

# Plan: Fix Bugs + Add Edit Capabilities + Testing Guide

## Issue 1: "Set" machine type blocked by database constraint

The error `machines_type_check` is a database CHECK constraint that only allows `'washer'` or `'dryer'`. The UI offers "Set" but the database rejects it.

**Fix:** Run a migration to update the constraint to include `'set'`:
```sql
ALTER TABLE machines DROP CONSTRAINT machines_type_check;
ALTER TABLE machines ADD CONSTRAINT machines_type_check CHECK (type = ANY (ARRAY['washer','dryer','set']));
```

## Issue 2: Add Edit Renter + Edit Machine dialogs

No edit functionality exists anywhere in the codebase. Need to build:

**A) EditRenterDialog** — opened from RenterDetail page
- Pre-fill all editable fields: name, phone, email, address, monthly_rate, install_fee, deposit_amount, late_fee, notes, lease_start_date, status
- Add an `useUpdateRenter` mutation to `useSupabaseData.ts`
- Add an "Edit" button on the RenterDetail page header

**B) EditMachineDialog** — opened from MachinesList page (per-row action)
- Pre-fill: type, model, serial, prong, condition, notes, status
- Add an `useUpdateMachine` mutation to `useSupabaseData.ts`
- Add an edit icon/button on each machine row

Both dialogs reuse the same form layouts as their Create counterparts but with pre-populated values and an update mutation instead of insert.

## Issue 3: Stripe "Connection Error" + How to Test

Your screenshot shows "Connection Error — Your Stripe key appears to be invalid." This means the `STRIPE_SECRET_KEY` secret is either missing or wrong. Before any Stripe flow works, we need to fix this.

**Action:** I'll prompt you to re-enter or verify your Stripe Secret Key (starts with `sk_test_` or `sk_live_`).

**How to test the full flow once Stripe is connected:**

1. **Settings page** — should show "Connected" with your account name
2. **Create a renter** with a name, phone, email, and billing terms
3. **Open the renter detail** — click "Send Card Setup Link" — this generates a Stripe checkout URL
4. **Open that URL** in a browser — use Stripe's test card `4242 4242 4242 4242` (any future date, any CVC)
5. **After completing checkout** — Stripe fires `checkout.session.completed` webhook → the renter's `has_payment_method` flips to `true` → the page now shows "Start Autopay"
6. **Click "Start Autopay"** — creates a Stripe subscription → renter status becomes `active`, next due date is set
7. **Email reminders** fire daily at 9 AM UTC via the cron job — to test immediately, I can add a "Send Test Reminder" button or you can wait for the cron
8. **Late fees** are applied automatically when `days_late` exceeds your configured grace period (default 7 days)

For Stripe test mode, everything works with fake cards and no real money moves.

## Issue 4: Full App Capabilities Summary

This will be included as a written summary in the implementation message, covering:
- Renter lifecycle management (lead → active → late → closed)
- Machine inventory tracking
- Stripe card-on-file collection via hosted checkout
- Automated recurring billing via Stripe subscriptions
- Automated email reminders (upcoming, failed, late fees)
- Payment history and timeline tracking
- Operator settings (default rates, late fee rules)
- Maintenance log tracking

## Build Order

1. Fix `machines_type_check` constraint (migration)
2. Add `useUpdateRenter` and `useUpdateMachine` mutations
3. Create `EditRenterDialog` component
4. Create `EditMachineDialog` component
5. Wire edit buttons into RenterDetail and MachinesList
6. Prompt for Stripe Secret Key verification

