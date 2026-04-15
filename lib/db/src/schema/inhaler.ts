/**
 * Database schema for the Smart Inhaler Monitor.
 *
 * Uses SQLite via Drizzle ORM — no external database server required.
 * The database file is stored at ./inhaler.db in the project root.
 *
 * Tables:
 *   - inhaler_usage: Records each inhaler usage event with AI analysis results
 *   - alerts: Stores Edge AI-triggered alerts with severity and risk scores
 *
 * This system simulates Edge AI locally using rule-based inference.
 * In real-world deployment, this would be replaced by a TensorFlow Lite model
 * running on the inhaler device (ESP32 or similar microcontroller).
 */
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";

/**
 * inhaler_usage table — records each time the patient uses their inhaler.
 *
 * Fields:
 *   - id:        Auto-incrementing primary key
 *   - strength:  Inhalation strength from the sensor (Low | Medium | High)
 *                In a real device: Peak Inspiratory Flow Rate (PIFR) in L/min
 *   - alert:     Whether the Edge AI analysis triggered an alert (0/1)
 *   - alertType: The type of alert triggered (null if no alert)
 *   - riskScore: Numeric risk score 0–100 computed by the Edge AI engine
 *   - severity:  Categorical severity: none | low | medium | high
 *   - createdAt: ISO timestamp string of the usage event
 *
 * Indexes:
 *   - idx_inhaler_usage_created_at — speeds up time-window queries in Edge AI
 *   - idx_inhaler_usage_alert_type — speeds up alert-type filtering
 */
export const inhalerUsageTable = sqliteTable(
  "inhaler_usage",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    strength: text("strength").notNull(),       // "Low" | "Medium" | "High"
    alert: integer("alert", { mode: "boolean" }).notNull().default(false),
    alertType: text("alert_type"),              // "high_usage" | "low_strength" | "rapid_usage" | "attack_risk" | null
    riskScore: integer("risk_score").default(0), // 0–100 AI risk score
    severity: text("severity").default("none"), // "none" | "low" | "medium" | "high"
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    index("idx_inhaler_usage_created_at").on(table.createdAt),
    index("idx_inhaler_usage_alert_type").on(table.alertType),
  ],
);

export const insertInhalerUsageSchema = createInsertSchema(inhalerUsageTable).omit({
  id: true,
  createdAt: true,
});
export type InsertInhalerUsage = z.infer<typeof insertInhalerUsageSchema>;
export type InhalerUsage = typeof inhalerUsageTable.$inferSelect;

/**
 * alerts table — stores all Edge AI-triggered alerts.
 *
 * Fields:
 *   - id:        Auto-incrementing primary key
 *   - type:      Alert category (high_usage | low_strength | rapid_usage | attack_risk)
 *   - message:   Human-readable alert message shown to the patient
 *   - severity:  Categorical severity: low | medium | high
 *   - riskScore: The AI risk score at the time the alert was triggered
 *   - createdAt: ISO timestamp string when the alert was triggered
 *
 * Indexes:
 *   - idx_alerts_created_at — speeds up time-window queries (unread count, insights)
 *   - idx_alerts_type       — speeds up alert-type filtering
 */
export const alertsTable = sqliteTable(
  "alerts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    type: text("type").notNull(),               // "high_usage" | "low_strength" | "rapid_usage" | "attack_risk"
    message: text("message").notNull(),
    severity: text("severity").default("low"),  // "low" | "medium" | "high"
    riskScore: integer("risk_score").default(0),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    index("idx_alerts_created_at").on(table.createdAt),
    index("idx_alerts_type").on(table.type),
  ],
);

export const insertAlertSchema = createInsertSchema(alertsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alertsTable.$inferSelect;
