import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import RenterDetail from "@/pages/RenterDetail";

vi.mock("@/hooks/useSupabaseData", () => ({
  useRenter: () => ({
    data: {
      id: "renter-1",
      name: "Aaron de Brie",
      status: "active",
      phone: "(253) 248-5258",
      email: "aaron@example.com",
      address: "10908 Glenwood Dr SW, Lakewood, WA 98498",
      lease_start_date: null,
      min_term_end_date: null,
      monthly_rate: 150,
      rent_collected: 0,
      balance: 0,
      next_due_date: null,
      paid_through_date: null,
      late_fee: 25,
      install_fee: 75,
      install_fee_collected: false,
      deposit_amount: 0,
      deposit_collected: false,
      has_payment_method: true,
      stripe_subscription_id: null,
      notes: "Base note",
      install_notes: null,
      dryer_outlet: "3-prong",
    },
    isLoading: false,
  }),
  useEntityCustomFields: () => ({ data: [], isLoading: false }),
  useMachinesForRenter: () => ({ data: [], isLoading: false }),
  useMachines: () => ({ data: [], isLoading: false }),
  useAssignMachineToRenter: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUnassignMachineFromRenter: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateRenter: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateMachine: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useTimelineEvents: () => ({ data: [], isLoading: false }),
  useMaintenanceForRenter: () => ({ data: [], isLoading: false }),
  usePaymentsForRenter: () => ({ data: [], isLoading: false }),
  useRenterBalanceAdjustments: () => ({ data: [], isLoading: false }),
  useAddRenterBalanceAdjustment: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRemoveRenterBalanceAdjustment: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useStripeConnection: () => ({
    data: {
      connected: true,
      webhook_configured: false,
      renter_billing_ready: false,
    },
    isLoading: false,
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: vi.fn() },
  },
}));

vi.mock("@/components/EditRenterDialog", () => ({
  EditRenterDialog: () => null,
}));

vi.mock("@/components/RecordPaymentDialog", () => ({
  RecordPaymentDialog: () => null,
}));

describe("RenterDetail renter billing readiness", () => {
  it("blocks setup-link and autopay actions until webhook setup is complete", async () => {
    const client = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/renters/renter-1"]}>
          <Routes>
            <Route path="/renters/:id" element={<RenterDetail />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByRole("button", { name: /finish webhook setup/i })).toBeInTheDocument();
    expect(screen.getByText(/renter billing stays blocked/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /start autopay/i })).not.toBeInTheDocument();
  });
});
