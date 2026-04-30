-- Allow renter-cancelled maintenance requests and surface a matching timeline event.

ALTER TABLE public.maintenance_logs
  DROP CONSTRAINT IF EXISTS maintenance_logs_status_check;

ALTER TABLE public.maintenance_logs
  ADD CONSTRAINT maintenance_logs_status_check
  CHECK (status IN ('reported', 'scheduled', 'in_progress', 'resolved', 'cancelled'));

ALTER TABLE public.timeline_events
  DROP CONSTRAINT IF EXISTS timeline_events_type_check;

ALTER TABLE public.timeline_events
  ADD CONSTRAINT timeline_events_type_check
  CHECK (
    type IN (
      'created',
      'machine_assigned',
      'payment_succeeded',
      'payment_failed',
      'late_fee',
      'maintenance_opened',
      'maintenance_resolved',
      'maintenance_cancelled',
      'pickup_scheduled',
      'pickup_completed',
      'note'
    )
  );
