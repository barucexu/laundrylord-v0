ALTER TABLE public.renters DROP CONSTRAINT IF EXISTS renters_status_check;
ALTER TABLE public.renters ADD CONSTRAINT renters_status_check
  CHECK (status IN ('lead','scheduled','active','late','maintenance','termination_requested','pickup_scheduled','closed','defaulted','archived'));