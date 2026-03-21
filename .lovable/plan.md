

# Logo Swap + Premium Design Refinement

## Part 1: Logo Replacement

Replace the logo in all three locations (favicon, auth page, sidebar) with the newly uploaded mascot image (`laundrylord_logo_square-2.png`).

- Copy uploaded image to `src/assets/laundrylord-logo.png` (overwriting existing) and `public/favicon.png`
- Auth page and sidebar already reference these files, so no code changes needed for the swap itself

## Part 2: Premium Design System Overhaul

A visual-only refinement pass across the entire product. No route, data model, or business logic changes.

### Global Design Tokens (`src/index.css`)

- Refine the color palette to feel more premium: cooler slate neutrals, deeper primary blues, softer success/warning/destructive tones
- Add Inter font import for a cleaner, more professional sans-serif
- Improve the shadow and border system with subtler, more layered values
- Slightly tighten border radius for a crisper feel

### Component Polish

**Cards** (`src/components/ui/card.tsx`): Softer shadow, refined border color, slightly more padding in headers
**Buttons** (`src/components/ui/button.tsx`): Improve focus rings, add subtle transitions, refine variant colors
**Inputs** (`src/components/ui/input.tsx`): Better focus state, slightly taller for easier interaction
**Tables** (`src/components/ui/table.tsx`): Better header styling, improved row hover states, refined cell padding
**StatusBadge** (`src/components/StatusBadge.tsx`): More refined, softer color tints for each status with better contrast
**Badge** (`src/components/ui/badge.tsx`): Softer border-radius and colors

### Sidebar (`src/components/AppSidebar.tsx`)

- Richer dark background with better contrast
- Improved nav item spacing, hover/active states
- Better branding area with refined logo presentation
- Cleaner footer with user email and sign-out

### Shell (`src/components/AppLayout.tsx`)

- Refined header bar with subtle bottom border
- Better content area padding and max-width

### Auth Page (`src/pages/AuthPage.tsx`)

- More intentional composition: subtle background gradient or pattern
- Larger, better-spaced card with improved typography hierarchy
- Refined Google button and separator styling
- Better field spacing and "Forgot password?" link treatment

### Dashboard (`src/pages/Dashboard.tsx`)

- Improved KPI cards: better icon treatment, clearer value/label hierarchy
- Better section spacing between stats grid and detail cards
- Refined empty states with intentional messaging

### Renters List (`src/pages/RentersList.tsx`)

- Better page header hierarchy
- Improved search and filter bar styling
- Refined table with better row hover and cell alignment

### Renter Detail (`src/pages/RenterDetail.tsx`)

- Stronger page header with name, status, and date clearly ranked
- Billing card: more prominent, trustworthy styling with better action hierarchy
- Financial Summary: cleaner grid with better label/value differentiation
- Timeline: refined icon treatment, better spacing
- Sidebar cards (Contact, Lease, Machine, Notes): improved label/value pairs
- Better empty states throughout

### Machines Page (`src/pages/MachinesList.tsx`)

- Cleaner table styling, better status pill alignment
- Refined action column

### Payments Page (`src/pages/PaymentsView.tsx`)

- Better type/status/amount hierarchy in table rows
- Improved filter controls

### Maintenance Page (`src/pages/MaintenanceView.tsx`)

- Better table presentation, improved empty state

### Settings Page (`src/pages/SettingsPage.tsx`)

- Better card grouping and section headers
- More trustworthy Stripe connection section
- Improved checklist styling
- Better email template section with refined collapsibles

### Reset Password + Not Found

- Match the refined auth page aesthetic

## Files Changed

- `src/assets/laundrylord-logo.png` — replaced with new uploaded image
- `public/favicon.png` — replaced with new uploaded image
- `src/index.css` — refined color palette, typography, shadows
- `tailwind.config.ts` — minor token adjustments if needed
- `src/components/ui/card.tsx` — refined styling
- `src/components/ui/button.tsx` — refined styling
- `src/components/ui/input.tsx` — refined styling
- `src/components/ui/table.tsx` — refined styling
- `src/components/StatusBadge.tsx` — refined status colors
- `src/components/AppSidebar.tsx` — refined sidebar design
- `src/components/AppLayout.tsx` — refined shell
- `src/pages/AuthPage.tsx` — premium auth experience
- `src/pages/ResetPasswordPage.tsx` — match auth aesthetic
- `src/pages/Dashboard.tsx` — improved KPI and layout
- `src/pages/RentersList.tsx` — refined list page
- `src/pages/RenterDetail.tsx` — polished detail page
- `src/pages/MachinesList.tsx` — refined table
- `src/pages/PaymentsView.tsx` — refined table
- `src/pages/MaintenanceView.tsx` — refined table
- `src/pages/SettingsPage.tsx` — refined admin surface
- `src/pages/NotFound.tsx` — polished 404

