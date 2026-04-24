-- Support operator-created maintenance logs without requiring a machine,
-- preserve renter-portal provenance, and archive logs without deleting history.

ALTER TABLE public.maintenance_logs
  ALTER COLUMN machine_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'operator',
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'maintenance_logs_source_check'
      AND conrelid = 'public.maintenance_logs'::regclass
  ) THEN
    ALTER TABLE public.maintenance_logs
      ADD CONSTRAINT maintenance_logs_source_check
      CHECK (source IN ('operator', 'renter_portal'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_maintenance_logs_user_archived
  ON public.maintenance_logs(user_id, archived_at);

CREATE INDEX IF NOT EXISTS idx_maintenance_logs_user_source
  ON public.maintenance_logs(user_id, source);
