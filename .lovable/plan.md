

# Plan: Fix All Build Errors

There are errors in 6 files stemming from accumulated inconsistencies (duplicate declarations, missing imports, references to non-existent properties). Here's the smallest safe diff for each.

## Files and fixes

### 1. `src/utils/import/placeholders.ts` — 5 errors
- **Duplicate `getPlaceholder`** (lines 17-23 and 75-81): Remove the second duplicate (lines 75-81) which references undefined `RENTER_DEFAULTS`/`MACHINE_DEFAULTS`
- **`defaultVal` undefined** (line 32): Change `record[key] = defaultVal` → `record[key] = placeholder` (matching the destructured variable name)
- **`checkMinimumData` undefined** (line 57): Add a `checkMinimumData` function that validates minimum required fields (renter needs `name`, machine needs `serial` or `type`)
- **`return null` in void function** (line 50): Remove the `return null` from `applyInsertDefaultsForGroup`

### 2. `src/hooks/useSubscription.ts` — 5 errors
- **`useDemo()` undefined** (line 39): Import `useDemo` from `@/contexts/DemoContext` and handle demo mode (return mock Starter subscription when `isDemo`)
- **`upgradeProcessing` undefined** (line 194): Remove it from the return object (it's not in `SubscriptionState` interface and was never declared)
- **Duplicate properties** (lines 196-199): Remove the duplicate `initiateUpgrade`, `upgradeIntent`, `confirmUpgrade`, `cancelUpgrade` entries already present at lines 190-193

### 3. `src/components/PlanBanner.tsx` — 12 errors
- **Destructures `upgradeTarget`/`upgradeProcessing`** from `useSubscription()` but they don't exist on the interface
- **Redeclares `upgradeTarget`** on line 10 using undefined `renterCount`/`tier`
- **References `tier.name`** on line 32 (undefined)
- **Uses `UpgradeConfirmDialog`** without importing it, and passes `tierName`/`tierLabel`/`isUpgrade` which don't exist on `upgradeIntent`

**Fix**: Rewrite to use only valid `useSubscription()` properties. Compute `upgradeTarget` from `getNextUpgradeTierForCount(billableCount)`. Remove the `UpgradeConfirmDialog` block (the dialog is already rendered in RentersList/MachinesList/SettingsPage). Use `effectiveTier` instead of `tier`.

### 4. `src/pages/RentersList.tsx` — 8 errors
- **`billableCount`/`upgradeIntent`/`upgradeProcessing`/`cancelUpgrade`/`confirmUpgrade` undefined**: These aren't destructured from `useSubscription()`
- **`upgradeIntent.tierName`/`tierLabel`/`isUpgrade`** don't exist on the type

**Fix**: Destructure `billableCount`, `upgradeIntent`, `cancelUpgrade`, `confirmUpgrade` from `useSubscription()`. Remove the `UpgradeConfirmDialog` block entirely (upgrade confirmation is handled by the checkout flow directly now — no separate confirm dialog needed from list pages since `checkout()` opens Stripe directly).

### 5. `src/pages/MachinesList.tsx` — 8 errors (same pattern as RentersList)
**Fix**: Same approach — destructure missing properties, remove the orphaned `UpgradeConfirmDialog` block.

### 6. `src/pages/SettingsPage.tsx` — 3 errors
- `upgradeIntent.tierName`, `tierLabel`, `isUpgrade` don't exist; `upgradeProcessing` doesn't exist

**Fix**: Remove the `UpgradeConfirmDialog` block from SettingsPage (lines 508-518). The checkout flow handles this directly.

### 7. `src/pages/ImportPage.tsx` — 2 errors
- `checkMinimumData` is called but not imported

**Fix**: Import `checkMinimumData` from `@/utils/import/placeholders` (it will exist after fix #1). Also the machines-only path (lines 320-349) has duplicate insert logic — the block after line 340 duplicates the insert from line 336. Remove the duplicate block (lines 341-348).

## Summary

| File | Changes |
|------|---------|
| `src/utils/import/placeholders.ts` | Fix `defaultVal` → `placeholder`, add `checkMinimumData`, remove duplicate `getPlaceholder`, remove `return null` |
| `src/hooks/useSubscription.ts` | Import `useDemo`, handle demo mode, remove `upgradeProcessing` and duplicate props |
| `src/components/PlanBanner.tsx` | Rewrite to use valid subscription properties, remove UpgradeConfirmDialog |
| `src/pages/RentersList.tsx` | Destructure missing props, remove UpgradeConfirmDialog block |
| `src/pages/MachinesList.tsx` | Destructure missing props, remove UpgradeConfirmDialog block |
| `src/pages/SettingsPage.tsx` | Remove UpgradeConfirmDialog block |
| `src/pages/ImportPage.tsx` | Import `checkMinimumData`, remove duplicate machine insert block |

