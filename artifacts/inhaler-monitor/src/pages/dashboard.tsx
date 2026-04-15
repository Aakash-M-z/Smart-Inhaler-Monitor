import { useState } from "react";
import { 
  useGetStats, 
  useGetUsageLogs, 
  useUseInhaler,
  getGetStatsQueryKey,
  getGetUsageLogsQueryKey,
  getGetAlertsQueryKey,
  getGetUnreadAlertCountQueryKey,
  getGetUsageChartQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Activity, AlertCircle, AlertTriangle, CheckCircle2, Clock, Wind } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export function Dashboard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: stats, isLoading: statsLoading } = useGetStats();
  const { data: logs, isLoading: logsLoading } = useGetUsageLogs();
  const { mutateAsync: useInhaler, isPending: isInhalerPending } = useUseInhaler();

  const [isPressing, setIsPressing] = useState(false);

  const handleUseInhaler = async () => {
    setIsPressing(true);
    try {
      await useInhaler();
      toast({
        title: "Dose Recorded",
        description: "Your inhaler usage has been logged successfully.",
        variant: "default",
      });
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetUsageLogsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetAlertsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetUnreadAlertCountQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetUsageChartQueryKey() });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to record inhaler usage. Please try again.",
        variant: "destructive",
      });
    } finally {
      setTimeout(() => setIsPressing(false), 500); // Keep animation state briefly
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "Good": return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
      case "Warning": return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case "Critical": return <AlertCircle className="h-5 w-5 text-destructive" />;
      default: return <Activity className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "Good": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400";
      case "Warning": return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400";
      case "Critical": return "bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getStrengthBadge = (strength: string) => {
    switch (strength) {
      case "Low": return <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30">Low Strength</Badge>;
      case "Medium": return <Badge variant="outline" className="bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-500/20 dark:text-teal-400 dark:border-teal-500/30">Good Strength</Badge>;
      case "High": return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30">High Strength</Badge>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">Welcome back</h1>
          <p className="text-muted-foreground">Your respiratory health overview for today.</p>
        </div>
        {stats && (
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium ${getStatusColor(stats.status)}`}>
            {getStatusIcon(stats.status)}
            <span>Status: {stats.status}</span>
          </div>
        )}
      </div>

      {/* Hero Section - The Button */}
      <div className="flex flex-col items-center justify-center p-8 sm:p-12 bg-card border rounded-3xl shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center gap-6">
          <Button
            size="lg"
            className={`
              h-40 w-40 sm:h-48 sm:w-48 rounded-full shadow-lg shadow-primary/20 
              text-xl sm:text-2xl font-medium transition-all duration-300 ease-out
              ${isPressing || isInhalerPending ? 'scale-95 bg-primary/90' : 'hover:scale-105 hover:shadow-xl hover:shadow-primary/30'}
            `}
            onClick={handleUseInhaler}
            disabled={isInhalerPending}
          >
            <div className="flex flex-col items-center gap-3">
              <Wind className={`h-10 w-10 sm:h-12 sm:w-12 ${isInhalerPending ? 'animate-pulse' : ''}`} />
              <span>{isInhalerPending ? "Recording..." : "Use Inhaler"}</span>
            </div>
          </Button>
          <p className="text-sm text-muted-foreground font-medium text-center">
            Press to log an immediate dose
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Uses Today</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-3xl font-bold">{stats?.totalToday || 0}</div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Last Usage</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-3xl font-bold">{stats?.lastUsageTime || "None"}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Alerts Today</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className={`text-3xl font-bold ${stats?.alertsTriggeredToday ? 'text-amber-500' : ''}`}>
                {stats?.alertsTriggeredToday || 0}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Logs */}
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
            ) : logs?.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No usage logged today.
              </div>
            ) : (
              logs?.slice(0, 5).map((log) => (
                <div key={log.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <Wind className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-medium">{log.time}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(log.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {getStrengthBadge(log.strength)}
                    {log.alert && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Alert Triggered</Badge>
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
