

# Revised Pilot-Ready Plan

## Constraints Applied

1. **Card-on-file from webhook only** -- `has_payment_method` set exclusively by `checkout.session.completed` webhook, never from query params. The `?setup=success` param remains UI-only (toast).
2. **Platform sending domain** -- Emails sent from LaundryLord's own domain (e.g. `notify.laundrylord.com`), not per-operator domains. Requires one-time email domain setup via the platform dialog before email functions work.
3. **Late fees are app-level only** -- Applied to balance in the database, shown in UI and emails, logged in timeline. Not charged through Stripe.
4. **Idempotency** -- Reminders and late fees tracked per renter per billing cycle to prevent duplicates.
5. **Stripe webhooks are source of truth** -- Payment state (paid/failed), `paid_through_date`, `balance`, `days_late` all driven by webhook events.

---

## Database Migration (1 migration)

**Add to `renters` table:**
- `has_payment_method` boolean, default false
- `late_fee` numeric, default 25

**New table: `operator_settings`**
- `id` uuid PK, `user_id` uuid (unique, not null), `default_monthly_rate` numeric default 150, `default_install_fee` numeric default 75, `default_deposit` numeric default 0, `late_fee_amount` numeric default 25, `late_fee_after_days` integer default 7, `reminder_days_before` integer default 3, `created_at`/`updated_at` timestamps
- RLS: user can CRUD own row

**New table: `billing_reminders`** (idempotency tracking)
- `id` uuid PK, `renter_id` uuid not null, `user_id` uuid not null, `billing_cycle` date not null (the due date this reminder is for), `reminder_type` text not null (payment_reminder / payment_failed / late_fee_applied), `sent_at` timestamptz default now()
- Unique constraint on `(renter_id, billing_cycle, reminder_type)` -- prevents duplicates
- RLS: user can view/insert own rows

---

## Edge Function Changes

### 1. `stripe-webhook` -- add `checkout.session.completed` handler

When Stripe fires `checkout.session.completed` with `mode=setup`:
- Extract `customer` ID from the session
- Find renter by `stripe_customer_id`
- Set `has_payment_method = true`
- Log timeline event: "Card on file saved"

This is the **only** path that sets `has_payment_method = true`.

### 2. `send-billing-reminders` (new edge function, scheduled daily)

Runs via pg_cron once daily. For each renter with `status = 'active'` and `stripe_subscription_id` set:

- **3 days before `next_due_date`**: Send "payment reminder" email if no `billing_reminders` row exists for this cycle + type
- **`days_late >= 1`**: Send "payment failed" email if no reminder row exists for this cycle + `payment_failed`
- **`days_late >= late_fee_after_days` (from operator_settings)**: Apply late fee to balance, log timeline event, send "late fee applied" email -- all only if no reminder row exists for this cycle + `late_fee_applied`

Emails sent via Resend API (through the platform's LaundryLord email domain). Each send inserts into `billing_reminders` for idempotency.

### 3. `check-stripe-connection` -- no changes needed (already working)

### 4. `create-setup-link` -- no changes needed (query param stays UI-only)

### 5. `create-subscription` -- no changes needed

---

## Frontend Changes

### `RenterDetail.tsx`
- Change card detection from `!!renter.stripe_customer_id` to `!!renter.has_payment_method`
- Show late fee amount in financial summary
- Show card-on-file status explicitly (Yes/No badge)

### `SettingsPage.tsx`
- Wire billing defaults + reminder timing to `operator_settings` table (read on mount, save on button click)
- Add `useOperatorSettings` hook + `useSaveOperatorSettings` mutation

### `CreateRenterDialog.tsx`
- Load operator settings and use as initial form values for monthly_rate, install_fee, deposit_amount
- Add late_fee field prefilled from settings

### `useSupabaseData.ts`
- Add `useOperatorSettings()` query hook
- Add `useSaveOperatorSettings()` mutation hook

---

## Email Domain Prerequisite

No email domain is configured yet. The first step in implementation will be to present the email domain setup dialog so you can configure `laundrylord.com` (or a subdomain). The rest of the plan (Stripe webhook fix, settings persistence, billing CTA fix) can proceed immediately in parallel.

---

## Build Order

1. Database migration (operator_settings + billing_reminders + renter columns)
2. Settings persistence (hook + SettingsPage wiring)
3. Smart defaults in CreateRenterDialog
4. Stripe webhook update (checkout.session.completed → has_payment_method)
5. RenterDetail billing CTA fix (use has_payment_method)
6. Email domain setup (user action)
7. send-billing-reminders edge function + pg_cron schedule
8. Deploy all edge functions

