ALTER TABLE public.stripe_keys
  ADD COLUMN IF NOT EXISTS webhook_endpoint_token uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS webhook_signing_secret text,
  ADD COLUMN IF NOT EXISTS webhook_configured_at timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_account_id text,
  ADD COLUMN IF NOT EXISTS stripe_account_name text,
  ADD COLUMN IF NOT EXISTS stripe_livemode boolean;

UPDATE public.stripe_keys
SET webhook_endpoint_token = gen_random_uuid()
WHERE webhook_endpoint_token IS NULL;

ALTER TABLE public.stripe_keys
  ALTER COLUMN webhook_endpoint_token SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'stripe_keys_webhook_endpoint_token_key'
  ) THEN
    ALTER TABLE public.stripe_keys
      ADD CONSTRAINT stripe_keys_webhook_endpoint_token_key UNIQUE (webhook_endpoint_token);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id text NOT NULL,
  event_type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_id)
);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'stripe_webhook_events'
      AND policyname = 'Service role full access'
  ) THEN
    CREATE POLICY "Service role full access" ON public.stripe_webhook_events
      FOR ALL TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
