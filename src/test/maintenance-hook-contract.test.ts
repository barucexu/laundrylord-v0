import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("maintenance hook contract", () => {
  it("filters archived rows in maintenance hooks and keeps demo mutations in parity", () => {
    const hooksSource = readFileSync(`${process.cwd()}/src/hooks/useSupabaseData.ts`, "utf8");
    const demoSource = readFileSync(`${process.cwd()}/src/contexts/DemoContext.tsx`, "utf8");

    expect(hooksSource).toContain('.is("archived_at", null)');
    expect(hooksSource).toContain("demo.addMaintenanceLog");
    expect(hooksSource).toContain("demo.updateMaintenanceLog");
    expect(hooksSource).toContain("demo.archiveMaintenanceLog");
    expect(demoSource).toContain("addMaintenanceLog");
    expect(demoSource).toContain("updateMaintenanceLog");
    expect(demoSource).toContain("archiveMaintenanceLog");
  });
});
