
Do I know what the issue is? Yes.

What’s wrong right now
- This is not RLS and not plan-gating. The logs show a PostgreSQL `23514` check-constraint failure on `renters_status_check`.
- In `src/pages/ImportPage.tsx`, the importer currently:
  - copies the mapped spreadsheet value directly into `record.status` (`getMappedRecord`)
  - never normalizes renter status in `parseRenterRecord`
  - inserts that raw value as-is in `handleImport`
- `applyInsertDefaults()` only fills `status: "lead"` when status is blank, so it does nothing when the sheet already contains a status.
- Your uploaded XLSX maps `Customer Status` to renter status, and that sheet contains values like `Active` and `Former Customer`.
- The database only accepts canonical internal renter statuses: `lead`, `scheduled`, `active`, `late`, `maintenance`, `termination_requested`, `pickup_scheduled`, `closed`, `defaulted`, `archived`.
- So:
  - `Active` fails because the check is case-sensitive
  - `Former Customer` fails because it is not a valid internal status at all
- That explains why all 47 rows failed together.
- Preview still looks “Ready” because the current row classification only checks `empty / has_data / likely_duplicate`. It does not validate or sanitize constrained values, so preview and insert are out of sync.

Smallest safe fix
1. Keep the new preview / duplicate-review UI.
2. Do not loosen the database constraint. The rest of the app already uses the canonical internal status set, so changing the DB to accept external labels would create contract drift.
3. Add one shared normalization step that runs before both preview and insert:
   - renter status examples:
     - `Active` -> `active`
     - `Former Customer` -> `archived`
     - known synonyms -> matching internal status
     - unknown status text -> remove the invalid status and let the default `lead` apply, with a visible warning
4. Use that same normalized record in preview and in `handleImport`, so a row marked “Ready” is actually insertable.
5. Show row warnings in preview for transformed values, for example:
   - `Status normalized: Former Customer -> archived`
   - `Unrecognized status "X" -> using lead`
6. Improve the done-state error messaging so the first real DB error is surfaced in the UI if anything still fails.

Files to change
- `src/pages/ImportPage.tsx`
  - add a tiny `normalizeImportedRecord()` helper
  - call it during row classification
  - store normalized warnings/results per row
  - import the normalized record instead of rebuilding a different one later
- `src/utils/import/types.ts`
  - extend `ClassifiedRow` with normalized warnings and/or prepared record fields so preview/import truly share one path

Edge cases I would harden in the same pass
- Machine import should get the same treatment for constrained values so the next blanket failure doesn’t happen there:
  - machine `status` -> `available | assigned | maintenance | retired`
  - machine `prong` -> `3-prong | 4-prong`, otherwise `null`
  - machine `type` normalize obvious washer/dryer variants if that DB constraint still applies
- Blank status should keep working via existing defaults.
- Unknown external labels should warn, not hard-fail the whole batch.

Why this is the right fix
- It fixes the actual blocker shown in the logs.
- It preserves the UI you like.
- It keeps the database and app contracts clean.
- It removes the current preview/import contradiction without redesigning the importer again.

Manual QA after implementation
- Re-import the same XLSX with `Customer Status` mapped:
  - `Active` rows import
  - `Former Customer` rows import
  - no `renters_status_check` errors
- Confirm preview shows normalization warnings before import.
- Confirm duplicate review behavior is unchanged.
- Confirm skipping the status column still imports renters with default `lead`.
- Smoke-test one machine import with odd status/prong labels to make sure raw constrained text no longer causes a blanket failure.
