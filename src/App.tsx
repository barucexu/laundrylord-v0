import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import { DemoProvider } from "@/contexts/DemoContext";
import { DemoLayout } from "@/components/DemoLayout";
import Dashboard from "@/pages/Dashboard";
import RentersList from "@/pages/RentersList";
import RenterDetail from "@/pages/RenterDetail";
import MachinesList from "@/pages/MachinesList";
import MachineMapPage from "@/pages/MachineMapPage";
import PaymentsView from "@/pages/PaymentsView";
import MaintenanceView from "@/pages/MaintenanceView";
import MaintenanceArchive from "@/pages/MaintenanceArchive";
import SettingsPage from "@/pages/SettingsPage";
import ImportPage from "@/pages/ImportPage";
import RenterArchive from "@/pages/RenterArchive";
import AuthPage from "@/pages/AuthPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import RenterPortal from "@/pages/RenterPortal";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

/** Shared page routes used by both real and demo modes */
const PAGE_ROUTES = (
  <>
    <Route index element={<Dashboard />} />
    <Route path="renters" element={<RentersList />} />
    <Route path="renters/archive" element={<RenterArchive />} />
    <Route path="renters/:id" element={<RenterDetail />} />
    <Route path="machines" element={<MachinesList />} />
    <Route path="machine-map" element={<MachineMapPage />} />
    <Route path="payments" element={<PaymentsView />} />
    <Route path="maintenance" element={<MaintenanceView />} />
    <Route path="maintenance/archive" element={<MaintenanceArchive />} />
    <Route path="settings" element={<SettingsPage />} />
    <Route path="import" element={<ImportPage />} />
  </>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Auth routes — no demo context needed */}
          <Route path="/auth" element={
            <AuthProvider>
              <AuthPage />
            </AuthProvider>
          } />
          <Route path="/reset-password" element={
            <AuthProvider>
              <ResetPasswordPage />
            </AuthProvider>
          } />
          <Route path="/portal/:token" element={<RenterPortal />} />

          {/* Demo routes — DemoProvider + AuthProvider(isDemo) */}
          <Route path="/demo" element={
            <AuthProvider isDemo>
              <DemoProvider>
                <DemoLayout />
              </DemoProvider>
            </AuthProvider>
          }>
            {PAGE_ROUTES}
          </Route>

          {/* Real authenticated routes */}
          <Route element={
            <AuthProvider>
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            </AuthProvider>
          }>
            {PAGE_ROUTES}
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
