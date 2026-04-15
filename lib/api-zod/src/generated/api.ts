/**
 * Zod validation schemas for the Smart Inhaler Monitor API.
 *
 * These schemas validate all API request/response payloads.
 * Extended to include riskScore, severity, trend, and insights fields
 * produced by the upgraded Edge AI analysis engine.
 *
 * This system simulates Edge AI locally using rule-based inference.
 * In real-world deployment, this would be replaced by a TensorFlow Lite model
 * running on the inhaler device (ESP32 or similar microcontroller).
 */
import * as zod from "zod";

/** Health check response */
export const HealthCheckResponse = zod.object({
  status: zod.string(),
});

/**
 * Usage statistics response.
 * Status is now a 3-level smart indicator:
 *   "Safe"      → Green  (normal usage)
 *   "Moderate"  → Yellow (elevated usage or alerts)
 *   "High Risk" → Red    (critical usage or attack risk)
 */
export const GetStatsResponse = zod.object({
  totalToday: zod.number().describe("Total inhaler uses today"),
  lastUsageTime: zod.string().nullable().describe("Time of last usage"),
  alertsTriggeredToday: zod.number().describe("Number of alerts triggered today"),
  status: zod.string().describe("Smart status: Safe | Moderate | High Risk"),
  maxRiskScore: zod.number().optional().describe("Highest AI risk score recorded today (0–100)"),
});

/**
 * Single usage record — includes AI analysis results.
 */
export const GetUsageLogsResponseItem = zod.object({
  id: zod.number(),
  time: zod.string().describe('Formatted time string (e.g. "10:30 AM")'),
  timestamp: zod.coerce.date(),
  strength: zod.enum(["Low", "Medium", "High"]),
  alert: zod.boolean(),
  alertType: zod.string().nullish(),
  riskScore: zod.number().nullable().optional().describe("AI risk score 0–100"),
  severity: zod.enum(["none", "low", "medium", "high"]).nullable().optional(),
});
export const GetUsageLogsResponse = zod.array(GetUsageLogsResponseItem);

/**
 * Alert record — includes severity and risk score.
 * severity is nullable to handle legacy rows that predate the severity column.
 */
export const GetAlertsResponseItem = zod.object({
  id: zod.number(),
  type: zod.string(), // "high_usage" | "low_strength" | "rapid_usage" | "attack_risk"
  message: zod.string(),
  timestamp: zod.coerce.date(),
  time: zod.string(),
  severity: zod.enum(["low", "medium", "high"]).nullable().optional(),
  riskScore: zod.number().nullable().optional(),
});
export const GetAlertsResponse = zod.array(GetAlertsResponseItem);

/** Unread alert count */
export const GetUnreadAlertCountResponse = zod.object({
  count: zod.number(),
});

/** Single hourly chart data point */
export const ChartDataPointSchema = zod.object({
  hour: zod.string().describe('Hour label (e.g. "10 AM")'),
  count: zod.number().describe("Number of uses in that hour"),
});

/**
 * Usage chart response — includes hourly data and trend direction.
 * trend: "increasing" | "decreasing" | "stable"
 */
export const GetUsageChartResponse = zod.object({
  data: zod.array(ChartDataPointSchema),
  trend: zod.enum(["increasing", "decreasing", "stable"]),
});

/**
 * AI-generated insights response.
 * Compares today vs yesterday, computes weekly averages, and detects alert trends.
 */
export const GetInsightsResponse = zod.object({
  todayCount: zod.number(),
  yesterdayCount: zod.number(),
  vsYesterdayPct: zod.number().nullable(),
  vsYesterdayLabel: zod.string(),
  avgDailyUsage: zod.number(),
  peakUsageTime: zod.string().nullable(),
  riskLevel: zod.enum(["Low", "Moderate", "High"]),
  alertTrend: zod.enum(["improving", "worsening", "stable"]),
  weekAlertCount: zod.number(),
});

// Re-export ChartDataPoint type for backwards compatibility
export const GetUsageChartResponseItem = ChartDataPointSchema;
