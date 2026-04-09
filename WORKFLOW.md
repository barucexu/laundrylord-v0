# WORKFLOW.md

LaundryLord default development workflow for humans and coding agents.

## Why this file exists

This file turns "be careful" into a repeatable loop. Use it when a task is large enough that improvising would create avoidable rework.

## What a "pass" means

A pass is one bounded step with one job.

1. Planning pass: produce the plan only
2. Review pass: critique a plan or implementation only
3. Implementation pass: make the approved code changes only
4. Validation pass: run checks and summarize evidence only

Avoid mixing all four jobs together on medium or large work unless the user explicitly wants speed over rigor.

## Task sizing

### Small task

Examples:

1. One-file copy tweak
2. Small isolated bug fix
3. Narrow UI cleanup with no business-logic change

Default loop:

1. Quick plan
2. One implementation pass
3. One review or validation pass

### Medium task

Examples:

1. Multi-file feature addition in one domain
2. Import or plan-gating fix
3. UI change that touches both demo and authenticated shells

Default loop:

1. Planning pass
2. Fresh review pass on the plan
3. One implementation pass, or phased implementation if risk is moderate
4. Fresh review pass on the result
5. Validation pass

### Large task

Examples:

1. Cross-domain feature
2. Billing or enforcement overhaul
3. Large import/data model change
4. Work that touches frontend, hooks, backend functions, and tests together

Default loop:

1. Planning pass
2. Fresh review pass on the plan
3. Phase 1 implementation pass
4. Fresh review pass
5. Phase 2 implementation pass
6. Fresh review pass
7. Continue until done
8. Final validation and review pass

## Phasing rules

Use phases when:

1. The task touches multiple domains
2. The task can leave the app in a partially correct state
3. The task affects billing, imports, source-of-truth logic, or route structure

Each phase should have:

1. A clear deliverable
2. A clear validation target
3. A clear stop point for review

Do not define phases like "frontend" and "backend" unless those are independently verifiable. Prefer phases like:

1. Centralize authoritative logic
2. Wire UI to the authoritative helper
3. Add or repair tests and docs

## Review checkpoints

Stop for a review when:

1. A plan is written for medium or large work
2. A phase is declared complete
3. The task changes billing, imports, enforcement, machine assignment, or shared shell behavior

If a fresh reviewer is available, use one. If not, do a strict self-review and say that independent review was not available.

## Repo-specific must-check areas

Before implementation:

1. Read `README.md`, `RULES.md`, and `ARCHITECTURE.md`
2. Add `BILLING_POLICY.md` and `QA_RUNBOOK.md` for billing/import/enforcement work
3. Inspect the current implementation before editing; do not rely on memory

During implementation:

1. Keep real and demo flows in mind when changing shell, sidebar, or route behavior
2. Keep add/create and import paths aligned when changing enforcement
3. Keep server-enforced behavior aligned with frontend messaging

Before wrapping up:

1. Run relevant validation
2. Summarize risks, assumptions, and any skipped checks
3. Confirm docs are updated when logic or policy changed

## Branch and SHA workflow

For medium or large work, prefer a feature branch.

Before starting work in cloud or any detached environment:

1. Confirm the branch name
2. Confirm the full HEAD commit SHA
3. Confirm the latest one-line commit message
4. If you expect a specific starting commit, confirm that HEAD begins with the expected short SHA
5. If remote state cannot be verified, say so before continuing

## Prompt template for cloud work

Use a prompt like this when repo freshness matters:

```text
Before doing any work:
1. Print the current branch name.
2. Print the full HEAD commit SHA.
3. Print the latest one-line commit message.
4. Confirm whether HEAD starts with this expected short SHA: <paste short SHA>.
5. If it does not match, stop.
6. If remote state cannot be verified in this environment, say so clearly before continuing.

Then read AGENTS.md and the repo docs it references, produce a plan if the task is non-trivial, and do not start risky implementation until the plan has been reviewed.
```

## Local vs cloud guidance

Use local when:

1. You want tight back-and-forth iteration
2. You need direct access to your running app or local tools
3. You want the agent to coordinate multiple sub-steps in the same workspace session
4. You want to test against the hosted Supabase backend through local frontend env values

Use cloud when:

1. The task may run for a long time unattended
2. You want background execution
3. You want to minimize dependence on your laptop staying awake and connected

Database note:

1. Do not assume all agents have the same database capabilities
2. In Lovable, use the managed database tooling when direct migration/query/deploy work is part of the task
3. In external Codex sessions, first check whether the environment actually exposes a supported DB access path
4. If it does not, prefer repo migrations and code changes, and say clearly that execution must flow through Lovable or another supported pipeline

## Definition of done

A task is not done unless:

1. The requested behavior is implemented
2. Relevant validations have been run or explicitly skipped with reason
3. Docs are updated if logic or policy changed
4. The result has been reviewed at the level appropriate to the task size
