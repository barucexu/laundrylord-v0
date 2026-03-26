# Demo Mode + Pricing Calculator

## Architecture Overview

```text
                    ┌─────────────┐
  /auth ───────────>│  AuthPage   │──── "Explore Demo" ────> /demo/*
                    │  + Landing  │──── "Create Account" ──> signup flow
                    └─────────────┘
                          │
                    /demo/* routes
                          │
              ┌───────────┴───────────┐
              │   DemoProvider ctx    │  (isDemo=true, in-memory data)
              │   DemoLayout          │  (AppLayout + banner)
              └───────────┴───────────┘
                          │
              Same pages: Dashboard, Renters, RenterDetail,
              Machines, MachineMap, Payments, Maintenance, Settings
```

### Key Design Decision: Client-side in-memory demo data

Instead of hitting Supabase, Demo Mode uses a React context (`DemoContext`) that provides the same data shape as the Supabase hooks. The existing hooks (`useRenters`, `useMachines`, etc.) are wrapped with a thin check: if `isDemo` is true, return seeded data from context instead of querying Supabase. Mutations update in-memory state (resetting on refresh). This means:

- Zero backend changes
- Same real screens/components used
- No persistent guest accounts
- Auto-resets on refresh
- Stays in sync as the app evolves (same hooks, same components)

---

## Part 1: Demo Infrastructure

### New files

`**src/contexts/DemoContext.tsx**`

- `DemoProvider` with state: `isDemo: boolean`, in-memory copies of renters/machines/payments/maintenance/timeline arrays
- Provides CRUD helpers (add/update/delete that modify in-memory arrays)
- Initializes from seeded demo data on mount
- Exposes `enterDemo()` and `exitDemo()` functions

`**src/data/demo-seed-data.ts**`

- ~200 renters across TX, GA, FL, TN, NC markets with realistic addresses
- ~250 machines (washers + dryers, Samsung/LG/Whirlpool/GE models, serial numbers, 3/4-prong)
- ~800 payment records (mix of paid/overdue/upcoming/failed)
- ~60 maintenance logs
- ~400 timeline events
- Operator settings (business_name: "SunBelt Laundry Rentals")
- All IDs use deterministic UUIDs so cross-references are consistent
- Data structured as typed arrays matching Supabase Row types

### Modified files

`**src/hooks/useSupabaseData.ts**`

- Each hook checks `useDemo().isDemo`
- If demo: return in-memory data from context (wrapped in `useQuery`-compatible shape with `{ data, isLoading: false }`)
- If not demo: existing Supabase queries unchanged
- Mutations in demo mode update in-memory state and return

`**src/hooks/useAuth.tsx**`

- Add `isDemo` and `demoUser` to AuthContext
- When in demo mode, provide a fake user object so ProtectedRoute passes
- `signOut` in demo mode navigates to `/auth`

`**src/components/ProtectedRoute.tsx**`

- Also allow through if `isDemo` is true (from auth context)

`**src/App.tsx**`

- Add `/demo` route group mirroring the protected routes, wrapped in `DemoProvider`
- Demo routes use `DemoLayout` (AppLayout + persistent banner)

### Demo Banner

`**src/components/DemoBanner.tsx**`

- Sticky top bar: "You're exploring Demo Mode. Changes won't be saved."
- CTA button: "Create Account" linking to `/auth` with signup mode
- Styled: muted blue/gray background, small text, non-intrusive but always visible

`**src/components/DemoLayout.tsx**`

- Wraps `AppLayout` with `DemoBanner` at top
- Adjusts sidebar footer to show "Demo User" instead of email, and "Exit Demo" instead of "Sign Out"

---

## Part 2: Landing / Auth Page Updates

`**src/pages/AuthPage.tsx**`

- Add "Explore Demo" button below the auth card (secondary/outline style)
- On click: navigate to `/demo`
- Keep existing login/signup/forgot flow unchanged
- Add a brief pricing section or link to pricing below the demo CTA

---

## Part 3: Pricing Calculator

`**src/components/PricingCalculator.tsx**`

- Standalone component, rendered on AuthPage below the auth card
- Slider: "Average monthly rent per machine" ($40–$120, default $60)
- Tick marks at $40, $50, $60, $70, $80, $100, $120
- Tier cards in a grid:

| Tier      | Price    | Revenue Range | % of Gross |

|-----------|----------|---------------|------------|

| 1–10      | Free     | —             | —          |

| 11–24     | $29/mo   | calculated    | calculated |

| 25–49     | $49/mo   | calculated    | calculated |

| 50–74     | $99/mo   | calculated    | calculated |

| 75–99     | $129/mo  | calculated    | calculated |

| 100–199   | $199/mo  | calculated    | calculated |

| 200–399   | $299/mo  | calculated    | calculated |

| 400–699   | $499/mo  | calculated    | calculated |

| 700–1000  | $799/mo  | calculated    | calculated |

| 1000+     | Haven't thought that far | —           | Contact us |

- Revenue = renter count × slider value (show range for min–max of tier)
- Cost % = software price / revenue (show range)
- Tagline: "Usually around 1–4% of gross revenue for most operators."
- Pricing config as a const array, easy to edit later

---

## Part 4: Demo Seed Data Details

The `demo-seed-data.ts` file will contain ~200 renters distributed across markets:

- **Texas (Houston/Dallas/San Antonio)**: ~70 renters
- **Georgia (Atlanta metro)**: ~49 renters  
- Alabama ~1 renter
- **Florida (Orlando/Tampa/Miami)**: ~45 renters
- **Tennessee (Nashville/Memphis)**: ~20 renters
- **North Carolina (Charlotte/Raleigh)**: ~15 renters

Each renter has:

- Realistic name, phone, email, full street address
- Status distribution: ~140 active, ~20 late, ~10 scheduled, ~8 maintenance, ~5 termination_requested, ~5 pickup_scheduled, ~7 leads, ~5 closed
- Monthly rates: $45–$100 range
- Machines assigned where applicable (washer, dryer, or set)
- Coherent balance/paid-through/days-late based on status

Machines (~250):

- Mix of Samsung, LG, Whirlpool, GE, Maytag models
- Realistic serials (format: `WF-2024-XXXX`)
- Status matches renter assignments
- 3-prong / 4-prong distribution
- Cost basis: $200–$800 range

Payments (~800): 6 months of history per active renter, with realistic paid/overdue/failed distribution.

Maintenance (~60): Mix of leak, noise, error code, not starting, vibration categories.

Timeline (~400): Created, assigned, payment, maintenance events spread across renter histories.

---

## Files Summary

**New files (5):**

1. `src/contexts/DemoContext.tsx` — demo state provider
2. `src/data/demo-seed-data.ts` — seeded dataset (~200 renters)
3. `src/components/DemoBanner.tsx` — persistent demo banner
4. `src/components/DemoLayout.tsx` — layout wrapper for demo routes
5. `src/components/PricingCalculator.tsx` — pricing slider + tier cards

**Modified files (5):**

1. `src/App.tsx` — add `/demo/*` routes
2. `src/hooks/useAuth.tsx` — add demo user support
3. `src/hooks/useSupabaseData.ts` — demo data bypass
4. `src/components/ProtectedRoute.tsx` — allow demo users
5. `src/pages/AuthPage.tsx` — add "Explore Demo" CTA + pricing calculator

**No database changes. No new backend functions. No new dependencies.**

## Implementation Order

1. Demo seed data file
2. Demo context + provider
3. Hook modifications (useAuth, useSupabaseData)
4. Demo layout + banner + route wiring
5. Auth page updates (Explore Demo CTA)
6. Pricing calculator component + integration