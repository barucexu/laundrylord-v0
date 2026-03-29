

# Fix Archive + Upgrade Checkout + Build Errors

## Issues

### 1. Can't archive a renter
The screenshot shows error toast: "Could not find the 'archived_at' column of 'renters' in the schema cache." The `archived_at` and `billable_until` columns exist in the types but PostgREST schema cache may be stale. However, the `demo-seed-data.ts` build error confirms these fields are expected but missing from the demo renter objects — that's a separate build error. The archive action itself uses `as any` cast which should work at runtime. The real fix: this is likely a PostgREST schema cache issue that needs a schema cache refresh, but we should also ensure the code handles gracefully.

**Fix**: The archive flow writes `archived_at` and `billable_until` via `updateRenter`. If PostgREST rejects those columns, we need to verify they exist in the DB. Since they're in the generated types, they should exist. The error suggests the schema cache is stale — we should trigger a schema cache refresh. But as a code-level fix, remove the `as any` cast and instead only send the fields that are in the Update type properly.

Actually, looking more carefully: `archived_at` IS in the Update type (line 459). The error is from PostgREST at runtime, not TypeScript. This means the column might not actually exist in the database despite being in the types file. We need to check and potentially add a migration.

**Plan**: Add a migration to ensure `archived_at` and `billable_until` columns exist on the `renters` table (idempotent `ALTER TABLE ADD COLUMN IF NOT EXISTS`).

### 2. Upgrade button shows portal instead of new checkout
From the screenshot: user has an active Starter subscription and hits "Upgrade to Growth". The `create-checkout` function detects `hasSaasSub = true` and redirects to the Stripe Customer Portal. The portal shows current subscriptions but doesn't pre-select the upgrade tier. This is actually correct Stripe behavior — the portal allows plan changes — but the user expected a direct checkout for the new tier.

**Fix**: When `create-checkout` is called with a `price_id` that differs from the current subscription's price, instead of redirecting to the generic portal, we should update the existing subscription's price via Stripe API directly, or create a portal session with a `flow_data` configuration that pre-selects the upgrade. The simplest correct approach: use `stripe.billingPortal.sessions.create` with `flow_data` of type `subscription_update` pointing to the specific subscription and the target price.

### 3. Build errors

**`demo-seed-data.ts`**: Add `archived_at: null` and `billable_until: null` to each generated renter object.

**Edge functions `npm:@supabase/supabase-js@2.57.2`**: These need a `deno.json` specifying the npm dependency, or switch to the `https://esm.sh/` import pattern. The simplest fix: change all edge functions using `npm:@supabase/supabase-js@2.57.2` to use `npm:@supabase/supabase-js@2` (without patch version) which is more flexible, matching what `process-email-queue` already does.

**`process-email-queue/index.ts`**: The `email_send_log` table and `move_to_dlq` RPC don't exist in the schema types. These are pre-existing type errors not introduced by recent changes. Add `as any` casts to bypass the strict typing for these internal tables.

---

## Files to change

| File | Change |
|------|--------|
| `src/data/demo-seed-data.ts` | Add `archived_at: null, billable_until: null` to renter objects |
| `supabase/functions/check-stripe-connection/index.ts` | Change import to `npm:@supabase/supabase-js@2` |
| `supabase/functions/check-subscription/index.ts` | Change import to `npm:@supabase/supabase-js@2` |
| `supabase/functions/create-setup-link/index.ts` | Change import to `npm:@supabase/supabase-js@2` |
| `supabase/functions/create-checkout/index.ts` | Change import + fix upgrade flow to use portal `flow_data` for subscription updates |
| `supabase/functions/customer-portal/index.ts` | Change import to `npm:@supabase/supabase-js@2` |
| `supabase/functions/create-subscription/index.ts` | Change import to `npm:@supabase/supabase-js@2` |
| `supabase/functions/save-stripe-key/index.ts` | Change import to `npm:@supabase/supabase-js@2` |
| `supabase/functions/send-billing-reminders/index.ts` | Change import to `npm:@supabase/supabase-js@2` |
| `supabase/functions/stripe-webhook/index.ts` | Change import to `npm:@supabase/supabase-js@2` |
| `supabase/functions/process-email-queue/index.ts` | Add `as any` casts for `email_send_log` and `move_to_dlq` |
| DB migration | `ALTER TABLE renters ADD COLUMN IF NOT EXISTS archived_at timestamptz; ALTER TABLE renters ADD COLUMN IF NOT EXISTS billable_until timestamptz;` |

## Key behavior change: create-checkout upgrade flow

When `hasSaasSub` is true AND the requested `price_id` differs from the current subscription's price:
```ts
// Find the active SaaS subscription
const saasSubscription = subscriptions.data.find(sub =>
  sub.items.data.some(item => {
    const pid = typeof item.price.product === "string" ? item.price.product : item.price.product?.id;
    return pid && SAAS_PRODUCT_IDS.has(pid);
  })
);

// If requesting same price, go to portal (manage existing)
// If requesting different price, create portal session with subscription_update flow
if (saasSubscription) {
  const currentPriceId = saasSubscription.items.data[0].price.id;
  if (currentPriceId !== price_id) {
    // Direct upgrade via portal with flow_data
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/settings?subscription=success`,
      flow_data: {
        type: "subscription_update",
        subscription_update: {
          subscription: saasSubscription.id,
        },
      },
    });
    return new Response(JSON.stringify({ url: portalSession.url }), { ... });
  }
  // Same price — just go to portal
  // ... existing portal redirect
}
```

This sends the user directly to the plan-change screen in Stripe's portal instead of the generic overview.

