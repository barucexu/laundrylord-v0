

# Settings Page: Compact All-in-One-View Layout

## Approach

Use a **two-column grid layout** for the top sections (Billing Defaults + Reminder Timing side by side, Stripe Connection + Setup Checklist side by side), and keep Email Reminders full-width below since it's collapsible and variable-height. This mirrors the dashboard's dense grid approach.

## Changes — `src/pages/SettingsPage.tsx`

1. **Two-column grid for top sections**: Wrap Billing Defaults and Reminder Timing in a `grid md:grid-cols-2 gap-3` row. Billing Defaults has 4 fields (2×2 grid inside), Reminder Timing has 2 fields — they sit side by side.

2. **Two-column grid for Stripe + Checklist**: Wrap Stripe Connection and Setup Checklist in another `grid md:grid-cols-2 gap-3` row.

3. **Tighten card internals**:
   - Reduce `CardHeader` padding via className overrides (`p-3 pb-2`)
   - Reduce `CardContent` padding (`p-3 pt-0`)
   - Tighten `space-y-4` → `space-y-2` inside card contents
   - Reduce gaps in inner grids from `gap-4` → `gap-2`

4. **Billing Defaults fields**: Change from `md:grid-cols-2` to a 2×2 grid with tighter spacing, keeping labels small.

5. **Email Reminders card**: stays full-width but with tighter padding to match.

6. **Move Save button**: float it top-right in the page header row instead of bottom, or keep bottom but reduce `pb-6` → `pb-2`.

7. **Reduce outer spacing**: `space-y-5` → `space-y-3` on the root container.

## Result

On a 946×652 viewport, the operator should see Billing Defaults, Reminder Timing, Stripe, and Checklist all without scrolling. Email Reminders (collapsed) visible at the bottom. Save button accessible without scroll in most cases.

## Files Modified
- `src/pages/SettingsPage.tsx`

