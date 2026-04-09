# REVIEW_STANDARD.md

LaundryLord review standard for plans, implementations, and phase completions.

## Why this file exists

Reviews should reduce risk, not merely restate what changed. This file defines what a real review should look for.

## General review rule

Prioritize findings over praise.

If there are issues, list them first in severity order with the concrete risk. If there are no issues, say so explicitly and still mention residual uncertainty or untested areas.

## Plan review standard

A plan is acceptable only if it:

1. Identifies the real source-of-truth files and modules
2. Names the likely regression surfaces
3. Keeps scope tight
4. Includes validation
5. Uses phases only when those phases are independently reviewable

Reject or revise the plan if it:

1. Changes UI without naming the authoritative logic
2. Changes enforcement without covering import paths
3. Changes machine assignment without acknowledging `machines.assigned_renter_id`
4. Touches billing without separating SaaS billing from renter billing
5. Ignores demo/authenticated shell parity when changing shared navigation or layout behavior

## Implementation review standard

Check for:

1. Behavioral regressions
2. Source-of-truth violations
3. Missing validation
4. Logic duplication
5. Docs/tests drift
6. Real/demo drift where a shared behavior should stay aligned

## Repo-specific review checklist

### Billing / enforcement / import work

Review must confirm:

1. Boundary behavior at `10`, `24`, `49`, `74`, and `99`
2. Import path parity with add/create flows
3. Archive/unarchive impact on billable counts
4. Upgrade CTA correctness
5. No renter-billing regressions

### Machine assignment work

Review must confirm:

1. Canonical reads/writes use `machines.assigned_renter_id`
2. No new canonical dependency on `renters.machine_id`
3. Import and UI flows remain aligned with the canonical relation

### Timeline / persisted value work

Review must confirm:

1. Canonical value sets in `README.md` still match implementation
2. UI renderers still cover new or changed persisted values
3. Relevant tests were added or updated

### Shell / navigation work

Review must confirm:

1. Authenticated and demo shells were both inspected
2. Route availability still matches expectations
3. Sidebar or layout behavior did not drift unintentionally between modes

## Phase completion review

Do not approve a phase unless:

1. The declared deliverable is actually complete
2. The work compiles logically with surrounding code
3. The next phase is not relying on hidden cleanup from the previous one
4. Known risks have been surfaced

## Approval language

Use one of these outcomes:

1. Approved
2. Approved with minor follow-ups
3. Needs revision

Do not say "looks good" unless the review really found no meaningful issues.
