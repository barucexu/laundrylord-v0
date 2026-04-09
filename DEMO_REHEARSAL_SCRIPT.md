# 60-Minute Demo Rehearsal Script

This is the fastest serious rehearsal I would run before a pilot demo.

It is designed to reduce two kinds of risk:

1. Demo embarrassment risk: broken routes, weird copy, wrong state, slow map load, missing assignment sync
2. Pilot trust risk: Stripe setup/autopay flow looks real and behaves correctly in test mode before you touch live keys

Use this script after the broader checklist in `PILOT_READINESS_TEST_PLAN.md` has been reviewed.

## What this script is and is not

- This is a human-run rehearsal with exact clicks, expected outcomes, and pass/fail logging.
- This is not a substitute for automated tests.
- This is not a full live-key certification by itself.

## Recommended rehearsal environment

Use a stable internal environment with:

1. A real operator account you can log into
2. Stripe test secret key ready (`sk_test_...`)
3. At least one clean renter test record you can safely modify
4. At least one machine record you can safely assign/unassign
5. One renter import file and one machine import file prepared in advance
6. Browser devtools available in case you need to confirm network or console failures

## Rehearsal data pack to prepare before starting

Prepare these before the clock starts:

1. `rehearsal-renters-clean.csv`
   Include 2-3 clean renter rows.
2. `rehearsal-renters-messy.csv`
   Include:
   - one valid row
   - one row with an invalid date or amount
   - one row with an extra custom column
   - one blank row
   - one row that duplicates another row so you can confirm current duplicate behavior
3. `rehearsal-machines.csv`
   Include:
   - one washer
   - one dryer
   - one row with partial data
4. One renter named something obvious like `Demo Billing Renter`
5. One machine with a recognizable serial number

## Pass/Fail severity

- `Blocker`: do not demo or pilot until fixed
- `Major`: demo only with an explicit workaround you have practiced
- `Minor`: acceptable for pilot only if logged and understood

## 0:00-0:05 Preflight

### Actions

1. Log into the real app.
2. Confirm the left nav shows:
   - `Dashboard`
   - `Renters`
   - `Machines`
   - `Machine Map`
   - `Payments`
   - `Maintenance`
   - `Import`
   - `Settings`
3. Open `Settings`.
4. Keep Stripe Dashboard open in a second tab.

### Expected outcomes

1. No auth loop.
2. No blank screen or missing sidebar.
3. `Settings` loads without console-breaking errors.

### Record

- App loaded cleanly: Pass / Fail
- Sidebar complete: Pass / Fail
- Settings route healthy: Pass / Fail

## 0:05-0:12 Stripe connection and plan sanity

### Actions

1. In `Settings`, go to the Stripe key area.
2. Paste your Stripe test secret key.
3. Click the save action for the key.
4. Wait for the connection state to refresh.
5. In the `Your Plan` card, read:
   - current billed plan
   - required by usage
   - billable renters
   - active renters
6. Click `View all plans`.
7. Confirm the 30-day archive billing note is visible.

### Expected outcomes

1. Stripe key save succeeds.
2. Connection verifies instead of silently failing.
3. Plan card is internally coherent:
   - billed plan is shown
   - required plan is shown
   - billable and active counts are both present
4. Copy includes the note that archived renters remain billable for 30 days.

### Fail if

1. Test key saves but connection never reflects healthy state.
2. Plan copy is contradictory or missing.
3. Settings implies renter billing and SaaS billing are the same system.

## 0:12-0:25 Renter billing flow rehearsal

Use a renter you can safely modify.

### Actions

1. Go to `Renters`.
2. Search for your rehearsal renter.
3. Click the renter name to open `Renter Detail`.
4. In the Billing card:
   - if Stripe is not connected, click `Connect Stripe` and stop the run as a blocker
   - if no card is on file, click `Send Payment Setup Link`
5. Confirm the setup link success toast appears.
6. Complete the setup flow in Stripe test mode.
7. Return to the renter detail page and refresh if needed.
8. Confirm the UI now moves from no-card state to `Start Autopay`.
9. Click `Start Autopay`.
10. Confirm the success toast includes the next due date.
11. Verify the billing card shows `Autopay Active`.
12. Check that renter detail reflects the expected payment state.
13. Check Stripe test dashboard for the created customer/subscription artifacts.

### Expected outcomes

1. `Send Payment Setup Link` works and does not error.
2. Completing setup gives a renter state consistent with `has_payment_method=true`.
3. `Start Autopay` succeeds without manual DB intervention.
4. The renter moves into the active autopay branch.
5. Stripe test dashboard shows the underlying customer/subscription objects.

### Fail if

1. Setup link creation fails.
2. Setup completes in Stripe but LaundryLord still shows no-card or broken state.
3. `Start Autopay` errors or creates duplicate/confusing states.
4. UI says active but Stripe objects are missing.

## 0:25-0:33 Manual add + machine assignment confidence

### Actions

1. Go back to `Renters`.
2. Click `Add Renter`.
3. Create a fresh renter with obvious test data.
4. Confirm the renter appears in the renters table.
5. Open `Machines`.
6. Click `Add Machine`.
7. Create a machine with a distinctive model/serial.
8. Confirm it appears in the machines table.
9. Open the new renter in `Renter Detail`.
10. In the machine assignment area, assign the new machine.
11. Confirm assignment appears in renter detail.
12. Return to `Machines` and confirm the `Assigned To` column reflects the same renter.
13. Unassign the machine.
14. Confirm both renter detail and machines list return to the unassigned state.

### Expected outcomes

1. Add flows complete without validation weirdness.
2. Assignment and unassignment both work.
3. The same assignment is visible in both places.
4. No view behaves as if `renters.machine_id` were canonical.

### Fail if

1. Add renter or add machine works only partially.
2. Assignment appears in one view but not the other.
3. Unassign leaves stale UI.

## 0:33-0:42 Import rehearsal

### Actions

1. Open `Import`.
2. Click `Renters`.
3. Upload `rehearsal-renters-messy.csv`.
4. Confirm mapping populates reasonably.
5. Advance to preview.
6. Check the preview counters:
   - `ready`
   - `review needed`
   - `fully empty`
   - `removed`
7. Manually remove one row in preview and confirm the removed count changes.
8. Run the import.
9. On the results screen, record:
   - `Imported`
   - `Blocked by plan`
   - `Failed insert`
   - `Skipped empty`
   - `Deleted by operator`
10. Repeat for `Machines` using `rehearsal-machines.csv`.
11. Spot-check one imported renter and one imported machine in their list pages.

### Expected outcomes

1. Upload, mapping, preview, and import all function without crashing.
2. The preview status buckets are intelligible.
3. Result summaries render the real import outcome clearly.
4. Imported custom columns show up later as custom fields on renter detail.
5. Machines-only import behaves independently of renter-billing confusion.

### Fail if

1. Preview counts are obviously wrong.
2. The import succeeds but the record is missing from the list page.
3. Duplicate behavior is surprising and undocumented during the run.
4. Result summaries are too confusing to explain in a demo.

## 0:42-0:48 Archive and plan-count sanity

### Actions

1. Open a renter you can safely archive.
2. Click `Archive`.
3. Confirm the archive messaging mentions the 30-day billable period.
4. Return to `Renters` and confirm the renter leaves the active list.
5. Click `View Archive`.
6. Confirm the renter appears in `Renter Archive`.
7. Return to `Settings`.
8. Re-check the `Billable renters` and `Active renters` values.
9. If safe, unarchive the renter and confirm the renter returns to active workflows.

### Expected outcomes

1. Archive moves the renter out of the active list.
2. Archive view shows the renter.
3. Settings still explains billable versus active counts clearly.
4. Archive behavior is not misleading about plan enforcement.

### Fail if

1. Archive action hides the renter but count behavior becomes confusing.
2. Archive or unarchive causes broken navigation or stale data.
3. The archive message does not match the 30-day policy.

## 0:48-0:55 Machine map + cross-page consistency

### Actions

1. Open `Machine Map`.
2. Time how long the map takes to become usable.
3. Confirm mapped machines render.
4. Confirm unmatched machines have understandable reasons.
5. Click back to `Machines`.
6. Pick one assigned machine and confirm the renter matches what you saw earlier.
7. Return to the renter detail page for that renter and confirm assignment consistency again.

### Expected outcomes

1. Map loads without hanging or white-screening.
2. Geocoding state is understandable if addresses are still resolving.
3. Unmatched machines explain whether the issue is:
   - no renter assignment
   - no renter address
   - address could not be geocoded
4. Assignment state remains consistent across map, machine list, and renter detail.

### Fail if

1. Machine map is too slow or unstable to demo confidently.
2. Map markers disagree with machines list data.
3. Unmatched reasons are absent or confusing.

## 0:55-1:00 Real/demo parity sweep

### Actions

1. In real mode, click through:
   - `Dashboard`
   - `Renters`
   - one `Renter Detail`
   - `Machines`
   - `Machine Map`
   - `Payments`
   - `Maintenance`
   - `Import`
   - `Settings`
2. Open demo mode at `/demo`.
3. Repeat the same navigation path in demo mode.
4. Compare:
   - sidebar structure
   - route availability
   - obvious copy drift
   - missing shells or broken layouts
5. End by deciding `Go`, `Go with caveats`, or `No-go`.

### Expected outcomes

1. Real and demo modes share the same route skeleton.
2. No broken page interrupts the walkthrough.
3. Demo mode feels like the same product, not a different app.

### Fail if

1. A route exists in one mode but not the other without a deliberate reason.
2. Demo shell or real shell looks broken.
3. You need to explain away a navigation bug during rehearsal.

## Go/No-Go decision rule

Call the build `Go` only if all of these are true:

1. Stripe test-key setup and autopay activation both worked
2. Manual add + assignment worked end-to-end
3. Both renter and machine import completed with understandable summaries
4. Archive flow matched the 30-day billable policy messaging
5. Machine map was demo-safe
6. Real/demo navigation sweep had no blocker

Call it `Go with caveats` only if the remaining issues are minor and you have a practiced workaround.

Call it `No-go` if any blocker affects:

1. Stripe setup or autopay
2. import integrity
3. assignment consistency
4. core navigation
5. machine map stability

## Five-minute live-key smoke addendum

Do this separately from the 60-minute test-key rehearsal.

### Actions

1. In `Settings`, switch to a live key only in a controlled operator environment.
2. Use one non-production renter or tiny real-dollar amount.
3. Repeat:
   - key save and connection verification
   - `Send Payment Setup Link`
   - payment-method completion
   - `Start Autopay`
4. Verify live Stripe dashboard receives the expected customer/subscription/webhook activity.
5. Confirm LaundryLord reflects the same state changes.

### Pass standard

1. One complete renter setup succeeds on live keys
2. State in Stripe and LaundryLord matches
3. No manual admin fix is needed

If this fails, do not call the product pilot-ready even if test mode looked good.

## Copy-paste pass/fail log template

```md
# LaundryLord Demo Rehearsal Log

Date:
Environment:
Operator account:
Build/branch:
Tester:

## Results

| Section | Result | Severity | Notes |
|---|---|---|---|
| Preflight | Pass/Fail | Blocker/Major/Minor | |
| Stripe connection and plan sanity | Pass/Fail | Blocker/Major/Minor | |
| Renter billing flow rehearsal | Pass/Fail | Blocker/Major/Minor | |
| Manual add + machine assignment | Pass/Fail | Blocker/Major/Minor | |
| Import rehearsal | Pass/Fail | Blocker/Major/Minor | |
| Archive and plan-count sanity | Pass/Fail | Blocker/Major/Minor | |
| Machine map + cross-page consistency | Pass/Fail | Blocker/Major/Minor | |
| Real/demo parity sweep | Pass/Fail | Blocker/Major/Minor | |
| Live-key smoke addendum | Pass/Fail/Skipped | Blocker/Major/Minor | |

## Issues found

1. Issue:
Severity:
Repro:
Workaround:
Owner:

2. Issue:
Severity:
Repro:
Workaround:
Owner:

## Final decision

- Go
- Go with caveats
- No-go

Reason:
```
