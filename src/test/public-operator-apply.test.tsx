import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PublicOperatorApply from "@/pages/PublicOperatorApply";

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

describe("PublicOperatorApply", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    invokeMock
      .mockResolvedValueOnce({
        data: {
          business_name: "Sunbelt Laundry Rentals",
          responsibility_template: "Please review these responsibilities.",
          responsibility_version: 1,
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { success: true, application_id: "app-1" },
        error: null,
      });
  });

  it("loads the operator profile and submits a public application through the edge function", async () => {
    render(
      <MemoryRouter initialEntries={["/o/sunbelt/apply"]}>
        <Routes>
          <Route path="/o/:operatorSlug/apply" element={<PublicOperatorApply />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Sunbelt Laundry Rentals")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Jamie Carter" } });
    fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "(555) 222-1111" } });
    fireEvent.change(screen.getByLabelText("Street address"), { target: { value: "123 Main St" } });
    fireEvent.change(screen.getByLabelText("City"), { target: { value: "Austin" } });
    fireEvent.change(screen.getByLabelText("State"), { target: { value: "tx" } });
    fireEvent.change(screen.getByLabelText("ZIP"), { target: { value: "78701" } });
    fireEvent.change(screen.getByLabelText("What floor is the install on?"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Submit application" }));

    await waitFor(() => {
      expect(invokeMock).toHaveBeenLastCalledWith("public-operator-intake", {
        body: expect.objectContaining({
          action: "submit-application",
          operatorSlug: "sunbelt",
          payload: expect.objectContaining({
            full_name: "Jamie Carter",
            floor_number: 2,
            has_elevator: "unknown",
            responsibilities_accepted: true,
            state: "TX",
          }),
        }),
      });
    });

    expect(await screen.findByText("Application received")).toBeInTheDocument();
  });
});
