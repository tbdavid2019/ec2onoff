import sqlite3 from "sqlite3";
import { formatDistanceToNow, differenceInMinutes } from "date-fns";

// Use verbose mode for better debugging
const sqlite = sqlite3.verbose();
const dbName = process.env.DB_PATH || "./logs.db";

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
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          uptime_minutes INTEGER DEFAULT 0
        )
      `);
        }
    });
};

export const logAction = (action, userEmail) => {
    return new Promise(async (resolve, reject) => {
        try {
            let uptime = 0;

            // If action is stop, calculate uptime since the last start
            if (action === "stop" || action === "STOP") {
                const lastStart = await getLastStartLog();
                if (lastStart) {
                    const startTimestamp = new Date(lastStart.timestamp + "Z"); // SQLite CURRENT_TIMESTAMP is UTC
                    const now = new Date();
                    uptime = differenceInMinutes(now, startTimestamp);
                }
            }

            db.run(
                `INSERT INTO instance_logs (action, user_email, uptime_minutes) VALUES (?, ?, ?)`,
                [action.toUpperCase(), userEmail, uptime],
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

const getLastStartLog = () => {
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT * FROM instance_logs WHERE action = 'START' ORDER BY timestamp DESC LIMIT 1`,
            (err, row) => {
                if (err) reject(err);
                else resolve(row);
            }
        );
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
