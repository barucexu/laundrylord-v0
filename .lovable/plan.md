

# Enforce SaaS Tier Limits on Add Renter / Add Machine

## Summary

Switch renter counting from "active only" to **total renters** (all statuses), and disable the "Add Renter" and "Add Machine" buttons when the operator exceeds their paid tier's max. Grant immediate access after checkout but re-check subscription status to catch failed payments.

## Stripe Key Clarification

The SaaS billing (`check-subscription`, `create-checkout`, `customer-portal`) correctly uses the **platform STRIPE_SECRET_KEY** (Bruce's key set as an env var). The operator's own Stripe key (stored in `stripe_keys` table) is only used for renter billing. These are separate — confirmed working as designed.

## Changes

### 1. Count ALL renters, not just active — `src/lib/pricing-tiers.ts`
- Update `getTierForCount` comment to say "total renters"
- `needsSubscription` threshold stays the same (>10 total renters)

### 2. Update `useSubscription.ts`
- Change `activeRenters` to count **all** renters (`renters?.length ?? 0`) instead of filtering by `status === "active"`
- Rename the field to `renterCount` for clarity
- Expose a new computed boolean: `canAddRenter` — true when:
  - Tier is Free and count < 10, OR
  - Tier is paid and `subscribed === true` and count < tier max, OR
  - Still `loading` (give benefit of the doubt during load)
- After checkout completes, trigger an aggressive re-check (poll every 5s for 60s) to detect payment confirmation quickly, then fall back to normal 60s polling

### 3. Disable buttons — `src/pages/RentersList.tsx` and `src/pages/MachinesList.tsx`
- Import `useSubscription` hook
- Disable "Add Renter" / "Add Machine" button when `canAddRenter === false`
- Show a tooltip or small helper text: "Upgrade your plan to add more renters"

### 4. Update `PlanBanner.tsx`
- Use `renterCount` (total) instead of `activeRenters`
- Update copy from "active renters" to "renters"

### 5. Update `SettingsPage.tsx`
- Same rename: display total renter count, not active-only

## What this does NOT change
- No database or schema changes
- No hard paywall — existing renters/machines remain accessible
- Operator's renter billing flows untouched
- Edge functions unchanged (they don't enforce limits)

