# Pilot Readiness Test Plan (Live-Key Confidence vs Test-Key Confidence)

This plan is designed to prevent embarrassing demos and raise confidence that LaundryLord works in real operator conditions.

## 1) Why this plan is split into AI-doable vs human-only tests

Some test coverage can be run repeatedly and deterministically in CI/local (AI-doable), while some high-risk flows require real external systems and human judgment (human-only), especially around Stripe live behavior, onboarding quality, and demo safety.

- **AI-doable** = can be validated from code and automated tests in this repo.
- **Human-only** = requires real Stripe dashboards/events, real key context, UX judgment, or production environment checks.

## 2) Current confidence from existing automated coverage (AI-doable today)

### A. Plan gating and upgrade messaging (automated)

1. Free-tier cap behavior at 10 billable renters and upgrade messaging to Starter.
2. Starter-tier capacity behavior and blocked state at 24 with Growth upgrade CTA.
3. Subscription capacity resolution logic around `canAddRenter` and next upgrade target.

Files:
- `src/test/renters-plan-gating.test.tsx`
- `src/test/use-subscription-capacity.test.ts`

### B. Import behavior and plan-enforcement parity (automated)

1. Import preview paging, remove/undo behavior, and result summaries.
2. Plan-slot blocking behavior for renters during import.
3. Import engine coercion and warning behavior for mapped values.
4. Plan-limit backend error reclassification (`blocked_by_plan`) and stopping subsequent renter inserts.
5. Custom field creation/reuse behavior from unmapped import columns.

Files:
- `src/test/import-page.test.tsx`
- `src/test/import-engine.test.ts`

### C. Canonical machine assignment source-of-truth (automated)

1. Machine-to-renter linking uses `machines.assigned_renter_id`.
2. Legacy `renters.machine_id` is not treated as canonical.

Files:
- `src/test/machine-assignment.test.tsx`
- `src/test/import-linking.test.tsx`

### D. Timeline/event mapping and settings sync behavior (automated)

1. Backend-written timeline event types are represented in Renter Detail icon mapping.
2. Subscription success callback on Settings triggers subscription refresh.

Files:
- `src/test/renter-detail-timeline.test.tsx`
- `src/test/settings-subscription-success.test.tsx`

### E. Custom-field rendering separation in renter detail (automated)

1. Custom fields render independently from notes and are visible in renter detail.

File:
- `src/test/renter-custom-fields.test.tsx`

## 3) AI-doable tests to add before pilot (high confidence, no human needed)

> Goal: make your automated suite catch demo-killing regressions before humans touch live/test Stripe.

### P0 (must add)

1. **Boundary-cap table tests** for `10`, `24`, `49`, `74`, `99` against `resolveSubscriptionCapacity` and CTA tier mapping.
2. **Archive cooldown counting tests** in `useSubscription`: archived renters with future `billable_until` count toward `billableCount`, expired ones do not.
3. **Create Machine gating parity tests** (same gating semantics as Add Renter).
4. **Import cap parity tests** at each boundary (`10/24/49/74/99`) for renter imports.
5. **Webhook contract tests** for `invoice.payment_succeeded`, `invoice.payment_failed`, and `customer.subscription.deleted` side effects on renters/payments/timeline rows.
6. **Setup-link + subscription activation negative-path tests** (missing Stripe key, missing payment method, stale customer ID recovery).

### P1 (strongly recommended)

1. **Machine map data-contract tests**: unassigned/no-address/un-geocodable machines classified into “Not on Map”.
2. **Renter detail billing-state tests** for `no_stripe`, `no_card`, `no_autopay`, `active` UI/action branches.
3. **Enum drift tests** ensuring persisted statuses/types remain in canonical README set.
4. **Demo-vs-real route parity smoke tests** across shared route tree (`PAGE_ROUTES`).

## 4) Bare-minimum human pilot checklist (must run yourself)

> This is the minimum set I recommend before any serious pilot demo.

### A. Stripe and autopay confidence (test keys first, then live keys)

1. **Operator Stripe key save/verify**
   - Save `sk_test_...` in Settings.
   - Confirm “Connected” status appears and account name resolves.
2. **Setup link lifecycle**
   - Send setup link from renter detail.
   - Complete Stripe setup session.
   - Verify renter flips to `has_payment_method=true` and timeline logs payment-method-saved event.
3. **Autopay activation**
   - Start autopay and verify `stripe_subscription_id` appears, renter status transitions appropriately, and `next_due_date` is set.
4. **Invoice success + failure behavior (Stripe test clock/time travel)**
   - Advance time to trigger recurring invoice.
   - Validate success path updates `balance`, `rent_collected`, `paid_through_date`, `next_due_date`, adds payment row and timeline event.
   - Simulate failure path; validate late status/balance/days late + failed payment row + timeline event.
5. **Late fee automation**
   - Trigger `send-billing-reminders` path for overdue renters and confirm one-time-per-cycle late-fee behavior and payment insertion with status `overdue`.
6. **Live key smoke** (very small controlled amount)
   - Repeat one complete renter setup + first charge using `sk_live_...` in a controlled environment.
   - Confirm webhook receipts in live Stripe dashboard and Supabase side effects.

### B. Import confidence (renters + machines)

1. Import renters with:
   - clean rows,
   - invalid dates/rates,
   - extra custom columns,
   - blank rows,
   - duplicates (to verify current importer behavior is understood).
2. Import machines with mixed statuses and partial rows.
3. Validate summaries: imported / blocked_by_plan / failed_insert / skipped_empty / deleted_by_operator.
4. Validate post-import counts in Renters/Machines pages.
5. Validate custom columns become custom fields and appear in renter detail.

### C. Add/create + assignment confidence

1. Create renter manually from UI.
2. Create machine manually from UI.
3. Assign and unassign machine from renter detail.
4. Confirm machine assignment appears consistently in:
   - Machines list,
   - Renter detail,
   - Machine map.

### D. Demo-safety confidence (avoid embarrassing demos)

1. Run the same navigation script in **real mode** and **demo mode**:
   - Dashboard → Renters → Renter Detail → Machines → Machine Map → Payments → Maintenance → Settings → Import.
2. Ensure no broken pages, missing sidebars, route drift, or obvious copy drift.
3. Verify machine map loads quickly with warmed cache and with cold cache.
4. Verify settings and plan section copy are clear when blocked/upgrading.

## 5) Live-key confidence criteria (go/no-go)

Before live pilot, require all of:

1. One successful end-to-end renter autopay cycle on live keys.
2. One failed-payment scenario verified on non-production renter.
3. One import run for renters and one for machines with post-import spot checks.
4. One archive/unarchive cycle verifying 30-day billable cooldown behavior in plan counts.
5. One complete demo dry run without any manual “reload/fix/ignore” moments.

If any of the above fails, do not call pilot-ready.

## 6) Known risk surfaces to treat as explicit checks

1. **Webhook trust/routing limitation:** current webhook implementation notes a single webhook secret limitation for multi-operator Stripe setups.
2. **Import duplicates:** current UI explicitly warns duplicates are not checked by importer.
3. **Plan-gating consistency:** add-renter, add-machine, and import flows must stay aligned at every boundary cap.
4. **Archive billing cooldown:** archived renters should remain billable for 30 days in enforcement logic.

## 7) Suggested pilot execution order (practical)

1. Run all automated tests (`lint`, `test`, `build`).
2. Run full Stripe **test-key** matrix with Stripe test clock/time travel.
3. Run importer matrix (renters + machines) with realistic “messy” files.
4. Run one internal demo rehearsal using demo mode and real mode.
5. Run minimal **live-key** smoke matrix with controlled renters.
6. Freeze build for pilot demo.

## 8) Clarifications I need from you to tighten this further

1. Are you piloting with **single operator only** first, or multiple operators concurrently?
2. Do you expect ACH (`us_bank_account`) to be part of initial pilot, or card-only for now?
3. Should “pilot-ready” include email deliverability verification (SPF/DKIM/domain reputation), or only app-side send success?
4. Do you want “machines-only import unaffected by plan” to remain strict behavior for pilot?
5. Do you want me to draft an exact click-by-click **60-minute pilot rehearsal script** next?
