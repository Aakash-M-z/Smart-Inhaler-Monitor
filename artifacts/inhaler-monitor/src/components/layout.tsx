import { Link, useLocation } from "wouter";
import { Activity, Bell, Home, List, Moon, Sun, Wind } from "lucide-react";
import { useTheme } from "./theme-provider";
import { useGetUnreadAlertCount } from "@workspace/api-client-react";
import { Button } from "./ui/button";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();
  
  const { data: unreadAlerts } = useGetUnreadAlertCount();
  const hasAlerts = unreadAlerts && unreadAlerts.count > 0;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b bg-background px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
        <div className="flex flex-1 items-center gap-x-4 self-stretch lg:gap-x-6">
          <div className="flex items-center gap-2 font-semibold text-primary">
            <Wind className="h-6 w-6" />
            <span className="hidden sm:inline-block text-lg">AeroSense</span>
          </div>
          <div className="flex flex-1" />
          <div className="flex items-center gap-x-4 lg:gap-x-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="rounded-full"
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 pb-20 sm:pb-0 sm:pl-20">
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t bg-background/80 backdrop-blur-md px-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <MobileNavLink href="/" icon={Home} label="Home" active={location === "/"} />
          <MobileNavLink href="/history" icon={List} label="History" active={location === "/history"} />
          <MobileNavLink 
            href="/alerts" 
            icon={Bell} 
            label="Alerts" 
            active={location === "/alerts"} 
            badge={hasAlerts ? unreadAlerts.count : undefined} 
          />
        </div>

        <div className="hidden sm:fixed sm:inset-y-0 sm:left-0 sm:z-50 sm:flex sm:w-20 sm:flex-col sm:border-r sm:bg-background sm:pb-4 sm:pt-20">
          <nav className="mt-8 flex flex-col items-center gap-y-4">
            <DesktopNavLink href="/" icon={Home} label="Dashboard" active={location === "/"} />
            <DesktopNavLink href="/history" icon={List} label="History" active={location === "/history"} />
            <DesktopNavLink 
              href="/alerts" 
              icon={Bell} 
              label="Alerts" 
              active={location === "/alerts"} 
              badge={hasAlerts ? unreadAlerts.count : undefined} 
            />
          </nav>
        </div>

        <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

function MobileNavLink({ href, icon: Icon, label, active, badge }: any) {
  return (
    <Link href={href} className={`flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors relative ${active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
      <div className="relative">
        <Icon className={`h-6 w-6 ${active ? 'stroke-[2.5px]' : ''}`} />
        {badge !== undefined && (
          <span className="absolute -right-2 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
            {badge}
          </span>
        )}
      </div>
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
}

function DesktopNavLink({ href, icon: Icon, label, active, badge }: any) {
  return (
    <Link href={href} className={`group flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-all relative ${active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
      <div className="relative">
        <Icon className={`h-6 w-6 ${active ? 'stroke-[2.5px]' : ''}`} />
        {badge !== undefined && (
          <span className="absolute -right-2 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
            {badge}
          </span>
        )}
      </div>
      <span className="sr-only">{label}</span>
    </Link>
  );
}
