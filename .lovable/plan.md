

# Plan: Immediate Plan Payment, Banner Refresh, Archive Dialog

## Three issues

1. **Plan changes defer payment to next cycle.** `stripe.subscriptions.update` with `proration_behavior: "create_prorations"` creates proration invoice items but doesn't collect immediately. Fix: add `payment_behavior: "pending_if_incomplete"` and create + pay the prorated invoice immediately after update.

2. **PlanBanner shows stale tier after plan change.** When `checkout()` detects `data.updated`, it calls `checkSubscription()` — but the banner reads `upgradeTarget` which derives from `billableCount`, not the subscription product. The banner's "subscribed" path shows `upgradeTarget.name` instead of `currentBilledTier.name`. Fix: banner should show `currentBilledTier` when subscribed.

3. **Archive confirm uses `window.confirm()`** which shows the ugly domain. Fix: replace with a proper `AlertDialog` component.

## Changes

### File 1: `supabase/functions/create-checkout/index.ts`

In the existing subscription update block (lines 102-106), after `stripe.subscriptions.update`:
- Add `invoice_settings: { days_until_due: 0 }` is not needed; instead, after the update call, create an invoice and pay it immediately:
```ts
await stripe.subscriptions.update(saasSubscription.id, {
  items: [{ id: subscriptionItemId, price: price_id }],
  proration_behavior: "always_invoice",
});
```
Using `proration_behavior: "always_invoice"` will immediately generate and finalize an invoice for the prorated amount, charging the customer's default payment method right away.

Actually, the cleanest Stripe approach: use `proration_behavior: "always_invoice"` which creates and immediately finalizes the prorated invoice. But this only auto-charges if the customer has a default payment method. Since these operators already have a payment method on file (they subscribed via checkout), this should work.

### File 2: `src/components/PlanBanner.tsx`

Line 25: change `{upgradeTarget.name} plan` to `{subscription.currentBilledTier.name} plan` when subscribed. Need to destructure `currentBilledTier` from `useSubscription()`.

### File 3: `src/pages/RenterDetail.tsx`

Replace `window.confirm(...)` with a `<AlertDialog>` from the existing UI components. Add state `archiveDialogOpen`, render an `AlertDialog` with:
- Title: "Archive this renter?"
- Description: "Archived renters remain billable for 30 days."
- Cancel / OK buttons
- On confirm: run the existing archive mutation logic.

## Technical details

### Stripe immediate payment
`proration_behavior: "always_invoice"` tells Stripe to immediately generate a finalized invoice for the price difference. Since the customer already has a payment method from their original checkout, Stripe will attempt to charge it immediately. This is the standard approach for mid-cycle upgrades that should be paid now.

### Banner staleness
The banner currently destructures `upgradeTarget` and uses its name for the subscribed state display. After a plan change, `productId` updates via `checkSubscription()`, which updates `currentBilledTier`. The banner should use `currentBilledTier.name` for the subscribed display line.

### Archive dialog
Uses existing `AlertDialog` from `src/components/ui/alert-dialog.tsx`. No new dependencies.

## Files changed

| File | Change |
|------|--------|
| `supabase/functions/create-checkout/index.ts` | Change `proration_behavior` to `"always_invoice"` for immediate charge |
| `src/components/PlanBanner.tsx` | Use `currentBilledTier.name` instead of `upgradeTarget.name` when subscribed |
| `src/pages/RenterDetail.tsx` | Replace `window.confirm` with `AlertDialog` component |

