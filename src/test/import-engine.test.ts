import { describe, expect, it, vi } from "vitest";
import { MACHINE_FIELDS, RENTER_FIELDS } from "@/utils/import/fields";
import { classifyImportRows, executeImport, getPreviewStatus, toggleRowDeleted } from "@/utils/import/engine";

describe("import engine", () => {
  it("skips only fully empty rows and still keeps unknown-only rows for review", () => {
    const rows = classifyImportRows({
      headers: ["Name", "Referral Source"],
      rows: [["Alice", ""], ["", "cousin"], ["", ""]],
      mapping: { name: "Name" },
      fields: RENTER_FIELDS,
      mode: "renters",
    });

    expect(getPreviewStatus(rows[0])).toBe("ready");
    expect(getPreviewStatus(rows[1])).toBe("review_needed");
    expect(rows[1].record.notes).toBe("Imported extras: Referral Source: cousin");
    expect(getPreviewStatus(rows[2])).toBe("skipped_empty");
  });

  it("captures unknown columns and invalid typed values in one imported extras block", () => {
    const [row] = classifyImportRows({
      headers: ["Name", "Notes", "Referral Source", "Lease Start Date", "Monthly Rate"],
      rows: [["Alice", "Existing note", "cousin", "George", "abc"]],
      mapping: {
        name: "Name",
        notes: "Notes",
        lease_start_date: "Lease Start Date",
        monthly_rate: "Monthly Rate",
      },
      fields: RENTER_FIELDS,
      mode: "renters",
    });

    expect(row.record.lease_start_date).toBeNull();
    expect(row.record.monthly_rate).toBeNull();
    expect(row.record.notes).toBe(
      "Existing note\n\nImported extras: Lease Start Date (raw): George | Monthly Rate (raw): abc | Referral Source: cousin",
    );
  });

  it("normalizes machine enums to DB-safe lowercase values", () => {
    const [row] = classifyImportRows({
      headers: ["Type", "Model", "Serial #", "Status"],
      rows: [["Washer", "Speed Queen", "SQ-1", "In Use"]],
      mapping: {
        type: "Type",
        model: "Model",
        serial: "Serial #",
        status: "Status",
      },
      fields: MACHINE_FIELDS,
      mode: "machines",
    });

    expect(row.record.type).toBe("washer");
    expect(row.record.status).toBe("assigned");
    expect(getPreviewStatus(row)).toBe("ready");
  });

  it("attempts sparse machine rows and marks them review_needed", async () => {
    const rows = classifyImportRows({
      headers: ["Model"],
      rows: [["Speed Queen"]],
      mapping: { model: "Model" },
      fields: MACHINE_FIELDS,
      mode: "machines",
    });

    const insertRow = vi.fn<(tableName: "renters" | "machines", record: Record<string, unknown>) => Promise<{ error: null }>>(async () => ({ error: null }));
    const { summary, results } = await executeImport({
      rows,
      mode: "machines",
      userId: "user-1",
      renterSlotsAvailable: Number.POSITIVE_INFINITY,
      insertRow,
    });

    expect(getPreviewStatus(rows[0])).toBe("review_needed");
    expect(insertRow).toHaveBeenCalledOnce();
    expect(insertRow.mock.calls[0][1]).toMatchObject({ model: "Speed Queen", user_id: "user-1" });
    expect(summary.imported).toBe(1);
    expect(results[0].status).toBe("imported");
  });

  it("blocks renter rows after the plan cap and records the explicit reason", async () => {
    const rows = classifyImportRows({
      headers: ["Name"],
      rows: [["Alice"], ["Bob"]],
      mapping: { name: "Name" },
      fields: RENTER_FIELDS,
      mode: "renters",
    });

    const insertRow = vi.fn(async () => ({ error: null }));
    const { summary, results } = await executeImport({
      rows,
      mode: "renters",
      userId: "user-1",
      renterSlotsAvailable: 1,
      insertRow,
    });

    expect(insertRow).toHaveBeenCalledOnce();
    expect(summary.imported).toBe(1);
    expect(summary.blocked_by_plan).toBe(1);
    expect(results.map((row) => row.status)).toEqual(["imported", "blocked_by_plan"]);
  });

  it("keeps partial success when one row fails to insert", async () => {
    const rows = classifyImportRows({
      headers: ["Name"],
      rows: [["Alice"], ["Bob"], ["Chris"]],
      mapping: { name: "Name" },
      fields: RENTER_FIELDS,
      mode: "renters",
    });

    const insertRow = vi
      .fn()
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: { message: "insert failed" } })
      .mockResolvedValueOnce({ error: null });

    const { summary, results } = await executeImport({
      rows,
      mode: "renters",
      userId: "user-1",
      renterSlotsAvailable: 10,
      insertRow,
    });

    expect(summary.imported).toBe(2);
    expect(summary.failed_insert).toBe(1);
    expect(summary.firstError).toBe("insert failed");
    expect(results.map((row) => row.status)).toEqual(["imported", "failed_insert", "imported"]);
  });

  it("omits deleted rows from the import payload and counts them separately", async () => {
    const rows = toggleRowDeleted(
      classifyImportRows({
        headers: ["Name"],
        rows: [["Alice"], ["Bob"]],
        mapping: { name: "Name" },
        fields: RENTER_FIELDS,
        mode: "renters",
      }),
      0,
    );

    const insertRow = vi.fn<(tableName: "renters" | "machines", record: Record<string, unknown>) => Promise<{ error: null }>>(async () => ({ error: null }));
    const { summary } = await executeImport({
      rows,
      mode: "renters",
      userId: "user-1",
      renterSlotsAvailable: 10,
      insertRow,
    });

    expect(insertRow).toHaveBeenCalledOnce();
    expect(insertRow.mock.calls[0][1]).toMatchObject({ name: "Bob", user_id: "user-1" });
    expect(summary.deleted_by_operator).toBe(1);
    expect(summary.imported).toBe(1);
  });
});
