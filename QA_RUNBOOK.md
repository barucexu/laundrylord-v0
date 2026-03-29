# QA_RUNBOOK.md — Pricing & Enforcement

Use this runbook before merging any plan/billing enforcement change.

## 1) Boundary tests

- Count 10: blocked + actionable Starter upgrade CTA
- Count 24: blocked + actionable Growth upgrade CTA
- Count 49: blocked + actionable Pro upgrade CTA
- Repeat at 74 and 99

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

