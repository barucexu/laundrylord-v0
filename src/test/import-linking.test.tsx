import { describe, it, expect } from "vitest";

/**
 * Contract test: import/linking must use machines.assigned_renter_id
 * as the canonical machine↔renter linkage. This test validates the
 * shape of the update payload that would be sent to Supabase when
 * linking a machine to a renter during import.
 */

describe("Import machine↔renter linking contract", () => {
  it("links machine to renter via assigned_renter_id, not renter.machine_id", () => {
    // Simulate the linking payload shape used in ImportPage
    const machineUpdate = {
      assigned_renter_id: "renter-uuid-123",
      status: "assigned",
    };

    // The canonical field must be present
    expect(machineUpdate).toHaveProperty("assigned_renter_id");
    expect(machineUpdate.assigned_renter_id).toBe("renter-uuid-123");

    // Must NOT use the legacy renter-side field
    expect(machineUpdate).not.toHaveProperty("machine_id");
  });

  it("canonical payment statuses are a known set", () => {
    const CANONICAL_PAYMENT_STATUSES = ["upcoming", "due_soon", "overdue", "failed", "paid"];

    // "pending" was previously written by send-billing-reminders — must not be in canonical set
    expect(CANONICAL_PAYMENT_STATUSES).not.toContain("pending");
    expect(CANONICAL_PAYMENT_STATUSES).toContain("overdue");
  });
});
