# Coherence & Guardrails Pass

## Diagnosis

### 1. Machine assignment source-of-truth is inconsistent

`MachinesList.tsx` line 21 resolves assignment via `renters.find(r => r.machine_id === machineId)` — the legacy `renter.machine_id` column. But all write paths (RenterDetail assign/unassign, ImportPage linking) use `machine.assigned_renter_id`. The canonical relation is `machines.assigned_renter_id` (has a foreign key `machines_assigned_renter_id_fkey`). The read in MachinesList must match.

### 2. Route duplication in App.tsx

Lines 81-91 duplicate the same 10 routes already defined in `PAGE_ROUTES` (lines 28-41). The `PAGE_ROUTES` fragment is already used by demo mode but not by the real authenticated routes.

### 3. No meaningful regression tests exist

Only a placeholder `example.test.ts` exists. No coverage for billing status values, webhook timeline types, or machine assignment display logic.

### 4. README is a placeholder

Contains only "TODO: Document your project here."

### 5. Already fixed in prior pass (no action needed)

- `send-billing-reminders` auth guard: already in place (lines 23-31)
- `send-billing-reminders` payment status: already writes `"overdue"` (line 140)
- `stripe-webhook` timeline type `payment_method_saved`: already mapped in RenterDetail (line 22)

---

## Plan

### Task 1: Fix MachinesList assignment lookup

**File: `src/pages/MachinesList.tsx**`

Replace:

```ts
const getRenterForMachine = (machineId: string) => renters.find(r => r.machine_id === machineId);
```

With a lookup using `machine.assigned_renter_id`:

```ts
const getRenterName = (machine: MachineRow) => {
  if (!machine.assigned_renter_id) return null;
  return renters.find(r => r.id === machine.assigned_renter_id);
};
```

Update the call site at line 82 to pass the machine object instead of `m.id`. Remove the `useRenters` import dependency on `machine_id`.

**Canonical relation after fix**: `machines.assigned_renter_id → renters.id` for all reads and writes.

### Task 2: Deduplicate routes in App.tsx

Replace lines 81-91 (the duplicated real-mode routes) with `{PAGE_ROUTES}`, matching how demo mode already uses it. The `PAGE_ROUTES` fragment uses relative paths (`path="renters"` not `path="/renters"`), which works correctly inside a layout route element.

**File: `src/App.tsx**` — replace the 10 explicit `<Route>` elements with `{PAGE_ROUTES}`.

### Task 3: Add targeted regression tests

**File: `src/test/machine-assignment.test.tsx**`

- Test that MachinesList renders the assigned renter name using `assigned_renter_id` (not `machine_id`)
- Mock data: machine with `assigned_renter_id` pointing to a renter, verify renter name appears

**File: `src/test/machine-assignment.test.tsx**`****

**- Test that** `MachinesList` **renders the assigned renter name using** `machine.assigned_renter_id`

**- Mock data: machine with** `assigned_renter_id` **pointing to a renter, verify renter name appears**

**- Also verify a renter with legacy** `machine_id` **but no matching** `assigned_renter_id` **does not drive the displayed assignment**

**File: `src/test/renter-detail-timeline.test.tsx**`****

**- Test that** `RenterDetail` **renders the** `payment_method_saved` **timeline event with the expected icon / label path**

**- Mock timeline data including** `payment_method_saved`**, verify the event renders correctly and does not fall through to an unhandled state**

**File: `src/test/import-linking.test.tsx**`****  

**- Add a small fixture-based regression test around the import/linking flow or helper directly involved in machine↔renter linking**

**- Prove imported/linking data respects the canonical relation** `machines.assigned_renter_id`

**- Keep this narrow and behavior-focused, not a broad import-suite buildout**

**These should be small, pragmatic regression tests aimed at the exact areas that recently drifted.**

**Do not invent new helpers or abstractions just to make tests easier.**

**Prefer testing existing behavior and source-of-truth assumptions directly.**

Do not extract new helpers solely to make tests easier. Test existing behavior directly unless a tiny extraction is already necessary for production clarity.

&nbsp;

### Task 4: Replace README with architecture doc

**File: `README.md**` — replace TODO with:

- App overview (vertical SaaS for washer/dryer rental operators)
- Entry points (`src/main.tsx`, `src/App.tsx`)
- Feature areas (dashboard, renters, machines, payments, maintenance, settings, import)
- Real mode vs demo mode structure
- Key hooks: `useSupabaseData`, `useSubscription`, `useAuth`
- Canonical machine assignment: `machines.assigned_renter_id`
- Edge function matrix with trust level (service-role-only vs user-authenticated vs webhook)
- Billing/reminder/webhook locations
- Repo rules: no silent enum drift, edge functions must enforce caller trust, source-of-truth changes must be documented

### Not changed

- `useSupabaseData.ts` — left alone, no split
- Machine type / payment type constants — already verified consistent
- No styling or UI changes beyond the assignment lookup fix
- No edge function changes (auth guard and status already fixed)

---

## Files changed summary


| File                                       | Change                                                                               |
| ------------------------------------------ | ------------------------------------------------------------------------------------ |
| `src/pages/MachinesList.tsx`               | Fix assignment lookup to use `machine.assigned_renter_id`                            |
| `src/App.tsx`                              | Replace duplicated real-mode routes with `{PAGE_ROUTES}`                             |
| `src/test/machine-assignment.test.tsx`     | New: assignment display contract test                                                |
| `src/test/renter-detail-timeline.test.tsx` | New: regression test for `payment_method_saved` timeline rendering                   |
| `src/test/import-linking.test.tsx`         | New: narrow regression test for canonical machine↔renter linking in import/link flow |
| `README.md`                                | Replace TODO with architecture/source-of-truth doc                                   |
