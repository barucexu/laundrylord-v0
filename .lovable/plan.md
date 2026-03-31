

# Plan: Fix Import Dedup False Matches + Skipped Rows

## Two bugs

### Bug 1: "47 matched existing" is false — placeholder dedup poisoning

**Root cause**: `ensureRequiredFields` runs BEFORE `findExistingRenter` / `findExistingMachine`. It fills empty email with `"No email yet"`, empty phone with `"No phone yet"`, empty serial with `"No serial yet"`. Then the dedup query matches every existing record that also has that placeholder value. One match in the DB causes ALL unmapped-email rows to "match existing."

**Fix** (`src/pages/ImportPage.tsx`): Reorder so `ensureRequiredFields` / `ensureRequiredFieldsForGroup` runs AFTER the dedup check, right before the actual insert. Three code paths need fixing:

1. **Customers-only** (line ~271): move `ensureRequiredFields("customers", record)` to after the `findExistingRenter` check, just before the `supabase.from("renters").insert()` call
2. **Machines-only** (line ~291): move `ensureRequiredFields("machines", record)` to after `findExistingMachine`, just before insert
3. **Combined** (lines ~320, ~345): move `ensureRequiredFieldsForGroup("renter", rRecord)` and `ensureRequiredFieldsForGroup("machine", mRecord)` to after their respective dedup checks, before insert

Additionally, add placeholder guards in `findExistingRenter` and `findExistingMachine` — skip the query if the value is a known placeholder string (`"No email yet"`, `"No phone yet"`, `"No serial yet"`).

### Bug 2: Machine rows all skipped — auto-mapper can't match Konrad's headers

**Root cause**: Konrad's Excel file likely uses column headers that don't match any of the current synonyms (e.g., "Make" instead of "Type", "Serial Number" with different casing/spacing, etc.). The auto-mapper produces an empty mapping → `buildPayload` returns `hasContent: false` for every row → all skipped.

**Fix** (`src/utils/import/auto-mapper.ts` + `src/utils/import/fields.ts`):

1. **Expand machine synonyms** to cover common real-world header names:
   - `type`: add `"make"`, `"appliance"`, `"w/d"`, `"washer dryer"`
   - `model`: add `"model no"`, `"model num"`
   - `serial`: add `"serial no"`, `"serial num"`, `"s/n"`, `"ser"`, `"serial#"`
   - `condition`: add `"cond"`
   - `status`: add `"avail"`, `"in use"`

2. **Also expand renter synonyms** for common variants:
   - `name`: add `"customer"`, `"tenant"`, `"client"`, `"client name"`
   - `phone`: add `"tel"`, `"ph"`, `"contact"`
   - `address`: add `"addr"`, `"delivery address"`, `"install address"`
   - `monthly_rate`: add `"monthly"`, `"mo rate"`, `"rent/mo"`, `"rent mo"`

3. **Add machine error counting** in combined mode — currently machine insert errors only `console.error` without incrementing `res.skipped`. Add `res.skipped++` in the machine insert error path (line ~368).

### Bug 3 (minor): Improve error messaging

When `res.skipped > 0` and total created is 0, the toast should say something more helpful like "All rows were skipped — check that your column mappings are correct" instead of just "0 records, X skipped."

## Files changed

| File | Change |
|------|--------|
| `src/pages/ImportPage.tsx` | Move `ensureRequiredFields` after dedup; add placeholder guards to dedup functions; count machine insert errors in combined mode; improve zero-result messaging |
| `src/utils/import/fields.ts` | Expand synonyms for machine and renter fields to cover real-world header variants |

