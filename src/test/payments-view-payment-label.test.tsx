import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PaymentsView from "@/pages/PaymentsView";

vi.mock("@/hooks/useSupabaseData", () => ({
  usePayments: () => ({
    data: [
      {
        id: "payment-1",
        type: "payment",
        due_date: "2026-04-18",
        paid_date: "2026-04-18",
        payment_source: "stripe",
        amount: 54,
        status: "paid",
      },
    ],
    isLoading: false,
  }),
}));

describe("PaymentsView payment labels", () => {
  it("renders the new payment type as Payment", () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <PaymentsView />
      </QueryClientProvider>,
    );

    expect(screen.getByRole("cell", { name: "Payment" })).toBeInTheDocument();
    expect(screen.queryByRole("cell", { name: "Rent" })).not.toBeInTheDocument();
  });
});
