import { useGetUsageLogs, useGetUsageChart } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Wind } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function History() {
  const { data: logs, isLoading: logsLoading } = useGetUsageLogs();
  const { data: chartData, isLoading: chartLoading } = useGetUsageChart();

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
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">Usage History</h1>
        <p className="text-muted-foreground">Comprehensive log of your inhaler usage.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Today's Hourly Usage</CardTitle>
          <CardDescription>Number of doses taken per hour</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] w-full">
            {chartLoading ? (
              <Skeleton className="h-full w-full" />
            ) : chartData && chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis 
                    dataKey="hour" 
                    stroke="#888888" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="#888888" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(value) => `${value}`} 
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(0,0,0,0.05)' }} 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]} 
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                No data available for today.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Records</CardTitle>
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
          ) : logs?.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No usage logs found.
            </div>
          ) : (
            logs?.map((log) => (
              <div key={log.id} className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Wind className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {log.time}
                      <span className="text-xs text-muted-foreground font-normal hidden sm:inline-block">
                        {new Date(log.timestamp).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground sm:hidden">
                      {new Date(log.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center sm:justify-end gap-2 sm:w-1/3">
                  {getStrengthBadge(log.strength)}
                  {log.alert && (
                    <Badge variant="destructive">Alert</Badge>
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
