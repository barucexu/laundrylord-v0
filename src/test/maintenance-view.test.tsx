import { readFileSync } from "node:fs";
import { render } from "@testing-library/react";
import { fireEvent, screen } from "@testing-library/dom";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MaintenanceView from "@/pages/MaintenanceView";
import type { MachineRow, MaintenanceRow, RenterRow } from "@/hooks/useSupabaseData";

const mockArchiveMaintenanceLog = vi.fn();
const mockCreateMaintenanceLog = vi.fn();
const mockUpdateMaintenanceLog = vi.fn();
let mockLogs: MaintenanceRow[] = [];
let mockRenters: RenterRow[] = [];
let mockMachines: MachineRow[] = [];

vi.mock("@/hooks/useSupabaseData", () => ({
  useMaintenanceLogs: () => ({ data: mockLogs, isLoading: false }),
  useRenters: () => ({ data: mockRenters, isLoading: false }),
  useMachines: () => ({ data: mockMachines, isLoading: false }),
  useCreateMaintenanceLog: () => ({ mutateAsync: mockCreateMaintenanceLog, isPending: false }),
  useUpdateMaintenanceLog: () => ({ mutateAsync: mockUpdateMaintenanceLog, isPending: false }),
  useArchiveMaintenanceLog: () => ({ mutateAsync: mockArchiveMaintenanceLog, isPending: false }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

function renter(overrides: Partial<RenterRow> = {}): RenterRow {
  return {
    id: "renter-1",
    user_id: "user-1",
    name: "Valid Value Wins",
    phone: "555-1001",
    email: null,
    address: null,
    status: "active",
    monthly_rate: 88,
    balance: 0,
    days_late: 0,
    deposit_amount: 150,
    deposit_collected: false,
    dryer_outlet: null,
    has_payment_method: false,
    install_fee: 100,
    install_fee_collected: false,
    install_notes: null,
    language: null,
    late_fee: 30,
    laundrylord_email: null,
    lease_start_date: null,
    machine_id: "legacy-machine-id",
    min_term_end_date: null,
    next_due_date: null,
    notes: null,
    paid_through_date: null,
    rent_collected: 0,
    secondary_contact: null,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    archived_at: null,
    billable_until: null,
    created_at: "2026-04-01T00:00:00.000Z",
    updated_at: "2026-04-01T00:00:00.000Z",
    ...overrides,
  };
}

function machine(overrides: Partial<MachineRow> = {}): MachineRow {
  return {
    id: "machine-1",
    user_id: "user-1",
    type: "washer",
    model: "Speed Queen",
    serial: "SQ-1",
    status: "assigned",
    assigned_renter_id: "renter-1",
    condition: null,
    cost_basis: null,
    prong: null,
    sourced_from: null,
    notes: null,
    laundrylord_email: null,
    created_at: "2026-04-01T00:00:00.000Z",
    updated_at: "2026-04-01T00:00:00.000Z",
    ...overrides,
  };
}

function maintenance(overrides: Partial<MaintenanceRow> = {}): MaintenanceRow {
  return {
    id: "maintenance-1",
    user_id: "user-1",
    renter_id: "renter-1",
    machine_id: "machine-1",
    issue_category: "leak",
    description: "Water leak",
    status: "reported",
    source: "operator",
    archived_at: null,
    reported_date: "2026-04-01",
    resolved_date: null,
    resolution_notes: null,
    cost: null,
    created_at: "2026-04-01T00:00:00.000Z",
    updated_at: "2026-04-01T00:00:00.000Z",
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <MaintenanceView />
    </MemoryRouter>,
  );
}

describe("MaintenanceView", () => {
  beforeEach(() => {
    mockArchiveMaintenanceLog.mockReset();
    mockCreateMaintenanceLog.mockReset();
    mockUpdateMaintenanceLog.mockReset();
    mockArchiveMaintenanceLog.mockResolvedValue(maintenance({ archived_at: "2026-04-02T00:00:00.000Z" }));
    mockCreateMaintenanceLog.mockResolvedValue(maintenance());
    mockUpdateMaintenanceLog.mockResolvedValue(maintenance());
    mockRenters = [renter()];
    mockMachines = [machine()];
    mockLogs = [maintenance()];
  });

  it("renders active maintenance rows with renter and assigned machine details", () => {
    renderPage();

    expect(screen.getAllByText("Valid Value Wins").length).toBeGreaterThan(0);
    expect(screen.getByText("SQ-1")).toBeInTheDocument();
    expect(screen.getByText("Water leak")).toBeInTheDocument();
  });

  it("archives a maintenance row through the hook", async () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Archive leak" }));

    expect(mockArchiveMaintenanceLog).toHaveBeenCalledWith({ id: "maintenance-1" });
  });

  it("does not use legacy renters.machine_id for maintenance machine behavior", () => {
    const source = readFileSync(`${process.cwd()}/src/pages/MaintenanceView.tsx`, "utf8");

    expect(source).not.toContain("renter.machine_id");
    expect(source).toContain("getSingleAssignedMachineId");
  });
});
