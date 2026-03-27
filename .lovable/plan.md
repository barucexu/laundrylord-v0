

# Payment Terminology & ACH Groundwork — Smallest Safe Diff

## ACH Verification

**Can Stripe Checkout `mode: "setup"` with `us_bank_account` work here?**

Yes for setup — Stripe Checkout in setup mode supports `payment_method_types: ["card", "us_bank_account"]`. The renter sees both options on the Stripe-hosted page and can link a bank account via Plaid or manual entry.

**But `create-subscription` has a blocker.** It currently does `paymentMethods.list({ type: "card" })` — it only looks for cards. If a renter set up a bank account, this query returns nothing and throws "No payment method on file." Additionally, `us_bank_account` payment methods require microdeposit verification for manual entry, which can take 1-2 business days. Stripe handles this, but the current flow assumes instant readiness.

**Verdict: ACH is groundwork only, not complete.** The setup-link change is safe. The subscription side needs careful handling of bank account verification state, which is not a one-line fix. This pass will:
- Enable bank account collection in the setup flow
- Update `create-subscription` to check both card and bank account types
- Label this clearly as "groundwork" — bank accounts via Plaid will work, manual-entry bank accounts may need verification delay handling in a future pass

## Changes

### 1. `src/pages/RenterDetail.tsx` — Terminology fixes (4 string changes)

- Line 192: `"Connect Business Stripe"` → `"Connect Stripe"`
- Line 194: `"Connect your Stripe account in Settings before you can charge renters."` → `"Add your Stripe key in Settings to enable billing."`
- Line 207: `"Send Card Setup Link"` → `"Send Payment Setup Link"`
- Line 208: `"Send a secure link to collect the renter's card on file"` → `"Send a secure link for the renter to add a payment method"`
- Line 224: `"Resend Setup Link"` stays (already accurate)
- Line 228: `"Card on file ✓"` → `"Payment method on file ✓"`
- Line 241: `"Update Card"` → `"Update Payment Method"`

### 2. `supabase/functions/create-setup-link/index.ts` — Enable bank accounts

- Change `payment_method_types: ["card"]` → `payment_method_types: ["card", "us_bank_account"]`
- Add a comment: `// ACH groundwork: bank accounts can be collected but verification delays may apply for manual entry`

### 3. `supabase/functions/create-subscription/index.ts` — Check both payment method types

- After the existing card check, also check for `us_bank_account` type
- Use whichever is found as the default payment method
- Add comment: `// ACH groundwork: supports bank accounts collected via setup link. Manual-entry bank accounts may need microdeposit verification — full ACH support is not complete in this pass.`

### 4. `supabase/functions/stripe-webhook/index.ts` — Add limitation comment

- Add a block comment near the top:
```
// KNOWN LIMITATION: This webhook uses a single STRIPE_WEBHOOK_SECRET env var.
// Each operator has their own Stripe account, but only one webhook secret can
// be verified at a time. Customer ID lookups work because Stripe customer IDs
// are globally unique, but signature verification only validates against one
// Stripe account's signing secret. Multi-operator webhook routing is not
// solved in this pass.
```

### 5. `src/components/RecordPaymentDialog.tsx` — No changes needed

Payment sources are already truthfully labeled as manual tracking methods. "Stripe" in the source list means "I'm recording a Stripe payment manually" — this is fine.

## Files Modified

- `src/pages/RenterDetail.tsx` — string fixes
- `supabase/functions/create-setup-link/index.ts` — add `us_bank_account`
- `supabase/functions/create-subscription/index.ts` — check both card and bank account
- `supabase/functions/stripe-webhook/index.ts` — add limitation comment

## What This Does NOT Do

- Does not handle microdeposit verification polling for manual-entry bank accounts
- Does not solve multi-operator webhook secret architecture
- Does not add ACH as a visible UI option — it works transparently through Stripe's hosted page
- Does not change any database schema

## Verification Checklist

- [ ] "Connect Stripe" button text on renter detail
- [ ] "Add your Stripe key" description text
- [ ] "Send Payment Setup Link" button text
- [ ] "Payment method on file" description text
- [ ] Setup link Stripe Checkout page shows both card and bank account options
- [ ] Activating autopay works when renter has a card (existing flow preserved)
- [ ] Activating autopay works when renter has a bank account (via Plaid — groundwork)
- [ ] Manual payment recording unchanged
- [ ] Webhook limitation comment present in code

