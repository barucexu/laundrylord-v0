

# Add Dryer Outlet Type (3-Prong/4-Prong) to Renter Profile

## Rationale
The outlet type belongs to the renter's home, not the machine. Swapping a dryer cord is trivial — the outlet is fixed. Move this field to the renter level.

## Changes

### 1. Database migration
- Add `dryer_outlet` text column (nullable) to `renters` table
- Keep `prong` on `machines` table for now (no destructive change)

### 2. `src/components/EditRenterDialog.tsx`
- Add a "Dryer Outlet" select field (3-Prong / 4-Prong / None) in the contact/property info section, near the address field

### 3. `src/components/CreateRenterDialog.tsx`
- Add the same "Dryer Outlet" select field

### 4. `src/pages/RenterDetail.tsx`
- Display dryer outlet type in the Contact/Lease card area (e.g. near address)
- Remove the "Prong" line from the machine cards (lines 486) since it's now on the renter

### 5. `src/hooks/useSupabaseData.ts`
- Include `dryer_outlet` in create/update renter mutations

### 6. `src/data/demo-seed-data.ts`
- Add `dryer_outlet` to demo renters (realistic distribution: ~60% 3-prong, ~35% 4-prong, ~5% null)

### 7. `src/pages/RentersList.tsx`
- Optionally show outlet type as a column (low priority, skip if table is already dense)

## Files Modified
- **Migration**: add `dryer_outlet` column to `renters`
- `src/components/EditRenterDialog.tsx`
- `src/components/CreateRenterDialog.tsx`
- `src/pages/RenterDetail.tsx`
- `src/hooks/useSupabaseData.ts`
- `src/data/demo-seed-data.ts`

