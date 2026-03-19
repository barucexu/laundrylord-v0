

# Onboarding Blockers — Fix All + Stripe Webhook Setup

## Current State

Your app code is ready. You have 3 renters in the database. Stripe key is configured. Email domain `notify.laundrylord.club` is verified. The full flow (create renter → send card link → activate autopay → automated reminders) is coded.

**There are 3 things preventing real onboarding right now:**

## Fix 1: Email from-address bug

The `send-billing-reminders` edge function sends from `notifications@notify.laundrylord.com` but your verified domain is `notify.laundrylord.club`. This will cause all reminder emails to fail silently.

**Change:** Update line 191 in `send-billing-reminders/index.ts` from `.laundrylord.com` to `.laundrylord.club`.

## Fix 2: Set up daily cron job for billing reminders

The `send-billing-reminders` function exists but nothing invokes it. Need a `pg_cron` job to call it daily.

**Change:** Create a cron job that calls `https://olbedjfebvbojlahhvpq.supabase.co/functions/v1/send-billing-reminders` once per day at 9 AM UTC. This requires enabling `pg_cron` and `pg_net` extensions and inserting the schedule via SQL (not a migration, since it contains project-specific URLs/keys).

## Fix 3: Add `STRIPE_WEBHOOK_SECRET` + walk through Stripe webhook setup

The webhook function works without signature verification (dev mode), but for production you need to:

1. Go to your [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Set the endpoint URL to: `https://olbedjfebvbojlahhvpq.supabase.co/functions/v1/stripe-webhook`
4. Select these events:
   - `checkout.session.completed` (card-on-file detection)
   - `invoice.payment_succeeded` (payment tracking)
   - `invoice.payment_failed` (failed payment tracking)
   - `customer.subscription.deleted` (cancellation tracking)
5. Click "Add endpoint", then copy the **Signing secret** (starts with `whsec_`)
6. I'll store that as a secret in the project so webhook signatures are verified

## Redeploy

After fixing the from-address, redeploy `send-billing-reminders` and `stripe-webhook` edge functions.

## After These Fixes — Your Onboarding Flow

1. **Settings** → Stripe shows "Connected" (already working)
2. **Add Renter** → Create with billing terms (already working)
3. **Renter Detail** → "Send Card Setup Link" → copies Stripe checkout URL (already working)
4. **Renter completes checkout** → Stripe webhook fires → `has_payment_method = true` → page shows "Start Autopay"
5. **Click "Start Autopay"** → creates Stripe subscription → renter status = active, next_due_date set
6. **Daily cron** → sends reminders 3 days before due, on failed payment, applies late fees after configured days

## Build Order

1. Fix from-address in `send-billing-reminders`
2. Redeploy edge functions
3. Create pg_cron schedule
4. Prompt you for `STRIPE_WEBHOOK_SECRET` after you set up the webhook endpoint in Stripe

