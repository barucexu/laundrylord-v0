

# Plan: Conservative Import Refinement + Ownership Email Column

## What's wrong now (bugs found during inspection)

1. **Machine type normalization is wrong**: `MACHINE_TYPE_MAP` maps to `"Washer"` / `"Dryer"` but DB constraint requires lowercase `'washer'` / `'dryer'` / `'set'`. Any machine import with type would fail.
2. **Import warnings are noisy**: every row gets verbose text like `Status: "Former Customer" → archived` repeated 47 times.
3. **No way to remove bad rows** before import.
4. **No plan/billing notice** on import page.
5. **No `laundrylord_email`** on renters/machines for debugging ownership.

---

## A) Database Migration

**New migration file**

1. Add `laundrylord_email` column to `renters` and `machines`:
   ```sql
   ALTER TABLE renters ADD COLUMN IF NOT EXISTS laundrylord_email text;
   ALTER TABLE machines ADD COLUMN IF NOT EXISTS laundrylord_email text;
   ```

2. Backfill from auth.users:
   ```sql
   UPDATE renters SET laundrylord_email = u.email 
   FROM auth.users u WHERE u.id = renters.user_id AND renters.laundrylord_email IS NULL;
   
   UPDATE machines SET laundrylord_email = u.email 
   FROM auth.users u WHERE u.id = machines.user_id AND machines.laundrylord_email IS NULL;
   ```

3. Drop the existing `machines_type_check` constraint and re-add it to also allow NULL (it already allows NULL since the column is nullable, but the values need to include the forms we normalize to):
   - Constraint already allows NULL (nullable column). Values `'washer'`, `'dryer'`, `'set'` are correct. No change needed to the constraint itself — we just need to fix the TypeScript normalization map.

---

## B) `src/pages/ImportPage.tsx` — Rewrite normalization + UI

### B1: Generic coercion pipeline (replaces current `normalizeRecord` + `parseRenterRecord` + `parseMachineRecord`)

One function: `prepareRecord(record, mode)` that handles ALL type coercion:

- **Strings**: keep as-is
- **Numbers** (`monthly_rate`, `balance`, `late_fee`, `install_fee`, `deposit_amount`, `cost_basis`): `parseFloat()` or `null` if NaN
- **Booleans** (`install_fee_collected`, `deposit_collected`, `has_payment_method`): normalize `yes/no/true/false/1/0` → boolean, otherwise `null`
- **Dates** (`lease_start_date`, `next_due_date`, `paid_through_date`, `min_term_end_date`): validate parseable date, otherwise `null`
- **Enum: renter status**: lookup in map → match or `null` (let `applyInsertDefaults` fill `"lead"`)
- **Enum: machine status**: lookup in map → match or `null` (let defaults fill `"available"`)
- **Enum: machine type**: lookup in map → match or `null`. **Fix**: map to lowercase `"washer"` / `"dryer"` to match DB constraint
- **Enum: machine prong**: lookup in map → match or `null`

For each field where a value was coerced to `null`, mark that cell in a `nullCells: string[]` array on the `ClassifiedRow` (just the field key).

### B2: Extend `ClassifiedRow` type

```ts
export type ClassifiedRow = {
  index: number;
  status: RowStatus;
  record: Record<string, any>;
  duplicateOf?: { id: string; label: string };
  importDecision: "import" | "skip" | "deleted";  // add "deleted"
  warnings: string[];      // keep but reduce to missing-field only
  nullCells: string[];     // NEW: field keys where value was coerced to null
};
```

### B3: Row-level delete in preview

- Add a small "×" / trash button per row in the preview table
- Clicking it sets `importDecision: "deleted"`
- Deleted rows show as struck-through / grayed with a "Removed" badge
- An "Undo" button restores the row
- Deleted rows are skipped during import (same as empty)

### B4: Replace warning spam with cell-level null indicators

- In preview table cells: if a field key is in `nullCells`, show the cell with a subtle `null` badge (small gray pill) instead of the original invalid value
- Remove verbose per-row warning text like `Status: "Former Customer" → archived`
- Keep only missing-field warnings (e.g., "No name", "No serial #") — these are short
- Add ONE global note above the preview table:
  > "Some values couldn't be mapped and will be stored as empty. You can edit records after import."

### B5: Free-plan and billing notice

Add a notice card at the top of the upload step (below mode selector, above drop zone):

- If free plan: "Free plan includes up to 10 billable renters. Need more? Check Settings first. You can always import later, even one at a time."
- Always (for renter imports): "Imported renters count as billable. Even if archived later, they still count for 30 days."
- Short, one card, not obnoxious.

### B6: Import execution uses prepared record directly

- `handleImport` uses `classified.record` (already prepared/coerced) — no re-parsing
- Add `"deleted"` to skip conditions alongside `"empty"` and operator-skipped duplicates
- Add `deletedCount` to `ImportResult` for the done summary

### B7: Auto-populate `laundrylord_email` on insert

- When building the insert record, include `laundrylord_email: user.email` alongside `user_id: user.id`

---

## C) `src/utils/import/types.ts`

- Add `"deleted"` to `importDecision` union
- Add `nullCells: string[]` to `ClassifiedRow`

---

## Files changed

| File | Change |
|------|--------|
| Migration SQL | Add `laundrylord_email` to renters + machines, backfill |
| `src/utils/import/types.ts` | Add `nullCells`, `"deleted"` decision |
| `src/pages/ImportPage.tsx` | Generic coercion pipeline, fix machine type map to lowercase, row delete, null cell indicators, plan notice, auto-set laundrylord_email |

---

## Not changed

- No changes to fields.ts, auto-mapper.ts, placeholders.ts
- No changes to Stripe billing, plan enforcement logic, or other pages
- No changes to existing DB constraints (they're correct — the bug was in the TypeScript map)

---

## QA Checklist

1. Import XLSX with "Active" / "Former Customer" status → rows import, status normalized correctly
2. Machine import with "Washer" / "Dryer" type → stored as lowercase `washer` / `dryer` (no constraint error)
3. Invalid number in monthly_rate → stored as null, cell shows `null` badge in preview
4. Row delete in preview → row excluded from import, count shown in results
5. Free-plan notice visible on import page for renter imports
6. `laundrylord_email` populated on new renters and machines
7. No verbose warning spam — just cell-level null markers and short missing-field notes

