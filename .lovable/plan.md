

# Fix Build Errors and Deploy Live Stripe SaaS Billing

## Changes

### 1. `src/hooks/useSupabaseData.ts` — remove only duplicate exports

`RenterRow` (line 10) and `MachineRow` (line 12) are already `export type` at declaration. The other six types (`PaymentRow`, `PaymentInsert`, `MaintenanceRow`, `TimelineRow`, `CustomFieldDefinitionRow`, `CustomFieldValueRow`) are declared without `export` on lines 14-19 and only exported via the block at line 695.

Fix: remove `RenterRow` and `MachineRow` from the block, keep the other six.

```typescript
export type {
  PaymentRow,
  PaymentInsert,
  MaintenanceRow,
  TimelineRow,
  CustomFieldDefinitionRow,
  CustomFieldValueRow,
};
```

### 2. `supabase/functions/create-checkout/index.ts` — type the filter callback

Line 87: add `Stripe.Subscription` type to the outer callback. Let item type infer.

```typescript
const activeSaasSubs = subscriptions.data.filter((sub: Stripe.Subscription) =>
  sub.items.data.some((item) => {
```

### 3. `supabase/functions/check-subscription/index.ts` — type the find callback

Line 140:

```typescript
const sub = subscriptions.data.find((subscription: Stripe.Subscription) => getSaasProductId(subscription) !== null);
```

### 4. `supabase/functions/process-email-queue/index.ts` — type-only fixes if deploy is blocked

- Line 57: widen `supabase` param to `any` (the generated Supabase types don't include `email_send_log` or the queue RPC signatures, so typed client won't work)
- Lines 63, 70: no code changes needed once the param is `any`
- Lines 159, 164: add `{ msg_id: number; message: Record<string, unknown> }` and `string | null` types to the callbacks

No behavior changes.

### 5. Migration

`20260410010000_live_saas_stripe_ids.sql` already exists — apply only, do not recreate.

### 6. Deploy

- Frontend (auto-deploys after build fix)
- Edge functions: `create-checkout`, `check-subscription`, `customer-portal`
- Migration

### 7. STRIPE_SECRET_KEY

Update to live platform key using the Stripe secret key tool. Not in frontend env or Settings > Stripe Connection.

### 8. Post-deploy smoke test

Manual verification of Starter checkout, plan sync, Customer Portal, Stripe Dashboard, capacity enforcement, archived-renter billing window, and upgrade CTA price IDs.

## Files touched
- `src/hooks/useSupabaseData.ts` — fix export block
- `supabase/functions/create-checkout/index.ts` — typed callback
- `supabase/functions/check-subscription/index.ts` — typed callback
- `supabase/functions/process-email-queue/index.ts` — narrow type fixes (only if deploy blocked)

