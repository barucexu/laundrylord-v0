import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import RenterDetail from "@/pages/RenterDetail";

vi.mock("@/hooks/useSupabaseData", () => ({
  useRenter: () => ({
    data: {
      id: "renter-1",
      name: "Crystal Nocket",
      status: "autopay_pending",
      phone: "(907) 727-4990",
      email: "crystal@example.com",
      address: "2481 Mann Ave B, JBLM, WA 98433",
      lease_start_date: null,
      min_term_end_date: null,
      monthly_rate: 70,
      rent_collected: 0,
      balance: 130,
      next_due_date: "2026-05-18",
      paid_through_date: null,
      late_fee: 25,
      install_fee: 75,
      install_fee_collected: false,
      deposit_amount: 0,
      deposit_collected: false,
      has_payment_method: true,
      stripe_subscription_id: "sub_123",
      notes: null,
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
  useRenterBalanceAdjustments: () => ({
    data: [{ id: "adj-1", description: "First payment", amount: 70 }],
    isLoading: false,
  }),
  useAddRenterBalanceAdjustment: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRemoveRenterBalanceAdjustment: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useStripeConnection: () => ({
    data: {
      connected: true,
      webhook_configured: true,
      renter_billing_ready: true,
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

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe("RenterDetail autopay pending state", () => {
  it("shows persistent pending guidance while freezing balance mutations", async () => {
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

    expect(screen.getAllByText("Autopay Pending")).toHaveLength(2);
    expect(screen.getByText(/Bank payment is still processing. Autopay will activate after confirmation./i)).toBeInTheDocument();
    expect(screen.getByText("Next recurring charge: $70.00 on 2026-05-18")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /update payment method/i })).toBeInTheDocument();
    expect(screen.getByText("First payment")).toBeInTheDocument();
    expect(screen.getByText(/Current balance items are locked while this bank payment is processing./i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add item/i })).toBeDisabled();
    expect(screen.queryByRole("button", { name: /start autopay/i })).not.toBeInTheDocument();
  });
});
