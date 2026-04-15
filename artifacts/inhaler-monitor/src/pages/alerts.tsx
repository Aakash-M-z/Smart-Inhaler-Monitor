import { useGetAlerts } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, AlertTriangle, Bell, Clock } from "lucide-react";

export function Alerts() {
  const { data: alerts, isLoading } = useGetAlerts();

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "high_usage":
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      case "low_strength":
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case "rapid_usage":
        return <Clock className="h-5 w-5 text-destructive" />;
      default:
        return <Bell className="h-5 w-5 text-primary" />;
    }
  };

  const formatAlertType = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">Alerts</h1>
        <p className="text-muted-foreground">Important notifications about your usage patterns.</p>
      </div>

      <div className="space-y-4">
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
        ) : alerts?.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Bell className="h-6 w-6" />
              </div>
              <p className="font-medium text-foreground">No alerts</p>
              <p className="text-sm">Your usage is within normal parameters.</p>
            </CardContent>
          </Card>
        ) : (
          alerts?.map((alert) => (
            <Card key={alert.id} className="overflow-hidden">
              <div className={`w-1 h-full absolute left-0 top-0 bottom-0 ${alert.type === 'low_strength' ? 'bg-amber-500' : 'bg-destructive'}`} />
              <CardContent className="p-4 sm:p-6 pl-5 sm:pl-7 relative">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${alert.type === 'low_strength' ? 'bg-amber-100 dark:bg-amber-500/20' : 'bg-destructive/10 dark:bg-destructive/20'}`}>
                      {getAlertIcon(alert.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground">{formatAlertType(alert.type)}</h3>
                        <Badge variant={alert.type === 'low_strength' ? 'outline' : 'destructive'} className={alert.type === 'low_strength' ? 'text-amber-600 border-amber-200' : ''}>
                          Alert
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {alert.message}
                      </p>
                    </div>
                  </div>
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center text-sm text-muted-foreground border-t sm:border-t-0 pt-3 sm:pt-0 shrink-0">
                    <span className="font-medium text-foreground">{alert.time}</span>
                    <span>{new Date(alert.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
