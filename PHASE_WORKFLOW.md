# PHASE_WORKFLOW.md

LaundryLord phase-thread workflow for humans and coding agents.

## Why this file exists

Multi-phase work is easier to manage when each implementation thread has one clear scope and one approved handoff. This file keeps phase execution aligned with the master planning thread instead of letting status and next steps drift across sessions.

## Core rule

When the user says "work on Phase X" or similar, first check whether the current session already has a focused Phase X handoff.

If the current session does not already contain that focused Phase X handoff:

1. Do not begin implementation yet
2. Remind the user to start a fresh Phase X thread or session
3. Provide the exact handoff block the user should paste into that new Phase X thread

Do not treat a vague reference to an older plan as enough. The active phase thread should start from a concrete handoff that names the phase goal, scope, stop point, and validation target.

## Per-phase thread rules

Inside a Phase X implementation thread:

1. Stay scoped to that phase only
2. Do not begin later phases unless the user explicitly approves it
3. After implementation, provide manual smoke tests for the user to run
4. After the user reports that manual smoke tests passed, produce a concise completion packet for the master planning thread

## Master planning thread rules

The master planning thread remains the source of truth for:

1. Overall phase status
2. Approvals to start the next phase
3. The next phase handoff block
4. Any re-scoping after a phase completes

Do not silently promote a phase thread into the master planning thread. If phase status, sequencing, or cross-phase tradeoffs need to change, send that update back through the master planning thread.

## Required handoff shape

A focused phase handoff should include:

1. Phase name and goal
2. Scope and explicit non-goals
3. Invariants that must remain true
4. Key files or modules to inspect
5. Validation target
6. Clear stop point
7. What to report back to the master planning thread

## Completion packet shape

After manual smoke tests pass, the phase thread should return a concise packet the user can paste into the master planning thread. Include:

1. Phase completed
2. What changed
3. What was validated
4. Remaining risks or follow-ups
5. Recommendation on whether the next phase handoff can be issued
