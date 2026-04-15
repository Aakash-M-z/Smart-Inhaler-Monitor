import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Table for recording each inhaler usage event
export const inhalerUsageTable = pgTable("inhaler_usage", {
  id: serial("id").primaryKey(),
  strength: text("strength").notNull(), // Low | Medium | High
  alert: boolean("alert").notNull().default(false),
  alertType: text("alert_type"), // high_usage | low_strength | rapid_usage | null
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertInhalerUsageSchema = createInsertSchema(inhalerUsageTable).omit({
  id: true,
  createdAt: true,
});
export type InsertInhalerUsage = z.infer<typeof insertInhalerUsageSchema>;
export type InhalerUsage = typeof inhalerUsageTable.$inferSelect;

// Table for triggered alerts
export const alertsTable = pgTable("alerts", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // high_usage | low_strength | rapid_usage
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAlertSchema = createInsertSchema(alertsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alertsTable.$inferSelect;
