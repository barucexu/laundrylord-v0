-- Remove the legacy renter-side assignment pointer.
--
-- Canonical machine assignment is machines.assigned_renter_id -> renters.id.
-- This migration first preserves any non-conflicting legacy renter.machine_id
-- data in the canonical column, then drops renters.machine_id.

DROP VIEW IF EXISTS public.v_audit_renters;
DROP VIEW IF EXISTS public.v_renters_for_admin;
DROP VIEW IF EXISTS public.v_renters_with_owner;

UPDATE public.machines AS m
SET
  assigned_renter_id = r.id,
  status = CASE WHEN m.status = 'available' THEN 'assigned' ELSE m.status END
FROM public.renters AS r
WHERE r.machine_id = m.id
  AND r.user_id = m.user_id
  AND r.machine_id IS NOT NULL
  AND m.assigned_renter_id IS NULL
  AND m.status <> 'retired';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.renters AS r
    LEFT JOIN public.machines AS m
      ON m.id = r.machine_id
      AND m.user_id = r.user_id
    WHERE r.machine_id IS NOT NULL
      AND (
        m.id IS NULL
        OR m.assigned_renter_id IS DISTINCT FROM r.id
      )
  ) THEN
    RAISE EXCEPTION
      'Cannot drop renters.machine_id: unresolved legacy assignments remain. Resolve conflicts into machines.assigned_renter_id first.';
  END IF;
END $$;

ALTER TABLE public.renters
  DROP CONSTRAINT IF EXISTS fk_renters_machine;

ALTER TABLE public.renters
  DROP COLUMN IF EXISTS machine_id;

CREATE VIEW public.v_renters_for_admin WITH (security_invoker = true) AS
SELECT r.*
FROM public.renters AS r;

CREATE VIEW public.v_renters_with_owner WITH (security_invoker = true) AS
SELECT r.*, os.owner_email, os.business_name
FROM public.renters AS r
LEFT JOIN public.operator_settings AS os ON os.user_id = r.user_id;

CREATE VIEW public.v_audit_renters WITH (security_invoker = true) AS
SELECT
  r.id AS renter_id,
  r.user_id,
  r.name AS renter_name,
  r.email AS renter_email,
  r.phone AS renter_phone,
  r.status AS renter_status,
  r.address,
  r.archived_at,
  r.balance,
  r.billable_until,
  r.created_at,
  r.days_late,
  r.deposit_amount,
  r.has_payment_method,
  r.install_fee,
  r.install_notes,
  r.language,
  r.lease_start_date,
  r.min_term_end_date,
  r.monthly_rate,
  r.next_due_date,
  r.notes,
  r.paid_through_date,
  r.rent_collected,
  r.secondary_contact,
  r.stripe_customer_id,
  r.stripe_subscription_id,
  r.updated_at,
  os.owner_email,
  os.business_name
FROM public.renters AS r
LEFT JOIN public.operator_settings AS os ON os.user_id = r.user_id;
