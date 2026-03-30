

# Plan: Demo Data Tuning, Line Chart, Compact Rows

## Four changes

### 1. Demo seed data → 15 renters, ~20 machines, all in NYC, Starter plan, curated payments

**File: `src/data/demo-seed-data.ts`**

- Replace all market addresses with a single NYC market (Manhattan/Brooklyn streets, NY zips)
- Set `MARKET_RENTER_COUNTS` to `[15]` total
- Status distribution: ~10 active, 2 late, 1 scheduled, 1 maintenance, 1 lead
- Generate ~20 machines: 15 assigned (one per active/late/maintenance renter) + 5 unassigned inventory
- Payment history: 6 months per active renter, ~85% paid via `stripe` autopay, 2 specific exceptions (1 Venmo, 1 Zelle), a few `late`/`overdue` scattered in
- Update `MARKET_CENTERS` to only include NYC center coords
- Update `buildDemoGeoCache` accordingly (single NYC cluster)
- Reduce maintenance logs proportionally (~5-8 entries)
- Reduce timeline events proportionally

### 2. Settings plan display in demo → show "Starter" as current, not "$X required"

**File: `src/pages/SettingsPage.tsx`**

- In the "Your Plan" card, when in demo mode, show the plan status as if subscribed to Starter (since 15 renters = Starter tier). The demo context doesn't set `subscription.subscribed`, so the display falls through to the "required" wording.
- Fix: In demo mode, display "Starter plan — $29/mo" with "Current" highlighted on the Starter tile in the plan grid. Add a demo-specific override in the plan status section.

**File: `src/hooks/useSubscription.ts`** (minor)
- When `isDemo`, return `subscribed: true` with `currentBilledTier` set to the Starter tier (matching 15 renters).

### 3. Dashboard chart → line graph (both demo and real accounts)

**File: `src/pages/Dashboard.tsx`**

- Replace `BarChart` + `Bar` imports with `LineChart` + `Line` from recharts
- Use `type="monotone"`, `stroke="hsl(var(--primary))"`, `strokeWidth={2}`, `dot={{ r: 3 }}`, `fill` under line area optional
- Add `AreaChart`/`Area` for the filled-under-line look matching the reference image, or use `LineChart` with area fill
- Actually: use `AreaChart` + `Area` for the smooth filled line look from the reference image: `type="monotone"`, `fill="hsl(var(--primary))"`, `fillOpacity={0.1}`, `stroke="hsl(var(--primary))"`, `strokeWidth={2}`

### 4. Compact table rows → fit ~18 renters on screen

**File: `src/components/ui/table.tsx`**

- Change `TableCell` padding from `py-3` to `py-1.5` 
- Change `TableHead` height from `h-10` to `h-8`

This applies globally to all tables (renters, machines, payments, maintenance) which is the right behavior.

## Technical details

- Demo seed data generators are fully rewritten for 15 renters / 20 machines / NYC-only
- The `useSubscription` demo path currently returns `subscribed: false` — changing it to `true` with Starter tier makes settings show "Starter plan" with "Current" badge
- Recharts `AreaChart` gives the smooth line-with-fill look from the reference image
- Table cell padding reduction from `py-3` (12px each side = 24px) to `py-1.5` (6px each side = 12px) roughly doubles visible rows

## Files changed

| File | Change |
|------|--------|
| `src/data/demo-seed-data.ts` | Rewrite: 15 renters, 20 machines, NYC only, 6mo payments, stripe-heavy, 2 exceptions |
| `src/hooks/useSubscription.ts` | Demo mode returns `subscribed: true`, `currentBilledTier: Starter` |
| `src/pages/Dashboard.tsx` | Replace BarChart with AreaChart (line + fill), both demo and real |
| `src/components/ui/table.tsx` | Reduce cell padding and header height for compact rows |

