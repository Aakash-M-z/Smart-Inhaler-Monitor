/**
 * Database connection for the Smart Inhaler Monitor.
 *
 * Uses SQLite via better-sqlite3 + Drizzle ORM.
 * No external database server required — the DB file is created automatically
 * at ./inhaler.db relative to the workspace root when the server starts.
 *
 * This system simulates Edge AI locally using rule-based inference.
 * In real-world deployment, this would be replaced by a TensorFlow Lite model
 * running on the inhaler device (ESP32 or similar microcontroller).
 */
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, "../../../inhaler.db");

// Open (or create) the SQLite database file
const sqlite = new Database(DB_PATH);

// WAL mode: better concurrent read performance for a monitoring app
sqlite.pragma("journal_mode = WAL");
// Enforce foreign key constraints
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

/**
 * Auto-migrate: create tables and add new columns if they don't exist yet.
 * This is safe to run on every startup — all statements are idempotent.
 *
 * New columns (risk_score, severity) are added via ALTER TABLE IF NOT EXISTS
 * so existing databases are upgraded without data loss.
 */
sqlite.exec(`
  -- Core usage events table
  CREATE TABLE IF NOT EXISTS inhaler_usage (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    strength   TEXT    NOT NULL,
    alert      INTEGER NOT NULL DEFAULT 0,
    alert_type TEXT,
    risk_score INTEGER DEFAULT 0,
    severity   TEXT    DEFAULT 'none',
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  -- Triggered alerts table
  CREATE TABLE IF NOT EXISTS alerts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    type       TEXT    NOT NULL,
    message    TEXT    NOT NULL,
    severity   TEXT    DEFAULT 'low',
    risk_score INTEGER DEFAULT 0,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  -- Performance indexes for time-window queries used by Edge AI engine
  CREATE INDEX IF NOT EXISTS idx_inhaler_usage_created_at ON inhaler_usage(created_at);
  CREATE INDEX IF NOT EXISTS idx_inhaler_usage_alert_type ON inhaler_usage(alert_type);
  CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at);
  CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(type);
`);

// Safely add new columns to existing databases (ALTER TABLE ignores if column exists via try/catch)
const addColumnIfMissing = (table: string, column: string, definition: string) => {
  try {
    sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  } catch {
    // Column already exists — safe to ignore
  }
};

addColumnIfMissing("inhaler_usage", "risk_score", "INTEGER DEFAULT 0");
addColumnIfMissing("inhaler_usage", "severity", "TEXT DEFAULT 'none'");
addColumnIfMissing("alerts", "severity", "TEXT DEFAULT 'low'");
addColumnIfMissing("alerts", "risk_score", "INTEGER DEFAULT 0");

export * from "./schema";
