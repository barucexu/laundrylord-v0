

# LaundryLord v2: Operator Mission Control + Water Theme

This is a large upgrade covering 4 workstreams: database schema changes, dashboard overhaul with real KPIs + charts, manual payment logging, CSV import, multi-machine support, new record fields, and a water/laundry-themed color palette. All existing auth, routing, Stripe, and billing logic preserved.

---

## Color Scheme: Water / Laundry Theme

Update `src/index.css` CSS variables to shift from generic slate-blue to a **water-themed palette**:

- **Primary**: Ocean blue (`205 78% 48%` → clean water blue)
- **Background**: Very light sky blue tint (`200 20% 97%`)
- **Cards**: Pure white with soft blue-tinted borders (`200 18% 92%`)
- **Success**: Fresh aqua-green (`168 56% 38%`)
- **Warning**: Warm amber (kept)
- **Destructive**: Coral red (kept, slightly softened)
- **Sidebar**: Deep navy (`210 35% 10%`) with ocean-blue accents
- **Muted**: Cool blue-gray tones throughout

This gives a pleasant "clean water / fresh laundry" feel without being garish.

---

## Database Migrations (3 migrations)

### Migration 1: `payment_source` on payments
```sql
ALTER TABLE payments ADD COLUMN payment_source text DEFAULT 'stripe';
ALTER TABLE payments ADD COLUMN payment_notes text DEFAULT '';
```

### Migration 2: Machine cost tracking
```sql
ALTER TABLE machines ADD COLUMN cost_basis numeric DEFAULT 0;
ALTER TABLE machines ADD COLUMN sourced_from text DEFAULT '';
```

### Migration 3: Extended renter fields
```sql
ALTER TABLE renters ADD COLUMN secondary_contact text DEFAULT '';
ALTER TABLE renters ADD COLUMN language text DEFAULT 'English';
ALTER TABLE renters ADD COLUMN install_notes text DEFAULT '';
```

No migration needed for multi-machine — `machines.assigned_renter_id` already exists. We switch from `renters.machine_id` to querying machines by `assigned_renter_id`.

---

## Workstream 1: Dashboard Overhaul

**File: `src/pages/Dashboard.tsx`** — Full rewrite.

### KPI Cards Row (6 cards, matching mockup style)
- **Active Renters** — `renters.filter(status=active).length`
- **MRR** — `SUM(monthly_rate)` of active renters
- **Total Revenue** — `SUM(amount)` of paid payments
- **Overdue Balance** — `SUM(balance)` of renters with balance > 0
- **On-Time Rate** — `paid / (paid + failed + overdue)` as percentage
- **Monthly Churn** — renters moved to closed/defaulted in last 30d / active at period start

### Sections Below KPIs
1. **Monthly Revenue Chart** — Recharts `BarChart` grouping paid payments by month (uses existing `chart.tsx` wrappers). Water-blue bars.
2. **Due Today / Overdue Now** — List of renters with `next_due_date = today` or `status = 'late'`, clickable to detail. Red highlight for overdue.
3. **Recent Payments** — Last 10 payments with source badge (Stripe, Zelle, Cash, etc.)
4. **Open Maintenance** — Kept from current, refined
5. **Inventory Snapshot** — Machines by status (available/assigned/maintenance/retired) + prong breakdown (3-prong vs 4-prong counts)

### Support Footer
Add subtle "Questions or feature requests? Email don.brucexu@gmail.com" text at bottom of dashboard.

---

## Workstream 2: Manual Payment Logging

### New file: `src/components/RecordPaymentDialog.tsx`
- Dialog with fields: amount, date (datepicker), payment source (Select: Stripe / Square / Zelle / Venmo / CashApp / Apple Pay / Cash / Other), notes
- On submit: inserts into `payments` table with `status: 'paid'`, `paid_date`, `payment_source`
- Updates renter: reduces `balance`, updates `paid_through_date` if fully paid

### New hook: `useCreatePayment` in `src/hooks/useSupabaseData.ts`

### Modified: `src/pages/RenterDetail.tsx`
- Add "Record Payment" button in billing card
- Payment history rows show payment source as a colored pill badge

### Modified: `src/pages/PaymentsView.tsx`
- Add `Source` column to table
- Add source filter dropdown alongside status filter

### New component: `src/components/PaymentSourceBadge.tsx`
- Colored pills for each source (Stripe=purple, Zelle=blue, Venmo=teal, CashApp=green, Cash=gray, etc.)

---

## Workstream 3: CSV Import

### New file: `src/pages/ImportPage.tsx`
- Tab selector: Customers / Machines
- Step 1: File upload (drag-and-drop CSV)
- Step 2: Column mapping (auto-detect common headers, dropdown overrides)
- Step 3: Preview first 10 rows with validation highlights
- Step 4: Import button → batch insert via Supabase
- Customer fields: name, phone, email, address, monthly_rate, balance, paid_through_date, notes, status
- Machine fields: type, model, serial, prong, condition, cost_basis, sourced_from, notes
- Support contact prominently shown: "Need help? Email don.brucexu@gmail.com for free human-assisted data upload"
- Uses `papaparse` for CSV parsing (add to dependencies)

### Modified: `src/App.tsx` — Add `/import` route
### Modified: `src/components/AppSidebar.tsx` — Add "Import" nav item with Upload icon

---

## Workstream 4: Record Upgrades

### Multi-Machine Support
**`src/hooks/useSupabaseData.ts`**: Add `useMachinesForRenter(renterId)` — queries machines where `assigned_renter_id = renterId`

**`src/pages/RenterDetail.tsx`**: Replace single machine select with:
- List of assigned machines as small cards
- "Assign Machine" button to add from available machines
- Each machine card has unassign button
- Backward compat: reads from both `machine_id` and `assigned_renter_id`

### New Renter Fields
**`CreateRenterDialog.tsx`** and **`EditRenterDialog.tsx`**: Add secondary_contact, language (Select: English/Spanish/Other), install_notes (Textarea)

**`RenterDetail.tsx`**: Show these in sidebar Contact and Lease cards

### New Machine Fields
**`CreateMachineDialog.tsx`** and **`EditMachineDialog.tsx`**: Add cost_basis ($ input), sourced_from (text)

**`MachinesList.tsx`**: Add "Cost" column to table

---

## Workstream 5: Support Contact Integration

**`src/components/AppLayout.tsx`**: Add subtle support footer below main content: "Questions or feature requests? don.brucexu@gmail.com"

Also shown prominently on:
- Import page (above upload area)
- Settings page (bottom)
- Sidebar footer (below sign out, when expanded)

---

## Files Changed Summary

**New files (4)**:
- `src/components/RecordPaymentDialog.tsx`
- `src/components/PaymentSourceBadge.tsx`
- `src/pages/ImportPage.tsx`

**Database**: 3 SQL migrations

**Modified files (14)**:
- `src/index.css` — water-themed color palette
- `src/pages/Dashboard.tsx` — full KPI + chart + sections overhaul
- `src/pages/RenterDetail.tsx` — multi-machine, record payment, new fields
- `src/pages/PaymentsView.tsx` — source column + filter
- `src/pages/MachinesList.tsx` — cost basis column
- `src/pages/RentersList.tsx` — minor column additions
- `src/components/CreateRenterDialog.tsx` — new fields
- `src/components/EditRenterDialog.tsx` — new fields
- `src/components/CreateMachineDialog.tsx` — cost basis, sourced from
- `src/components/EditMachineDialog.tsx` — cost basis, sourced from
- `src/components/AppSidebar.tsx` — Import nav + support email
- `src/components/AppLayout.tsx` — support footer
- `src/hooks/useSupabaseData.ts` — new hooks
- `src/App.tsx` — /import route

**Implementation order**: Migrations → Color theme → Dashboard → Manual payments → Record upgrades → CSV import → Support contact

