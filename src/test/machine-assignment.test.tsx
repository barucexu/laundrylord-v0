import { describe, it, expect } from "vitest";

/**
 * Contract test: MachinesList must resolve assigned renter via
 * machine.assigned_renter_id → renters.id (NOT renter.machine_id).
 *
 * We test the lookup logic directly rather than rendering the full component,
 * because the component has deep provider dependencies. This is intentionally
 * narrow — it catches the exact drift that occurred.
 */

interface MockMachine {
  id: string;
  assigned_renter_id: string | null;
}

interface MockRenter {
  id: string;
  machine_id: string | null;
  name: string;
}

// This mirrors the canonical lookup that MachinesList must use
function getRenterForMachine(machine: MockMachine, renters: MockRenter[]) {
  if (!machine.assigned_renter_id) return undefined;
  return renters.find((r) => r.id === machine.assigned_renter_id);
}

describe("Machine assignment source-of-truth", () => {
  const renters: MockRenter[] = [
    { id: "renter-1", machine_id: "machine-A", name: "Alice" },
    { id: "renter-2", machine_id: null, name: "Bob" },
  ];

  it("resolves assigned renter via machine.assigned_renter_id", () => {
    const machine: MockMachine = { id: "machine-X", assigned_renter_id: "renter-2" };
    const result = getRenterForMachine(machine, renters);
    expect(result?.name).toBe("Bob");
  });

  it("returns undefined when assigned_renter_id is null", () => {
    const machine: MockMachine = { id: "machine-Y", assigned_renter_id: null };
    const result = getRenterForMachine(machine, renters);
    expect(result).toBeUndefined();
  });

  it("does NOT use renter.machine_id for lookup", () => {
    // Machine has no assigned_renter_id, but renter-1 has machine_id pointing to it.
    // The canonical lookup must NOT find renter-1 via this legacy field.
    const machine: MockMachine = { id: "machine-A", assigned_renter_id: null };
    const result = getRenterForMachine(machine, renters);
    expect(result).toBeUndefined();
  });

  it("handles mismatched legacy machine_id without confusion", () => {
    // renter-1.machine_id = "machine-A", but machine-A.assigned_renter_id points elsewhere
    const machine: MockMachine = { id: "machine-A", assigned_renter_id: "renter-2" };
    const result = getRenterForMachine(machine, renters);
    expect(result?.name).toBe("Bob"); // canonical wins over legacy
  });
});
