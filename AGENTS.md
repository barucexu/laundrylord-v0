# AGENTS.md

Shared instructions for coding agents working in the LaundryLord repo.

## Why this file exists

Use this file like teams use `CLAUDE.md`: keep durable repo-specific rules here, update it when an avoidable mistake happens, and treat it as the shortest safe path into the codebase.

## Start here

Read these before making meaningful changes:

1. `README.md` for product map, routes, data flows, canonical value sets, and key entry points
2. `RULES.md` for non-negotiable engineering guardrails
3. `ARCHITECTURE.md` for system boundaries, especially SaaS billing vs renter billing
4. `WORKFLOW.md` for the default plan -> implement -> review operating loop
5. `REVIEW_STANDARD.md` for what counts as an acceptable plan review or implementation review
6. `BILLING_POLICY.md` when changing pricing, plan gating, archive semantics, or billable-count logic
7. `QA_RUNBOOK.md` when touching pricing, billing, imports, or enforcement

## Current project direction

1. Prefer the current branch plus explicit user guidance over assumptions from recent history
2. Treat billing, enforcement, and import behavior as high-risk product surfaces that need deliberate review
3. Preserve simple, centralized business logic over UI-local conditionals
4. Be cautious with real/demo UI drift; shared behavior matters more than cosmetic divergence
5. When changing UI, preserve existing product direction unless the user explicitly asks for redesign work

## Repo truths to preserve

1. Machine assignment source of truth is `machines.assigned_renter_id`
2. Do not introduce logic that reads `renters.machine_id` as canonical
3. Machine assignment mutations should use the guarded assign/unassign hooks and `src/lib/machine-assignment.ts`, not ad hoc `useUpdateMachine` calls or UI-only availability filters
4. SaaS billing and renter billing are separate systems with separate key and trust contexts
5. Persisted enums and status values cannot drift silently; update docs, UI mappings, and tests together
6. Enforcement-critical fixes must live in authoritative logic, not only in UI disabled states
7. Import flows must respect the same plan and data-integrity rules as add/create flows
8. Demo and authenticated experiences should not drift in navigation, shell behavior, or page availability without an explicit product reason
9. This project uses a Lovable Cloud-managed Supabase backend; distinguish between Lovable-internal database capabilities and external agent capabilities before promising DB work

## Supabase DB change handling in this environment

1. Codex cannot apply SQL directly to your live Supabase project
2. For schema/data changes, provide explicit SQL that the user can run manually in Lovable's Supabase SQL interface
3. When SQL is required, clearly label what to run, where to run it, and any ordering/rollback notes
4. In this project, SQL can be run manually in the SQL editor, but Edge Function deployment should be treated as a Lovable-managed action unless a separate supported deployment path is explicitly confirmed

## Key implementation hotspots

Inspect these files before changing the related area:

1. Routing / mode split: `src/App.tsx`
2. Shared authenticated shell: `src/components/AppLayout.tsx`, `src/components/AppSidebar.tsx`
3. Demo shell path: `src/components/DemoLayout.tsx`, `src/components/DemoSidebar.tsx`
4. Supabase CRUD hooks: `src/hooks/useSupabaseData.ts`
5. Plan enforcement and billing counts: `src/hooks/useSubscription.ts`, `src/lib/pricing-tiers.ts`
6. Import flow: `src/pages/ImportPage.tsx`, `src/utils/import/*`
7. Renter center of gravity: `src/pages/RenterDetail.tsx`
8. Machine assignment helpers: `src/lib/machine-assignment.ts`, `src/components/RenterMachineAssignments.tsx`
9. Backend enforcement and billing functions: `supabase/functions/*`

## Change discipline

1. Keep changes small and scoped to one problem area
2. Avoid unrelated refactors in fix-focused work
3. Reuse canonical helpers and hooks instead of duplicating business logic
4. If logic changes, update the relevant docs in the same change
5. If policy, workflow, or review expectations change, update this file and the companion workflow docs together
6. If a source of truth changes, update `README.md`
7. If a shell or sidebar change is made, inspect both authenticated and demo paths before wrapping up

## Planning standard

Use the workflow in `WORKFLOW.md` for non-trivial work. At minimum, a written plan should include:

1. Problem statement
2. Scope and non-goals
3. Constraints pulled from repo docs
4. Touched files or modules
5. Risks and likely regressions
6. Validation plan
7. If large enough, a phased rollout with explicit stop points

Do not start large or risky implementation before this plan exists.

## Review standard

Use `REVIEW_STANDARD.md`.

For medium or large work, use a fresh review context between planning and implementation when the client/runtime supports it. If the environment cannot create a fresh reviewer, perform a strict self-review and explicitly say that the independent review step was unavailable.

For multi-phase work, stop after each declared phase and verify that:

1. The phase deliverable is complete
2. Relevant tests or checks for that phase have run
3. Known risks for the phase are documented
4. The next phase still makes sense given what was learned

## Validation commands

This repo currently exposes these package scripts:

```sh
npm run dev
npm run build
npm run lint
npm run test
```

Notes:

1. Use the existing `package.json` scripts instead of inventing ad hoc commands
2. Default to `npm run ...` because `package-lock.json` is present
3. Run targeted validation when possible, but do not skip `lint`, `build`, or `test` when the change affects shared logic broadly

## Extra checks for pricing, billing, import, and enforcement changes

Before wrapping up, confirm:

1. Boundary behavior at counts `10`, `24`, `49`, `74`, `99`, `199`, `399`, `699`, `999`, and `1000+`
2. Import-path parity with add/create flows
3. Archive/unarchive impact on plan enforcement
4. Upgrade CTA correctness
5. No renter-billing regressions
6. Canonical machine assignment still uses `machines.assigned_renter_id`
7. Persisted timeline/payment/status values still match the documented canonical sets

## Branch and repo-state hygiene

1. Prefer feature branches for medium or large work instead of committing directly to `main`
2. Before large changes, confirm the starting branch and HEAD commit SHA
3. If working in a cloud or detached environment, do not assume the repo is current without an explicit branch/SHA check
4. If the environment cannot verify remote state, say so clearly before continuing with risky work
5. If the user has asked for implementation rather than planning-only, default to committing, pushing, opening a PR, and merging after validation passes unless the user explicitly says not to publish yet
6. After publishing code needed for Lovable testing, give the user a tiny Lovable-ready redeploy message naming only the changed edge functions that need redeploy

## Database access guidance

1. Local development may point at the hosted Supabase project when the safe frontend env values are present
2. In Lovable itself, database work can be done directly through the managed migration/query/deploy tooling with user approval
3. In external Codex sessions, do not claim direct database execution unless the environment actually exposes a supported DB access path
4. Never expose backend-only secrets such as `SUPABASE_SERVICE_ROLE_KEY` in frontend code or docs
5. If direct database access is unavailable in the current environment, say that clearly and fall back to repo migrations, code changes, or user-run steps as needed

## Final summary requirements

Call out:

1. What changed
2. What was validated
3. Any assumptions or skipped checks
4. Any remaining risks or follow-up review needs

## When to update this file

Update `AGENTS.md` when:

1. An agent repeatedly makes the same repo-specific mistake
2. A new source-of-truth rule is introduced
3. The expected planning or review workflow changes
4. A policy or architecture constraint becomes important enough to be part of the default agent brief
5. The project adds a new high-risk surface that should always be inspected before editing
