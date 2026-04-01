-- Drop the denormalized laundrylord_email columns from base tables
ALTER TABLE public.renters DROP COLUMN IF EXISTS laundrylord_email;
ALTER TABLE public.machines DROP COLUMN IF EXISTS laundrylord_email;