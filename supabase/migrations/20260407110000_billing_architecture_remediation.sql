ALTER TABLE public.stripe_keys
  RENAME COLUMN encrypted_key TO legacy_key_plaintext;

ALTER TABLE public.stripe_keys
  ALTER COLUMN legacy_key_plaintext DROP NOT NULL;

ALTER TABLE public.stripe_keys
  ADD COLUMN IF NOT EXISTS ciphertext text,
  ADD COLUMN IF NOT EXISTS key_version integer,
  ADD COLUMN IF NOT EXISTS iv_or_nonce text;

CREATE TABLE IF NOT EXISTS public.operator_webhook_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_account_label text,
  webhook_secret_ciphertext text,
  webhook_secret_key_version integer,
  webhook_secret_iv_or_nonce text,
  webhook_path_token text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS operator_webhook_endpoints_active_user_idx
  ON public.operator_webhook_endpoints (user_id)
  WHERE active = true;

CREATE TABLE IF NOT EXISTS public.processed_stripe_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.saas_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_label text NOT NULL,
  product_id text UNIQUE,
  price_id text,
  min_count integer NOT NULL,
  max_count integer,
  sort_order integer NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.saas_plans (name, display_label, product_id, price_id, min_count, max_count, sort_order, active)
VALUES
  ('Free', 'Free', NULL, NULL, 1, 10, 0, true),
  ('Starter', '$29/mo', 'prod_UEEy3RgIQPQOGZ', 'price_1TFmUg7o90tJn3krILvYLKBP', 11, 24, 1, true),
  ('Growth', '$49/mo', 'prod_UEEyoVnhxLF3vy', 'price_1TFmUh7o90tJn3krlGQuqdiu', 25, 49, 2, true),
  ('Pro', '$99/mo', 'prod_UEEyKtssPt0430', 'price_1TFmUi7o90tJn3krfXA6KgB2', 50, 74, 3, true),
  ('Scale', '$129/mo', 'prod_UEEygRRU9opKwW', 'price_1TFmUj7o90tJn3krsJq0qv9N', 75, 99, 4, true),
  ('Business', '$199/mo', 'prod_UEEyrzDO6LUlgl', 'price_1TFmUk7o90tJn3kr0GNbTYIg', 100, 199, 5, true),
  ('Enterprise', '$299/mo', 'prod_UEEyuMGKTuzhYF', 'price_1TFmUl7o90tJn3krfybZEO7K', 200, 399, 6, true),
  ('Portfolio', '$499/mo', 'prod_UEEyc2En1L0HBs', 'price_1TFmUn7o90tJn3krki0r0xmT', 400, 699, 7, true),
  ('Empire', '$799/mo', 'prod_UEEyriCh6VhS2S', 'price_1TFmUo7o90tJn3krKsZmjhAk', 700, 999, 8, true),
  ('Ultimate', '$999/mo', 'prod_UEEyMlX4QNETsG', 'price_1TFmUo7o90tJn3krdi8mb7pZ', 1000, NULL, 9, true)
ON CONFLICT (name) DO UPDATE
SET
  display_label = EXCLUDED.display_label,
  product_id = EXCLUDED.product_id,
  price_id = EXCLUDED.price_id,
  min_count = EXCLUDED.min_count,
  max_count = EXCLUDED.max_count,
  sort_order = EXCLUDED.sort_order,
  active = EXCLUDED.active,
  updated_at = now();

INSERT INTO public.operator_webhook_endpoints (user_id, webhook_path_token, active)
SELECT
  sk.user_id,
  encode(gen_random_bytes(18), 'hex'),
  true
FROM public.stripe_keys sk
ON CONFLICT (webhook_path_token) DO NOTHING;

ALTER TABLE public.operator_webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processed_stripe_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on operator_webhook_endpoints" ON public.operator_webhook_endpoints
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access on processed_stripe_events" ON public.processed_stripe_events
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access on saas_plans" ON public.saas_plans
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.enforce_renter_plan_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  billable_count INTEGER;
  saas_subscribed_value BOOLEAN := false;
  saas_product_id_value TEXT := NULL;
  allowed_capacity INTEGER := 10;
BEGIN
  SELECT COUNT(*) INTO billable_count
  FROM public.renters
  WHERE user_id = NEW.user_id
    AND (
      status != 'archived'
      OR (status = 'archived' AND billable_until > now())
    );

  SELECT
    COALESCE(os.saas_subscribed, false),
    os.saas_product_id
  INTO
    saas_subscribed_value,
    saas_product_id_value
  FROM public.operator_settings os
  WHERE os.user_id = NEW.user_id;

  IF saas_subscribed_value AND saas_product_id_value IS NOT NULL THEN
    SELECT sp.max_count
    INTO allowed_capacity
    FROM public.saas_plans sp
    WHERE sp.active = true
      AND sp.product_id = saas_product_id_value
    LIMIT 1;
  ELSE
    SELECT sp.max_count
    INTO allowed_capacity
    FROM public.saas_plans sp
    WHERE sp.active = true
      AND sp.name = 'Free'
    LIMIT 1;
  END IF;

  IF allowed_capacity IS NULL OR billable_count < allowed_capacity THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Plan limit reached. Subscribe to add more renters.'
    USING ERRCODE = 'P0001';
END;
$$;
