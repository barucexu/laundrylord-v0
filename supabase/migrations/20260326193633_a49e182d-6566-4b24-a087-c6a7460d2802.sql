
-- Create server-only table for Stripe secret keys
CREATE TABLE public.stripe_keys (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  encrypted_key text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stripe_keys ENABLE ROW LEVEL SECURITY;

-- Only service_role can access this table (not readable from client)
CREATE POLICY "Service role full access" ON public.stripe_keys
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Migrate existing keys
INSERT INTO public.stripe_keys (user_id, encrypted_key)
SELECT user_id, stripe_secret_key
FROM public.operator_settings
WHERE stripe_secret_key IS NOT NULL AND stripe_secret_key != '';

-- Drop the column from operator_settings
ALTER TABLE public.operator_settings DROP COLUMN stripe_secret_key;
