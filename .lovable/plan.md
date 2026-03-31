

# Plan: Simplified Import (Single-Entity, Full Preview, Operator-Controlled Dedup) + DB Ownership Clarity

## Overview

Rewrite ImportPage.tsx from ~848 lines to ~600 lines. Remove combined mode entirely. Add full-row preview with pagination, a duplicate-review step, and remove all required-field blocking. Add DB migration for nullable columns + ownership views.

---

## A) Database Migration

**New migration file:** `supabase/migrations/<timestamp>_import_nullable_and_ownership.sql`

1. **Relax NOT NULL constraints** on identity columns:
   - `ALTER TABLE renters ALTER COLUMN name DROP NOT NULL;`
   - `ALTER TABLE machines ALTER COLUMN type DROP NOT NULL;`
   - `ALTER TABLE machines ALTER COLUMN model DROP NOT NULL;`
   - `ALTER TABLE machines ALTER COLUMN serial DROP NOT NULL;`

2. **Add `owner_email` to `operator_settings`** (if not exists):
   - `ALTER TABLE operator_settings ADD COLUMN IF NOT EXISTS owner_email text;`
   - Backfill: `UPDATE operator_settings SET owner_email = u.email FROM auth.users u WHERE u.id = operator_settings.user_id AND operator_settings.owner_email IS NULL;`

3. **Create debug views** (with RLS-compatible security definer functions or simple views):
   ```sql
   CREATE OR REPLACE VIEW v_renters_with_owner AS
   SELECT r.*, os.owner_email, os.business_name
   FROM renters r
   LEFT JOIN operator_settings os ON os.user_id = r.user_id;

   CREATE OR REPLACE VIEW v_machines_with_owner AS
   SELECT m.*, os.owner_email, os.business_name
   FROM machines m
   LEFT JOIN operator_settings os ON os.user_id = m.user_id;
   ```

---

## B) Type Changes

**File: `src/utils/import/types.ts`**

- Remove `"combined"` from `ImportMode` → `"customers" | "machines"`
- Add row classification type:
  ```ts
  export type RowStatus = "empty" | "has_data" | "likely_duplicate";
  export type ClassifiedRow = {
    index: number;
    status: RowStatus;
    record: Record<string, any>;
    duplicateOf?: { id: string; label: string };
    importDecision: "import" | "skip"; // default "import"
  };
  ```

---

## C) Placeholders Simplification

**File: `src/utils/import/placeholders.ts`**

- Keep `applyInsertDefaults` for safe numeric/boolean defaults (monthly_rate, status, etc.)
- **Remove** `checkMinimumData`, `checkMinimumDataForGroup`, `ensureRequiredFields`, `ensureRequiredFieldsForGroup` — no more required-field gating
- Keep `getPlaceholder` for UI display only

---

## D) Fields & Auto-Mapper Cleanup

**File: `src/utils/import/fields.ts`**

- Remove `getCombinedFields()` and `resolveFieldKey()` (no more combined mode)

**File: `src/utils/import/auto-mapper.ts`**

- Remove `autoMapCombined()` export

---

## E) ImportPage.tsx Rewrite

**File: `src/pages/ImportPage.tsx`**

### Steps flow: `upload → map → preview → duplicates → done`

### Upload step:
- **Top-level visible mode selector** (not hidden in Advanced):
  - Two buttons: "Renters" / "Machines" — immediately visible above the drop zone
- Remove the Collapsible/Advanced section entirely

### Map step:
- Same as today but only show renter OR machine fields (never both)

### Preview step (full rows + pagination):
- **Classify all rows** using one shared function:
  ```ts
  classifyRows(rawData, mapping, headers, fields, existingRecords) → ClassifiedRow[]
  ```
  - `empty`: all mapped values are empty/whitespace
  - `likely_duplicate`: matched by email/phone (renters) or serial (machines) against existing DB records
  - `has_data`: everything else
- Fetch existing records once (all renters or all machines for the operator) before classification
- Show **all rows** in a paginated table (25 rows/page) with:
  - Row number, key mapped values, status badge (empty/duplicate/ready)
  - Empty rows shown grayed out with "Will skip" badge
  - Duplicate rows shown with warning badge
- Warnings (non-blocking) for rows missing key info (name for renters, serial for machines)
- "Continue to Import" button (or "Review Duplicates" if any exist)

### Duplicate review step (new):
- Only shown if `likely_duplicate` rows exist
- For each duplicate row, show side-by-side:
  - Incoming data (left)
  - Existing record (right)
- Per-row toggle: "Import anyway" (default) / "Skip"
- "Select All: Import" / "Select All: Skip" bulk buttons
- "Confirm & Import" button
- If user clicks "Skip Review" or goes straight to import, all flagged rows import by default

### Import execution:
- Simple loop: for each non-empty, non-operator-skipped row:
  - `applyInsertDefaults` for safe numeric defaults
  - Insert into `renters` or `machines`
  - If insert fails, count as error
- No dedup logic during insert (already handled in preview/review)
- Plan limit check: count renters created so far, block if over cap

### Done step:
- Clear counts: imported, duplicate-imported, duplicate-skipped, empty-skipped, blocked-by-plan, insert-errors

---

## Files Changed

| File | Change |
|------|--------|
| `supabase/migrations/…` | Relax NOT NULL on name/type/model/serial; add owner_email; create views |
| `src/utils/import/types.ts` | Remove "combined"; add ClassifiedRow types |
| `src/utils/import/fields.ts` | Remove getCombinedFields, resolveFieldKey |
| `src/utils/import/auto-mapper.ts` | Remove autoMapCombined |
| `src/utils/import/placeholders.ts` | Remove checkMinimumData and ensureRequiredFields functions |
| `src/pages/ImportPage.tsx` | Full rewrite: visible mode selector, full preview with pagination, duplicate review step, simplified import loop |

---

## QA Checklist

1. Renters-only import with partial rows (missing name, phone) → imports with warnings, no blocks
2. Machines-only import with partial rows (missing serial) → imports with warnings, no blocks
3. Full preview with 50+ rows → paginated, all visible
4. Duplicate review: skip some, import others → correct counts
5. Skip duplicate review entirely → all flagged rows import
6. Empty rows → auto-skipped, shown grayed in preview
7. Plan limit → blocks renters beyond cap, shows count
8. Query `v_renters_with_owner` and `v_machines_with_owner` → shows owner_email + business_name

