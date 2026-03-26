

# Fix Machine Map Load Speed

## Root Cause

Every renter address is geocoded one-by-one via the Nominatim API with a mandatory 1.1-second delay between requests (to respect rate limits). With ~170 unique addresses in demo mode, that's **over 3 minutes** of sequential geocoding. The geocode cache lives only in React state, so it resets on every page navigation — meaning the map starts from scratch every time you visit it.

## Solution (two-pronged)

### 1. Pre-baked coordinates for demo mode (`src/data/demo-seed-data.ts`)

Add a hardcoded lat/lng lookup keyed by `"City, State"` market. Instead of geocoding each street address, assign coordinates by adding small deterministic offsets to a market center point. This gives realistic geographic clustering with zero API calls.

For example, Houston center = `[29.76, -95.37]`, then each renter gets a tiny offset based on their index (±0.05°, ~3 miles). This produces a realistic scatter without any network requests.

New helper: `getMarketCoords(marketIndex, renterIndex)` returns `{ lat, lng }`.

### 2. Persistent geocode cache via localStorage (`src/pages/MachineMapPage.tsx`)

For real (non-demo) users:
- On mount, load the geocode cache from `localStorage` key `"ll-geocache"`
- When new addresses are geocoded, save the updated cache to `localStorage`
- This means addresses only need to be geocoded once ever, not on every visit

### 3. Progressive marker rendering

Currently, all geocoding must finish before `setGeoCache` is called once. Change to update state after each batch of ~5 addresses so markers appear incrementally as geocoding progresses — the map feels alive immediately instead of blank for 3 minutes.

### 4. Skip geocoding in demo mode entirely

In `MachineMapPage`, detect demo mode. If demo, inject pre-baked coordinates directly into the geo cache on mount — no Nominatim calls at all. The map loads instantly with all ~170 markers.

## Files Modified

- **`src/data/demo-seed-data.ts`** — Add market center coordinates and a `DEMO_GEO_CACHE` export mapping each generated address to its pre-computed lat/lng
- **`src/pages/MachineMapPage.tsx`** — Load `DEMO_GEO_CACHE` when in demo mode; persist real-user geocache in localStorage; progressive batch updates; set initial map view to US overview (`[39.8, -98.5]`, zoom 4) instead of Atlanta

## Result

- Demo mode: map loads in under 1 second with all markers
- Real users: first visit geocodes (progressively, with markers appearing as they resolve); subsequent visits load from localStorage cache instantly
- Map starts showing a US-wide view that auto-fits to marker bounds once data is ready

