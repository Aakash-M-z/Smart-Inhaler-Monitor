/**
 * Alerts page — displays all Edge AI-triggered alerts with severity scoring.
 *
 * Alert types and severity:
 *   - attack_risk  → HIGH   — Potential asthma attack warning (red, pulsing)
 *   - rapid_usage  → HIGH   — 3+ uses in 10 minutes (red)
 *   - high_usage   → MEDIUM — 6+ uses today (amber)
 *   - low_strength → LOW    — Improper inhalation technique (amber)
 *
 * Each card shows: type label, severity badge, risk score, message, timestamp.
 *
 * This system simulates Edge AI locally using rule-based inference.
 * In real-world deployment, this would be replaced by a TensorFlow Lite model
 * running on the inhaler device (ESP32 or similar microcontroller).
 */
import { useGetAlerts } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, AlertTriangle, Bell, Clock, ShieldAlert, Zap } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

type AlertType = "high_usage" | "low_strength" | "rapid_usage" | "attack_risk";

interface AlertConfig {
  icon: React.ReactNode;
  borderColor: string;
  bgColor: string;
  badgeVariant: "destructive" | "outline";
  badgeClass: string;
  badgeLabel: string;
  severityLabel: string;
}

function getAlertConfig(type: string, severity?: string): AlertConfig {
  if (type === "attack_risk") {
    return {
      icon: <ShieldAlert className="h-5 w-5 text-destructive" aria-hidden="true" />,
      borderColor: "bg-destructive",
      bgColor: "bg-destructive/10 dark:bg-destructive/20",
      badgeVariant: "destructive",
      badgeClass: "",
      badgeLabel: "Critical",
      severityLabel: "HIGH",
    };
  }
  if (type === "rapid_usage") {
    return {
      icon: <Clock className="h-5 w-5 text-destructive" aria-hidden="true" />,
      borderColor: "bg-destructive",
      bgColor: "bg-destructive/10 dark:bg-destructive/20",
      badgeVariant: "destructive",
      badgeClass: "",
      badgeLabel: "Critical",
      severityLabel: "HIGH",
    };
  }
  if (type === "high_usage") {
    return {
      icon: <AlertCircle className="h-5 w-5 text-amber-500" aria-hidden="true" />,
      borderColor: "bg-amber-500",
      bgColor: "bg-amber-100 dark:bg-amber-500/20",
      badgeVariant: "outline",
      badgeClass: "text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-500/40",
      badgeLabel: "Warning",
      severityLabel: "MEDIUM",
    };
  }
  if (type === "low_strength") {
    return {
      icon: <AlertTriangle className="h-5 w-5 text-amber-500" aria-hidden="true" />,
      borderColor: "bg-amber-500",
      bgColor: "bg-amber-100 dark:bg-amber-500/20",
      badgeVariant: "outline",
      badgeClass: "text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-500/40",
      badgeLabel: "Warning",
      severityLabel: "LOW",
    };
  }
  return {
    icon: <Bell className="h-5 w-5 text-primary" aria-hidden="true" />,
    borderColor: "bg-primary",
    bgColor: "bg-primary/10",
    badgeVariant: "outline",
    badgeClass: "",
    badgeLabel: "Info",
    severityLabel: "LOW",
  };
}

function formatAlertType(type: string): string {
  const labels: Record<string, string> = {
    attack_risk: "⚠️ Potential Asthma Attack",
    rapid_usage: "Rapid Usage Detected",
    high_usage: "High Daily Usage",
    low_strength: "Improper Inhalation Technique",
  };
  return labels[type] ?? type.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function getRiskScoreColor(score?: number): string {
  if (!score) return "text-muted-foreground";
  if (score >= 75) return "text-destructive font-bold";
  if (score >= 50) return "text-amber-500 font-semibold";
  return "text-muted-foreground";
}

// ─────────────────────────────────────────────────────────────────────────────
// ALERTS COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function Alerts() {
  const { data: alerts, isLoading, isError } = useGetAlerts();

  const criticalCount = alerts?.filter((a) => a.type === "attack_risk" || a.type === "rapid_usage").length ?? 0;
  const warningCount = alerts?.filter((a) => a.type === "high_usage" || a.type === "low_strength").length ?? 0;

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Alerts</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Edge AI-triggered notifications about your inhaler usage patterns.
        </p>
      </div>

      {/* ── Summary Strip ────────────────────────────────────────────────── */}
      {!isLoading && !isError && alerts && alerts.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border bg-card p-3 text-center">
            <div className="text-2xl font-bold tabular-nums">{alerts.length}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Total Alerts</div>
          </div>
          <div className="rounded-xl border bg-card p-3 text-center">
            <div className={`text-2xl font-bold tabular-nums ${criticalCount > 0 ? "text-destructive" : ""}`}>{criticalCount}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Critical</div>
          </div>
          <div className="rounded-xl border bg-card p-3 text-center">
            <div className={`text-2xl font-bold tabular-nums ${warningCount > 0 ? "text-amber-500" : ""}`}>{warningCount}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Warnings</div>
          </div>
        </div>
      )}

      {/* ── Critical banner ──────────────────────────────────────────────── */}
      {!isLoading && !isError && criticalCount > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/30 animate-in slide-in-from-top-2 duration-300">
          <Zap className="h-5 w-5 text-destructive shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-destructive">
              {criticalCount} critical alert{criticalCount !== 1 ? "s" : ""} detected
            </p>
            <p className="text-xs text-destructive/80 mt-0.5">
              Your usage pattern indicates a potential risk. Please consult your doctor immediately.
            </p>
          </div>
        </div>
      )}

      {/* ── Warning banner ───────────────────────────────────────────────── */}
      {!isLoading && !isError && criticalCount === 0 && warningCount > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" aria-hidden="true" />
          <p className="text-sm text-amber-800 dark:text-amber-400">
            <span className="font-semibold">{warningCount} warning{warningCount !== 1 ? "s" : ""} recorded.</span>{" "}
            Review the details below and consult your doctor if symptoms persist.
          </p>
        </div>
      )}

      {/* ── Alert List ───────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 sm:p-6 flex items-start gap-4">
                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-1/4" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : isError ? (
          <Card className="border-destructive/30">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
              </div>
              <p className="font-medium">Failed to load alerts</p>
              <p className="text-sm text-muted-foreground mt-1">
                Make sure the backend is running on port 5000.
              </p>
            </CardContent>
          </Card>
        ) : alerts?.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Bell className="h-6 w-6" aria-hidden="true" />
              </div>
              <p className="font-medium text-foreground">No alerts</p>
              <p className="text-sm">Your usage is within normal parameters. Keep it up!</p>
            </CardContent>
          </Card>
        ) : (
          alerts.map((alert) => {
            const cfg = getAlertConfig(alert.type, alert.severity);
            return (
              <Card
                key={alert.id}
                className={`overflow-hidden relative transition-all duration-200 hover:shadow-md ${alert.type === "attack_risk" ? "border-destructive/40" : ""}`}
              >
                {/* Left severity border */}
                <div className={`w-1 absolute left-0 top-0 bottom-0 ${cfg.borderColor} ${alert.type === "attack_risk" ? "animate-pulse" : ""}`} aria-hidden="true" />

                <CardContent className="p-4 sm:p-5 pl-5 sm:pl-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Icon + content */}
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${cfg.bgColor}`}>
                        {cfg.icon}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-semibold text-sm text-foreground">
                            {formatAlertType(alert.type)}
                          </h3>
                          <Badge variant={cfg.badgeVariant} className={`text-xs ${cfg.badgeClass}`}>
                            {cfg.badgeLabel}
                          </Badge>
                          {/* Severity level chip */}
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${cfg.badgeVariant === "destructive" ? "bg-destructive/10 text-destructive" : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"}`}>
                            {cfg.severityLabel}
                          </span>
                          {/* Risk score */}
                          {alert.riskScore !== undefined && alert.riskScore > 0 && (
                            <span className={`text-[11px] ${getRiskScoreColor(alert.riskScore)}`}>
                              Risk: {alert.riskScore}/100
                            </span>
                          )}
                        </div>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          {alert.message}
                        </p>
                      </div>
                    </div>

                    {/* Timestamp */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center text-sm text-muted-foreground border-t sm:border-t-0 pt-3 sm:pt-0 shrink-0 gap-1">
                      <span className="font-medium text-foreground text-sm">{alert.time}</span>
                      <span className="text-xs">
                        {new Date(alert.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
