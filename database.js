import sqlite3 from "sqlite3";
import { formatDistanceToNow, differenceInMinutes } from "date-fns";
import fs from "fs";
import path from "path";

// Use verbose mode for better debugging
const sqlite = sqlite3.verbose();
const dbName = process.env.DB_PATH || "./logs/logs.db";

// Ensure directory exists for persistent volume mapping
const dbDir = path.dirname(dbName);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

let db;

export const setupDatabase = () => {
    db = new sqlite.Database(dbName, (err) => {
        if (err) {
            console.error("Error opening database:", err.message);
        } else {
            console.log(`Connected to SQLite database: ${dbName}`);
            db.run(`
        CREATE TABLE IF NOT EXISTS instance_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          action TEXT NOT NULL,
          user_email TEXT NOT NULL,
          instance_id TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          uptime_minutes INTEGER DEFAULT 0
        )
      `, (err) => {
                if (!err) {
                    // Try to add column if table already exists from older version (ignore error if it already has it)
                    db.run(`ALTER TABLE instance_logs ADD COLUMN instance_id TEXT`, () => { });
                }
            });
        }
    });
};

export const logAction = (action, userEmail, instanceId = null) => {
    return new Promise(async (resolve, reject) => {
        try {
            let uptime = 0;

            // If action is stop, calculate uptime since the last start for this specific instance
            if (action === "stop" || action === "STOP") {
                const lastStart = await getLastStartLog(instanceId);
                if (lastStart) {
                    const startTimestamp = new Date(lastStart.timestamp + "Z"); // SQLite CURRENT_TIMESTAMP is UTC
                    const now = new Date();
                    uptime = differenceInMinutes(now, startTimestamp);
                }
            }

            db.run(
                `INSERT INTO instance_logs (action, user_email, instance_id, uptime_minutes) VALUES (?, ?, ?, ?)`,
                [action.toUpperCase(), userEmail, instanceId, uptime],
                function (err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        } catch (err) {
            reject(err);
        }
    });
};

const getLastStartLog = (instanceId) => {
    return new Promise((resolve, reject) => {
        let query = `SELECT * FROM instance_logs WHERE action = 'START'`;
        const params = [];

        if (instanceId) {
            query += ` AND instance_id = ?`;
            params.push(instanceId);
        }

        query += ` ORDER BY timestamp DESC LIMIT 1`;

        db.get(query, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

export const getLogs = () => {
    return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM instance_logs ORDER BY timestamp DESC LIMIT 50`, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};
