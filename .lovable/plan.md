

# Add Upgrade/Checkout Button to Disabled-State Tooltips

## What's needed

The tooltip on the disabled "Add Renter" / "Add Machine" buttons tells the operator to upgrade but doesn't let them actually do it from there. Add a clickable "Upgrade to {tier}" button inside the tooltip (or convert it to a popover) so operators can check out directly from the renters page — not just from Settings.

Settings already has the upgrade button — no changes needed there.

## Approach

**Convert tooltip to popover** on `RentersList.tsx` and `MachinesList.tsx`. Tooltips can't contain interactive elements (buttons). A `Popover` with the same styling will show the upgrade message + a checkout button when the disabled "Add Renter/Machine" button is clicked.

### Files to change

**`src/pages/RentersList.tsx`**
- Replace `Tooltip` with `Popover` when `!canAddRenter`
- Show the existing upgrade text + an "Upgrade to {tier.name}" button that calls `checkout()` from `useSubscription`
- Keep the normal clickable `Button` when `canAddRenter` is true (no popover wrapping)

**`src/pages/MachinesList.tsx`**
- Same pattern as RentersList

**No other files change.** Settings page and PlanBanner already have upgrade buttons.

