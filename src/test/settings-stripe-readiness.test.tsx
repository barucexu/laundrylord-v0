import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import SettingsPage from "@/pages/SettingsPage";

vi.mock("@/hooks/useSupabaseData", () => ({
  useStripeConnection: () => ({
    data: {
      connected: true,
      webhook_configured: false,
      renter_billing_ready: false,
      reason: "webhook_missing",
      account_name: "LaundryLord Operator",
      stripe_livemode: true,
      webhook_url: "https://olbedjfebvbojlahhvpq.supabase.co/functions/v1/stripe-webhook?token=token-123",
    },
    isLoading: false,
  }),
  useOperatorSettings: () => ({ data: null, isLoading: false }),
  useSaveOperatorSettings: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("@/hooks/useSubscription", () => ({
  useSubscription: () => ({
    requiredTier: { name: "Free", price: 0, label: "Free" },
    currentBilledTier: null,
    effectiveTier: { name: "Free", price: 0, label: "Free" },
    capacityTier: { name: "Free", price: 0, label: "Free" },
    nextUpgradeTier: null,
    tier: { name: "Free", price: 0, label: "Free" },
    renterCount: 0,
    activeOperationalCount: 0,
    billableCount: 0,
    subscribed: false,
    loading: false,
    subscriptionEnd: null,
    productId: null,
    canAddRenter: true,
    checkout: vi.fn(),
    manageSubscription: vi.fn(),
    initiateUpgrade: vi.fn(),
    upgradeIntent: null,
    upgradePreview: null,
    upgradePreviewLoading: false,
    confirmUpgrade: vi.fn(),
    cancelUpgrade: vi.fn(),
    refresh: vi.fn(),
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
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe("SettingsPage renter billing readiness", () => {
  it("shows webhook setup as incomplete and renders the operator webhook URL", () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/settings"]}>
          <SettingsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText("Webhook setup incomplete")).toBeInTheDocument();
    expect(screen.getByText("Renter billing ready")).toBeInTheDocument();
    expect(screen.getByDisplayValue("https://olbedjfebvbojlahhvpq.supabase.co/functions/v1/stripe-webhook?token=token-123")).toBeInTheDocument();
    expect(screen.getByText(/renter autopay stays blocked/i)).toBeInTheDocument();
  });
});
