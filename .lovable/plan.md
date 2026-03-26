

# Fix: Move Stripe Secret Keys Out of Client-Readable Table

## Problem

The `operator_settings` table stores `stripe_secret_key` in a column readable by any authenticated user (via their own RLS-scoped row). This means the Stripe secret key is fetched to the browser when the Settings page loads or when operator_settings is queried. A malicious script or browser extension could exfiltrate it.

## Solution

Create a new edge function `save-stripe-key` that accepts the key from the frontend and stores it in a **separate server-only table** (`stripe_keys`) with RLS that only allows `service_role` access. Remove `stripe_secret_key` from `operator_settings`. All existing edge functions already use `SUPABASE_SERVICE_ROLE_KEY` to query, so they can read from the new table.

## Changes

### 1. Database migration

- Create table `stripe_keys` with columns: `user_id uuid PRIMARY KEY REFERENCES auth.users(id)`, `encrypted_key text NOT NULL`, `created_at`, `updated_at`
- Enable RLS with **service_role-only** policies (SELECT, INSERT, UPDATE, DELETE)
- Migrate existing data: `INSERT INTO stripe_keys (user_id, encrypted_key) SELECT user_id, stripe_secret_key FROM operator_settings WHERE stripe_secret_key IS NOT NULL`
- Drop column: `ALTER TABLE operator_settings DROP COLUMN stripe_secret_key`

### 2. New edge function: `save-stripe-key`

- Authenticates user via JWT
- Validates key format (`sk_test_` or `sk_live_`)
- Upserts into `stripe_keys` using service role client
- Returns success/error

### 3. Update existing edge functions

Modify `check-stripe-connection`, `create-setup-link`, `create-subscription` to read from `stripe_keys` instead of `operator_settings.stripe_secret_key`. They already use service role, so no RLS issue.

### 4. Update `src/pages/SettingsPage.tsx`

- Remove client-side read of `stripe_secret_key` from operator_settings
- `handleSaveStripeKey` calls `supabase.functions.invoke('save-stripe-key', { body: { key } })` instead of direct upsert
- Remove pre-population of the key input (never send key back to client — show masked placeholder like `sk_****...` based on connection status from `check-stripe-connection`)

### 5. Update `src/data/demo-seed-data.ts`

- Remove `stripe_secret_key` from demo operator settings object

## Files

- **Migration**: new `stripe_keys` table, drop column from `operator_settings`
- **New**: `supabase/functions/save-stripe-key/index.ts`
- **Modified**: `supabase/functions/check-stripe-connection/index.ts`, `create-setup-link/index.ts`, `create-subscription/index.ts`
- **Modified**: `src/pages/SettingsPage.tsx`, `src/data/demo-seed-data.ts`

