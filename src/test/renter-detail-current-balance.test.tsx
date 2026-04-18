import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import RenterDetail from "@/pages/RenterDetail";

const removeBalanceAdjustmentSpy = vi.fn();

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
      balance: 250,
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
  useRenterBalanceAdjustments: () => ({
    data: [{ id: "adj-1", description: "First month rent", amount: 150 }],
    isLoading: false,
  }),
  useAddRenterBalanceAdjustment: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRemoveRenterBalanceAdjustment: () => ({ mutateAsync: removeBalanceAdjustmentSpy, isPending: false }),
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
  },
}));

describe("RenterDetail current balance items", () => {
  it("shows first-month guidance and removes pre-autopay items through the mutation hook", async () => {
    removeBalanceAdjustmentSpy.mockReset();
    removeBalanceAdjustmentSpy.mockResolvedValue(undefined);

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

    expect(screen.getByText("Current balance items")).toBeInTheDocument();
    expect(screen.getByText(/If you want to charge first month's rent now/i)).toBeInTheDocument();
    expect(screen.getByText(/Common items: first month rent, install fee, deposit/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /remove first month rent/i }));

    await waitFor(() => {
      expect(removeBalanceAdjustmentSpy).toHaveBeenCalledWith({
        renter_id: "renter-1",
        adjustment_id: "adj-1",
      });
    });
  });
});
