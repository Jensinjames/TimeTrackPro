import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { DateRangeProvider } from "@/hooks/use-date-range";
import { ProtectedRoute } from "@/lib/protected-route";
import { useIsMobile } from "@/hooks/use-mobile";
import HomePage from "@/pages/home-page";
import DashboardPage from "@/pages/dashboard-page";
import AuthPage from "@/pages/auth-page";
// import SettingsPage from "@/pages/settings-page";
import SettingsPage from "@/pages/settings-page-improved";
import HistoryPage from "@/pages/history-page";
import TestAuthPage from "@/pages/test-auth";
import NotFound from "@/pages/not-found";
import Sidebar from "@/components/sidebar";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/test-auth" component={TestAuthPage} />
      <ProtectedRoute path="/" component={DashboardPage} />
      <ProtectedRoute path="/dashboard" component={DashboardPage} />
      <ProtectedRoute path="/settings" component={SettingsPage} />
      <ProtectedRoute path="/history" component={HistoryPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const isMobile = useIsMobile();
  
  // Don't show the sidebar on auth pages
  if (location === "/auth" || location === "/test-auth") {
    return <>{children}</>;
  }
  
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      
      <main className={`flex-1 ${isMobile ? "pt-16" : ""}`}>
        {children}
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <DateRangeProvider>
          <TooltipProvider>
            <Layout>
              <Router />
            </Layout>
            <Toaster />
          </TooltipProvider>
        </DateRangeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
