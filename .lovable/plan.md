

# Remove Top Header, Move Sidebar Toggle Into Sidebar

## Changes

### `src/components/AppLayout.tsx`
Remove the `<header>` element entirely. The main content area becomes just the `<main>` block directly, reclaiming ~44px of vertical space.

### `src/components/AppSidebar.tsx`
Add `SidebarTrigger` inside the sidebar header, next to the logo. When expanded, show it inline with the logo row. When collapsed, show it centered (replacing or beside the logo icon).

Import `SidebarTrigger` from the sidebar UI and place it in the `SidebarHeader`:
- Expanded: `[logo] [LaundryLord] [toggle-button]` — trigger aligned to the right via `ml-auto`
- Collapsed: trigger centered below or replacing the logo icon

This keeps the toggle always accessible inside the sidebar strip (since `collapsible="icon"` never fully hides the sidebar).

## Files Modified
- `src/components/AppLayout.tsx` — remove header
- `src/components/AppSidebar.tsx` — add SidebarTrigger to sidebar header

