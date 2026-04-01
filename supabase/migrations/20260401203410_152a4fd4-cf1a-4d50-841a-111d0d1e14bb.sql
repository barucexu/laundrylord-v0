
ALTER TABLE public.renters ADD COLUMN IF NOT EXISTS laundrylord_email text;
ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS laundrylord_email text;

UPDATE public.renters SET laundrylord_email = u.email 
FROM auth.users u WHERE u.id = renters.user_id AND renters.laundrylord_email IS NULL;

UPDATE public.machines SET laundrylord_email = u.email 
FROM auth.users u WHERE u.id = machines.user_id AND machines.laundrylord_email IS NULL;
