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

## Edge Function Matrix

| Function | Trust Level | Auth Pattern |
|----------|------------|--------------|
| `send-billing-reminders` | Service-role only | Validates `Authorization: Bearer <SERVICE_ROLE_KEY>` exactly |
| `stripe-webhook` | Webhook | Stripe signature verification (or raw JSON parse fallback) |
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

1. **Stripe webhook** (`stripe-webhook`): Receives Stripe events → updates `renters`, inserts `payments` and `timeline_events`
2. **Billing reminders** (`send-billing-reminders`): Scheduled/cron → checks active renters → inserts `billing_reminders`, applies late fees, sends emails via Lovable API
3. **Payment recording** (UI): `RecordPaymentDialog` → inserts `payments` row via authenticated client

### Canonical Value Sets

| Domain | Values |
|--------|--------|
| `machines.type` | `washer`, `dryer`, `set` |
| `machines.status` | `available`, `assigned`, `maintenance`, `retired` |
| `payments.type` | `rent`, `install_fee`, `deposit`, `late_fee`, `other` |
| `payments.status` | `upcoming`, `due_soon`, `overdue`, `failed`, `paid` |
| `timeline_events.type` | `created`, `machine_assigned`, `payment_succeeded`, `payment_failed`, `payment_method_saved`, `late_fee`, `maintenance_opened`, `maintenance_resolved`, `pickup_scheduled`, `pickup_completed`, `note` |


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

## Tech Stack

React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui, Supabase (auth + Postgres + edge functions), Stripe (billing), React Query, React Router v6.

## Local Backend Access

- Frontend local development uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
- These are safe client-side values and are enough for normal authenticated app usage against the hosted Supabase project.
- External agents working only from the repo should use migrations in `supabase/migrations/` unless they also have an explicit supported DB access path.
- Backend-only secrets such as `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `LOVABLE_API_KEY` must stay server-side.
