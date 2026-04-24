import { describe, expect, it } from "vitest";
import { getSingleAssignedMachineId, isActiveMaintenanceLog, sortMaintenanceLogs } from "@/lib/maintenance";
import type { MachineRow, MaintenanceRow } from "@/hooks/useSupabaseData";

function machine(id: string, assigned_renter_id: string | null): Pick<MachineRow, "id" | "assigned_renter_id"> {
  return { id, assigned_renter_id };
}

function maintenance(overrides: Partial<MaintenanceRow>): MaintenanceRow {
  return {
    id: "maintenance-1",
    user_id: "user-1",
    renter_id: "renter-1",
    machine_id: null,
    issue_category: "leak",
    description: "",
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

describe("maintenance helpers", () => {
  it("prefills no machine when the renter has zero assigned machines", () => {
    expect(getSingleAssignedMachineId("renter-1", [machine("machine-1", null)])).toBeNull();
  });

  it("prefills exactly one assigned machine from machines.assigned_renter_id", () => {
    expect(getSingleAssignedMachineId("renter-1", [machine("machine-1", "renter-1")])).toBe("machine-1");
  });

  it("prefills no machine when the renter has multiple assigned machines", () => {
    expect(
      getSingleAssignedMachineId("renter-1", [
        machine("machine-1", "renter-1"),
        machine("machine-2", "renter-1"),
      ]),
    ).toBeNull();
  });

  it("treats archived maintenance logs as inactive", () => {
    expect(isActiveMaintenanceLog(maintenance({ archived_at: null }))).toBe(true);
    expect(isActiveMaintenanceLog(maintenance({ archived_at: "2026-04-02T00:00:00.000Z" }))).toBe(false);
  });

  it("sorts open statuses before resolved logs", () => {
    const sorted = sortMaintenanceLogs([
      maintenance({ id: "resolved", status: "resolved", reported_date: "2026-04-03" }),
      maintenance({ id: "reported", status: "reported", reported_date: "2026-04-01" }),
      maintenance({ id: "progress", status: "in_progress", reported_date: "2026-04-02" }),
    ]);

    expect(sorted.map((log) => log.id)).toEqual(["reported", "progress", "resolved"]);
  });
});
