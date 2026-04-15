import { Router, type IRouter } from "express";
import { desc, gte, and, sql } from "drizzle-orm";
import { db, inhalerUsageTable, alertsTable } from "@workspace/db";
import {
  GetStatsResponse,
  GetUsageLogsResponse,
  GetAlertsResponse,
  GetUnreadAlertCountResponse,
  GetUsageChartResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

// Edge-AI simulation logic
// Determines if an alert should be triggered based on usage pattern and strength
async function runEdgeAIAnalysis(strength: string): Promise<{
  alert: boolean;
  alertType: string | null;
  alertMessage: string | null;
}> {
  const now = new Date();
  const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

  // Get recent usages in the last 10 minutes for rapid usage detection
  const recentUsages = await db
    .select()
    .from(inhalerUsageTable)
    .where(gte(inhalerUsageTable.createdAt, tenMinutesAgo));

  // Rule 1: LOW inhalation strength = improper technique warning
  if (strength === "Low") {
    return {
      alert: true,
      alertType: "low_strength",
      alertMessage: "Improper inhalation detected! Use a slow, deep breath for best results.",
    };
  }

  // Rule 2: More than 3 uses in the last 10 minutes = rapid usage alert
  if (recentUsages.length >= 3) {
    return {
      alert: true,
      alertType: "rapid_usage",
      alertMessage: "Rapid usage detected! You have used your inhaler multiple times in a short period.",
    };
  }

  // Rule 3: More than 6 uses today = high usage alert
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const todayUsages = await db
    .select()
    .from(inhalerUsageTable)
    .where(gte(inhalerUsageTable.createdAt, startOfDay));

  if (todayUsages.length >= 6) {
    return {
      alert: true,
      alertType: "high_usage",
      alertMessage: "High usage detected! You have used your inhaler more than 6 times today. Please consult your doctor.",
    };
  }

  return { alert: false, alertType: null, alertMessage: null };
}

// Format a Date to a readable time string like "10:30 AM"
function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// POST /use-inhaler — Record an inhaler usage event with Edge AI analysis
router.post("/use-inhaler", async (req, res): Promise<void> => {
  const strengths = ["Low", "Medium", "High"];
  // Weighted random: 20% Low, 50% Medium, 30% High to simulate realistic usage
  const rand = Math.random();
  const strength = rand < 0.2 ? "Low" : rand < 0.7 ? "Medium" : "High";

  // Run Edge AI analysis to determine if an alert should be triggered
  const aiResult = await runEdgeAIAnalysis(strength);

  // Insert the usage record
  const [usage] = await db
    .insert(inhalerUsageTable)
    .values({
      strength,
      alert: aiResult.alert,
      alertType: aiResult.alertType ?? null,
    })
    .returning();

  // If an alert was triggered, save it to the alerts table
  if (aiResult.alert && aiResult.alertType && aiResult.alertMessage) {
    await db.insert(alertsTable).values({
      type: aiResult.alertType,
      message: aiResult.alertMessage,
    });
  }

  req.log.info({ usageId: usage.id, strength, alert: aiResult.alert }, "Inhaler usage recorded");

  res.status(201).json({
    id: usage.id,
    time: formatTime(usage.createdAt),
    timestamp: usage.createdAt.toISOString(),
    strength: usage.strength,
    alert: usage.alert,
    alertType: usage.alertType ?? null,
  });
});

// GET /stats — Return today's usage statistics
router.get("/stats", async (req, res): Promise<void> => {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  // Get all usages today
  const todayUsages = await db
    .select()
    .from(inhalerUsageTable)
    .where(gte(inhalerUsageTable.createdAt, startOfDay))
    .orderBy(desc(inhalerUsageTable.createdAt));

  // Get today's alerts count
  const todayAlerts = await db
    .select()
    .from(alertsTable)
    .where(gte(alertsTable.createdAt, startOfDay));

  const totalToday = todayUsages.length;
  const lastUsage = todayUsages[0];
  const alertsTriggeredToday = todayAlerts.length;

  // Determine overall status based on usage and alerts
  let status = "Good";
  if (alertsTriggeredToday >= 3 || totalToday >= 8) {
    status = "Critical";
  } else if (alertsTriggeredToday >= 1 || totalToday >= 5) {
    status = "Warning";
  }

  const statsData = {
    totalToday,
    lastUsageTime: lastUsage ? formatTime(lastUsage.createdAt) : null,
    alertsTriggeredToday,
    status,
  };

  res.json(GetStatsResponse.parse(statsData));
});

// GET /usage-logs — Return all usage records
router.get("/usage-logs", async (req, res): Promise<void> => {
  const usages = await db
    .select()
    .from(inhalerUsageTable)
    .orderBy(desc(inhalerUsageTable.createdAt));

  const formatted = usages.map((u) => ({
    id: u.id,
    time: formatTime(u.createdAt),
    timestamp: u.createdAt.toISOString(),
    strength: u.strength,
    alert: u.alert,
    alertType: u.alertType ?? null,
  }));

  res.json(GetUsageLogsResponse.parse(formatted));
});

// GET /alerts — Return alert history
router.get("/alerts", async (req, res): Promise<void> => {
  const alerts = await db
    .select()
    .from(alertsTable)
    .orderBy(desc(alertsTable.createdAt));

  const formatted = alerts.map((a) => ({
    id: a.id,
    type: a.type,
    message: a.message,
    timestamp: a.createdAt.toISOString(),
    time: formatTime(a.createdAt),
  }));

  res.json(GetAlertsResponse.parse(formatted));
});

// GET /alerts/unread-count — Return unread alerts count (alerts in last 24h)
router.get("/alerts/unread-count", async (req, res): Promise<void> => {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recent = await db
    .select()
    .from(alertsTable)
    .where(gte(alertsTable.createdAt, oneDayAgo));

  res.json(GetUnreadAlertCountResponse.parse({ count: recent.length }));
});

// GET /usage-chart — Return hourly usage counts for today
router.get("/usage-chart", async (req, res): Promise<void> => {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  // Get all today's usages
  const todayUsages = await db
    .select()
    .from(inhalerUsageTable)
    .where(gte(inhalerUsageTable.createdAt, startOfDay))
    .orderBy(inhalerUsageTable.createdAt);

  // Build hourly buckets from midnight to current hour
  const hourlyMap: Record<number, number> = {};
  const currentHour = now.getHours();

  for (let h = 0; h <= currentHour; h++) {
    hourlyMap[h] = 0;
  }

  for (const usage of todayUsages) {
    const hour = usage.createdAt.getHours();
    if (hour in hourlyMap) {
      hourlyMap[hour]++;
    }
  }

  const chartData = Object.entries(hourlyMap).map(([hour, count]) => {
    const h = parseInt(hour);
    const label = h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`;
    return { hour: label, count };
  });

  res.json(GetUsageChartResponse.parse(chartData));
});

export default router;
