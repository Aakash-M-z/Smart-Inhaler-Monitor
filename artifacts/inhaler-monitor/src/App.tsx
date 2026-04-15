/**
 * Root application component for the Smart Inhaler Monitor.
 *
 * Sets up:
 *   - ThemeProvider: persists dark/light mode preference in localStorage
 *   - QueryClientProvider: manages all API data fetching and caching
 *   - TooltipProvider: enables tooltip components throughout the app
 *   - WouterRouter: client-side routing with BASE_URL support
 *
 * Routes:
 *   /         → Dashboard (usage button + stats)
 *   /history  → Usage history log + hourly chart
 *   /alerts   → Edge AI alert history
 *
 * This system simulates Edge AI locally.
 * In real-world implementation, TensorFlow Lite can be used for on-device inference.
 */
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { ThemeProvider } from "@/components/theme-provider";
import { Layout } from "@/components/layout";
import { Dashboard } from "@/pages/dashboard";
import { History } from "@/pages/history";
import { Alerts } from "@/pages/alerts";

// Configure React Query with sensible defaults for a medical monitoring app:
// - staleTime: 30s — data is considered fresh for 30 seconds
// - retry: 2 — retry failed requests twice before showing an error
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
    },
  },
});

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/history" component={History} />
        <Route path="/alerts" component={Alerts} />
        {/* Catch-all 404 route */}
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="aerosense-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          {/* WouterRouter supports sub-path deployments via BASE_URL */}
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          {/* Global toast notification container */}
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
