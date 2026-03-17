import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import RentersList from "@/pages/RentersList";
import RenterDetail from "@/pages/RenterDetail";
import MachinesList from "@/pages/MachinesList";
import PaymentsView from "@/pages/PaymentsView";
import MaintenanceView from "@/pages/MaintenanceView";
import SettingsPage from "@/pages/SettingsPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/renters" element={<RentersList />} />
            <Route path="/renters/:id" element={<RenterDetail />} />
            <Route path="/machines" element={<MachinesList />} />
            <Route path="/payments" element={<PaymentsView />} />
            <Route path="/maintenance" element={<MaintenanceView />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
