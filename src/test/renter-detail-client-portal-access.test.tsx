import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RenterDetail from "@/pages/RenterDetail";

const { invokeMock, clipboardWriteTextMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
  clipboardWriteTextMock: vi.fn(),
}));

vi.mock("@/hooks/useSupabaseData", () => ({
  useRenter: () => ({
    data: {
      id: "renter-1",
      name: "Maria Santos",
      status: "active",
      phone: "(555) 555-5555",
      email: "maria@example.com",
      address: "123 Main St",
      lease_start_date: "2026-04-01",
      min_term_end_date: null,
      monthly_rate: 70,
      rent_collected: 0,
      balance: 45,
      next_due_date: "2026-05-15",
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
      dryer_outlet: null,
    },
    isLoading: false,
  }),
  useEntityCustomFields: () => ({ data: [], isLoading: false }),
  useTimelineEvents: () => ({ data: [], isLoading: false }),
  useMaintenanceForRenter: () => ({ data: [], isLoading: false }),
  usePaymentsForRenter: () => ({ data: [], isLoading: false }),
  useRenterBalanceAdjustments: () => ({ data: [], isLoading: false }),
  useOperatorSettings: () => ({ data: { public_slug: "demo-operator" }, isLoading: false }),
  useStripeConnection: () => ({
    data: {
      connected: true,
      webhook_configured: true,
      renter_billing_ready: true,
    },
    isLoading: false,
  }),
  useUpdateRenter: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useAddRenterBalanceAdjustment: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRemoveRenterBalanceAdjustment: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: invokeMock },
  },
}));

vi.mock("@/components/EditRenterDialog", () => ({
  EditRenterDialog: () => null,
}));

vi.mock("@/components/RecordPaymentDialog", () => ({
  RecordPaymentDialog: () => null,
}));

vi.mock("@/components/RenterMachineAssignments", () => ({
  RenterMachineAssignments: () => null,
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe("RenterDetail client portal access", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    clipboardWriteTextMock.mockReset();
    Object.assign(navigator, {
      clipboard: { writeText: clipboardWriteTextMock },
    });
  });

  it("copies the permanent client portal login plus phone and PIN", async () => {
    invokeMock.mockResolvedValueOnce({
      data: { pin: "123456" },
      error: null,
    });

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
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

    fireEvent.click(screen.getByRole("button", { name: /copy permanent client portal access/i }));

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith("renter-portal-access-admin", {
        body: { renter_id: "renter-1" },
      });
      expect(clipboardWriteTextMock).toHaveBeenCalledWith(
        "http://localhost:3000/o/demo-operator/portal\nPhone: (555) 555-5555\nPIN: 123456",
      );
    });
  });
});
