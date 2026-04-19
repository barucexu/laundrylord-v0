-- Prevent users from self-promoting their SaaS plan by writing to operator_settings.
-- Strategy: keep the existing user-scoped UPDATE policy for normal columns, but add
-- a BEFORE UPDATE trigger that blocks changes to subscription-controlled columns
-- unless the caller is the service role (used by Stripe edge functions).

CREATE OR REPLACE FUNCTION public.protect_operator_settings_saas_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow service_role (edge functions with service key) to make any change.
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- For all other roles (authenticated users), prevent modification of
  -- subscription/billing fields that drive plan enforcement.
  IF NEW.saas_subscribed IS DISTINCT FROM OLD.saas_subscribed
     OR NEW.saas_product_id IS DISTINCT FROM OLD.saas_product_id
     OR NEW.saas_subscription_end IS DISTINCT FROM OLD.saas_subscription_end
     OR NEW.saas_stripe_customer_id IS DISTINCT FROM OLD.saas_stripe_customer_id
  THEN
    RAISE EXCEPTION 'Subscription fields can only be modified by the billing service'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_operator_settings_saas_columns ON public.operator_settings;

CREATE TRIGGER protect_operator_settings_saas_columns
BEFORE UPDATE ON public.operator_settings
FOR EACH ROW
EXECUTE FUNCTION public.protect_operator_settings_saas_columns();

-- Also block users from setting these fields on INSERT (initial row creation).
CREATE OR REPLACE FUNCTION public.protect_operator_settings_saas_columns_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Force defaults on insert from regular users; ignore any client-supplied values.
  NEW.saas_subscribed := false;
  NEW.saas_product_id := NULL;
  NEW.saas_subscription_end := NULL;
  NEW.saas_stripe_customer_id := NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_operator_settings_saas_columns_insert ON public.operator_settings;

CREATE TRIGGER protect_operator_settings_saas_columns_insert
BEFORE INSERT ON public.operator_settings
FOR EACH ROW
EXECUTE FUNCTION public.protect_operator_settings_saas_columns_insert();