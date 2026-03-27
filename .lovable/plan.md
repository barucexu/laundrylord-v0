these bruce's human-added notes first, override the plan below in parts where it directly conflicts.

add payment method is from free plan to starter, and make it smart to check if there is a payment method at all. This shouldn't show up from tier starter to tier growth and so on because their payment method should already be saved.

lovable's original plan:

# Standardize SaaS Tier System: Expand to 10 Tiers with Consistent Upgrade UX

## Overview

Expand from 6 tiers to 10, create new Stripe products, and standardize all upgrade messaging to say "Upgrade to {tier}" instead of "Add payment method."

## New Tier Structure

```text
Free:       1–10     $0
Starter:    11–24    $29/mo   (exists)
Growth:     25–49    $49/mo   (exists)
Pro:        50–74    $99/mo   (exists)
Scale:      75–99    $129/mo  (exists)
Business:   100–199  $199/mo  (NEW)
Enterprise: 200–399  $299/mo  (NEW)
Portfolio:  400–699  $499/mo  (NEW)
Empire:     700–999  $799/mo  (NEW)
Custom:     1000+    $999/mo  (NEW — was "Let's talk", now a real product)
```

## Step 1: Create 5 New Stripe Products + Prices

Use `stripe--create_stripe_product_and_price` tool to create:

- LaundryLord Business — $199/mo recurring
- LaundryLord Enterprise — $299/mo recurring  
- LaundryLord Portfolio — $499/mo recurring
- LaundryLord Empire — $799/mo recurring
- LaundryLord Ultimate — $999/mo recurring

## Step 2: Update `src/lib/pricing-tiers.ts`

- Replace the 6-tier array with 10 tiers using the new product/price IDs
- Remove `Custom` with `price: -1` — the $999 "Ultimate" tier is now a real purchasable tier
- Add a true "Custom" for 1000+ that says "Let's talk"
- Update `needsSubscription()` to cover `totalRenters > 10` (no upper cap since all paid tiers are real now)

## Step 3: Standardize upgrade messaging — `PlanBanner.tsx`

Replace "Add a payment method to keep things running smoothly" with:

- **Free → paid**: "Upgrade to {tier.name} ({tier.label}) to keep growing."
- **Already subscribed, wrong tier (grew past current tier)**: "Time to upgrade to {tier.name} ({tier.label})."
- Button text: **"Upgrade to {tier.name}"** instead of "Add payment method"
- Keep the "already subscribed" status line and "Custom/Let's talk" contact CTA for 1000+

## Step 4: Update tooltips — `RentersList.tsx` and `MachinesList.tsx`

Match the PlanBanner messaging: "Upgrade to {tier.name} ({tier.label}) to add more renters/machines."

## Step 5: Update `SettingsPage.tsx`

Change button from "Add payment method" to "Upgrade to {tier.name}" for consistency.

## Step 6: Update edge functions

- `**customer-portal/index.ts**`: Add all new product IDs to `SAAS_PRODUCT_IDS`
- `**check-subscription/index.ts**`: No changes needed (it just checks for any active subscription)

## Step 7: Update `PricingCalculator.tsx`

Automatically picks up new tiers from the shared `TIERS` array — no changes needed.

## Files to change


| File                                          | Change                                 |
| --------------------------------------------- | -------------------------------------- |
| `src/lib/pricing-tiers.ts`                    | Expand to 10 tiers with new Stripe IDs |
| `src/components/PlanBanner.tsx`               | "Upgrade to X" messaging + button      |
| `src/pages/RentersList.tsx`                   | Tooltip text update                    |
| `src/pages/MachinesList.tsx`                  | Tooltip text update                    |
| `src/pages/SettingsPage.tsx`                  | Button text update                     |
| `supabase/functions/customer-portal/index.ts` | Add new product IDs                    |
