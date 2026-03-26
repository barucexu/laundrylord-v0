

# Smart Combined Import — Default Experience

## Summary

Replace the Customers/Machines tab selector with a default combined import flow. One uploaded file maps against both renter and machine fields simultaneously. Each row creates renter records, machine records, or both — and links them via `assigned_renter_id`. Optional toggles let the operator narrow to customers-only or machines-only.

## Key Schema Facts

- `machines.assigned_renter_id` (uuid, nullable) — already exists for linking
- `machines.status` — set to `"assigned"` when linked
- Both `renters` and `machines` have a `notes` field and a `status` field — need prefixed keys to disambiguate

## Changes

### 1. `src/utils/import/types.ts`

Add `ImportMode` type:
```ts
export type ImportMode = "combined" | "customers" | "machines";
```

### 2. `src/utils/import/fields.ts`

- Add `group: "renter" | "machine"` property to `ImportField` type
- Create `COMBINED_FIELDS` array that merges both sets with prefixed keys for collisions:
  - Renter `notes` → key `renter.notes`, label "Renter Notes"
  - Renter `install_notes` → key `renter.install_notes`, label "Install Notes"
  - Renter `status` → key `renter.status`, label "Renter Status"
  - Machine `notes` → key `machine.notes`, label "Machine Notes"
  - Machine `status` → key `machine.status`, label "Machine Status"
  - All other non-colliding fields keep their original keys
- Export a helper `getCombinedFields()` that returns the merged array
- Keep `RENTER_FIELDS` and `MACHINE_FIELDS` unchanged for single-mode use

### 3. `src/utils/import/auto-mapper.ts`

- Add `autoMapCombined(headers, combinedFields)` that maps against both renter and machine fields using the same normalize+synonym logic
- Uses the prefixed keys so `status` and `notes` columns can map to the correct side
- Export alongside existing `autoMap`

### 4. `src/utils/import/placeholders.ts`

- Add `ensureRequiredFieldsCombined(group, record)` that works with unprefixed DB keys after the mapping has been resolved back to real column names

### 5. `src/pages/ImportPage.tsx` — Major Refactor

**Upload step:**
- Remove the `Tabs` (Customers/Machines) as the primary UI
- Add an optional "Advanced" collapsible or small segmented control below the upload zone: `Default` | `Customers only` | `Machines only`
- Default state: combined mode — no selection required from user
- Store `importMode: ImportMode` state (default `"combined"`)

**Parsing:**
- On file upload, auto-map against `COMBINED_FIELDS` when mode is combined, or the appropriate single set when narrowed
- Same `processFile` flow, just picks the right field set

**Mapping step (combined mode):**
- Show two labeled sections with a visual separator between them:
  - `── Renter Fields ──` with all 18 renter fields
  - `── Machine Fields ──` with all 9 machine fields
- Left header: "LaundryLord's Label"
- Right header: "Your File's Column"  
- All dropdowns share the same `headers` list
- Skip always available
- When mode is customers-only or machines-only, show only that section (current behavior)

**Preview step (combined mode):**
- Replace flat table with card-per-row layout (first 5 rows)
- Each card shows:
  - **Renter Record** section (if renter fields have content): key-value pairs
  - **Machine Record** section (if machine fields have content): key-value pairs
  - **Link Result** line: "Will create renter + machine and link them" / "Renter only" / "Machine only"
- Muted placeholder styling for blank fields, consistent with current behavior

**Import logic (combined mode):**
For each row:
1. Split mapping into renter payload and machine payload using field group
2. Resolve prefixed keys back to real DB column names (`renter.notes` → `notes`, `machine.status` → `status`)
3. Check if renter side has real content, check if machine side has real content
4. If neither → skip
5. **Renter dedup**: if email present → exact match on `renters` where `user_id = auth.uid()`. Else if phone → same. If matched → reuse id, don't insert.
6. **Machine dedup**: if serial present → exact match on `machines` where `user_id = auth.uid()`. If matched → reuse id, don't insert.
7. If renter created/matched AND machine created/matched → set `machine.assigned_renter_id` = renter id, `machine.status` = `"assigned"`
8. If only one side → create/match just that side
9. Parse booleans and numerics same as current logic
10. Apply `ensureRequiredFields` per side

**Done step (combined mode):**
- Show: renters created / matched, machines created / matched, machines linked, rows skipped
- Single-mode summaries stay as-is

## Files Modified

- `src/utils/import/types.ts` — add `ImportMode`, add `group` to `ImportField`
- `src/utils/import/fields.ts` — add `COMBINED_FIELDS`, group property, disambiguation
- `src/utils/import/auto-mapper.ts` — add `autoMapCombined`
- `src/utils/import/placeholders.ts` — minor helper for combined mode
- `src/pages/ImportPage.tsx` — full refactor of UI and import logic

## Files Unchanged

- CSV/XLSX/image parsers — already output `ParsedData`
- Edge function for OCR — unchanged
- No database changes needed

