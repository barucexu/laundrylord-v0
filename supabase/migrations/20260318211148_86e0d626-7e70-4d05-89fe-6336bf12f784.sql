
ALTER TABLE public.renters
  ADD COLUMN IF NOT EXISTS rent_collected numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS install_fee numeric NOT NULL DEFAULT 75,
  ADD COLUMN IF NOT EXISTS install_fee_collected boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deposit_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_collected boolean NOT NULL DEFAULT false;
