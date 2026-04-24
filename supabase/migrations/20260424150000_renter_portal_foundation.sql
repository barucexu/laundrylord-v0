-- Phase 3 renter portal foundation:
-- store only hashed portal tokens, keep lookup indexes tight, and lock table
-- access to service-role paths used by edge functions.

CREATE TABLE IF NOT EXISTS public.renter_portal_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  renter_id uuid NOT NULL REFERENCES public.renters(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.renter_portal_tokens
  ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'renter_portal_tokens_token_hash_key'
      AND conrelid = 'public.renter_portal_tokens'::regclass
  ) THEN
    ALTER TABLE public.renter_portal_tokens
      ADD CONSTRAINT renter_portal_tokens_token_hash_key UNIQUE (token_hash);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_renter_portal_tokens_owner
  ON public.renter_portal_tokens(user_id, renter_id);

CREATE INDEX IF NOT EXISTS idx_renter_portal_tokens_expires_at
  ON public.renter_portal_tokens(expires_at);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'renter_portal_tokens'
      AND policyname = 'Service role full access'
  ) THEN
    CREATE POLICY "Service role full access" ON public.renter_portal_tokens
      FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;
