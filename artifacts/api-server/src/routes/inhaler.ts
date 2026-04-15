/**
 * Inhaler usage routes — Smart Inhaler Monitor API.
 *
 * This system simulates Edge AI locally using rule-based inference.
 * In real-world deployment, this would be replaced by a TensorFlow Lite model
 * running on the inhaler device (ESP32 or similar microcontroller).
 *
 * Routes:
 *   POST /use-inhaler         — Record usage + run Edge AI analysis
 *   GET  /stats               — Today's stats with smart status
 *   GET  /usage-logs          — Full usage history
 *   GET  /alerts              — All triggered alerts
 *   GET  /alerts/unread-count — Recent alert count (last 24h)
 *   GET  /usage-chart         — Hourly chart data with trend
 *   GET  /insights            — AI-generated usage insights
 */
import { Router, type IRouter, type Request, type Response } from "express";
import { desc, gte, lt, and } from "drizzle-orm";
import { db, inhalerUsageTable, alertsTable } from "@workspace/db";
import {
  GetStatsResponse,
  GetUsageLogsResponse,
  GetAlertsResponse,
  GetUnreadAlertCountResponse,
  GetUsageChartResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** Severity levels produced by the Edge AI engine */
type Severity = "none" | "low" | "medium" | "high";

/** Alert types the system can generate */
type AlertType = "low_strength" | "rapid_usage" | "high_usage" | "attack_risk";

/** Full result from the Edge AI analyzer */
interface AIAnalysisResult {
  alert: boolean;
  alertType: AlertType | null;
  alertMessage: string | null;
  /** Numeric risk score 0–100 used for status determination */
  riskScore: number;
  /** Categorical severity derived from riskScore */
  severity: Severity;
}

// ─────────────────────────────────────────────────────────────────────────────
// EDGE AI ANALYSIS ENGINE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts inhalation strength to a numeric penalty score.
 *
 * Low strength means the patient is not inhaling deeply enough for effective
 * drug delivery (poor Peak Inspiratory Flow Rate — PIFR).
 * In a real device, PIFR is measured by a flow-rate sensor in L/min.
 *
 *   Low    → +30 penalty (poor technique)
 *   Medium → +0  (normal)
 *   High   → -5  (slight bonus for good technique)
 */
function strengthPenalty(strength: string): number {
  if (strength === "Low") return 30;
  if (strength === "High") return -5;
  return 0;
}

/**
 * Maps a numeric risk score (0–100) to a categorical severity level.
 *
 *   0–24  → none   (safe)
 *   25–49 → low    (monitor)
 *   50–74 → medium (warning)
 *   75+   → high   (critical / potential attack)
 */
function scoreToSeverity(score: number): Severity {
  if (score >= 75) return "high";
  if (score >= 50) return "medium";
  if (score >= 25) return "low";
  return "none";
}

/**
 * Edge AI Analyzer — simulates on-device inference for inhaler usage patterns.
 *
 * Scoring model (additive risk score, 0–100):
 *   Base score components:
 *     +10 per use in the last 10 minutes (rapid usage window)
 *     +5  per use today beyond the first 2
 *     +30 if inhalation strength is Low (poor technique)
 *     -5  if inhalation strength is High (good technique)
 *
 *   Alert thresholds:
 *     score ≥ 75 → "attack_risk"  — Potential Asthma Attack Warning
 *     score ≥ 50 → "rapid_usage"  — Rapid usage / overuse
 *     Low strength alone → "low_strength" warning
 *     ≥6 uses today → "high_usage" warning
 *
 * This system simulates Edge AI locally using rule-based inference.
 * In real-world deployment, this would be replaced by a TensorFlow Lite model
 * running on the inhaler device (ESP32 or similar microcontroller).
 *
 * @param strength - Inhalation strength: "Low" | "Medium" | "High"
 * @returns Full AIAnalysisResult with score, severity, alert type, and message
 */
async function edgeAIAnalyzer(strength: string): Promise<AIAnalysisResult> {
  const now = new Date();

  // ── Query 1: Usages in the last 10 minutes (rapid usage window) ──────────
  const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000).toISOString();
  const recentUsages = await db
    .select()
    .from(inhalerUsageTable)
    .where(gte(inhalerUsageTable.createdAt, tenMinutesAgo));

  // ── Query 2: All usages today ─────────────────────────────────────────────
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const todayUsages = await db
    .select()
    .from(inhalerUsageTable)
    .where(gte(inhalerUsageTable.createdAt, startOfDay.toISOString()));

  const recentCount = recentUsages.length;   // uses in last 10 min (before this one)
  const todayCount = todayUsages.length;    // uses today (before this one)

  // ── Compute risk score ────────────────────────────────────────────────────
  // Each component contributes additively to the overall risk score.
  const rapidScore = Math.min(recentCount * 10, 40);  // cap at 40 from rapid usage
  const dailyScore = Math.max(0, (todayCount - 2) * 5); // first 2 uses are baseline
  const strengthScore = strengthPenalty(strength);
  const rawScore = rapidScore + dailyScore + strengthScore;
  const riskScore = Math.min(100, Math.max(0, rawScore)); // clamp to [0, 100]
  const severity = scoreToSeverity(riskScore);

  // ── Determine alert type and message based on score + rules ──────────────

  // CRITICAL: Potential asthma attack — high score with rapid usage
  if (riskScore >= 75 && recentCount >= 2) {
    return {
      alert: true,
      alertType: "attack_risk",
      alertMessage:
        `⚠️ POTENTIAL ASTHMA ATTACK WARNING: High-frequency usage detected ` +
        `(${recentCount + 1} uses in 10 min, risk score: ${riskScore}/100). ` +
        "Seek immediate medical attention if breathing difficulty persists.",
      riskScore,
      severity: "high",
    };
  }

  // HIGH: Rapid usage with or without low strength
  if (recentCount >= 3) {
    const extra = strength === "Low"
      ? " Improper inhalation technique also detected — use a slow, deep breath."
      : "";
    return {
      alert: true,
      alertType: "rapid_usage",
      alertMessage:
        `Rapid usage detected! ${recentCount + 1} uses in the last 10 minutes (risk score: ${riskScore}/100).` +
        ` This may indicate worsening symptoms — consult your doctor.${extra}`,
      riskScore,
      severity,
    };
  }

  // MEDIUM: Low inhalation strength — improper technique
  if (strength === "Low") {
    return {
      alert: true,
      alertType: "low_strength",
      alertMessage:
        `Improper inhalation technique detected (risk score: ${riskScore}/100). ` +
        "Use a slow, deep breath to ensure full medication delivery to the lungs.",
      riskScore,
      severity: riskScore >= 50 ? "medium" : "low",
    };
  }

  // MEDIUM: High daily usage — poor asthma control indicator
  if (todayCount >= 6) {
    return {
      alert: true,
      alertType: "high_usage",
      alertMessage:
        `High daily usage: ${todayCount + 1} doses today (risk score: ${riskScore}/100). ` +
        "Using a rescue inhaler more than 2 days/week may indicate poor asthma control. Please consult your doctor.",
      riskScore,
      severity,
    };
  }

  // SAFE: No alert conditions met
  return {
    alert: false,
    alertType: null,
    alertMessage: null,
    riskScore,
    severity: "none",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Formats an ISO date string into a human-readable 12-hour time string.
 * Example: "2024-01-15T10:30:00.000Z" → "10:30 AM"
 */
function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Simulates a realistic inhalation strength reading from the inhaler sensor.
 * Weighted distribution: 20% Low, 50% Medium, 30% High.
 *
 * In a real device, this value comes from a flow-rate sensor (spirometer)
 * measuring Peak Inspiratory Flow Rate (PIFR) in L/min:
 *   PIFR < 30 L/min  → Low
 *   PIFR 30–60 L/min → Medium
 *   PIFR > 60 L/min  → High
 */
function simulateInhalationStrength(): "Low" | "Medium" | "High" {
  const rand = Math.random();
  if (rand < 0.2) return "Low";
  if (rand < 0.7) return "Medium";
  return "High";
}

/**
 * Determines the smart status label from usage stats and risk score.
 *
 * Status levels:
 *   "Safe"     → Green  — normal usage, no alerts
 *   "Moderate" → Yellow — some alerts or elevated usage
 *   "High Risk"→ Red    — critical alerts or very high usage
 */
function computeStatus(
  totalToday: number,
  alertsToday: number,
  maxRiskScore: number,
): "Safe" | "Moderate" | "High Risk" {
  if (maxRiskScore >= 75 || alertsToday >= 3 || totalToday >= 8) return "High Risk";
  if (maxRiskScore >= 50 || alertsToday >= 1 || totalToday >= 5) return "Moderate";
  return "Safe";
}

// ─────────────────────────────────────────────────────────────────────────────
// API ROUTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /use-inhaler
 *
 * Records a new inhaler usage event. Simulates sensor data (inhalation strength),
 * runs Edge AI analysis to detect unsafe patterns, and persists both the usage
 * record and any triggered alert to the database.
 *
 * Response: UsageRecord with riskScore and severity (201 Created)
 */
router.post("/use-inhaler", async (req: Request, res: Response): Promise<void> => {
  try {
    // Simulate inhalation strength from the device sensor
    const strength = simulateInhalationStrength();

    // Run Edge AI analysis — computes risk score and determines alert conditions
    const aiResult = await edgeAIAnalyzer(strength);

    // Persist the usage event to the database
    const [usage] = await db
      .insert(inhalerUsageTable)
      .values({
        strength,
        alert: aiResult.alert,
        alertType: aiResult.alertType ?? null,
        riskScore: aiResult.riskScore,
        severity: aiResult.severity,
      })
      .returning();

    // If an alert was triggered, save it to the alerts table for notification history
    if (aiResult.alert && aiResult.alertType && aiResult.alertMessage) {
      await db.insert(alertsTable).values({
        type: aiResult.alertType,
        message: aiResult.alertMessage,
        severity: aiResult.severity,
        riskScore: aiResult.riskScore,
      });
    }

    req.log.info(
      {
        usageId: usage.id,
        strength,
        alert: aiResult.alert,
        alertType: aiResult.alertType,
        riskScore: aiResult.riskScore,
        severity: aiResult.severity,
      },
      "Inhaler usage recorded",
    );

    res.status(201).json({
      id: usage.id,
      time: formatTime(usage.createdAt),
      timestamp: new Date(usage.createdAt).toISOString(),
      strength: usage.strength,
      alert: usage.alert,
      alertType: usage.alertType ?? null,
      riskScore: aiResult.riskScore,
      severity: aiResult.severity,
    });
  } catch (error) {
    req.log.error({ error }, "Failed to record inhaler usage");
    res.status(500).json({ error: "Failed to record inhaler usage. Please try again." });
  }
});

/**
 * GET /stats
 *
 * Returns today's usage statistics with smart status indicator.
 *
 * Status logic (based on usage frequency + AI risk scores):
 *   "Safe"      → Green  — totalToday < 5, alertsToday = 0, maxRisk < 50
 *   "Moderate"  → Yellow — totalToday 5–7 OR alertsToday 1–2 OR maxRisk 50–74
 *   "High Risk" → Red    — totalToday ≥ 8 OR alertsToday ≥ 3 OR maxRisk ≥ 75
 *
 * Response: UsageStats (200 OK)
 */
router.get("/stats", async (req: Request, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const startOfDayISO = startOfDay.toISOString();

    // Fetch all usage events and alerts for today in parallel
    const [todayUsages, todayAlerts] = await Promise.all([
      db
        .select()
        .from(inhalerUsageTable)
        .where(gte(inhalerUsageTable.createdAt, startOfDayISO))
        .orderBy(desc(inhalerUsageTable.createdAt)),
      db
        .select()
        .from(alertsTable)
        .where(gte(alertsTable.createdAt, startOfDayISO)),
    ]);

    const totalToday = todayUsages.length;
    const lastUsage = todayUsages[0];
    const alertsTriggeredToday = todayAlerts.length;

    // Find the highest risk score recorded today for smart status computation
    const maxRiskScore = todayUsages.reduce(
      (max, u) => Math.max(max, u.riskScore ?? 0),
      0,
    );

    const status = computeStatus(totalToday, alertsTriggeredToday, maxRiskScore);

    res.json(
      GetStatsResponse.parse({
        totalToday,
        lastUsageTime: lastUsage ? formatTime(lastUsage.createdAt) : null,
        alertsTriggeredToday,
        status,
        maxRiskScore,
      }),
    );
  } catch (error) {
    req.log.error({ error }, "Failed to fetch stats");
    res.status(500).json({ error: "Failed to fetch usage statistics." });
  }
});

/**
 * GET /usage-logs
 *
 * Returns all inhaler usage records ordered by most recent first.
 * Includes riskScore and severity for each entry.
 *
 * Response: UsageRecord[] (200 OK)
 */
router.get("/usage-logs", async (req: Request, res: Response): Promise<void> => {
  try {
    const usages = await db
      .select()
      .from(inhalerUsageTable)
      .orderBy(desc(inhalerUsageTable.createdAt));

    const formatted = usages.map((u) => ({
      id: u.id,
      time: formatTime(u.createdAt),
      timestamp: new Date(u.createdAt).toISOString(),
      strength: u.strength,
      alert: u.alert,
      alertType: u.alertType ?? null,
      riskScore: u.riskScore ?? 0,
      // Coerce null/undefined severity from legacy rows
      severity: (u.severity && ["none", "low", "medium", "high"].includes(u.severity)
        ? u.severity
        : "none") as Severity,
    }));

    res.json(GetUsageLogsResponse.parse(formatted));
  } catch (error) {
    req.log.error({ error }, "Failed to fetch usage logs");
    res.status(500).json({ error: "Failed to fetch usage logs." });
  }
});

/**
 * GET /alerts
 *
 * Returns all triggered alerts ordered by most recent first.
 * Includes severity and riskScore for each alert.
 *
 * Response: Alert[] (200 OK)
 */
router.get("/alerts", async (req: Request, res: Response): Promise<void> => {
  try {
    const alerts = await db
      .select()
      .from(alertsTable)
      .orderBy(desc(alertsTable.createdAt));

    const formatted = alerts.map((a) => ({
      id: a.id,
      type: a.type,
      message: a.message,
      timestamp: new Date(a.createdAt).toISOString(),
      time: formatTime(a.createdAt),
      // Coerce null/undefined severity from legacy rows to a valid value
      severity: (a.severity && ["low", "medium", "high"].includes(a.severity)
        ? a.severity
        : "low") as "low" | "medium" | "high",
      riskScore: a.riskScore ?? 0,
    }));

    res.json(GetAlertsResponse.parse(formatted));
  } catch (error) {
    req.log.error({ error }, "Failed to fetch alerts");
    res.status(500).json({ error: "Failed to fetch alerts." });
  }
});

/**
 * GET /alerts/unread-count
 *
 * Returns the count of alerts triggered in the last 24 hours.
 * Used by the navigation badge to indicate pending notifications.
 *
 * Response: UnreadAlertCount (200 OK)
 */
router.get("/alerts/unread-count", async (req: Request, res: Response): Promise<void> => {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const recent = await db
      .select()
      .from(alertsTable)
      .where(gte(alertsTable.createdAt, oneDayAgo));

    res.json(GetUnreadAlertCountResponse.parse({ count: recent.length }));
  } catch (error) {
    req.log.error({ error }, "Failed to fetch unread alert count");
    res.status(500).json({ error: "Failed to fetch alert count." });
  }
});

/**
 * GET /usage-chart
 *
 * Returns hourly usage counts for today with trend detection.
 * Trend compares the second half of the day to the first half.
 *
 * Response: { data: ChartDataPoint[], trend: "increasing"|"decreasing"|"stable" } (200 OK)
 */
router.get("/usage-chart", async (req: Request, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const todayUsages = await db
      .select()
      .from(inhalerUsageTable)
      .where(gte(inhalerUsageTable.createdAt, startOfDay.toISOString()))
      .orderBy(inhalerUsageTable.createdAt);

    // Build hourly buckets from midnight to the current hour
    const hourlyMap: Record<number, number> = {};
    const currentHour = now.getHours();
    for (let h = 0; h <= currentHour; h++) hourlyMap[h] = 0;

    for (const usage of todayUsages) {
      const hour = new Date(usage.createdAt).getHours();
      if (hour in hourlyMap) hourlyMap[hour]++;
    }

    const chartData = Object.entries(hourlyMap).map(([hour, count]) => {
      const h = parseInt(hour);
      const label =
        h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`;
      return { hour: label, count };
    });

    // Trend detection: compare first half vs second half of recorded hours
    const mid = Math.floor(chartData.length / 2);
    const firstHalf = chartData.slice(0, mid).reduce((s, d) => s + d.count, 0);
    const secondHalf = chartData.slice(mid).reduce((s, d) => s + d.count, 0);
    const trend: "increasing" | "decreasing" | "stable" =
      secondHalf > firstHalf + 1 ? "increasing"
        : firstHalf > secondHalf + 1 ? "decreasing"
          : "stable";

    res.json(GetUsageChartResponse.parse({ data: chartData, trend }));
  } catch (error) {
    req.log.error({ error }, "Failed to fetch usage chart data");
    res.status(500).json({ error: "Failed to fetch chart data." });
  }
});

/**
 * GET /insights
 *
 * Returns AI-generated usage insights for the patient.
 * Compares today's usage to yesterday's and computes analytics.
 *
 * Response: InsightsResponse (200 OK)
 */
router.get("/insights", async (req: Request, res: Response): Promise<void> => {
  try {
    const now = new Date();

    // Today's window
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    // Yesterday's window
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);

    // Last 7 days window
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [todayUsages, yesterdayUsages, weekUsages] = await Promise.all([
      db
        .select()
        .from(inhalerUsageTable)
        .where(gte(inhalerUsageTable.createdAt, startOfToday.toISOString())),
      db
        .select()
        .from(inhalerUsageTable)
        .where(
          and(
            gte(inhalerUsageTable.createdAt, startOfYesterday.toISOString()),
            lt(inhalerUsageTable.createdAt, startOfToday.toISOString()),
          ),
        ),
      db
        .select()
        .from(inhalerUsageTable)
        .where(gte(inhalerUsageTable.createdAt, sevenDaysAgo.toISOString())),
    ]);

    const todayCount = todayUsages.length;
    const yesterdayCount = yesterdayUsages.length;

    // Average daily usage over the last 7 days
    const avgDailyUsage = weekUsages.length > 0
      ? Math.round((weekUsages.length / 7) * 10) / 10
      : 0;

    // Percentage change vs yesterday
    let vsYesterdayPct: number | null = null;
    let vsYesterdayLabel = "No data for yesterday";
    if (yesterdayCount > 0) {
      vsYesterdayPct = Math.round(((todayCount - yesterdayCount) / yesterdayCount) * 100);
      vsYesterdayLabel =
        vsYesterdayPct > 0
          ? `You used inhaler ${vsYesterdayPct}% more than yesterday`
          : vsYesterdayPct < 0
            ? `You used inhaler ${Math.abs(vsYesterdayPct)}% less than yesterday`
            : "Same usage as yesterday";
    } else if (todayCount > 0) {
      vsYesterdayLabel = `${todayCount} dose${todayCount !== 1 ? "s" : ""} today — no data for yesterday`;
    }

    // Peak usage hour today
    const hourlyMap: Record<number, number> = {};
    for (const u of todayUsages) {
      const h = new Date(u.createdAt).getHours();
      hourlyMap[h] = (hourlyMap[h] ?? 0) + 1;
    }
    const peakHour = Object.entries(hourlyMap).sort((a, b) => b[1] - a[1])[0];
    let peakUsageTime: string | null = null;
    if (peakHour) {
      const h = parseInt(peakHour[0]);
      peakUsageTime =
        h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`;
    }

    // Overall risk level based on week's data
    const weekAlerts = await db
      .select()
      .from(alertsTable)
      .where(gte(alertsTable.createdAt, sevenDaysAgo.toISOString()));

    const riskLevel: "Low" | "Moderate" | "High" =
      weekAlerts.length >= 5 || avgDailyUsage >= 6 ? "High"
        : weekAlerts.length >= 2 || avgDailyUsage >= 3 ? "Moderate"
          : "Low";

    // Alert trend: compare this week's alerts to last week's
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const lastWeekAlerts = await db
      .select()
      .from(alertsTable)
      .where(
        and(
          gte(alertsTable.createdAt, twoWeeksAgo.toISOString()),
          lt(alertsTable.createdAt, sevenDaysAgo.toISOString()),
        ),
      );

    const alertTrend: "improving" | "worsening" | "stable" =
      weekAlerts.length < lastWeekAlerts.length - 1 ? "improving"
        : weekAlerts.length > lastWeekAlerts.length + 1 ? "worsening"
          : "stable";

    res.json({
      todayCount,
      yesterdayCount,
      vsYesterdayPct,
      vsYesterdayLabel,
      avgDailyUsage,
      peakUsageTime,
      riskLevel,
      alertTrend,
      weekAlertCount: weekAlerts.length,
    });
  } catch (error) {
    req.log.error({ error }, "Failed to fetch insights");
    res.status(500).json({ error: "Failed to fetch insights." });
  }
});

export default router;
