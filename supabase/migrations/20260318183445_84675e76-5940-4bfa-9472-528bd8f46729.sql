
ALTER TABLE public.renters
ADD COLUMN stripe_customer_id text,
ADD COLUMN stripe_subscription_id text;
