

# Current State Assessment & Recommendation

## 1. Current State Summary

The SaaS billing enforcement system is **functionally complete** across these layers:

| Layer | Status | Location |
|-------|--------|----------|
| Pricing tiers (10 tiers, Free–$999) | Clean | `src/lib/pricing-tiers.ts` — single source of truth |
| Stripe products + prices | Created | All 9 paid tiers have real Stripe product/price IDs |
| Subscription check (edge fn) | Working | `check-subscription/index.ts` — uses platform `STRIPE_SECRET_KEY` |
| Checkout (edge fn) | Working | `create-checkout/index.ts` — takes `price_id`, creates session |
| Customer portal (edge fn) | Working | `customer-portal/index.ts` — has `SAAS_PRODUCT_IDS` filter |
| Frontend hook | Working | `useSubscription.ts` — returns `canAddRenter`, `checkout()`, `tier`, etc. |
| Hard-stop on Add Renter | Working | Dialog checks `canAddRenter` at submit; button disabled while loading |
| Hard-stop on Add Machine | Working | Same pattern |
| Upgrade popover (renters + machines) | Working | Shows tier name + checkout button |
| PlanBanner | Working | Shows upgrade CTA or subscribed status line |
| Settings plan card | Working | Shows tier, manage/upgrade button |
| Archive (DB constraint) | Done | `archived` added to CHECK constraint |
| Archive query filtering | Done | `useRenters()` excludes archived; `useArchivedRenters()` shows them |
| Archive UI | Done | `/renters/archive` route, "View Archive" link, StatusBadge styling |
| Renter billing (operator Stripe key) | Untouched | Separate edge functions use operator's key from `stripe_keys` table |

## 2. What Is Messy / Risky Right Now

**Low-risk issues (cosmetic/minor):**
- `PlanBanner` has its own `handleCheckout` with a dynamic import of supabase client instead of using the `checkout()` from `useSubscription`. Duplicated checkout logic.
- `customer-portal` declares `SAAS_PRODUCT_IDS` but doesn't actually use them to filter portal visibility — they're just a comment/reference. Stripe portal config is done in the Stripe Dashboard, not in code.
- `useSubscription` counts ALL renters (`renters?.length`) but `useRenters()` already excludes archived. So archived renters are already excluded from the count. This is correct behavior but the comment on line 33 says "Count ALL renters (every status)" which is misleading.

**Medium-risk issues:**
- `check-subscription` uses the **platform** `STRIPE_SECRET_KEY` env var. This is the same key for all operators. If Bruce's personal Stripe key (for renter billing) is the same as the platform key, the portal will show renter subscriptions alongside SaaS subscriptions. This was the original "$70/mo" bug. The fix is architectural: the platform STRIPE_SECRET_KEY must be a **different** Stripe account than operator keys. No code change fixes this — it's a Stripe account separation issue.
- No upgrade/downgrade handling — if an operator grows from Starter (11-24) to Growth (25-49), the system tells them to "Upgrade to Growth" and opens a new checkout, but doesn't cancel the old Starter subscription. They could end up with two active subscriptions.

**Not broken:**
- Renter billing flows are isolated (use operator's key from `stripe_keys` table)
- Archive preserves all history (payments, timeline, maintenance stay linked by `renter_id`)
- RLS is intact

## 3. Verdict: Continue, Don't Revert

**Recommend: continue from current version.**

Reasons:
- The current code is structurally sound. There are no tangled abstractions or broken patterns.
- The pricing tiers, edge functions, subscription hook, and UI enforcement all follow a single clean pattern.
- The "messiness" is limited to: one duplicated checkout call in PlanBanner, one misleading comment, and one unused constant. These are 10-minute fixes.
- Reverting would lose the archive feature, the 10-tier expansion, and the hard-stop enforcement — all of which are working correctly.
- The real remaining risk (dual subscriptions on upgrade) hasn't been introduced by recent patches — it's a gap that existed from the start.

## 4. Clean Implementation Plan (3 Changes)

### Change A: Deduplicate PlanBanner checkout
Replace the dynamic-import `handleCheckout` in `PlanBanner.tsx` with the `checkout` function from `useSubscription()` (which it already imports but doesn't use for the button).

**File:** `src/components/PlanBanner.tsx`
- Remove lines 34-49 (the `handleCheckout` function)
- Change button onClick from `handleCheckout` to `checkout`
- Already destructured from `useSubscription` on line 9 — just add `checkout` to the destructure

### Change B: Fix misleading comment in useSubscription
Line 33: change comment from "Count ALL renters (every status)" to "Count non-archived renters (useRenters excludes archived)"

**File:** `src/hooks/useSubscription.ts`

### Change C: Handle subscription upgrades (prevent duplicate subscriptions)
When an operator needs a higher tier, the checkout should upgrade the existing subscription rather than creating a second one. Two options:

**Option 1 (simpler, recommended):** In `create-checkout`, if the customer already has an active SaaS subscription, redirect to the customer portal instead. The portal handles plan changes natively.

**Option 2:** Create an `upgrade-subscription` edge function that calls `stripe.subscriptions.update()` to swap the price. More control but more code.

Recommend Option 1. Change in `create-checkout/index.ts`:
- After finding the customer, check for active subscriptions
- If one exists with a SaaS product ID, return the portal URL instead of a checkout URL
- Frontend already handles receiving a URL and opening it

### No other changes needed.

## 5. End-to-End Test Checklist

```text
FREE TIER (0-10 renters)
[ ] Add renters 1-10 — button works, no banner
[ ] At 10 renters, "Add Renter" still works (10 < max of 10... wait, max=10 and check is renterCount < tier.max, so at 10 it returns false)
    → Actually: Free tier max=10, min=1. At 10 renters, 10 < 10 = false. Button blocked. This is correct — Free allows up to 10.
    → Correction: at 9 renters you can add (9 < 10). At 10 renters, blocked. User must upgrade to Starter.
[ ] At 10 renters: Add Renter button shows popover with "Upgrade to Starter ($29/mo)"
[ ] Popover "Upgrade" button opens Stripe checkout for Starter price
[ ] PlanBanner appears saying "Upgrade to Starter"

STARTER TIER (11-24 renters)  
[ ] Complete Stripe checkout for Starter
[ ] After payment: subscription check returns subscribed=true
[ ] PlanBanner switches to "Starter plan · X renters" status line
[ ] Add Renter button re-enables
[ ] Can add renters up to 24
[ ] At 24 renters: blocked again, popover says "Upgrade to Growth ($49/mo)"

UPGRADE PATH (Starter → Growth)
[ ] Click "Upgrade to Growth" → should NOT create a second subscription
[ ] Should either open portal (Option 1) or swap price (Option 2)
[ ] After upgrade: check-subscription returns new product_id
[ ] Settings shows "Growth — $49/mo"

ARCHIVE
[ ] Archive a renter from detail page
[ ] Renter disappears from /renters list
[ ] Renter appears in /renters/archive
[ ] Renter detail page still accessible with all history
[ ] Archived renter does NOT count toward tier limit
[ ] Unarchive renter → reappears in list, counts toward limit again

SETTINGS
[ ] "Your Plan" card shows correct tier name and price
[ ] "Manage billing" opens Stripe portal (only SaaS subscription visible)
[ ] "Upgrade to X" button appears when not subscribed

RENTER BILLING (operator Stripe key — no changes)
[ ] Operator connects Stripe key in Settings
[ ] Send setup link to renter works
[ ] Activate billing for renter works
[ ] These use operator's key, NOT platform key

HARD-STOP RACE CONDITION
[ ] Navigate to /renters, immediately click "Add Renter" before data loads
[ ] Button should be disabled (loading state blocks it)
[ ] If dialog somehow opens, submit is blocked by canAddRenter check
```
