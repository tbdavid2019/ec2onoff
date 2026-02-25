import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { resolve } from "path";
import { setupDatabase, getLogs } from "./database.js";
import { checkStatus, startInstance, stopInstance } from "./awsService.js";
import { sendOtp } from "./emailService.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Auth config
const WHITELIST_EMAILS = (process.env.WHITELIST_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase());

// In-memory OTP store (email -> { code, expiresAt })
const otpStore = new Map();

// In-memory Session store (sessionId -> { email, expiresAt })
const sessionStore = new Map();

app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(express.static("public"));

// Helper: Check if email is whitelisted
const isWhitelisted = (email) => {
    return WHITELIST_EMAILS.includes(email.toLowerCase());
};

// Middleware: Verify Auth Session
const requireAuth = (req, res, next) => {
    const sessionId = req.cookies.sessionId;
    if (!sessionId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const session = sessionStore.get(sessionId);
    if (!session || session.expiresAt < Date.now()) {
        sessionStore.delete(sessionId);
        res.clearCookie("sessionId");
        return res.status(401).json({ error: "Session expired or invalid" });
    }

    req.user = session;
    next();
};

// Init DB before starting server
setupDatabase();

// --- API Endpoints ---

// 1. Request OTP
app.post("/api/request-otp", async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: "Email required" });

        const normalizedEmail = email.toLowerCase();
        if (!isWhitelisted(normalizedEmail)) {
            // Return success anyway to prevent email enumeration, but don't actually send
            console.log(`Blocked OTP request for non-whitelisted email: ${normalizedEmail}`);
            return res.json({ message: "If your email is whitelisted, an OTP has been sent." });
        }

        // Generate 6 digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Store OTP (expires in 5 minutes)
        otpStore.set(normalizedEmail, {
            code: otp,
            expiresAt: Date.now() + 5 * 60 * 1000,
        });

        // Send email
        await sendOtp(normalizedEmail, otp);

        res.json({ message: "If your email is whitelisted, an OTP has been sent." });
    } catch (err) {
        console.error("OTP Request Error:", err);
        res.status(500).json({ error: "Failed to process request" });
    }
});

// 2. Verify OTP
app.post("/api/verify-otp", (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: "Email and OTP required" });

    const normalizedEmail = email.toLowerCase();
    const record = otpStore.get(normalizedEmail);

    if (!record) {
        return res.status(400).json({ error: "OTP expired or invalid" });
    }

    if (Date.now() > record.expiresAt) {
        otpStore.delete(normalizedEmail);
        return res.status(400).json({ error: "OTP expired" });
    }

    if (record.code !== otp) {
        return res.status(400).json({ error: "Invalid OTP" });
    }

    // Success! Clear OTP and create session
    otpStore.delete(normalizedEmail);

    const sessionId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    // Session expires in 12 hours
    sessionStore.set(sessionId, {
        email: normalizedEmail,
        expiresAt: Date.now() + 12 * 60 * 60 * 1000
    });

    res.cookie("sessionId", sessionId, {
        httpOnly: true,
        maxAge: 12 * 60 * 60 * 1000,
        sameSite: "strict" // Protect against CSRF
    });

    res.json({ message: "Logged in successfully", email: normalizedEmail });
});

// 3. Logout
app.post("/api/logout", (req, res) => {
    const sessionId = req.cookies.sessionId;
    if (sessionId) {
        sessionStore.delete(sessionId);
        res.clearCookie("sessionId");
    }
    res.json({ message: "Logged out" });
});

// 4. Get EC2 Status
app.get("/api/status", requireAuth, async (req, res) => {
    try {
        const status = await checkStatus();
        res.json(status);
    } catch (err) {
        console.error("Status Check Error:", err);
        res.status(500).json({ error: "Failed to check instance status" });
    }
});

// 5. Toggle EC2 (Start/Stop)
app.post("/api/toggle", requireAuth, async (req, res) => {
    try {
        const { action } = req.body; // 'start' or 'stop'
        if (action !== "start" && action !== "stop") {
            return res.status(400).json({ error: "Invalid action" });
        }

        const email = req.user.email;
        let result;

        if (action === "start") {
            result = await startInstance(email);
        } else {
            result = await stopInstance(email);
        }

        res.json(result);
    } catch (err) {
        console.error("Toggle Error:", err);
        res.status(500).json({ error: "Failed to toggle instance" });
    }
});

// 6. Get Logs
app.get("/api/logs", requireAuth, async (req, res) => {
    try {
        const logs = await getLogs();
        res.json(logs);
    } catch (err) {
        console.error("Get Logs Error:", err);
        res.status(500).json({ error: "Failed to fetch logs" });
    }
});

// 7. Get Current User info
app.get("/api/me", requireAuth, (req, res) => {
    res.json({ email: req.user.email });
});


// Basic 404 handler
app.use((req, res) => {
    res.status(404).send("Page not found");
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
