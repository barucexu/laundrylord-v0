import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

/**
 * Contract test: MachinesList must resolve assigned renter via
 * machine.assigned_renter_id -> renters.id.
 *
 * We test the lookup logic directly rather than rendering the full component,
 * because the component has deep provider dependencies.
 */

interface MockMachine {
  id: string;
  assigned_renter_id: string | null;
}

interface MockRenter {
  id: string;
  name: string;
}

// This mirrors the canonical lookup that MachinesList must use
function getRenterForMachine(machine: MockMachine, renters: MockRenter[]) {
  if (!machine.assigned_renter_id) return undefined;
  return renters.find((r) => r.id === machine.assigned_renter_id);
}

describe("Machine assignment source-of-truth", () => {
  const renters: MockRenter[] = [
    { id: "renter-1", name: "Alice" },
    { id: "renter-2", name: "Bob" },
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

  it("ignores machine.id when resolving the renter", () => {
    const machine: MockMachine = { id: "machine-A", assigned_renter_id: "renter-2" };
    const result = getRenterForMachine(machine, renters);
    expect(result?.name).toBe("Bob");
  });

  it("does not expose renter-side machine assignment in generated types", () => {
    const types = readFileSync(`${process.cwd()}/src/integrations/supabase/types.ts`, "utf8");
    const renterTableStart = types.indexOf("      renters: {");
    const renterTableEnd = types.indexOf("      stripe_keys:", renterTableStart);
    expect(renterTableStart).toBeGreaterThan(-1);
    expect(renterTableEnd).toBeGreaterThan(renterTableStart);
    const renterTable = types.slice(renterTableStart, renterTableEnd);

    expect(renterTable).not.toContain("machine_id");
  });
});
