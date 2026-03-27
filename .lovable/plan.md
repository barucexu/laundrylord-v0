

# Three Changes: Portal Fix, Payment Testing Guide, Renter Archive

## 1. Fix "Manage billing" showing $70/mo instead of Starter plan

**Root cause**: The platform's `STRIPE_SECRET_KEY` and the operator's own Stripe key are the same test key. When the customer portal opens, it shows ALL subscriptions for that customer — including the renter's $70/mo washer rental subscription created under the same Stripe account.

**Fix**: The `customer-portal` edge function should filter the portal session to only show the SaaS subscription. Stripe's `billingPortal.sessions.create` supports a `flow_data` parameter to scope the portal to a specific subscription. We should:
- Look up the customer's active subscriptions
- Find the one matching a SaaS product ID (from `pricing-tiers.ts`)
- Pass `flow_data.subscription_id` to scope the portal, OR use Stripe Portal Configuration to restrict visible products

**Simpler approach**: Create a portal configuration that limits visible products to only the SaaS product IDs. Alternatively, just pass the subscription ID to scope the portal view. We'll find the SaaS subscription by matching product IDs from the TIERS config.

**Files**: `supabase/functions/customer-portal/index.ts`

## 2. Testing dual payment systems

This is a guidance/documentation answer — no code changes. The key insight: to properly test both systems, the platform `STRIPE_SECRET_KEY` env var and the operator's key saved in `stripe_keys` should be from **different** Stripe accounts (or at minimum different test mode accounts). In production this happens naturally. For testing, the user can create a second Stripe test account for the operator side.

## 3. Renter Archive Feature

Add an `archived` status to renters. Archived renters keep all their data (payments, timeline, maintenance) but are hidden from the main renters list and don't count toward the tier limit.

### Database
- No schema change needed — `status` is already a text field. Just use `"archived"` as a new status value.

### Code changes

**`src/hooks/useSupabaseData.ts`** — `useRenters()`:
- Filter out `status = 'archived'` from the main renters query
- Add new hook `useArchivedRenters()` that only returns archived renters

**`src/hooks/useSubscription.ts`**:
- Update `renterCount` to exclude archived renters (they shouldn't count toward tier limits since they're inactive historical records)

**`src/pages/RentersList.tsx`**:
- Add an "Archive" link/button near the top (e.g., "View Archive" text link)
- Remove `"archived"` from the status filter dropdown (archived renters aren't in this list)

**`src/pages/RenterArchive.tsx`** (new):
- New page at `/renters/archive`
- Shows archived renters in a table (name, phone, status badge, last updated)
- Each row links to the existing `/renters/:id` detail page (which still works since the renter record exists)
- Back link to `/renters`

**`src/pages/RenterDetail.tsx`**:
- Add "Archive" action button (moves status to `archived`)
- If renter is archived, show an "Unarchive" button instead

**`src/components/EditRenterDialog.tsx`**:
- Add `archived` to the status dropdown options

**`src/App.tsx`**:
- Add route `/renters/archive` → `RenterArchive`

**`src/components/StatusBadge.tsx`**:
- Add styling for `archived` status

