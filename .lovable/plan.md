

# Plan: Multi-tenant Stripe, Bug Fixes, Machine Assignment, Edit Enhancements

## 0. Per-Operator Stripe Keys (Multi-Tenant)

Currently, one `STRIPE_SECRET_KEY` env var is shared by all operators. To support multiple laundrylords, each operator stores their own Stripe key.

**Database**: Add `stripe_secret_key` (encrypted text) column to `operator_settings`.

**Settings Page**: Replace the read-only Stripe status panel with an input field where operators paste their own `sk_test_...` or `sk_live_...` key. The `check-stripe-connection` function verifies it.

**Edge Functions** (`create-setup-link`, `create-subscription`, `check-stripe-connection`): Instead of `Deno.env.get("STRIPE_SECRET_KEY")`, these functions read the authenticated user's key from `operator_settings.stripe_secret_key`.

**Webhook**: The `stripe-webhook` function looks up the renter by `stripe_customer_id`, gets the `user_id`, then reads that operator's Stripe key from `operator_settings` for processing. Signature verification uses the platform-level `STRIPE_WEBHOOK_SECRET` env var (shared, since all webhook events route to the same endpoint).

## 1. Fix: Email Edit Not Persisting + Webhook Not Updating `has_payment_method`

**Edit persistence**: The mutation code looks correct. Will add `queryClient.invalidateQueries` for the specific renter ID query key in the `onSuccess` to ensure the detail page refetches.

**Webhook issue**: The most likely cause is that the Stripe webhook URL is not configured in your Stripe Dashboard. The webhook at `https://olbedjfebvbojlahhvpq.supabase.co/functions/v1/stripe-webhook` must be registered in Stripe Dashboard > Developers > Webhooks, listening for `checkout.session.completed`, `invoice.payment_succeeded`, `invoice.payment_failed`, and `customer.subscription.deleted`. Will add instructions and a diagnostic log to the webhook function.

## 2. Machine Assignment from Renter Detail Page

Add a "Machine" card on the renter detail sidebar with:
- A `Select` dropdown listing available machines (status = "available") plus the currently assigned one
- Selecting a machine updates `renters.machine_id` and sets `machines.assigned_renter_id` + `machines.status = "rented"`
- An "Unassign" option that clears both sides

## 3. Edit Dialog Enhancements (Create + Edit)

**EditRenterDialog** additions:
- Start date picker (calendar, like CreateRenterDialog already has)
- `install_fee_collected` toggle (checkbox)
- `deposit_collected` toggle (checkbox)
- All lifecycle statuses in the status dropdown (lead, scheduled, active, late, maintenance, termination_requested, pickup_scheduled, closed, defaulted)

**CreateRenterDialog**: Already has start date and collected checkboxes. No changes needed.

## 4. Testing Recipe (Included in Response)

Will provide a step-by-step guide covering:
- Creating two separate accounts (two laundrylords)
- Each connecting their own Stripe test key
- Creating renters, assigning machines, editing records
- Testing card setup link with `4242 4242 4242 4242`
- Registering webhook URL in Stripe Dashboard
- Verifying autopay activation
- How email reminders and late fees trigger

## Build Order

1. Migration: add `stripe_secret_key` to `operator_settings`
2. Update all 4 edge functions to read per-operator keys
3. Update Settings page with Stripe key input
4. Fix EditRenterDialog (add start date, collected toggles, all statuses)
5. Add machine assignment UI to renter detail page
6. Provide testing recipe in response text

