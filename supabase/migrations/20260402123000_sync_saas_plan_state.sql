ALTER TABLE public.operator_settings
  ADD COLUMN IF NOT EXISTS saas_subscribed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS saas_product_id text,
  ADD COLUMN IF NOT EXISTS saas_subscription_end timestamptz;

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

  IF saas_subscribed_value THEN
    allowed_capacity := CASE saas_product_id_value
      WHEN 'prod_UEEy3RgIQPQOGZ' THEN 24
      WHEN 'prod_UEEyoVnhxLF3vy' THEN 49
      WHEN 'prod_UEEyKtssPt0430' THEN 74
      WHEN 'prod_UEEygRRU9opKwW' THEN 99
      WHEN 'prod_UEEyrzDO6LUlgl' THEN 199
      WHEN 'prod_UEEyuMGKTuzhYF' THEN 399
      WHEN 'prod_UEEyc2En1L0HBs' THEN 699
      WHEN 'prod_UEEyriCh6VhS2S' THEN 999
      WHEN 'prod_UEEyMlX4QNETsG' THEN NULL
      ELSE 10
    END;
  END IF;

  IF allowed_capacity IS NULL OR billable_count < allowed_capacity THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Plan limit reached. Subscribe to add more renters.'
    USING ERRCODE = 'P0001';
END;
$$;

DROP TRIGGER IF EXISTS check_renter_plan_limit ON public.renters;
CREATE TRIGGER check_renter_plan_limit
  BEFORE INSERT ON public.renters
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_renter_plan_limit();
