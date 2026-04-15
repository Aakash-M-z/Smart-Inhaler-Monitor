/**
 * History page — full usage log with hourly chart and trend detection.
 *
 * Features:
 *   - Hourly bar chart with trend indicator (increasing / decreasing / stable)
 *   - Complete usage log with strength badges, risk scores, and alert flags
 *   - Summary stats: total records, alert rate
 *
 * This system simulates Edge AI locally using rule-based inference.
 * In real-world deployment, this would be replaced by a TensorFlow Lite model
 * running on the inhaler device (ESP32 or similar microcontroller).
 */
import { useGetUsageLogs, useGetUsageChart } from "@workspace/api-client-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, TrendingDown, TrendingUp, Minus, Wind } from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

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

function TrendBadge({ trend }: { trend?: string }) {
  if (!trend) return null;
  if (trend === "increasing") {
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-destructive">
        <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
        Increasing
      </span>
    );
  }
  if (trend === "decreasing") {
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
        <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />
        Decreasing
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
      <Minus className="h-3.5 w-3.5" aria-hidden="true" />
      Stable
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HISTORY COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function History() {
  const { data: logs, isLoading: logsLoading, isError: logsError } = useGetUsageLogs();
  const { data: chartResp, isLoading: chartLoading } = useGetUsageChart();

  const chartData = chartResp?.data ?? [];
  const trend = chartResp?.trend;

  // Compute alert rate for summary
  const alertCount = logs?.filter((l) => l.alert).length ?? 0;
  const alertRate = logs && logs.length > 0
    ? Math.round((alertCount / logs.length) * 100)
    : 0;

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Usage History</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Comprehensive log of your inhaler usage and inhalation patterns.
        </p>
      </div>

      {/* ── Summary Strip ────────────────────────────────────────────────── */}
      {!logsLoading && logs && logs.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border bg-card p-3 text-center">
            <div className="text-2xl font-bold tabular-nums">{logs.length}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Total Records</div>
          </div>
          <div className="rounded-xl border bg-card p-3 text-center">
            <div className={`text-2xl font-bold tabular-nums ${alertCount > 0 ? "text-destructive" : "text-emerald-600"}`}>{alertCount}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Alerts Triggered</div>
          </div>
          <div className="rounded-xl border bg-card p-3 text-center">
            <div className={`text-2xl font-bold tabular-nums ${alertRate >= 30 ? "text-destructive" : alertRate >= 15 ? "text-amber-500" : "text-emerald-600"}`}>{alertRate}%</div>
            <div className="text-xs text-muted-foreground mt-0.5">Alert Rate</div>
          </div>
        </div>
      )}

      {/* ── Hourly Chart ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Today's Hourly Usage</CardTitle>
              <CardDescription>Number of doses taken per hour</CardDescription>
            </div>
            <TrendBadge trend={trend} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[240px] w-full">
            {chartLoading ? (
              <Skeleton className="h-full w-full" />
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <XAxis dataKey="hour" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: "rgba(0,0,0,0.04)" }}
                    contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.12)", fontSize: "13px" }}
                    formatter={(value: number) => [`${value} dose${value !== 1 ? "s" : ""}`, "Usage"]}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={44}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.count >= 3 ? "hsl(var(--destructive))" : entry.count >= 2 ? "hsl(38 92% 50%)" : "hsl(var(--primary))"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                No usage data for today yet.
              </div>
            )}
          </div>
          {/* Chart legend */}
          <div className="flex items-center gap-4 mt-3 justify-center text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-primary inline-block" />1 dose</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-amber-500 inline-block" />2 doses</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-destructive inline-block" />3+ doses</span>
          </div>
        </CardContent>
      </Card>

      {/* ── Full Usage Log ────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>All Records</CardTitle>
          <CardDescription>
            {!logsLoading && logs
              ? `${logs.length} total record${logs.length !== 1 ? "s" : ""}`
              : "Loading..."}
          </CardDescription>
        </CardHeader>
        <div className="divide-y border-t">
          {logsLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4 flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            ))
          ) : logsError ? (
            <div className="p-8 flex flex-col items-center justify-center text-center gap-3">
              <AlertCircle className="h-8 w-8 text-destructive" aria-hidden="true" />
              <p className="font-medium">Failed to load usage logs</p>
              <p className="text-sm text-muted-foreground">Make sure the backend is running on port 5000.</p>
            </div>
          ) : !logs || logs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No usage logs found. Press "Use Inhaler" on the dashboard to record your first dose.
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${log.alert ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                    <Wind className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="font-medium text-sm flex items-center gap-2">
                      {log.time}
                      <span className="text-xs text-muted-foreground font-normal hidden sm:inline-block">
                        {new Date(log.timestamp).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground sm:hidden">
                        {new Date(log.timestamp).toLocaleDateString()}
                      </span>
                      {/* Risk score inline */}
                      {log.riskScore !== undefined && log.riskScore > 0 && (
                        <span className={`text-[11px] font-medium ${log.riskScore >= 75 ? "text-destructive" : log.riskScore >= 50 ? "text-amber-500" : "text-muted-foreground"}`}>
                          Risk: {log.riskScore}/100
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center sm:justify-end gap-2 sm:w-auto">
                  {getStrengthBadge(log.strength)}
                  {log.alert && (
                    <Badge variant="destructive" className="text-xs">
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
  );
}
