import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import RenterDetail from "@/pages/RenterDetail";

vi.mock("@/hooks/useSupabaseData", () => ({
  useRenter: () => ({
    data: {
      id: "renter-1",
      name: "Miriam Tejeda",
      status: "closed",
      phone: "(206) 510-9597",
      email: "miriam@example.com",
      address: "23641 20th Ave S E104, Des Moines, WA 98198",
      lease_start_date: null,
      min_term_end_date: null,
      monthly_rate: 150,
      rent_collected: 0,
      balance: 210,
      next_due_date: null,
      paid_through_date: null,
      late_fee: 25,
      install_fee: 75,
      install_fee_collected: false,
      deposit_amount: 0,
      deposit_collected: false,
      has_payment_method: true,
      stripe_subscription_id: "sub_stale_after_failed_start",
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
  usePaymentsForRenter: () => ({
    data: [
      {
        id: "payment-1",
        payment_source: "stripe",
        status: "failed",
        payment_notes: "Starting payment failed while autopay was activating",
        type: "payment",
        due_date: "2026-04-18",
        created_at: "2026-04-18T14:00:00.000Z",
        amount: 210,
      },
    ],
    isLoading: false,
  }),
  useRenterBalanceAdjustments: () => ({
    data: [
      { id: "adj-1", description: "First payment", amount: 140 },
      { id: "adj-2", description: "Deposit", amount: 70 },
    ],
    isLoading: false,
  }),
  useAddRenterBalanceAdjustment: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRemoveRenterBalanceAdjustment: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useOperatorSettings: () => ({ data: { public_slug: "demo-operator" }, isLoading: false }),
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

describe("RenterDetail failed autopay start state", () => {
  it("keeps a failed start out of active autopay while keeping retry and balance edits available", async () => {
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

    expect(screen.getByText("Autopay not activated. Starting payment failed.")).toBeInTheDocument();
    expect(screen.queryByText("Autopay Active")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /start autopay and charge current balance/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add item/i })).toBeInTheDocument();
    expect(screen.getByText("Current balance items")).toBeInTheDocument();
  });
});
