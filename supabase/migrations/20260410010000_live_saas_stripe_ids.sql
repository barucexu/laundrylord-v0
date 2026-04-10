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
      WHEN 'prod_UJ58t9MVJy9kM1' THEN 24
      WHEN 'prod_UJ58vllhfPnDMA' THEN 49
      WHEN 'prod_UJ58WKvIfBSgVF' THEN 74
      WHEN 'prod_UJ58Un0dqdr1bw' THEN 99
      WHEN 'prod_UJ570aXFf4kHyD' THEN 199
      WHEN 'prod_UJ57FSgV0zgrlb' THEN 399
      WHEN 'prod_UJ57tGh0ISMKcj' THEN 699
      WHEN 'prod_UJ57Jy6PV80WrY' THEN 999
      WHEN 'prod_UJ57nRhlCMzAzY' THEN NULL
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
