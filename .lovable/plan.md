

# ACH Default + Fee Optimization Analysis

## What's possible and what's not

### 1. Default to ACH on setup link — trivial fix
Swap `payment_method_types: ["card", "us_bank_account"]` to `["us_bank_account", "card"]` in `create-setup-link`. Stripe Checkout shows the first type as default. One line change.

**Fee savings for operators**: ACH via Stripe costs **0.8% capped at $5** per transaction vs cards at **2.9% + $0.30**. On a $60/mo rental, that's $0.48 ACH vs $2.04 card. Real savings.

### 2. Zelle/Venmo autopay — not technically possible
Zelle has **no public API**. There is no way to programmatically:
- Create a Zelle payment
- Set up Zelle autopay
- Verify a Zelle payment was received
- Trigger or schedule Zelle transfers

Zelle autopay exists only within individual banking apps and is fully controlled by the sender's bank. Same limitation applies to Venmo for automated business collection. Cash App has limited business APIs but nothing for automated recurring pulls.

**The honest answer**: There is no free payment rail with an API that allows you to programmatically collect recurring payments. ACH via Stripe (0.8% capped $5) is the cheapest automated option. The alternatives are:
- **Stripe ACH** — 0.8% capped at $5 (best automated option)
- **Stripe cards** — 2.9% + $0.30 (current default)
- **Zelle/Venmo/Cash** — $0 fees but fully manual, no API, no automation

The current manual payment tracking (Record Payment dialog) already handles Zelle/Venmo/Cash as external methods. That's the correct representation — they're tracked, not platform-controlled.

### 3. LaundryLord SaaS pricing enforcement
The pricing tiers exist in `PricingCalculator.tsx` but are display-only. To actually charge operators, you'd need:
- Stripe products/prices for each tier
- A subscription check system
- Usage-based tier assignment (count renters → determine tier)

This is a significant feature (operator billing for the SaaS itself). It's separate from the renter billing system and would be a new workstream. **Not included in this pass** — noting it as a future item.

## Smallest safe change

### File: `supabase/functions/create-setup-link/index.ts`
- Swap `payment_method_types` order to `["us_bank_account", "card"]`
- Update comment to note ACH is now the default option shown

That's it. One line. The Stripe Checkout page (as shown in the uploaded screenshot) will now show "US bank account" selected by default instead of "Card". Renters can still choose card if they prefer.

## What remains for future passes
- LaundryLord SaaS subscription enforcement (operator billing by tier)
- Zelle/Venmo remain manual-only tracking — no API exists to automate them
- ACH microdeposit verification handling (existing known limitation)

