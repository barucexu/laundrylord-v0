

# Three Fixes: Hard-stop Add Renter, Better Tooltip, Archive Status Constraint

## Issues

1. **Race condition**: `canAddRenter` starts as `true` while `loading`, so clicking "Add Renter" before the subscription check completes bypasses the limit.
2. **Tooltip message**: When the button is grayed out, the tooltip should show the same upgrade CTA from PlanBanner (tier name, renter count, payment method prompt).
3. **Archive fails**: The `renters` table has a CHECK constraint that only allows `('lead','scheduled','active','late','maintenance','termination_requested','pickup_scheduled','closed','defaulted')`. "archived" is not in the list.

## Plan

### 1. Database migration — add "archived" to status CHECK constraint
Drop and re-add the constraint to include `'archived'`.

```sql
ALTER TABLE public.renters DROP CONSTRAINT IF EXISTS renters_status_check;
ALTER TABLE public.renters ADD CONSTRAINT renters_status_check
  CHECK (status IN ('lead','scheduled','active','late','maintenance','termination_requested','pickup_scheduled','closed','defaulted','archived'));
```

### 2. Hard-stop in CreateRenterDialog — block submission server-side-style

The real fix is two layers:
- **CreateRenterDialog**: Check `canAddRenter` at submission time (not just button disabled state). If `!canAddRenter`, show a toast error and refuse to submit. Also pass `canAddRenter` to disable the dialog's own submit button.
- **CreateRenterDialog `open` prop**: In `RentersList.tsx`, prevent `setDialogOpen(true)` when `!canAddRenter` (belt-and-suspenders with the disabled button).

This makes it impossible to add a renter even if the user clicks fast before the subscription state loads, because the dialog submit itself re-checks.

### 3. Better tooltip and disabled-state messaging

When the button is disabled on both RentersList and MachinesList, show a richer tooltip that mirrors PlanBanner:
- "You've grown to X renters! Your plan is now [Tier Name] ([label]). Add a payment method to keep adding renters."
- For free tier at limit: "You've reached 10 renters. Upgrade to Starter to keep growing."

### Files to change
- **Migration**: Add `archived` to renters status CHECK
- **`src/components/CreateRenterDialog.tsx`**: Add `canAddRenter` prop check at submit time
- **`src/pages/RentersList.tsx`**: Pass subscription info, prevent dialog open when not allowed, update tooltip content
- **`src/pages/MachinesList.tsx`**: Same tooltip update
- **`src/components/CreateMachineDialog.tsx`**: Same submit-time guard

