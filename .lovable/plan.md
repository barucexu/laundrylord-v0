

# Simplified SaaS Pricing — Revised Plan

## Pricing Model (6 tiers, down from 10)

| Tier | Renters | Price |
|------|---------|-------|
| Free | 1–10 | $0 |
| Starter | 11–24 | $29/mo |
| Growth | 25–49 | $49/mo |
| Pro | 50–74 | $99/mo |
| Scale | 75–99 | $129/mo |
| Custom | 100+ | Contact us |

## What Gets Built

### 1. Shared tier logic — `src/lib/pricing-tiers.ts`
- Extract the simplified 6-tier `TIERS` array into a shared module
- Export `getTierForCount(activeRenters)` helper
- Each paid tier includes its Stripe `price_id` (created via Stripe tools)

### 2. Update PricingCalculator
- Import from shared module, remove local `TIERS`
- Grid shrinks from 10 cards to 6 — cleaner, less intimidating
- "Custom" tier copy: "Let's talk" (not "Haven't thought that far")

### 3. Create 4 Stripe products + prices
- Starter ($29), Growth ($49), Pro ($99), Scale ($129) — monthly recurring
- No products needed for Free or Custom tiers

### 4. Three new edge functions

**`check-subscription`** — Looks up operator's subscription status using platform Stripe key. Free-tier operators (≤10 renters) skip Stripe entirely and return `{ tier: "free" }`.

**`create-checkout`** — Creates a Stripe Checkout session for the correct tier based on active renter count. Defaults to ACH-first payment method ordering.

**`customer-portal`** — Returns a Stripe Customer Portal URL so operators can manage billing themselves.

### 5. `src/hooks/useSubscription.ts`
- Calls `check-subscription` on auth change
- Exposes `{ tier, subscribed, loading }`
- Counts active renters via existing `useRenters()`

### 6. `src/components/PlanBanner.tsx` — the gentle nudge
A calm, dismissible banner inside `AppLayout` (above `<Outlet />`). Behavior:

- **≤10 renters**: No banner. Clean experience.
- **11+ renters, already subscribed**: Small subtle badge — "Starter plan · 14 active renters"
- **11+ renters, not subscribed**: Congratulatory milestone message. Example copy: *"Nice — you've grown to 14 renters! Your plan is now Starter ($29/mo). Add a payment method to keep things running smoothly. Bank account is the easiest option."* With a single calm CTA button. Dismissible per session; re-appears if tier changes.

No modals. No lockouts. No blocked features. Just a top banner.

### 7. Settings page — "Your Plan" section
Add a small card to SettingsPage showing current tier, renter count, and a "Manage billing" link (Stripe Customer Portal).

### 8. `AppLayout.tsx`
Render `<PlanBanner />` above `<Outlet />`.

## Files Summary

| Action | File |
|--------|------|
| Create (Stripe) | 4 products + 4 prices |
| Create | `src/lib/pricing-tiers.ts` |
| Create | `src/hooks/useSubscription.ts` |
| Create | `src/components/PlanBanner.tsx` |
| Create | `supabase/functions/check-subscription/index.ts` |
| Create | `supabase/functions/create-checkout/index.ts` |
| Create | `supabase/functions/customer-portal/index.ts` |
| Modify | `src/components/PricingCalculator.tsx` |
| Modify | `src/components/AppLayout.tsx` |
| Modify | `src/pages/SettingsPage.tsx` |

## What this does NOT do
- No hard paywall or feature lockout
- No auto-downgrade logic (keep current tier until next cycle)
- No database schema changes — subscription state lives in Stripe
- Existing renter billing flows completely untouched

