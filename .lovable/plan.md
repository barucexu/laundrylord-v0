

# LaundryLord v1 — Implementation Plan

## Phase 1: Foundation & UI Shell (This prompt)
- **Design system**: Update CSS variables to match the design brief (cool-tinted background, utility blue primary, status colors). System font stack with mono for data.
- **Layout shell**: 240px fixed sidebar with nav (Dashboard, Renters, Machines, Payments, Maintenance, Settings). Fluid main area max-w `1200px`.
- **Dashboard page**: Stat cards showing Overdue, Active, Failed Payments, Upcoming Payments, Open Maintenance, Pending Pickups. All with mock data initially.
- **Renters list page**: Dense table with status pills, search/filter by name/phone/status. Columns: Name, Phone, Machine, Status, Balance, Paid Through, Days Late.
- **Renter detail page**: Two-column layout (70/30). Left: Activity Timeline + Maintenance Log. Right: Renter Info, Machine Specs, Payment Summary, Quick Actions.
- **Machines list page**: Table with status, model, serial, assigned renter.
- **Payments view**: Table of all payment events with status badges.
- **Maintenance view**: List of open/resolved issues across all renters.
- **Settings page**: Workspace defaults form (business name, default rate, install fee, late fee, min term, reminder timing).

## Phase 2: Backend + Auth (Next prompt)
- Enable Lovable Cloud (Supabase)
- Auth: email/password signup, login, password reset
- Database schema: workspaces, renters, machines, billing_schedules, payments, maintenance_logs, timeline_events, offboarding_records
- RLS policies
- Wire all UI to real data

## Phase 3: Stripe Integration (Following prompt)
- Connect Stripe via Lovable's Stripe integration
- Operator connects Stripe account
- Create customers, set up recurring billing
- Webhook handling for payment succeeded/failed
- Auto-update paid-through dates and renter status

## Phase 4: Reminders, Offboarding & Polish
- Reminder state engine (due soon, overdue, failed)
- Operator-triggered reminder templates
- Offboarding workflow (termination, pickup scheduling, final balance)
- CSV export
- Edge cases and polish

## Design Execution
- **Status pills**: Solid background, `px-2 py-0.5 rounded-full text-xs font-medium` with semantic colors (green=active/paid, yellow=due soon, red=late/failed)
- **Data rows**: `h-12`, border-bottom, hover `bg-slate-50`
- **Cards**: Subtle box-shadow stack per design brief
- **Mono font** for serial numbers, balances, dates
- **No modals for simple edits** — inline edit or slide-over panels
- **Clinical voice**: "12 Overdue Renters", "Process Pickup", "Log Issue"

