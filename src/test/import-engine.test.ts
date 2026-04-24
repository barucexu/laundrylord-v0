import { describe, expect, it, vi } from "vitest";
import { MACHINE_FIELDS, RENTER_FIELDS } from "@/utils/import/fields";
import { classifyImportRows, executeImport, getPreviewStatus, toggleRowDeleted } from "@/utils/import/engine";

function createImportCallbacks() {
  return {
    insertRow: vi.fn(async (_tableName: "renters" | "machines", _record: Record<string, unknown>) => ({
      data: { id: crypto.randomUUID() },
      error: null,
    })),
    ensureCustomFieldDefinition: vi.fn(async ({ key }: { key: string }) => ({
      data: { id: `def-${key}` },
      error: null,
    })),
    upsertCustomFieldValue: vi.fn(async () => ({ error: null })),
  };
}

describe("import engine", () => {
  it("skips only fully empty rows and still keeps custom-column-only rows for review", () => {
    const rows = classifyImportRows({
      headers: ["Name", "Referral Source"],
      rows: [["Alice", ""], ["", "cousin"], ["", ""]],
      mapping: { name: "Name" },
      fields: RENTER_FIELDS,
      mode: "renters",
    });

    expect(getPreviewStatus(rows[0])).toBe("ready");
    expect(getPreviewStatus(rows[1])).toBe("review_needed");
    expect(rows[1].record.notes).toBeUndefined();
    expect(rows[1].customFields).toEqual([{ key: "referral_source", label: "Referral Source", value: "cousin" }]);
    expect(getPreviewStatus(rows[2])).toBe("skipped_empty");
  });

  it("keeps mapped notes intact and preserves custom columns separately", () => {
    const [row] = classifyImportRows({
      headers: ["Name", "Notes", "Referral Source", "Lease Start Date", "Monthly Rate"],
      rows: [["Alice", "Existing note", "cousin", "George", "125"]],
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
    expect(row.record.monthly_rate).toBe(125);
    expect(row.record.notes).toBe("Existing note");
    expect(row.customFields).toEqual([{ key: "referral_source", label: "Referral Source", value: "cousin" }]);
    expect(row.extrasPreview).toEqual(["Lease Start Date (raw): George", "Referral Source: cousin"]);
  });

  it("uses operator settings defaults for blank or unmapped renter financial fields", () => {
    const rows = classifyImportRows({
      headers: ["Name", "Monthly Rate"],
      rows: [["Alice", ""], ["Bob", "80"]],
      mapping: {
        name: "Name",
        monthly_rate: "Monthly Rate",
      },
      fields: RENTER_FIELDS,
      mode: "renters",
      operatorDefaults: {
        default_monthly_rate: 65,
        default_install_fee: 100,
        default_deposit: 150,
        late_fee_amount: 30,
      },
    });

    expect(rows[0].record).toMatchObject({
      monthly_rate: 65,
      install_fee: 100,
      deposit_amount: 150,
      late_fee: 30,
    });
    expect(rows[1].record).toMatchObject({
      monthly_rate: 80,
      install_fee: 100,
      deposit_amount: 150,
      late_fee: 30,
    });
  });

  it("uses operator settings defaults for invalid mapped renter financial values", async () => {
    const rows = classifyImportRows({
      headers: ["Name", "Monthly Rate"],
      rows: [["Alice", "abc"], ["Bob", "75"]],
      mapping: {
        name: "Name",
        monthly_rate: "Monthly Rate",
      },
      fields: RENTER_FIELDS,
      mode: "renters",
      operatorDefaults: {
        default_monthly_rate: 65,
        default_install_fee: 100,
        default_deposit: 150,
        late_fee_amount: 30,
      },
    });

    expect(getPreviewStatus(rows[0])).toBe("review_needed");
    expect(rows[0].warnings).toEqual(["Monthly Rate invalid"]);
    expect(rows[0].record.monthly_rate).toBe(65);

    const callbacks = createImportCallbacks();
    const { summary, results } = await executeImport({
      rows,
      mode: "renters",
      userId: "user-1",
      renterSlotsAvailable: 10,
      ...callbacks,
    });

    expect(callbacks.insertRow).toHaveBeenCalledTimes(2);
    expect(callbacks.insertRow.mock.calls[0][1]).toMatchObject({ name: "Alice", monthly_rate: 65 });
    expect(callbacks.insertRow.mock.calls[1][1]).toMatchObject({ name: "Bob", monthly_rate: 75 });
    expect(summary.imported).toBe(2);
    expect(results.map((row) => row.status)).toEqual(["imported", "imported"]);
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

    const callbacks = createImportCallbacks();
    const { summary, results } = await executeImport({
      rows,
      mode: "machines",
      userId: "user-1",
      renterSlotsAvailable: Number.POSITIVE_INFINITY,
      ...callbacks,
    });

    expect(getPreviewStatus(rows[0])).toBe("review_needed");
    expect(callbacks.insertRow).toHaveBeenCalledOnce();
    expect(callbacks.insertRow.mock.calls[0][1]).toMatchObject({ model: "Speed Queen", user_id: "user-1" });
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

    const callbacks = createImportCallbacks();
    const { summary, results } = await executeImport({
      rows,
      mode: "renters",
      userId: "user-1",
      renterSlotsAvailable: 1,
      ...callbacks,
    });

    expect(callbacks.insertRow).toHaveBeenCalledOnce();
    expect(summary.imported).toBe(1);
    expect(summary.blocked_by_plan).toBe(1);
    expect(results.map((row) => row.status)).toEqual(["imported", "blocked_by_plan"]);
  });

  it("counts invalid-financial fallback rows against plan slots after importing them", async () => {
    const rows = classifyImportRows({
      headers: ["Name", "Monthly Rate"],
      rows: [["Bad Rate", "nope"], ["Alice", "70"], ["Bob", "75"]],
      mapping: {
        name: "Name",
        monthly_rate: "Monthly Rate",
      },
      fields: RENTER_FIELDS,
      mode: "renters",
    });

    const callbacks = createImportCallbacks();
    const { summary, results } = await executeImport({
      rows,
      mode: "renters",
      userId: "user-1",
      renterSlotsAvailable: 1,
      ...callbacks,
    });

    expect(callbacks.insertRow).toHaveBeenCalledOnce();
    expect(callbacks.insertRow.mock.calls[0][1]).toMatchObject({ name: "Bad Rate", monthly_rate: 150 });
    expect(summary.imported).toBe(1);
    expect(summary.blocked_by_plan).toBe(2);
    expect(results.map((row) => row.status)).toEqual(["imported", "blocked_by_plan", "blocked_by_plan"]);
  });

  it("keeps partial success when one row fails to insert", async () => {
    const rows = classifyImportRows({
      headers: ["Name"],
      rows: [["Alice"], ["Bob"], ["Chris"]],
      mapping: { name: "Name" },
      fields: RENTER_FIELDS,
      mode: "renters",
    });

    const callbacks = createImportCallbacks();
    callbacks.insertRow = vi
      .fn()
      .mockResolvedValueOnce({ data: { id: "row-1" }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: "insert failed" } })
      .mockResolvedValueOnce({ data: { id: "row-3" }, error: null });

    const { summary, results } = await executeImport({
      rows,
      mode: "renters",
      userId: "user-1",
      renterSlotsAvailable: 10,
      ...callbacks,
    });

    expect(summary.imported).toBe(2);
    expect(summary.failed_insert).toBe(1);
    expect(summary.firstError).toBe("insert failed");
    expect(results.map((row) => row.status)).toEqual(["imported", "failed_insert", "imported"]);
  });

  it("reclassifies backend plan-limit insert errors and stops inserting later renter rows", async () => {
    const rows = classifyImportRows({
      headers: ["Name"],
      rows: [["Alice"], ["Bob"], ["Chris"]],
      mapping: { name: "Name" },
      fields: RENTER_FIELDS,
      mode: "renters",
    });

    const callbacks = createImportCallbacks();
    callbacks.insertRow = vi
      .fn()
      .mockResolvedValueOnce({ data: { id: "row-1" }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: "Plan limit reached. Subscribe to add more renters." } });

    const { summary, results } = await executeImport({
      rows,
      mode: "renters",
      userId: "user-1",
      renterSlotsAvailable: 10,
      ...callbacks,
    });

    expect(callbacks.insertRow).toHaveBeenCalledTimes(2);
    expect(summary.imported).toBe(1);
    expect(summary.blocked_by_plan).toBe(2);
    expect(summary.failed_insert).toBe(0);
    expect(summary.firstError).toBe("Plan limit reached. Subscribe to add more renters.");
    expect(results.map((row) => row.status)).toEqual(["imported", "blocked_by_plan", "blocked_by_plan"]);
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

    const callbacks = createImportCallbacks();
    const { summary } = await executeImport({
      rows,
      mode: "renters",
      userId: "user-1",
      renterSlotsAvailable: 10,
      ...callbacks,
    });

    expect(callbacks.insertRow).toHaveBeenCalledOnce();
    expect(callbacks.insertRow.mock.calls[0][1]).toMatchObject({ name: "Bob", user_id: "user-1" });
    expect(summary.deleted_by_operator).toBe(1);
    expect(summary.imported).toBe(1);
  });

  it("creates and reuses custom field definitions while writing custom field values", async () => {
    const rows = classifyImportRows({
      headers: ["Name", "Customer ID", "Laundry Room"],
      rows: [
        ["Alice", "201", "Upstairs"],
        ["Bob", "202", "Garage"],
      ],
      mapping: { name: "Name" },
      fields: RENTER_FIELDS,
      mode: "renters",
    });

    const callbacks = createImportCallbacks();

    const { summary, results } = await executeImport({
      rows,
      mode: "renters",
      userId: "user-1",
      renterSlotsAvailable: 10,
      ...callbacks,
    });

    expect(summary.imported).toBe(2);
    expect(results.map((row) => row.status)).toEqual(["imported", "imported"]);
    expect(callbacks.ensureCustomFieldDefinition).toHaveBeenCalledTimes(2);
    expect(callbacks.ensureCustomFieldDefinition).toHaveBeenCalledWith({
      userId: "user-1",
      entityType: "renter",
      key: "customer_id",
      label: "Customer ID",
    });
    expect(callbacks.ensureCustomFieldDefinition).toHaveBeenCalledWith({
      userId: "user-1",
      entityType: "renter",
      key: "laundry_room",
      label: "Laundry Room",
    });
    expect(callbacks.upsertCustomFieldValue).toHaveBeenCalledTimes(4);
  });

  it("does not create custom field value rows for blank custom-column cells", async () => {
    const rows = classifyImportRows({
      headers: ["Name", "Internal Location"],
      rows: [["Washer A", ""]],
      mapping: { name: "Name" },
      fields: RENTER_FIELDS,
      mode: "renters",
    });

    const callbacks = createImportCallbacks();
    await executeImport({
      rows,
      mode: "renters",
      userId: "user-1",
      renterSlotsAvailable: 10,
      ...callbacks,
    });

    expect(callbacks.ensureCustomFieldDefinition).not.toHaveBeenCalled();
    expect(callbacks.upsertCustomFieldValue).not.toHaveBeenCalled();
  });
});
