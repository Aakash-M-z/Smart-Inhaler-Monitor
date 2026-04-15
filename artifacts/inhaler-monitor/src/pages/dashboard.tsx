/**
 * Dashboard — main screen of the Smart Inhaler Monitor.
 *
 * Features:
 *   - Smart status indicator: Safe (green) / Moderate (yellow) / High Risk (red)
 *   - AI Risk Score gauge with animated progress bar
 *   - Large "Use Inhaler" button with press animation
 *   - Stats cards: uses today, last usage, alerts count
 *   - AI Insights card: vs-yesterday comparison + peak time + alert trend
 *   - Recent activity log with strength badges and alert flags
 *
 * This system simulates Edge AI locally using rule-based inference.
 * In real-world deployment, this would be replaced by a TensorFlow Lite model
 * running on the inhaler device (ESP32 or similar microcontroller).
 */
import { useState } from "react";
import {
  useGetStats,
  useGetUsageLogs,
  useGetInsights,
  useUseInhaler,
  getGetStatsQueryKey,
  getGetUsageLogsQueryKey,
  getGetAlertsQueryKey,
  getGetUnreadAlertCountQueryKey,
  getGetUsageChartQueryKey,
  getGetInsightsQueryKey,
  type Severity,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BarChart2,
  Brain,
  CheckCircle2,
  Clock,
  TrendingDown,
  TrendingUp,
  Wind,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function getStatusConfig(status?: string) {
  switch (status) {
    case "Safe":
      return {
        icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" aria-hidden="true" />,
        pill: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400",
        dot: "bg-emerald-500",
        label: "Safe",
      };
    case "Moderate":
      return {
        icon: <AlertTriangle className="h-5 w-5 text-amber-500" aria-hidden="true" />,
        pill: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
        dot: "bg-amber-500",
        label: "Moderate Risk",
      };
    case "High Risk":
      return {
        icon: <AlertCircle className="h-5 w-5 text-destructive" aria-hidden="true" />,
        pill: "bg-destructive/10 text-destructive dark:bg-destructive/20",
        dot: "bg-destructive animate-pulse",
        label: "High Risk",
      };
    default:
      return {
        icon: <Activity className="h-5 w-5 text-muted-foreground" aria-hidden="true" />,
        pill: "bg-muted text-muted-foreground",
        dot: "bg-muted-foreground",
        label: "Loading...",
      };
  }
}

function getRiskScoreColor(score: number): string {
  if (score >= 75) return "bg-destructive";
  if (score >= 50) return "bg-amber-500";
  if (score >= 25) return "bg-yellow-400";
  return "bg-emerald-500";
}

function getStrengthBadge(strength: string) {
  switch (strength) {
    case "Low":
      return (
        <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30">
          Low Strength
        </Badge>
      );
    case "Medium":
      return (
        <Badge variant="outline" className="bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-500/20 dark:text-teal-400 dark:border-teal-500/30">
          Good Strength
        </Badge>
      );
    case "High":
      return (
        <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30">
          High Strength
        </Badge>
      );
    default:
      return null;
  }
}

function getSeverityRing(severity?: Severity): string {
  switch (severity) {
    case "high": return "ring-2 ring-destructive/40";
    case "medium": return "ring-2 ring-amber-400/40";
    case "low": return "ring-2 ring-yellow-400/40";
    default: return "";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function Dashboard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: stats, isLoading: statsLoading } = useGetStats();
  const { data: logs, isLoading: logsLoading } = useGetUsageLogs();
  const { data: insights } = useGetInsights();
  const { mutateAsync: useInhaler, isPending: isInhalerPending } = useUseInhaler();

  const [isPressing, setIsPressing] = useState(false);

  const riskScore = stats?.maxRiskScore ?? 0;
  const statusCfg = getStatusConfig(stats?.status);

  const handleUseInhaler = async () => {
    setIsPressing(true);
    try {
      const result = await useInhaler();

      // Show severity-aware toast notification
      if (result.severity === "high" || result.alertType === "attack_risk") {
        toast({
          title: "🚨 CRITICAL ALERT",
          description: result.alertType === "attack_risk"
            ? "Potential asthma attack warning! Seek medical attention immediately."
            : "Critical usage pattern detected. Please consult your doctor.",
          variant: "destructive",
        });
      } else if (result.alert) {
        toast({
          title: "⚠️ Alert Triggered",
          description:
            result.alertType === "low_strength"
              ? "Improper inhalation detected. Use a slow, deep breath."
              : result.alertType === "rapid_usage"
                ? "Rapid usage detected. Monitor your symptoms."
                : "High usage today. Consider consulting your doctor.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "✓ Dose Recorded",
          description: `Strength: ${result.strength} · Risk Score: ${result.riskScore ?? 0}/100`,
          variant: "default",
        });
      }

      // Refresh all related queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetUsageLogsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetAlertsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetUnreadAlertCountQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetUsageChartQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetInsightsQueryKey() }),
      ]);
    } catch {
      toast({
        title: "Connection Error",
        description: "Failed to record inhaler usage. Check that the server is running on port 5000.",
        variant: "destructive",
      });
    } finally {
      setTimeout(() => setIsPressing(false), 500);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Welcome back</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Your respiratory health overview for today.</p>
        </div>

        {/* Smart status pill */}
        {statsLoading ? (
          <Skeleton className="h-10 w-40 rounded-full" />
        ) : (
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm transition-all ${statusCfg.pill}`}
            role="status"
            aria-label={`Health status: ${stats?.status}`}
          >
            <span className={`h-2 w-2 rounded-full ${statusCfg.dot}`} />
            {statusCfg.icon}
            <span>{statusCfg.label}</span>
          </div>
        )}
      </div>

      {/* ── Hero: Use Inhaler Button + Risk Score ─────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border bg-card shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-primary/3 pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center gap-6 p-8 sm:p-12">
          {/* Main action button */}
          <Button
            size="lg"
            className={`
              h-40 w-40 sm:h-48 sm:w-48 rounded-full shadow-lg shadow-primary/25
              text-xl sm:text-2xl font-semibold transition-all duration-300 ease-out
              ${isPressing || isInhalerPending
                ? "scale-95 shadow-none"
                : "hover:scale-105 hover:shadow-xl hover:shadow-primary/35"
              }
            `}
            onClick={handleUseInhaler}
            disabled={isInhalerPending}
            aria-label="Record inhaler usage"
          >
            <div className="flex flex-col items-center gap-3">
              <Wind className={`h-10 w-10 sm:h-12 sm:w-12 ${isInhalerPending ? "animate-pulse" : ""}`} aria-hidden="true" />
              <span>{isInhalerPending ? "Recording..." : "Use Inhaler"}</span>
            </div>
          </Button>

          <p className="text-sm text-muted-foreground font-medium">Press to log an immediate dose</p>

          {/* AI Risk Score bar */}
          <div className="w-full max-w-xs space-y-2">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Brain className="h-3.5 w-3.5" aria-hidden="true" />
                AI Risk Score
              </span>
              <span className={`font-bold tabular-nums ${!stats || stats.totalToday === 0
                  ? "text-muted-foreground"
                  : riskScore >= 75 ? "text-destructive"
                    : riskScore >= 50 ? "text-amber-500"
                      : "text-emerald-600"
                }`}>
                {!stats || stats.totalToday === 0 ? "—" : `${riskScore}/100`}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              {stats && stats.totalToday > 0 ? (
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${getRiskScoreColor(riskScore)}`}
                  style={{ width: `${Math.max(riskScore, 3)}%` }}
                  role="progressbar"
                  aria-valuenow={riskScore}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              ) : (
                /* Striped placeholder when no doses recorded yet */
                <div
                  className="h-full w-full rounded-full"
                  style={{
                    background: "repeating-linear-gradient(90deg, transparent, transparent 6px, hsl(var(--muted-foreground)/0.15) 6px, hsl(var(--muted-foreground)/0.15) 8px)"
                  }}
                />
              )}
            </div>
            <p className="text-[11px] text-center text-muted-foreground">
              {!stats || stats.totalToday === 0
                ? "Use inhaler to start tracking risk"
                : riskScore >= 75 ? "⚠️ Seek medical attention"
                  : riskScore >= 50 ? "Monitor symptoms closely"
                    : riskScore >= 25 ? "Elevated — stay alert"
                      : "Within safe range"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Stats Cards ──────────────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Uses Today */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Uses Today</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Activity className="h-4 w-4 text-primary" aria-hidden="true" />
            </div>
          </CardHeader>
          <CardContent>
            {statsLoading ? <Skeleton className="h-9 w-16" /> : (
              <div className="text-3xl font-bold tabular-nums">{stats?.totalToday ?? 0}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {(stats?.totalToday ?? 0) >= 6 ? "⚠️ Above recommended limit" : "Within normal range"}
            </p>
          </CardContent>
        </Card>

        {/* Last Usage */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Last Usage</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Clock className="h-4 w-4 text-blue-500" aria-hidden="true" />
            </div>
          </CardHeader>
          <CardContent>
            {statsLoading ? <Skeleton className="h-9 w-24" /> : (
              <div className="text-3xl font-bold">{stats?.lastUsageTime ?? "None"}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Most recent dose</p>
          </CardContent>
        </Card>

        {/* Alerts Today */}
        <Card className="relative overflow-hidden">
          <div className={`absolute inset-0 bg-gradient-to-br pointer-events-none ${(stats?.alertsTriggeredToday ?? 0) > 0 ? "from-destructive/5 to-transparent" : "from-emerald-500/5 to-transparent"}`} />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Alerts Today</CardTitle>
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${(stats?.alertsTriggeredToday ?? 0) > 0 ? "bg-destructive/10" : "bg-emerald-500/10"}`}>
              <AlertCircle className={`h-4 w-4 ${(stats?.alertsTriggeredToday ?? 0) > 0 ? "text-destructive" : "text-emerald-500"}`} aria-hidden="true" />
            </div>
          </CardHeader>
          <CardContent>
            {statsLoading ? <Skeleton className="h-9 w-12" /> : (
              <div className={`text-3xl font-bold tabular-nums ${(stats?.alertsTriggeredToday ?? 0) > 0 ? "text-destructive" : ""}`}>
                {stats?.alertsTriggeredToday ?? 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {(stats?.alertsTriggeredToday ?? 0) > 0 ? "Review alerts for details" : "No alerts triggered"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── AI Insights Card ─────────────────────────────────────────────── */}
      <Card className="relative overflow-hidden border-primary/20">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-blue-500/5 pointer-events-none" />
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Brain className="h-4 w-4 text-primary" aria-hidden="true" />
            </div>
            AI Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!insights ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* vs Yesterday */}
              <div className="rounded-xl bg-muted/50 p-3 space-y-1">
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">vs Yesterday</p>
                <div className="flex items-center gap-1">
                  {insights.vsYesterdayPct === null ? (
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  ) : insights.vsYesterdayPct > 0 ? (
                    <ArrowUp className="h-4 w-4 text-destructive" />
                  ) : insights.vsYesterdayPct < 0 ? (
                    <ArrowDown className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className={`text-lg font-bold tabular-nums ${insights.vsYesterdayPct !== null && insights.vsYesterdayPct > 0 ? "text-destructive" : insights.vsYesterdayPct !== null && insights.vsYesterdayPct < 0 ? "text-emerald-600" : ""}`}>
                    {insights.vsYesterdayPct !== null ? `${Math.abs(insights.vsYesterdayPct)}%` : "—"}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-tight">{insights.vsYesterdayLabel}</p>
              </div>

              {/* Avg Daily */}
              <div className="rounded-xl bg-muted/50 p-3 space-y-1">
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">7-Day Avg</p>
                <div className="flex items-center gap-1">
                  <BarChart2 className="h-4 w-4 text-primary" aria-hidden="true" />
                  <span className="text-lg font-bold tabular-nums">{insights.avgDailyUsage}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">doses/day</p>
              </div>

              {/* Peak Time */}
              <div className="rounded-xl bg-muted/50 p-3 space-y-1">
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Peak Time</p>
                <div className="flex items-center gap-1">
                  <Zap className="h-4 w-4 text-amber-500" aria-hidden="true" />
                  <span className="text-lg font-bold">{insights.peakUsageTime ?? "—"}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">busiest hour today</p>
              </div>

              {/* Alert Trend */}
              <div className="rounded-xl bg-muted/50 p-3 space-y-1">
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Alert Trend</p>
                <div className="flex items-center gap-1">
                  {insights.alertTrend === "improving" ? (
                    <TrendingDown className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                  ) : insights.alertTrend === "worsening" ? (
                    <TrendingUp className="h-4 w-4 text-destructive" aria-hidden="true" />
                  ) : (
                    <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  )}
                  <span className={`text-lg font-bold capitalize ${insights.alertTrend === "improving" ? "text-emerald-600" : insights.alertTrend === "worsening" ? "text-destructive" : ""}`}>
                    {insights.alertTrend}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">{insights.weekAlertCount} alerts this week</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Recent Activity ───────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Recent Activity</h2>
          <Link href="/history" className="text-sm font-medium text-primary hover:underline">
            View all
          </Link>
        </div>

        <Card>
          <div className="divide-y">
            {logsLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-4 flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              ))
            ) : !logs || logs.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No usage logged today. Press the button above to record your first dose.
              </div>
            ) : (
              logs.slice(0, 5).map((log) => (
                <div
                  key={log.id}
                  className={`p-4 flex items-center justify-between hover:bg-muted/40 transition-colors ${getSeverityRing(log.severity)}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${log.alert ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                      <Wind className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{log.time}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        {new Date(log.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        {log.riskScore !== undefined && log.riskScore > 0 && (
                          <span className={`font-medium ${log.riskScore >= 75 ? "text-destructive" : log.riskScore >= 50 ? "text-amber-500" : "text-muted-foreground"}`}>
                            · Risk: {log.riskScore}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    {getStrengthBadge(log.strength)}
                    {log.alert && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                        {log.alertType === "attack_risk" ? "⚠️ Attack Risk" : "Alert"}
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
