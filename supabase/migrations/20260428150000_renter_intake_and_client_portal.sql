-- Public operator intake + permanent client portal foundation.
-- Keep applications separate from renters so they never affect billing counts,
-- and add a revocable hashed phone+PIN access model for renter maintenance access.

CREATE OR REPLACE FUNCTION public.slugify_public_slug(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT trim(both '-' FROM regexp_replace(lower(coalesce(value, '')), '[^a-z0-9]+', '-', 'g'));
$$;

ALTER TABLE public.operator_settings
  ADD COLUMN IF NOT EXISTS public_slug text,
  ADD COLUMN IF NOT EXISTS public_responsibility_template text,
  ADD COLUMN IF NOT EXISTS public_responsibility_version integer NOT NULL DEFAULT 1;

UPDATE public.operator_settings os
SET public_slug = public.slugify_public_slug(
  coalesce(
    nullif(os.business_name, ''),
    nullif(os.owner_email, ''),
    nullif(split_part(u.email, '@', 1), ''),
    'operator'
  )
) || '-' || substring(os.user_id::text, 1, 6)
FROM auth.users u
WHERE u.id = os.user_id
  AND (os.public_slug IS NULL OR btrim(os.public_slug) = '');

UPDATE public.operator_settings
SET public_responsibility_template = coalesce(
  public_responsibility_template,
  trim($responsibilities$
You agree to the following before delivery:

- Clean the lint trap after every dryer use.
- Dryer ducting and ventilation inside the home are your responsibility.
- Home plumbing, shutoff valves, and water connections are your responsibility.
- Leave enough space behind the machines for safe operation and ventilation.
- Electrical outlets, breakers, gas hookups, and code compliance are your responsibility.
- Damage caused by pests, rodents, roaches, or infestations is not normal machine failure.
- Do not overload the washer or dryer.
- Do not attempt self-repairs or let third parties repair the equipment without approval.
- Report machine issues promptly so service can be scheduled.
$responsibilities$)
)
WHERE public_responsibility_template IS NULL;

ALTER TABLE public.operator_settings
  ADD CONSTRAINT operator_settings_public_slug_format
  CHECK (
    public_slug IS NULL
    OR public_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  );

CREATE UNIQUE INDEX IF NOT EXISTS operator_settings_public_slug_key
  ON public.operator_settings(public_slug)
  WHERE public_slug IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.renter_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  applicant_name text NOT NULL,
  phone text NOT NULL,
  email text,
  address_line1 text NOT NULL,
  address_line2 text,
  city text NOT NULL,
  state text NOT NULL,
  postal_code text NOT NULL,
  equipment_needed text NOT NULL CHECK (equipment_needed IN ('washer_and_dryer', 'washer_only', 'dryer_only')),
  layout_preference text NOT NULL CHECK (layout_preference IN ('side_by_side', 'stackable')),
  dryer_connection text NOT NULL CHECK (dryer_connection IN ('electric', 'gas')),
  electric_prong text CHECK (electric_prong IN ('3-prong', '4-prong', 'unknown')),
  upstairs boolean NOT NULL DEFAULT false,
  preferred_timing text NOT NULL CHECK (preferred_timing IN ('asap', 'specific')),
  preferred_delivery_notes text,
  notes text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'approved_not_billable', 'converted_billable', 'rejected')),
  source_slug text,
  responsibilities_acknowledged_at timestamptz NOT NULL,
  responsibility_version integer NOT NULL,
  responsibility_text text NOT NULL,
  submitted_ip text,
  submitted_user_agent text,
  converted_renter_id uuid REFERENCES public.renters(id) ON DELETE SET NULL,
  converted_at timestamptz,
  converted_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT renter_applications_electric_prong_rule CHECK (
    (dryer_connection = 'electric' AND electric_prong IS NOT NULL)
    OR (dryer_connection = 'gas' AND electric_prong IS NULL)
  )
);

ALTER TABLE public.renter_applications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'renter_applications'
      AND policyname = 'Users can view their own applications'
  ) THEN
    CREATE POLICY "Users can view their own applications" ON public.renter_applications
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'renter_applications'
      AND policyname = 'Users can create their own applications'
  ) THEN
    CREATE POLICY "Users can create their own applications" ON public.renter_applications
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'renter_applications'
      AND policyname = 'Users can update their own applications'
  ) THEN
    CREATE POLICY "Users can update their own applications" ON public.renter_applications
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'renter_applications'
      AND policyname = 'Users can delete their own applications'
  ) THEN
    CREATE POLICY "Users can delete their own applications" ON public.renter_applications
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE TRIGGER update_renter_applications_updated_at
BEFORE UPDATE ON public.renter_applications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_renter_applications_user_status
  ON public.renter_applications(user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_renter_applications_converted_renter
  ON public.renter_applications(converted_renter_id);

CREATE TABLE IF NOT EXISTS public.renter_portal_access_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  renter_id uuid NOT NULL UNIQUE REFERENCES public.renters(id) ON DELETE CASCADE,
  pin_hash text NOT NULL,
  pin_salt text NOT NULL,
  failed_attempts integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  last_login_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.renter_portal_access_credentials ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_renter_portal_access_credentials_updated_at
BEFORE UPDATE ON public.renter_portal_access_credentials
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_renter_portal_access_credentials_owner
  ON public.renter_portal_access_credentials(user_id, renter_id);

CREATE TABLE IF NOT EXISTS public.renter_portal_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  renter_id uuid NOT NULL REFERENCES public.renters(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.renter_portal_sessions ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_renter_portal_sessions_updated_at
BEFORE UPDATE ON public.renter_portal_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_renter_portal_sessions_owner
  ON public.renter_portal_sessions(user_id, renter_id, expires_at);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'renter_portal_access_credentials'
      AND policyname = 'Service role full access'
  ) THEN
    CREATE POLICY "Service role full access" ON public.renter_portal_access_credentials
      FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'renter_portal_sessions'
      AND policyname = 'Service role full access'
  ) THEN
    CREATE POLICY "Service role full access" ON public.renter_portal_sessions
      FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

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
    'Upstairs: ' || CASE WHEN app_row.upstairs THEN 'Yes' ELSE 'No' END,
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

GRANT EXECUTE ON FUNCTION public.convert_renter_application(uuid) TO authenticated;
