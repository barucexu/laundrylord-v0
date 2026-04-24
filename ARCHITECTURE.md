# ARCHITECTURE.md — LaundryLord System Map

This is a practical map for new contributors and coding agents.

## Core product domains

1. **Operations system of record**
   - Renters, machines, payments, maintenance, timeline
2. **SaaS billing (platform -> operator)**
   - Operator subscription to LaundryLord plans
3. **Renter billing (operator -> renter)**
   - Operator charges renters via Stripe setup/subscription flows

## Frontend architecture

- App shell/routes: `src/App.tsx`
- Shared layout + plan banner: `src/components/AppLayout.tsx`
- Data access hooks: `src/hooks/useSupabaseData.ts`
- Plan/subscription state: `src/hooks/useSubscription.ts`
- Pricing tier definitions: `src/lib/pricing-tiers.ts`

## Backend architecture (Supabase edge functions)

This project runs on a Lovable Cloud-managed Supabase backend. That hosting model matters operationally: Lovable-internal tooling can execute migrations and related backend actions directly, while external coding sessions typically work through repo changes plus Lovable-managed application/deployment.

### SaaS billing
- `supabase/functions/create-checkout`
- `supabase/functions/check-subscription`
- `supabase/functions/customer-portal`

### Renter billing
- `supabase/functions/save-stripe-key`
- `supabase/functions/check-stripe-connection`
- `supabase/functions/create-setup-link`
- `supabase/functions/renter-portal-admin`
- `supabase/functions/renter-portal`
- `supabase/functions/create-subscription`
- `supabase/functions/stripe-webhook`

Renter billing now assumes per-operator webhook routing:

1. Each operator stores their own Stripe secret key in `stripe_keys`
2. Each operator stores their own webhook signing secret in `stripe_keys`
3. Each operator gets a unique webhook endpoint token
4. `stripe-webhook` resolves the operator from that token and verifies the signature with that operator's signing secret

## Important separations

1. **SaaS billing key context** (platform-level)
2. **Operator renter-billing key context** (per-user `stripe_keys` table)

Never conflate these two domains in code changes.

## Plan/tier logic constraints

1. Plan enforcement must be consistent across:
   - Add Renter
   - Add Machine (if policy ties machine adds to renter plan)
   - Import path
2. Boundary counts must be deterministic:
   - If max is N, creation is blocked at N and upgrade path must be actionable.
3. Count definitions must be explicit:
   - operational count
   - billable count (if cooldown policy is adopted)

## Known complexity hotspots

1. `useSubscription` + UI pages using it (`RentersList`, `MachinesList`, `SettingsPage`, `PlanBanner`)
2. Import path (`src/pages/ImportPage.tsx`) because it can bypass UI-level assumptions
3. Webhook routing and multi-operator Stripe behavior

## Design principle

Prefer **simple, centralized, well-named helpers** over duplicated conditional logic in UI components.
