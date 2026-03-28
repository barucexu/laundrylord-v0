

# Create New Stripe Products + Fix Enforcement Gaps

## Part 1: Create 9 SaaS products on the new Stripe sandbox

Use the `stripe--create_stripe_product_and_price` tool to create all 9 paid tiers as monthly recurring subscriptions:

| Tier | Price |
|------|-------|
| Starter | $29/mo |
| Growth | $49/mo |
| Pro | $99/mo |
| Scale | $129/mo |
| Business | $199/mo |
| Enterprise | $299/mo |
| Portfolio | $499/mo |
| Empire | $799/mo |
| Ultimate | $999/mo |

Then update all three places that reference old Stripe IDs:
- `src/lib/pricing-tiers.ts` — replace all `product_id` and `price_id` values
- `supabase/functions/create-checkout/index.ts` — replace `SAAS_PRODUCT_IDS` set
- `supabase/functions/customer-portal/index.ts` — replace `SAAS_PRODUCT_IDS` array

## Part 2: Close import loophole

**File: `src/pages/ImportPage.tsx`**

- Import `useSubscription` hook
- Before starting the import loop, compute `slotsAvailable = tier.max - renterCount` (using current non-archived count)
- Track `rentersCreatedSoFar` during the loop
- When inserting a new renter, check `rentersCreatedSoFar < slotsAvailable` — if exceeded, increment a new `blockedByPlan` counter instead of inserting
- Show `blockedByPlan` count in the results summary with a message like "X rows blocked by plan limit"
- Machines-only mode is unaffected (machines aren't counted for tier limits)

Add `blockedByPlan` to the `CombinedResult` interface.

## Part 3: Fix loading-state upgrade messaging

**Files: `src/pages/RentersList.tsx`, `src/pages/MachinesList.tsx`**

Currently when `canAddRenter` is false during loading, the popover shows "Upgrade to Starter ($29/mo)" even if the operator is on a higher tier. Fix:

- Destructure `loading` from `useSubscription()`
- When `loading` is true, show a neutral disabled button (no popover, no tier text) — just a spinner or disabled state
- Only render the popover with tier-specific messaging after loading is complete

## Part 4: Consistent tier formatting helper

**File: `src/lib/pricing-tiers.ts`**

Add a small helper:
```ts
export function tierUpgradeLabel(tier: PricingTier): string {
  return `Upgrade to ${tier.name} (${tier.label})`;
}
```

Use it in `RentersList`, `MachinesList`, and `PlanBanner` to avoid copy/paste of formatting logic.

## Files changed

| File | Change |
|------|--------|
| `src/lib/pricing-tiers.ts` | New Stripe IDs + `tierUpgradeLabel` helper |
| `supabase/functions/create-checkout/index.ts` | New `SAAS_PRODUCT_IDS` |
| `supabase/functions/customer-portal/index.ts` | New `SAAS_PRODUCT_IDS` |
| `src/pages/ImportPage.tsx` | Plan limit enforcement + `blockedByPlan` result |
| `src/pages/RentersList.tsx` | Loading-state handling, use `tierUpgradeLabel` |
| `src/pages/MachinesList.tsx` | Loading-state handling, use `tierUpgradeLabel` |
| `src/components/PlanBanner.tsx` | Use `tierUpgradeLabel` |

## QA Checklist

```text
IMPORT ENFORCEMENT
[ ] At 9 renters (Free tier), import file with 3 new renters
    → 1 created, 2 blocked by plan limit
[ ] At 9 renters, import file with machines only → all succeed (no renter limit)
[ ] At 24 renters (Starter, subscribed), import 2 new renters → both blocked
[ ] Results screen shows "X blocked by plan limit" message

LOADING-STATE MESSAGING
[ ] Navigate to /renters — during loading, Add Renter shows disabled (no tier text)
[ ] After load at 10 renters, popover says "Upgrade to Starter ($29/mo)"
[ ] After load at 25 renters, popover says "Upgrade to Growth ($49/mo)"
[ ] Never shows Starter text when tier is actually Growth

ADD RENTER/MACHINE BOUNDARIES
[ ] Free tier: add works at 9, blocked at 10
[ ] Starter subscribed: add works at 23, blocked at 24
[ ] After successful checkout: button re-enables

UPGRADE FLOW
[ ] Popover "Upgrade" button calls checkout()
[ ] PlanBanner "Upgrade" button calls checkout()
[ ] Settings "Upgrade" button calls checkout()
[ ] Already-subscribed operator gets portal redirect (not new checkout)

RENTER BILLING (no regressions)
[ ] Connect Stripe key in Settings still works
[ ] Setup link flow unchanged
[ ] Billing activation unchanged
```

