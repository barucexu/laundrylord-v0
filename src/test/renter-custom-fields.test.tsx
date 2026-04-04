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
      email: null,
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
      has_payment_method: false,
      stripe_subscription_id: null,
      notes: "Base note",
      install_notes: "Install note",
      dryer_outlet: "3-prong",
    },
    isLoading: false,
  }),
  useEntityCustomFields: () => ({
    data: [
      { field_definition_id: "field-1", key: "customer_id", label: "Customer ID", value_type: "text", value: "208" },
      { field_definition_id: "field-2", key: "laundry_room", label: "Laundry Room", value_type: "text", value: "Main Level" },
    ],
    isLoading: false,
  }),
  useMachinesForRenter: () => ({ data: [], isLoading: false }),
  useMachines: () => ({ data: [], isLoading: false }),
  useUpdateRenter: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateMachine: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useTimelineEvents: () => ({ data: [], isLoading: false }),
  useMaintenanceForRenter: () => ({ data: [], isLoading: false }),
  usePaymentsForRenter: () => ({ data: [], isLoading: false }),
  useStripeConnection: () => ({ data: { connected: false }, isLoading: false }),
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

describe("RenterDetail custom fields", () => {
  it("renders custom fields separately from notes", async () => {
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

    expect(await screen.findByText("Custom Fields")).toBeInTheDocument();
    expect(screen.getByText("Customer ID")).toBeInTheDocument();
    expect(screen.getByText("208")).toBeInTheDocument();
    expect(screen.getByText("Laundry Room")).toBeInTheDocument();
    expect(screen.getByText("Main Level")).toBeInTheDocument();
    expect(screen.getByText("Notes")).toBeInTheDocument();
    expect(screen.getByText("Base note")).toBeInTheDocument();
  });
});
