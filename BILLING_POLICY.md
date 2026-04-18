# BILLING_POLICY.md — Product Billing Rules

This document defines billing behavior in plain language.

## A) SaaS plan policy (operator subscription)

1. Operators can upgrade/downgrade plans via billing management.
2. **Payments are non-refundable.**
3. Plan eligibility should be based on documented count rules.
4. If on a paid plan, UI should clearly show current billed plan.
5. Plan-change confirmation should show the best available Stripe-backed preview of what is due today instead of generic charge wording.

## B) Count semantics

Use explicit terms in code + UI:

1. **Operational renters**: non-archived renters (day-to-day operations)
2. **Billable renters**: renters counted for plan billing enforcement

Do not use ambiguous “renter count” without context.

## C) Archive anti-gaming policy (target behavior)

To prevent “archive on billing day, unarchive later” abuse:

1. Archived renters remain billable for 30 days.
2. During this 30-day window, plan enforcement still counts them.
3. After cooldown expires, they no longer count toward billable renters (unless unarchived).

This keeps policy simple and auditable; no rolling-average math.

## D) UX messaging policy

Tell users this policy clearly but minimally:

1. At archive action: short note that archived renters remain billable for 30 days.
2. In Settings > Your Plan: compact explanatory line.
3. Avoid repeated global warnings.

## E) Engineering enforcement policy

Any path that can create renters must enforce same plan logic:

1. Add Renter flow
2. Import renters flow
3. Any future bulk/API renter creation flow

No exceptions.
