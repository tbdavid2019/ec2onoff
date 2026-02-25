import nodemailer from "nodemailer";

export const sendOtp = async (toEmail, code) => {
    const transporter = nodemailer.createTransport({
        host: "mail.aicreate360.com", // Assuming standard cPanel or generic SMTP given the email domain
        // NOTE: We might need to adjust this host if it's Gmail or AWS SES.
        // I will set it up for a generic secure SMTP first, if it fails we can adjust.
        port: 465,
        secure: true,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    // If using generic host fails, fallback to common ones like Gmail if the user provides an App Password
    // For now let's use standard SMTP configuration that works with most custom domains.

    // We can also configure a simpler dynamic transport if the host isn't explicit
    // But generally, nodemailer needs a host.
    // We'll use the domain of the sender by default as a guess.
    const hostGuess = `mail.${process.env.SMTP_USER.split('@')[1]}`;

    const dynamicTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || hostGuess,
        port: process.env.SMTP_PORT || 465, // Try 465 for SSL, or 587 for TLS
        secure: process.env.SMTP_PORT === '465' || !process.env.SMTP_PORT, // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });


    const mailOptions = {
        from: `"EC2 Controller" <${process.env.SMTP_USER}>`,
        to: toEmail,
        subject: "Your Login Verification Code",
        html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2>Login Verification</h2>
        <p>Your one-time password (OTP) to log in is:</p>
        <h1 style="color: #4CAF50; letter-spacing: 5px; font-size: 32px;">${code}</h1>
        <p>This code will expire in 5 minutes.</p>
        <p>If you did not request this code, please ignore this email.</p>
      </div>
    `,
    };

    try {
        const info = await dynamicTransporter.sendMail(mailOptions);
        console.log("OTP Email sent:", info.messageId);
        return info;
    } catch (err) {
        console.error("Error sending email:", err);
        throw err;
    }
};
