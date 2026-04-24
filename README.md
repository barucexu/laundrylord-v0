# LaundryLord

Vertical SaaS for washer/dryer rental operators. Billing clarity + renter system of record.

## Entry Points

- `src/main.tsx` — React root
- `src/App.tsx` — Router, providers, route tree
- `index.html` — Vite HTML shell

## Feature Areas

| Route | Page | Purpose |
|-------|------|---------|
| `/` | Dashboard | KPIs, overdue/upcoming summary |
| `/renters` | RentersList | Active renter table |
| `/renters/archive` | RenterArchive | Archived renters |
| `/renters/:id` | RenterDetail | **Center of gravity** — billing, timeline, machines, actions |
| `/machines` | MachinesList | Machine inventory + assignment display |
| `/machine-map` | MachineMapPage | Geo view of machines |
| `/payments` | PaymentsView | Payment ledger with filters |
| `/maintenance` | MaintenanceView | Maintenance log |
| `/settings` | SettingsPage | Operator config, Stripe key, billing templates |
| `/import` | ImportPage | CSV/XLSX/image import for renters + machines |
| `/auth` | AuthPage | Login/signup |
| `/reset-password` | ResetPasswordPage | Password reset |

## Real Mode vs Demo Mode

- **Real mode**: `AuthProvider` → `ProtectedRoute` → `AppLayout` → page routes. Data from Supabase via `useSupabaseData` hooks.
- **Demo mode**: `/demo/*` routes. `AuthProvider isDemo` + `DemoProvider` → `DemoLayout` → same page routes. Data from in-memory `DemoContext` (seeded by `demo-seed-data.ts`).
- Shared route fragment `PAGE_ROUTES` in `App.tsx` is used by both modes to prevent drift.
- Local development can use the same hosted Supabase backend when `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are configured.

## Key Hooks & Services

| Hook/Module | Responsibility |
|-------------|---------------|
| `useSupabaseData` | All Supabase CRUD hooks (renters, machines, payments, maintenance, timeline, settings, Stripe connection). Demo-aware. |
| `useSubscription` | Plan tier gating — computes `canAddRenter`, `tier`, `checkout()`, `portal()` |
| `useAuth` | Auth state, sign-in/out, session, demo mode flag |
| `DemoContext` | In-memory data store for demo mode |
| `pricing-tiers.ts` | Tier definitions, limits, Stripe price/product IDs |

## Canonical Source of Truth: Machine Assignment

**Canonical relation**: `machines.assigned_renter_id` → `renters.id`

All reads AND writes must use `machines.assigned_renter_id`. The legacy `renters.machine_id` column still exists in the schema but is NOT the source of truth for assignment display or logic.

Assignment writes should go through the guarded assignment hooks in `useSupabaseData` and shared helpers in `src/lib/machine-assignment.ts`. They enforce that only unassigned `available` machines can be assigned and that unassigning clears only the current renter's assignment instead of relying on UI filtering alone.

## Edge Function Matrix

| Function | Trust Level | Auth Pattern |
|----------|------------|--------------|
| `send-billing-reminders` | Service-role only | Validates `Authorization: Bearer <SERVICE_ROLE_KEY>` exactly |
| `stripe-webhook` | Webhook | Operator token in URL + per-operator Stripe signature verification |
| `create-checkout` | User-authenticated | Standard JWT via Supabase client |
| `create-subscription` | User-authenticated | Standard JWT |
| `create-setup-link` | User-authenticated | Standard JWT |
| `customer-portal` | User-authenticated | Standard JWT |
| `check-stripe-connection` | User-authenticated | Standard JWT |
| `check-subscription` | User-authenticated | Standard JWT |
| `save-stripe-key` | User-authenticated | Standard JWT |
| `parse-image-table` | User-authenticated | Standard JWT |
| `process-email-queue` | Service-role only | Internal queue processor |

## Backend Hosting Model

- This project uses a Lovable Cloud-managed Supabase backend.
- In the Lovable editor, migrations, read queries, Edge Function deploys, and secret checks can be handled through Lovable's managed tooling.
- In external coding environments, frontend env values allow app access, but do not by themselves grant direct database-admin execution.

## Billing / Reminder / Webhook Flow

1. **Stripe webhook** (`stripe-webhook`): Receives Stripe events on an operator-specific endpoint URL, verifies the matching operator signing secret, dedupes events, then updates `renters`, inserts `payments`, and inserts `timeline_events`
2. **Billing reminders** (`send-billing-reminders`): Scheduled/cron → checks active renters → inserts `billing_reminders`, applies late fees, sends emails via Lovable API
3. **Payment recording** (UI): `RecordPaymentDialog` → authenticated RPC records the payment, updates renter balance/state, and inserts a timeline event in one authoritative write path
4. **Pre-autopay fee add-ons**: `renter_balance_adjustments` stores positive fee add-ons that increase `renters.balance` before autopay starts, and those items can be removed before autopay begins
5. **Autopay start** (`create-subscription`): Collects the renter's current balance through Stripe Invoicing, then starts recurring autopay for the next billing cycle

Renter billing readiness now means:

1. Operator Stripe secret key saved
2. Operator webhook signing secret saved
3. Operator-specific webhook endpoint URL configured in Stripe

Until all three are true, renter setup-link and autopay actions stay blocked.

Autopay start behavior now means:

1. Operator can add positive fee add-ons before autopay starts
2. If they want first month rent charged now, they add it as a current-balance item before starting autopay
3. `Start autopay and charge current balance` attempts the renter's current-balance invoice right away using the saved default payment method
4. Card current-balance payments can settle immediately; ACH current-balance payments can remain processing while the renter stays in an explicit `Autopay Pending` state until Stripe confirms success
5. A real Stripe subscription is created immediately for successful starts, but the app only treats ACH autopay as active after Stripe confirms the starting payment; `stripe_subscription_id` alone is not enough to infer Active
6. While ACH is pending, current-balance items stay visible but balance mutations are locked until Stripe reports success or failure
7. Current-balance items clear only after a successful starting-balance payment; failed starts preserve the balance and itemized rows for retry
8. Later setup-link completions replace the default payment method for future autopay charges
9. `lease_start_date` is set the first time the operator starts autopay for the current balance, so Start Date reflects rental commencement rather than delayed ACH settlement

### Canonical Value Sets

| Domain | Values |
|--------|--------|
| `renters.status` | `lead`, `scheduled`, `active`, `autopay_pending`, `late`, `maintenance`, `termination_requested`, `pickup_scheduled`, `closed`, `defaulted`, `archived` |
| `machines.type` | `washer`, `dryer`, `set` |
| `machines.status` | `available`, `assigned`, `maintenance`, `retired` |
| `payments.type` | `payment`, `rent`, `install_fee`, `deposit`, `late_fee`, `other` |
| `payments.status` | `upcoming`, `due_soon`, `overdue`, `failed`, `paid` |
| `timeline_events.type` | `created`, `machine_assigned`, `payment_succeeded`, `payment_failed`, `payment_method_saved`, `late_fee`, `maintenance_opened`, `maintenance_resolved`, `pickup_scheduled`, `pickup_completed`, `note` |

## Import Contracts

- Renter import financial fields use explicit app values: valid mapped values win, blank, unmapped, or invalid `monthly_rate`, `install_fee`, `deposit_amount`, and `late_fee` values use operator settings defaults.
- Extra import columns are stored as custom fields. Renter list search may include those custom-field labels and values through the batched renter custom-field query; it is not a global app search.


## Project Operating Docs

- `AGENTS.md` — shared instructions for AI coding agents working in this repo
- `WORKFLOW.md` — default planning, phasing, branch, and validation loop for non-trivial work
- `REVIEW_STANDARD.md` — review bar for plans, implementations, and phase completion
- `RULES.md` — non-negotiable engineering guardrails
- `ARCHITECTURE.md` — system map and module boundaries
- `BILLING_POLICY.md` — SaaS/enforcement policy decisions
- `QA_RUNBOOK.md` — manual validation checklist for pricing/enforcement

## Repo Rules

1. **No silent enum/contract drift**: Any new persisted value for type/status/event fields must be added to the canonical value set above and to all UI rendering paths (e.g., `StatusBadge`, `timelineIcons`).
2. **Edge functions must declare and enforce caller trust level**: Service-role-only functions must validate the Authorization header. User-authenticated functions rely on Supabase JWT verification.
3. **Source-of-truth changes must be documented**: If the canonical relation for machine assignment or billing state ownership changes, update this README.
4. **Machine assignment uses `machines.assigned_renter_id`**: Do not introduce reads via `renters.machine_id`.
5. **Payment status `"pending"` is not valid**: The billing reminders function writes `"overdue"` for late fees.
6. **Supabase DB changes are manual from agent output**: If a task needs DB/schema/data mutation, provide SQL for the user to run manually in Lovable's Supabase SQL interface.

## Testing

Tests live in `src/test/`. Run with `vitest`.

Key contract tests:
- `machine-assignment.test.tsx` — proves assignment lookup uses `assigned_renter_id`
- `renter-detail-timeline.test.tsx` — proves all backend event types have UI icon mappings
- `import-linking.test.tsx` — proves import linking uses canonical relation
- `import-engine.test.ts` and `import-page.test.tsx` — prove importer defaults, validation-blocking, custom fields, and plan-cap behavior
- `renter-search.test.ts` — proves renter list search text includes imported custom-field values

## Tech Stack

React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui, Supabase (auth + Postgres + edge functions), Stripe (billing), React Query, React Router v6.

## Local Backend Access

- Frontend local development uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
- These are safe client-side values and are enough for normal authenticated app usage against the hosted Supabase project.
- External agents working only from the repo should use migrations in `supabase/migrations/` unless they also have an explicit supported DB access path.
- Backend-only secrets such as `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `LOVABLE_API_KEY` must stay server-side.
