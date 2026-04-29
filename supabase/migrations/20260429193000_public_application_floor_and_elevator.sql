ALTER TABLE public.renter_applications
  ADD COLUMN IF NOT EXISTS floor_number integer,
  ADD COLUMN IF NOT EXISTS has_elevator text;

ALTER TABLE public.renter_applications
  DROP CONSTRAINT IF EXISTS renter_applications_floor_number_range;

ALTER TABLE public.renter_applications
  ADD CONSTRAINT renter_applications_floor_number_range
  CHECK (floor_number IS NULL OR floor_number BETWEEN 1 AND 99);

ALTER TABLE public.renter_applications
  DROP CONSTRAINT IF EXISTS renter_applications_has_elevator_check;

ALTER TABLE public.renter_applications
  ADD CONSTRAINT renter_applications_has_elevator_check
  CHECK (has_elevator IS NULL OR has_elevator IN ('yes', 'no', 'unknown'));

ALTER TABLE public.renter_applications
  DROP CONSTRAINT IF EXISTS renter_applications_floor_elevator_rule;

ALTER TABLE public.renter_applications
  ADD CONSTRAINT renter_applications_floor_elevator_rule
  CHECK (
    floor_number IS NOT NULL
    OR has_elevator IS NULL
  );

CREATE OR REPLACE FUNCTION public.convert_renter_application(p_application_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  app_row public.renter_applications%ROWTYPE;
  settings_row public.operator_settings%ROWTYPE;
  new_renter_id uuid;
  address_text text;
  install_notes_text text;
  notes_text text;
BEGIN
  SELECT *
  INTO app_row
  FROM public.renter_applications
  WHERE id = p_application_id
    AND user_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  IF app_row.converted_renter_id IS NOT NULL THEN
    RETURN app_row.converted_renter_id;
  END IF;

  IF app_row.status = 'rejected' THEN
    RAISE EXCEPTION 'Rejected applications cannot be converted';
  END IF;

  SELECT *
  INTO settings_row
  FROM public.operator_settings
  WHERE user_id = app_row.user_id;

  address_text := concat_ws(
    ', ',
    nullif(app_row.address_line1, ''),
    nullif(app_row.address_line2, ''),
    concat_ws(' ', concat_ws(', ', nullif(app_row.city, ''), nullif(app_row.state, '')), nullif(app_row.postal_code, ''))
  );

  install_notes_text := concat_ws(
    E'\n',
    'Application intake details:',
    'Equipment needed: ' || replace(app_row.equipment_needed, '_', ' '),
    'Layout: ' || replace(app_row.layout_preference, '_', ' '),
    'Dryer connection: ' || app_row.dryer_connection || coalesce(' (' || app_row.electric_prong || ')', ''),
    CASE
      WHEN app_row.floor_number IS NOT NULL THEN 'Install floor: ' || app_row.floor_number
      ELSE 'Upstairs: ' || CASE WHEN app_row.upstairs THEN 'Yes' ELSE 'No' END
    END,
    CASE
      WHEN app_row.has_elevator IS NOT NULL THEN 'Elevator: ' || app_row.has_elevator
      ELSE NULL
    END,
    'Preferred timing: ' || CASE
      WHEN app_row.preferred_timing = 'asap' THEN 'ASAP'
      ELSE coalesce(nullif(app_row.preferred_delivery_notes, ''), 'Specific timing requested')
    END
  );

  notes_text := concat_ws(
    E'\n\n',
    nullif(app_row.notes, ''),
    CASE
      WHEN nullif(app_row.preferred_delivery_notes, '') IS NULL THEN NULL
      ELSE 'Delivery notes: ' || app_row.preferred_delivery_notes
    END,
    'Converted from application submitted on ' || to_char(app_row.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI') || ' UTC.'
  );

  INSERT INTO public.renters (
    user_id,
    name,
    phone,
    email,
    address,
    status,
    monthly_rate,
    install_fee,
    deposit_amount,
    late_fee,
    notes,
    install_notes,
    dryer_outlet
  ) VALUES (
    app_row.user_id,
    app_row.applicant_name,
    app_row.phone,
    app_row.email,
    nullif(address_text, ''),
    'scheduled',
    coalesce(settings_row.default_monthly_rate, 150),
    coalesce(settings_row.default_install_fee, 75),
    coalesce(settings_row.default_deposit, 0),
    coalesce(settings_row.late_fee_amount, 25),
    nullif(notes_text, ''),
    nullif(install_notes_text, ''),
    CASE
      WHEN app_row.dryer_connection = 'electric' AND app_row.electric_prong IN ('3-prong', '4-prong') THEN app_row.electric_prong
      ELSE NULL
    END
  )
  RETURNING id INTO new_renter_id;

  UPDATE public.renter_applications
  SET
    status = 'converted_billable',
    converted_renter_id = new_renter_id,
    converted_at = now(),
    converted_by_user_id = auth.uid()
  WHERE id = app_row.id;

  INSERT INTO public.timeline_events (
    user_id,
    renter_id,
    type,
    description
  ) VALUES (
    app_row.user_id,
    new_renter_id,
    'note',
    'Converted from public application.'
  );

  RETURN new_renter_id;
END;
$$;
