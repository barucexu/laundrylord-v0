

# Gray/White Color Scheme + Compact Dashboard + Machine Map

## 1. Color Scheme: Gray & White (no dark blue)

Update `src/index.css` CSS variables to a clean gray/white palette inspired by the mockup:

**Light mode:**
- `--background`: near-white (`0 0% 98%`)
- `--foreground`: dark gray (`0 0% 12%`)
- `--card`: pure white
- `--primary`: kept as blue accent (`215 65% 48%`) for buttons/links only — not dominant
- `--secondary/muted/accent`: neutral grays (`0 0% 95%`, `0 0% 46%`)
- `--border/input`: light gray (`0 0% 88%`)
- `--sidebar-background`: white (`0 0% 100%`) with a left border instead of dark navy
- `--sidebar-foreground`: dark gray text
- `--sidebar-accent`: light gray hover (`0 0% 95%`)
- `--sidebar-border`: light gray (`0 0% 90%`)

The sidebar shifts from dark navy to **white with gray text**, matching the mockup's clean look. Active nav item uses blue text on a light blue-gray background.

## 2. Dashboard: Compact Layout

**File: `src/pages/Dashboard.tsx`** — Reduce spacing and sizes throughout:

- Change outer `space-y-6` → `space-y-3`
- KPI cards: reduce padding from `p-4` → `p-3`, font from `text-2xl` → `text-xl`
- Revenue chart: reduce height from `h-[250px]` → `h-[180px]`, tighten card header/content padding
- Grid sections gap from `gap-4` → `gap-3`
- Card headers: smaller padding, remove redundant spacing
- Lists (due today, payments, maintenance): tighter `py-2` rows instead of `py-3`
- Overall goal: see KPIs + chart + all 4 bottom cards without scrolling on a 768px+ viewport

## 3. Machine Map Page

### New file: `src/pages/MachineMapPage.tsx`
- Uses **Leaflet** (free, no API key needed) via `react-leaflet` + `leaflet` packages
- Fetches all machines and renters from existing hooks
- For each machine with `assigned_renter_id`, looks up the renter's `address` field
- Uses a free geocoding service (Nominatim/OpenStreetMap) to convert addresses to lat/lng — cached in a `useMemo` + local state to avoid re-geocoding
- Displays markers on the map, colored by machine status (green=active, yellow=maintenance, gray=available)
- Marker popups show: machine type, model, serial, renter name, address
- Below or beside the map: a small table/list of "Unmatched Machines" — machines with no assigned renter or whose renter has no address
- Default map center: Atlanta area (since Konrad operates there) or auto-fit to marker bounds

### Route & Nav
- **`src/App.tsx`**: Add `/machine-map` route → `<MachineMapPage />`
- **`src/components/AppSidebar.tsx`**: Add "Machine Map" nav item with `MapPin` icon, between Machines and Payments

### Dependencies
- Add `leaflet`, `react-leaflet`, `@types/leaflet` packages
- Import Leaflet CSS in the component or `index.html`

### Geocoding approach
- Use Nominatim (free OpenStreetMap geocoder) with a simple fetch: `https://nominatim.openstreetmap.org/search?q={address}&format=json`
- Rate-limit requests (1/sec) and cache results in component state
- If geocoding fails for an address, machine goes to "Unmatched" list
- Show a loading state while geocoding is in progress

## Files Changed

**Modified:**
- `src/index.css` — gray/white palette, light sidebar
- `src/pages/Dashboard.tsx` — compact spacing throughout
- `src/components/AppSidebar.tsx` — add Machine Map nav item, update styling for light sidebar
- `src/App.tsx` — add `/machine-map` route

**New:**
- `src/pages/MachineMapPage.tsx` — interactive Leaflet map + unmatched list

**Dependencies:**
- `leaflet`, `react-leaflet`, `@types/leaflet`

## Implementation Order
1. Color scheme update (index.css + sidebar styling)
2. Dashboard compaction
3. Machine Map page + route + nav

