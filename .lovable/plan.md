

# Plan: Fix Plan Gating After Upgrade + Fix Import Blank Row Bug

## Issue 1: `canAddRenter` stays false after upgrading

**Root cause**: The `canAddRenter` check at line 212-216 uses `tier` (which is `requiredTier`, derived from `billableCount`) — but when `tier.price > 0`, it requires `subscribed && billableCount < effectiveTier.max`. The problem is that `effectiveTier` is `currentBilledTier` when subscribed, and `currentBilledTier` comes from `productId` which is fetched via `checkSubscription()`. After upgrading, the aggressive polling runs every 5 seconds — but the React Query for renters doesn't refetch, so `billableCount` and tier derivations use stale data.

More importantly, the logic `if (tier.price === 0) return billableCount < tier.max` means: at exactly 10 renters, `billableCount` (10) is NOT less than `tier.max` (10), so it returns `false`. The `tier` variable is `requiredTier` = Free tier (max 10). Even after subscribing to Starter (max 24), `tier` still resolves to Free because `billableCount=10` falls in the Free range (1-10). So the check uses Free tier's max (10) instead of Starter's max (24).

**Fix**: The `canAddRenter` logic should use `effectiveTier` (which accounts for subscription) rather than `tier`/`requiredTier`:

```ts
const canAddRenter = (() => {
  if (finalLoading) return false;
  // If subscribed, use the billed tier's max
  if (finalSubscribed) return billableCount < finalEffectiveTier.max;
  // Not subscribed: only free tier is available
  return billableCount < TIERS[0].max;
})();
```

Also, after `checkout()` completes (either `data.updated` or after aggressive polling detects the new subscription), invalidate the `["renters"]` and `["renters", "billable-count"]` queries so counts refresh without a manual page reload.

**File: `src/hooks/useSubscription.ts`**
- Fix `canAddRenter` to use `finalEffectiveTier.max` when subscribed, and the free tier max (10) when not subscribed
- In `checkout()`, after `checkSubscription()` resolves (for `data.updated`), also invalidate relevant React Query keys
- Import `useQueryClient` and call `queryClient.invalidateQueries` for `["renters"]` and `["renters", "billable-count"]` after subscription changes

## Issue 2: Import shows all rows as blank for another user

**Root cause**: The `buildPayload` function at line 152 iterates over `fields` and looks up `mapping[f.key]` to find which CSV column maps to that field. In combined mode, fields use prefixed keys like `renter.status` and `machine.status` for colliding fields, but non-colliding fields use unprefixed keys like `name`, `phone`, `model`, `serial`.

The bug is that the auto-mapper successfully maps CSV headers to field keys, but `buildPayload` filters by `fields` that belong to the group. In combined mode, `renterFields` and `machineFields` are filtered from `activeFields` by `f.group`. The issue: when the user imports in **machines-only** or **customers-only** mode but has file columns that don't match any synonyms, `autoMap` produces an empty mapping. Then `buildPayload` finds no mapped columns → `hasContent = false` for every row → all rows skipped.

But the user said the preview showed data. So the preview worked but the import didn't. Let me re-examine...

Actually, looking more carefully: the user's client imported ~88 machine rows and ~50 renter rows. He probably used "combined" mode. The preview showed data. But import said "50 blank rows."

The most likely bug: the user's CSV has rows where some rows only have machine data (no renter data) and vice versa. In combined mode, if a row has neither renter nor machine content according to the mapping, it's skipped. But the user saw the preview correctly...

Wait — there's a subtler issue. The `buildPayload` checks `const csvCol = mapping[f.key]`. In combined mode, machine fields use keys like `type`, `model`, `serial` (no prefix for non-colliding ones). But `renterFields` filtered from combined mode still have keys like `name`, `phone` — also no prefix. So mapping should work.

Let me think about what could cause ALL rows to appear blank. The `hasContent` flag only becomes `true` if at least one `val` (trimmed cell value) is non-empty. If the mapping object is empty (no fields mapped), then every row would have `hasContent = false`.

The most likely scenario: the user uploaded an XLSX file where the auto-mapper couldn't match any headers. The preview shows raw data but the mapping dropdowns were all set to "—" (unmapped). The user didn't notice this and clicked Import. Since no fields are mapped, `buildPayload` returns `hasContent: false` for every row.

But the user said "they all populated in the data import preview" — this could mean the preview cards showed the raw row data, but the mapped fields were all placeholders. The preview might show rows with placeholder text which could look "populated."

**Fix**: Add a pre-import validation that checks if at least one field is mapped. If the mapping is empty (or has no actual field mappings), show an error toast before attempting import: "No columns are mapped. Please map at least one column to a LaundryLord field before importing."

Also, improve the `hasContent` check messaging — instead of silently skipping and reporting "X skipped," report explicitly that rows were skipped because no fields were mapped.

**File: `src/pages/ImportPage.tsx`**
- Before `handleImport` processes rows, check if `Object.keys(mapping).length === 0` and show a clear error
- After import, if `res.skipped > 0` and total created is 0, show a more descriptive error message mentioning unmapped columns
- Add a visual indicator on the mapping step when no columns are mapped (warning banner)

## Files changed

| File | Change |
|------|--------|
| `src/hooks/useSubscription.ts` | Fix `canAddRenter` to use `effectiveTier.max` when subscribed; invalidate queries after plan change |
| `src/pages/ImportPage.tsx` | Add pre-import validation for empty mappings; improve error messaging for blank-row scenarios |

