
-- Server-side plan enforcement: prevent renter creation beyond plan limits
-- This function checks if a user can add more renters based on their Stripe subscription

CREATE OR REPLACE FUNCTION public.enforce_renter_plan_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  billable_count INTEGER;
  free_tier_max INTEGER := 10;
BEGIN
  -- Count non-archived renters + archived renters still in cooldown
  SELECT COUNT(*) INTO billable_count
  FROM public.renters
  WHERE user_id = NEW.user_id
    AND (
      status != 'archived'
      OR (status = 'archived' AND billable_until > now())
    );

  -- If under free tier limit, always allow
  IF billable_count < free_tier_max THEN
    RETURN NEW;
  END IF;

  -- Over free tier limit: we cannot check Stripe subscription from DB,
  -- so we rely on the client-side enforcement + this as a safety net.
  -- The trigger prevents adding beyond free tier for users who haven't subscribed.
  -- For paid users, the client already validates; this catches direct inserts.
  -- We allow if user already has renters beyond free tier (implies paid subscription).
  IF billable_count >= free_tier_max THEN
    -- Check if user already has renters beyond free tier (they must be subscribed)
    -- This is a soft check - if they already have >10 renters, they're paid
    -- If they have exactly 10, this new one would be #11, block unless already past free
    IF billable_count > free_tier_max THEN
      -- Already past free tier, so they must be subscribed - allow
      RETURN NEW;
    END IF;

    -- Exactly at free tier limit - this would be the 11th renter
    -- Block it - client should have shown upgrade flow
    RAISE EXCEPTION 'Plan limit reached. Subscribe to add more renters.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on renters table for INSERT only
DROP TRIGGER IF EXISTS check_renter_plan_limit ON public.renters;
CREATE TRIGGER check_renter_plan_limit
  BEFORE INSERT ON public.renters
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_renter_plan_limit();
