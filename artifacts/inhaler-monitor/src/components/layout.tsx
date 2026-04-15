/**
 * Layout component — wraps all pages with the app shell.
 *
 * Structure:
 *   - Top header bar with app logo and dark/light mode toggle
 *   - Side navigation (desktop) / bottom navigation bar (mobile)
 *   - Main content area with max-width constraint
 *
 * The navigation badge on the Alerts link shows the count of recent alerts
 * fetched from the API, giving patients immediate visibility into issues.
 *
 * This system simulates Edge AI locally.
 * In real-world implementation, TensorFlow Lite can be used for on-device inference.
 */
import { Link, useLocation } from "wouter";
import { Bell, Home, List, Moon, Sun, Wind } from "lucide-react";
import { useTheme } from "./theme-provider";
import { useGetUnreadAlertCount } from "@workspace/api-client-react";
import { Button } from "./ui/button";
import type { LucideIcon } from "lucide-react";
import { AIChat } from "./ai-chat";

// ─────────────────────────────────────────────────────────────────────────────
// LAYOUT COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();

  // Fetch unread alert count for the navigation badge
  // This auto-refreshes via React Query's background refetch
  const { data: unreadAlerts } = useGetUnreadAlertCount();
  const alertBadgeCount =
    unreadAlerts && unreadAlerts.count > 0 ? unreadAlerts.count : undefined;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background text-foreground">
      {/* ── Top Header Bar ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b bg-background px-4 shadow-sm sm:gap-x-6 sm:pl-24 sm:pr-6 lg:pl-28 lg:pr-8">
        <div className="flex flex-1 items-center gap-x-4 self-stretch lg:gap-x-6">
          {/* App logo and name */}
          <div className="flex items-center gap-2 font-semibold text-primary" aria-label="AeroSense">
            <Wind className="h-6 w-6" aria-hidden="true" />
            <span className="hidden sm:inline-block text-lg">AeroSense</span>
          </div>

          <div className="flex flex-1" />

          {/* Dark/light mode toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-full"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Moon className="h-5 w-5" aria-hidden="true" />
            )}
          </Button>
        </div>
      </header>

      {/* ── Main Content + Navigation ───────────────────────────────────── */}
      <main className="flex-1 pb-20 sm:pb-0 sm:pl-20">
        {/* Mobile bottom navigation bar */}
        <nav
          className="sm:hidden fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t bg-background/80 backdrop-blur-md px-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]"
          aria-label="Mobile navigation"
        >
          <MobileNavLink href="/" icon={Home} label="Home" active={location === "/"} />
          <MobileNavLink
            href="/history"
            icon={List}
            label="History"
            active={location === "/history"}
          />
          <MobileNavLink
            href="/alerts"
            icon={Bell}
            label="Alerts"
            active={location === "/alerts"}
            badge={alertBadgeCount}
          />
        </nav>

        {/* Desktop side navigation — fixed sidebar, starts below the 64px header */}
        <nav
          className="hidden sm:fixed sm:top-16 sm:left-0 sm:bottom-0 sm:z-50 sm:flex sm:w-20 sm:flex-col sm:items-center sm:border-r sm:bg-background sm:py-6"
          aria-label="Desktop navigation"
        >
          <div className="flex flex-col items-center gap-y-2">
            <DesktopNavLink href="/" icon={Home} label="Dashboard" active={location === "/"} />
            <DesktopNavLink
              href="/history"
              icon={List}
              label="History"
              active={location === "/history"}
            />
            <DesktopNavLink
              href="/alerts"
              icon={Bell}
              label="Alerts"
              active={location === "/alerts"}
              badge={alertBadgeCount}
            />
          </div>
        </nav>

        {/* Page content */}
        <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">{children}</div>
      </main>

      {/* ── Groq AI Health Assistant (floating, all pages) ──────────────── */}
      <AIChat />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NAV LINK COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

interface NavLinkProps {
  href: string;
  icon: LucideIcon;
  label: string;
  active: boolean;
  badge?: number;
}

/**
 * Mobile bottom navigation link with icon, label, and optional badge.
 */
function MobileNavLink({ href, icon: Icon, label, active, badge }: NavLinkProps) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors relative ${active ? "text-primary" : "text-muted-foreground hover:text-foreground"
        }`}
      aria-current={active ? "page" : undefined}
    >
      <div className="relative">
        <Icon className={`h-6 w-6 ${active ? "stroke-[2.5px]" : ""}`} aria-hidden="true" />
        {/* Alert count badge */}
        {badge !== undefined && (
          <span
            className="absolute -right-2 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground"
            aria-label={`${badge} unread alerts`}
          >
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </div>
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
}

/**
 * Desktop side navigation link with icon, tooltip label, and optional badge.
 */
function DesktopNavLink({ href, icon: Icon, label, active, badge }: NavLinkProps) {
  return (
    <Link
      href={href}
      title={label}
      className={`group flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-all relative ${active
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      aria-current={active ? "page" : undefined}
      aria-label={label}
    >
      <div className="relative">
        <Icon className={`h-6 w-6 ${active ? "stroke-[2.5px]" : ""}`} aria-hidden="true" />
        {/* Alert count badge */}
        {badge !== undefined && (
          <span
            className="absolute -right-2 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground"
            aria-label={`${badge} unread alerts`}
          >
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </div>
      <span className="sr-only">{label}</span>
    </Link>
  );
}
