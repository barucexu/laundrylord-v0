# Stabilization Pass: Schema-Contract & Auth Fixes

## Diagnosis

### 1. Machine type — NO drift found

DB `machines.type` is `text` with no enum constraint. UI offers `washer`, `dryer`, `set` in both Create and Edit dialogs. Import fields map to the same values. No mismatch — these are consistent.

### 2. Payment type — NO drift found

DB `payments.type` is `text` with default `'rent'`. RecordPaymentDialog offers: `rent`, `install_fee`, `deposit`, `late_fee`, `other`. Webhook writes `rent`. Send-billing-reminders writes `late_fee`. All are valid free-text values with no enum constraint blocking them.

### 3. Payment status — **MISMATCH FOUND**

DB `payments.status` is `text` with default `'upcoming'`. The recognized set across UI (StatusBadge, PaymentsView filters) is: `upcoming`, `due_soon`, `overdue`, `failed`, `paid`.

`**send-billing-reminders` writes `status: "pending"` (line 130)** — this value is not in the recognized set. It will render as raw text "pending" in the UI with no styling. Should be `"overdue"` (it's a late fee applied after days_late threshold).

### 4. Timeline event type — **MISMATCH FOUND**

The `timelineIcons` map in RenterDetail recognizes: `created`, `machine_assigned`, `payment_succeeded`, `payment_failed`, `late_fee`, `maintenance_opened`, `maintenance_resolved`, `pickup_scheduled`, `pickup_completed`, `note`.

`**stripe-webhook` writes `type: "payment_method_saved"` (line 82)** — not in the icon map. It will render without an icon but won't crash. Should use a recognized value or be added to the icon map.

**Decision**: Add `payment_method_saved` to the `timelineIcons` map (it's a legitimate distinct event). This is the smallest fix — the webhook is correct in concept, the UI just doesn't have the icon mapping.

### 5. send-billing-reminders auth — **NO AUTH GUARD**

The function accepts any caller. It uses `SUPABASE_SERVICE_ROLE_KEY` internally to bypass RLS, but any unauthenticated HTTP request can trigger it. Should reject non-service-role callers explicitly.

## Plan

### ### File 1: `supabase/functions/send-billing-reminders/index.ts`

- **Line 130**: Change `status: "pending"` → `status: "overdue"` since the late fee is being applied after the renter is already overdue.

- **After the OPTIONS check**: Add an explicit service-role-only auth guard.

  - Do **not** use substring matching like `authHeader.includes(serviceKey)`.

  - Mirror the strictest existing service-role-only edge-function auth pattern already present elsewhere in this repo.

  - Prefer exact Authorization header validation for the expected `Bearer <service_role_key>` format.

  - Return 403 for any missing or invalid authorization.

  - Preserve valid scheduled / pg_cron invocation behavior if it already uses the service role key.

### File 2: `src/pages/RenterDetail.tsx`

- **Line 17-28**: Add `payment_method_saved: CreditCard` to the `timelineIcons` map (CreditCard is already imported)

### Files NOT changed

- CreateMachineDialog, EditMachineDialog — no drift found
- RecordPaymentDialog — no drift found
- stripe-webhook — timeline types `payment_succeeded`, `payment_failed`, `note` are all in the icon map; `payment_method_saved` fix is on the UI side
- No unrelated refactors

## Canonical persisted values after fix


| Domain               | Allowed values                                                                                                                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| machine.type         | `washer`, `dryer`, `set` (free text, no DB constraint)                                                                                                                                                 |
| payment.type         | `rent`, `install_fee`, `deposit`, `late_fee`, `other` (free text)                                                                                                                                      |
| payment.status       | `upcoming`, `due_soon`, `overdue`, `failed`, `paid` (free text)                                                                                                                                        |
| timeline_events.type | `created`, `machine_assigned`, `payment_succeeded`, `payment_failed`, `payment_method_saved`, `late_fee`, `maintenance_opened`, `maintenance_resolved`, `pickup_scheduled`, `pickup_completed`, `note` |


## QA Checklist

```text
PAYMENT STATUS FIX
[ ] Trigger send-billing-reminders for a renter with days_late >= late_fee_after_days
[ ] Verify the resulting payment row has status "overdue" not "pending"
[ ] Verify the payment renders correctly in PaymentsView with proper badge

TIMELINE ICON FIX
[ ] View a renter who completed Stripe setup (has payment_method_saved event)
[ ] Verify the CreditCard icon appears next to the event in timeline

AUTH GUARD
[ ] Call send-billing-reminders with anon key → expect 403
[ ] Call send-billing-reminders with service role key → expect 200
[ ] Scheduled cron invocation still works (uses service role)

NO REGRESSIONS
[ ] Create machine (washer/dryer/set) — all succeed
[ ] Edit machine — all types persist correctly
[ ] Record payment — all types persist correctly
[ ] Stripe webhook events still process (payment_succeeded, payment_failed, subscription.deleted, checkout.session.completed)
```