import { render } from "@testing-library/react";
import { screen } from "@testing-library/dom";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import MaintenanceArchive from "@/pages/MaintenanceArchive";

vi.mock("@/hooks/useSupabaseData", () => ({
  useArchivedMaintenanceLogs: () => ({
    data: [
      {
        id: "maintenance-1",
        renter_id: "renter-1",
        machine_id: "machine-1",
        issue_category: "leak",
        description: "Archived leak",
        status: "resolved",
        archived_at: "2026-04-23T00:00:00.000Z",
      },
    ],
    isLoading: false,
  }),
  useRenters: () => ({ data: [{ id: "renter-1", name: "Maria Santos" }], isLoading: false }),
  useMachines: () => ({ data: [{ id: "machine-1", serial: "WF-2024-1000" }], isLoading: false }),
}));

describe("MaintenanceArchive", () => {
  it("shows archived maintenance issues and links back to maintenance", () => {
    render(
      <MemoryRouter>
        <MaintenanceArchive />
      </MemoryRouter>,
    );

    expect(screen.getByText("Maintenance Archive")).toBeInTheDocument();
    expect(screen.getByText("Back to Maintenance")).toBeInTheDocument();
    expect(screen.getByText("Maria Santos")).toBeInTheDocument();
    expect(screen.getByText("WF-2024-1000")).toBeInTheDocument();
    expect(screen.getByText("Archived leak")).toBeInTheDocument();
  });
});
