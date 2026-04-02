-- Restore importer-owned contact columns and keep sparse import rows insertable.

ALTER TABLE public.renters
  ADD COLUMN IF NOT EXISTS laundrylord_email text;

ALTER TABLE public.machines
  ADD COLUMN IF NOT EXISTS laundrylord_email text;

UPDATE public.renters AS renters
SET laundrylord_email = users.email
FROM auth.users AS users
WHERE users.id = renters.user_id
  AND (renters.laundrylord_email IS NULL OR renters.laundrylord_email = "");

UPDATE public.machines AS machines
SET laundrylord_email = users.email
FROM auth.users AS users
WHERE users.id = machines.user_id
  AND (machines.laundrylord_email IS NULL OR machines.laundrylord_email = "");

ALTER TABLE public.renters
  ALTER COLUMN name DROP NOT NULL;

ALTER TABLE public.machines
  ALTER COLUMN type DROP NOT NULL,
  ALTER COLUMN model DROP NOT NULL,
  ALTER COLUMN serial DROP NOT NULL;
