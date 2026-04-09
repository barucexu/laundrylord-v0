# RULES.md — Engineering Guardrails

This file is the non-negotiable implementation contract for human + AI contributors.

## 1) Change discipline

1. **Small, isolated changes only.**
   - One problem area per PR.
   - No unrelated refactors in bugfix PRs.
2. **No silent behavior changes.**
   - If business logic changes, update docs + QA checklist in same PR.
3. **No duplicate business logic.**
   - Reuse canonical helpers/hooks (especially plan/tier logic).
4. **No “UI-only fixes” for enforcement bugs.**
   - Enforcement-critical logic needs an authoritative path, not just button disabling.

## 2) Source-of-truth rules

1. **Renter plan enforcement source of truth** lives in subscription/plan logic.
2. **Machine assignment source of truth** is `machines.assigned_renter_id`.
3. **SaaS billing and renter billing are separate systems**:
   - SaaS (platform billing): platform Stripe env key paths.
   - Renter billing (operator collects from renters): operator key from `stripe_keys`.
4. **Archived status semantics must be explicit** and documented (ops count vs billable count).

## 3) Safe shipping checklist (must pass)

Every PR touching pricing/billing/enforcement must include:

1. Boundary behavior at count caps (10/24/49/74/99/199/399/699/999 and 1000+ Ultimate).
2. Import path parity with add/create path.
3. Archive/unarchive behavior impact on plan enforcement.
4. Upgrade CTA correctness and destination correctness.
5. No renter billing regressions.

## 4) Messaging standards

1. Be clear, short, and consistent.
2. Show policy warnings only where action occurs (avoid repetitive nagging).
3. For billing policy notices, prefer:
   - archive action context
   - Settings > Your Plan context

## 5) PR quality bar

A PR is not ready unless it contains:

1. Scope statement (what changed / what did not change)
2. Risks + mitigations
3. Explicit test evidence
4. Doc updates when logic changes

## 6) Database execution boundaries

1. Do not conflate Lovable-internal capabilities with external Codex capabilities.
2. In Lovable Cloud, database migrations, read queries, Edge Function deploys, and secret checks may be executed through Lovable's managed tooling with approval.
3. In external Codex environments, frontend Supabase env values are not enough to claim direct schema or admin-level data access.
4. When external direct DB access is unavailable, author changes in `supabase/migrations/` and route execution through Lovable or another supported deployment path.
5. For DB/schema/data tasks that require manual execution, provide runnable SQL for Lovable's Supabase SQL interface.
6. Clearly separate "SQL to run manually" from repo code changes, including execution order and rollback guidance when relevant.
