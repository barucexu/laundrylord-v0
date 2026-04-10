ALTER TABLE public.operator_settings
  ADD COLUMN IF NOT EXISTS saas_stripe_customer_id text;
