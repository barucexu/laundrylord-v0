import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SettingsPage from "@/pages/SettingsPage";

const refreshSpy = vi.fn();
const toastSuccessSpy = vi.fn();

vi.mock("@/hooks/useSupabaseData", () => ({
  useStripeConnection: () => ({ data: { connected: false }, isLoading: false }),
  useOperatorSettings: () => ({ data: null, isLoading: false }),
  useSaveOperatorSettings: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("@/hooks/useSubscription", () => ({
  useSubscription: () => ({
    requiredTier: { name: "Free", price: 0, label: "Free" },
    currentBilledTier: { name: "Starter", price: 29, label: "$29/mo" },
    effectiveTier: { name: "Starter", price: 29, label: "$29/mo" },
    capacityTier: { name: "Starter", price: 29, label: "$29/mo" },
    nextUpgradeTier: null,
    tier: { name: "Starter", price: 29, label: "$29/mo" },
    renterCount: 10,
    activeOperationalCount: 10,
    billableCount: 10,
    subscribed: true,
    loading: false,
    subscriptionEnd: null,
    productId: "prod_starter",
    canAddRenter: true,
    checkout: vi.fn(),
    manageSubscription: vi.fn(),
    initiateUpgrade: vi.fn(),
    upgradeIntent: null,
    confirmUpgrade: vi.fn(),
    cancelUpgrade: vi.fn(),
    refresh: refreshSpy,
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessSpy(...args),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/settings?subscription=success"]}>
        <Routes>
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("SettingsPage subscription success sync", () => {
  beforeEach(() => {
    refreshSpy.mockReset();
    refreshSpy.mockResolvedValue(undefined);
    toastSuccessSpy.mockReset();
  });

  it("refreshes subscription state immediately after checkout success", async () => {
    renderPage();

    await waitFor(() => {
      expect(refreshSpy).toHaveBeenCalledTimes(1);
    });

    expect(toastSuccessSpy).toHaveBeenCalledWith("Plan updated");
  });
});
