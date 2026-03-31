ALTER TABLE public.renters
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS billable_until timestamptz;

-- Backfill existing archived renters so they remain billable for 30 days from migration time.
UPDATE public.renters
SET archived_at = COALESCE(archived_at, now()),
    billable_until = COALESCE(billable_until, now() + interval '30 days')
WHERE status = 'archived';
