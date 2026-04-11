# QA_RUNBOOK.md — Pricing & Enforcement

Use this runbook before merging any plan/billing enforcement change.

## 1) Boundary tests

- Count 10: blocked + actionable Starter upgrade CTA
- Count 24: blocked + actionable Growth upgrade CTA
- Count 49: blocked + actionable Pro upgrade CTA
- Count 74: blocked + actionable Scale upgrade CTA
- Count 99: blocked + actionable Business upgrade CTA
- Count 199: blocked + actionable Enterprise upgrade CTA
- Count 399: blocked + actionable Portfolio upgrade CTA
- Count 699: blocked + actionable Empire upgrade CTA
- Count 999: blocked + actionable Ultimate upgrade CTA
- Count 1000+: Ultimate remains unlimited

## 2) Loading-state tests

- On first page load, Add buttons should not show wrong tier messaging.
- After state resolves, messaging must match actual target tier.

## 3) Import parity tests

- Free plan near cap: import only up to cap
- Paid required but unsubscribed: renter imports blocked
- Paid + subscribed near cap: import only to cap
- Machines-only import unaffected

## 4) Archive behavior tests

- Archive renter and verify movement to archive view
- Unarchive behavior is explicit and documented
- Verify count impact on enforcement logic
- If cooldown policy exists: archived renters still counted until cooldown expiry

## 5) Upgrade/downgrade UX tests

- Settings always shows plan controls
- Upgrade path destination is correct
- Downgrade disabled state correctly explains why when out of range

## 6) Regression tests (must stay green)

- Add Renter dialog submit hard-stop
- Add Machine dialog submit hard-stop
- PlanBanner CTA text/target
- Renter billing setup + activation still works

## 7) Multi-operator renter billing checks

- Operator A saves Stripe key + webhook signing secret and reaches renter-billing-ready state
- Operator B does the same with a different Stripe account
- Operator A sees a different webhook URL than Operator B
- A setup-link completion updates only A renter rows
- A successful renter payment updates only A renter/payment/timeline rows
- B events do not mutate A data, and A events do not mutate B data
- Wrong webhook token fails closed
- Wrong Stripe signature fails closed
- Replayed Stripe event is ignored after the first successful process
- If webhook setup is incomplete, renter setup-link and autopay actions are blocked in both UI and backend
