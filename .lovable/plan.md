

# Refactor Import Data: Excel, Image, Better Mapping, Partial Rows

## Summary

Upgrade the existing import page to support `.xlsx` and image files, improve the mapping UI clarity, expand field coverage to match real schemas, improve auto-mapping with synonym support, and change import behavior to accept partial rows with placeholders instead of skipping them.

## Architecture

```text
src/utils/import/
  ├── types.ts          — ParsedData type ({ headers, rows, sourceType })
  ├── csv-parser.ts     — CSV → ParsedData (wraps existing Papa.parse)
  ├── xlsx-parser.ts    — XLSX → ParsedData (uses xlsx/SheetJS)
  ├── image-parser.ts   — Image → ParsedData (uses Lovable AI OCR)
  ├── auto-mapper.ts    — Smart header→field matching with synonyms
  ├── placeholders.ts   — Placeholder values for blank fields
  └── fields.ts         — RENTER_FIELDS / MACHINE_FIELDS definitions

src/pages/ImportPage.tsx — Refactored to use shared utilities
```

All parsers output the same `ParsedData` shape. The existing mapping → preview → import pipeline stays the same, just consumes this shared type.

## New Dependency

- `xlsx` (SheetJS) — for `.xlsx` parsing in the browser. No server needed.

## Detailed Changes

### 1. `src/utils/import/types.ts`
```ts
type ParsedData = { headers: string[]; rows: string[][]; sourceType: 'csv' | 'xlsx' | 'image' }
type ImportField = { key: string; label: string; placeholder?: string; synonyms?: string[] }
```

### 2. `src/utils/import/fields.ts`
Complete field definitions derived from actual schemas:

**Renter fields** (17 fields):
- name, phone, email, address, dryer_outlet, secondary_contact, language, status, lease_start_date, monthly_rate, late_fee, install_fee, deposit_amount, install_fee_collected, deposit_collected, install_notes, notes, has_payment_method (labeled "Card Set Up but no Autopay")

**Machine fields** (9 fields):
- type, model, serial, prong, condition, status, cost_basis, sourced_from, notes

Each field includes a `synonyms` array and a `placeholder` string for partial-row filling.

### 3. `src/utils/import/csv-parser.ts`
Extract existing Papa.parse logic from ImportPage into `parseCSV(file: File): Promise<ParsedData>`.

### 4. `src/utils/import/xlsx-parser.ts`
`parseXLSX(file: File): Promise<ParsedData>` — reads first sheet, first row as headers, remaining as string rows, drops blank rows.

### 5. `src/utils/import/image-parser.ts`
`parseImage(file: File): Promise<ParsedData>` — uses Lovable AI (Gemini Flash) via edge function to OCR the image and extract tabular data. Returns best-effort parsed headers/rows. On failure, shows a clear toast error and returns null so the rest of the flow is unaffected.

### 6. `src/utils/import/auto-mapper.ts`
`autoMap(csvHeaders: string[], fields: ImportField[]): Record<string, string>`

Matching logic:
1. Normalize both sides: lowercase, strip `_`, spaces, `#`, `$`, `()`, `-`
2. Check exact normalized match against field key
3. Check exact normalized match against each synonym
4. Check if normalized header contains normalized synonym (substring)
5. First match wins; no duplicate column assignments

### 7. `src/utils/import/placeholders.ts`
Defines placeholder values per field key:
- Renters: `name → "No name yet"`, `phone → "No phone yet"`, etc.
- Machines: `type → "No type yet"`, `model → "No model yet"`, etc.
- Numeric fields get schema defaults (monthly_rate → 150, etc.)
- Boolean fields get `false`
- Notes fields remain empty string

### 8. `src/pages/ImportPage.tsx` — Refactored

**Upload zone:**
- Accept `.csv, .xlsx, .png, .jpg, .jpeg`
- Update label: "Drop a CSV, Excel, or image file — or click to browse"
- Route file by extension to the correct parser
- All parsers return `ParsedData` → same `setHeaders` / `setRawData` / `setStep("map")` flow

**Mapping UI (step === "map"):**
- Add two clear column headers above the mapping rows:
  - Left: **"LaundryLord Field"** (muted label, left-aligned)
  - Right: **"Your File's Column"** (muted label, right-aligned)
- Remove `required` asterisks from labels (no more required-field concept)
- If source was image, show a small info note: "Imported from image — check mappings carefully"
- Remove `required` property from field definitions entirely

**Preview (step === "preview"):**
- Show placeholder values in preview cells with muted styling so operator sees what will fill in
- Remove red row highlighting for "required missing"
- If image source, show note: "OCR results may need manual cleanup after import"

**Import logic (`handleImport`):**
- Remove `valid = true / if (f.required && !val) valid = false` gating
- New rule: if a row has zero mapped non-empty values after trimming → skip
- For each field that's mapped but blank → use placeholder from `placeholders.ts`
- For DB-required fields (`name` on renters, `type`/`model`/`serial` on machines), always ensure a placeholder is set
- Numeric parsing and default status logic stays as-is
- Summary text updated: skipped = "fully blank rows"

### 9. Edge function for image OCR

**`supabase/functions/parse-image-table/index.ts`**
- Accepts image as base64 in request body
- Calls Lovable AI (Gemini 2.5 Flash) with prompt: "Extract any table from this image. Return JSON with `headers` (string array) and `rows` (array of string arrays). If no table found, return `{headers:[], rows:[]}`."
- Returns parsed JSON
- Handles errors gracefully

## Files Created
- `src/utils/import/types.ts`
- `src/utils/import/fields.ts`
- `src/utils/import/csv-parser.ts`
- `src/utils/import/xlsx-parser.ts`
- `src/utils/import/image-parser.ts`
- `src/utils/import/auto-mapper.ts`
- `src/utils/import/placeholders.ts`
- `supabase/functions/parse-image-table/index.ts`

## Files Modified
- `src/pages/ImportPage.tsx` — refactored to use utilities
- `package.json` — add `xlsx` dependency

## No Database Changes

No migrations needed. All changes are frontend + one new edge function.

