import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PublicClientPortal from "@/pages/PublicClientPortal";

const { invokeMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
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
          },
          operator: { business_name: "Sunbelt Laundry Rentals" },
          maintenance_requests: [],
        },
        error: null,
      });
  });

  it("signs in through the public portal edge function and loads renter-scoped maintenance data", async () => {
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
    expect(await screen.findByText("No maintenance requests yet.")).toBeInTheDocument();
  });
});
