import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PublicClientPortal from "@/pages/PublicClientPortal";

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

describe("PublicClientPortal", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    window.sessionStorage.clear();
    locationAssignMock.mockReset();
    vi.stubGlobal("location", {
      ...window.location,
      assign: locationAssignMock,
    });
  });

  it("signs in through the public portal edge function and loads renter-scoped maintenance data", async () => {
    invokeMock
      .mockResolvedValueOnce({
        data: { business_name: "Sunbelt Laundry Rentals" },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          session_token: "session-123",
          expires_at: "2026-05-31T00:00:00.000Z",
          renter_name: "Maria Santos",
          business_name: "Sunbelt Laundry Rentals",
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          renter: {
            name: "Maria Santos",
            phone: "(555) 555-5555",
            address: "123 Main St",
            status: "active",
            balance: 182.5,
            next_due_date: "2026-05-15",
            autopay_status: "pending",
            has_payment_method: true,
            payment_updates_available: true,
            portal_payments_available: true,
          },
          operator: { business_name: "Sunbelt Laundry Rentals", public_slug: "sunbelt" },
          maintenance_requests: [],
        },
        error: null,
      });

    render(
      <MemoryRouter initialEntries={["/o/sunbelt/portal"]}>
        <Routes>
          <Route path="/o/:operatorSlug/portal" element={<PublicClientPortal />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Sunbelt Laundry Rentals")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Phone number"), { target: { value: "(555) 555-5555" } });
    fireEvent.change(screen.getByLabelText("PIN"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(invokeMock).toHaveBeenNthCalledWith(2, "public-client-portal", {
        body: {
          action: "login",
          operatorSlug: "sunbelt",
          phone: "(555) 555-5555",
          pin: "123456",
        },
      });
    });

    expect(await screen.findByText("Account overview")).toBeInTheDocument();
    expect(await screen.findByText("Maria Santos")).toBeInTheDocument();
    expect(await screen.findByText("$182.50")).toBeInTheDocument();
    expect(await screen.findByText("May 15, 2026")).toBeInTheDocument();
    expect(await screen.findByText("Autopay pending")).toBeInTheDocument();
    expect(await screen.findByText("On file")).toBeInTheDocument();
    expect(await screen.findByText("No maintenance requests yet.")).toBeInTheDocument();
  });

  it("opens a Stripe payment update session through the permanent client portal", async () => {
    invokeMock
      .mockResolvedValueOnce({
        data: { business_name: "Sunbelt Laundry Rentals" },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          session_token: "session-123",
          expires_at: "2026-05-31T00:00:00.000Z",
          renter_name: "Maria Santos",
          business_name: "Sunbelt Laundry Rentals",
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          renter: {
            name: "Maria Santos",
            phone: "(555) 555-5555",
            address: "123 Main St",
            status: "active",
            balance: 20,
            next_due_date: "2026-05-15",
            autopay_status: "active",
            has_payment_method: true,
            payment_updates_available: true,
            portal_payments_available: true,
          },
          operator: { business_name: "Sunbelt Laundry Rentals", public_slug: "sunbelt" },
          maintenance_requests: [],
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { url: "https://checkout.stripe.com/setup/session_123" },
        error: null,
      });

    render(
      <MemoryRouter initialEntries={["/o/sunbelt/portal"]}>
        <Routes>
          <Route path="/o/:operatorSlug/portal" element={<PublicClientPortal />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(await screen.findByLabelText("Phone number"), { target: { value: "(555) 555-5555" } });
    fireEvent.change(screen.getByLabelText("PIN"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByText("Account overview");

    fireEvent.click(screen.getByRole("button", { name: /update payment method/i }));

    await waitFor(() => {
      expect(invokeMock).toHaveBeenLastCalledWith("public-client-portal", {
        body: { action: "update-payment-method", sessionToken: "session-123" },
      });
      expect(locationAssignMock).toHaveBeenCalledWith("https://checkout.stripe.com/setup/session_123");
    });
  });

  it("lets a renter cancel their own maintenance request from the permanent portal", async () => {
    invokeMock
      .mockResolvedValueOnce({
        data: { business_name: "Sunbelt Laundry Rentals" },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          session_token: "session-123",
          expires_at: "2026-05-31T00:00:00.000Z",
          renter_name: "Maria Santos",
          business_name: "Sunbelt Laundry Rentals",
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          renter: {
            name: "Maria Santos",
            phone: "(555) 555-5555",
            address: "123 Main St",
            status: "active",
            balance: 0,
            next_due_date: "2026-05-15",
            autopay_status: "active",
            has_payment_method: true,
            payment_updates_available: true,
            portal_payments_available: false,
          },
          operator: { business_name: "Sunbelt Laundry Rentals", public_slug: "sunbelt" },
          maintenance_requests: [
            {
              id: "maint-1",
              issue_category: "leak",
              description: "Water pooling under the washer",
              status: "reported",
              reported_date: "2026-04-29",
              resolved_date: null,
              resolution_notes: null,
            },
          ],
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { success: true },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          renter: {
            name: "Maria Santos",
            phone: "(555) 555-5555",
            address: "123 Main St",
            status: "active",
            balance: 0,
            next_due_date: "2026-05-15",
            autopay_status: "active",
            has_payment_method: true,
            payment_updates_available: true,
            portal_payments_available: false,
          },
          operator: { business_name: "Sunbelt Laundry Rentals", public_slug: "sunbelt" },
          maintenance_requests: [
            {
              id: "maint-1",
              issue_category: "leak",
              description: "Water pooling under the washer",
              status: "cancelled",
              reported_date: "2026-04-29",
              resolved_date: null,
              resolution_notes: "Cancelled by renter through the permanent portal.",
            },
          ],
        },
        error: null,
      });

    render(
      <MemoryRouter initialEntries={["/o/sunbelt/portal"]}>
        <Routes>
          <Route path="/o/:operatorSlug/portal" element={<PublicClientPortal />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(await screen.findByLabelText("Phone number"), { target: { value: "(555) 555-5555" } });
    fireEvent.change(screen.getByLabelText("PIN"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByText("Water pooling under the washer");

    fireEvent.click(screen.getByRole("button", { name: /cancel request/i }));

    await waitFor(() => {
      expect(invokeMock).toHaveBeenNthCalledWith(4, "public-client-portal", {
        body: {
          action: "cancel-maintenance",
          sessionToken: "session-123",
          maintenanceId: "maint-1",
        },
      });
    });

    expect(await screen.findByText("Cancelled")).toBeInTheDocument();
    expect(await screen.findByText("Cancelled by renter through the permanent portal.")).toBeInTheDocument();
  });
});
