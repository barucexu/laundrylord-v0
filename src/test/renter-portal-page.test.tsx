import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RenterPortal from "@/pages/RenterPortal";

const { invokeMock, locationAssignMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
  locationAssignMock: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: invokeMock },
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("RenterPortal", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    locationAssignMock.mockReset();
    vi.stubGlobal("location", {
      ...window.location,
      assign: locationAssignMock,
    });
  });

  it("loads summary through the renter-portal function and shows portal-only billing details", async () => {
    invokeMock.mockResolvedValueOnce({
      data: {
        renter_name: "Maria Santos",
        balance: 182.5,
        next_due_date: "2026-05-15",
        autopay_status: "pending",
        has_payment_method: true,
        payment_updates_available: true,
        expires_at: "2026-05-08T12:00:00.000Z",
      },
      error: null,
    });

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/portal/token-123"]}>
          <Routes>
            <Route path="/portal/:token" element={<RenterPortal />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await screen.findByText("Renter Portal");

    expect(invokeMock).toHaveBeenCalledWith("renter-portal", {
      body: { action: "summary", token: "token-123" },
    });
    expect(screen.getByText("$182.50")).toBeInTheDocument();
    expect(screen.getByText("May 15, 2026")).toBeInTheDocument();
    expect(screen.getByText("Autopay pending")).toBeInTheDocument();
    expect(screen.getByText("On file")).toBeInTheDocument();
  });

  it("opens a Stripe update session through the renter-portal function", async () => {
    invokeMock
      .mockResolvedValueOnce({
        data: {
          renter_name: "Maria Santos",
          balance: 20,
          next_due_date: "2026-05-15",
          autopay_status: "active",
          has_payment_method: true,
          payment_updates_available: true,
          expires_at: "2026-05-08T12:00:00.000Z",
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { url: "https://checkout.stripe.com/setup/session_123" },
        error: null,
      });

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/portal/token-123"]}>
          <Routes>
            <Route path="/portal/:token" element={<RenterPortal />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await screen.findByText("Renter Portal");
    fireEvent.click(screen.getByRole("button", { name: /update payment method/i }));

    await waitFor(() => {
      expect(invokeMock).toHaveBeenLastCalledWith("renter-portal", {
        body: { action: "update-payment-method", token: "token-123" },
      });
      expect(locationAssignMock).toHaveBeenCalledWith("https://checkout.stripe.com/setup/session_123");
    });
  });
});
