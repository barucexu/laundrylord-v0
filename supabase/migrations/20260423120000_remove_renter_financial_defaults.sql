-- Force renter financial terms to come from app/operator settings or explicit import data.
-- Leaving database defaults here can silently recreate stale values such as monthly_rate = 150.

ALTER TABLE public.renters
  ALTER COLUMN monthly_rate DROP DEFAULT,
  ALTER COLUMN install_fee DROP DEFAULT,
  ALTER COLUMN deposit_amount DROP DEFAULT,
  ALTER COLUMN late_fee DROP DEFAULT;
