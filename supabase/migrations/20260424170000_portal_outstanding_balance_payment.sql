-- Phase 4 renter portal payment:
-- store Stripe Checkout/PaymentIntent ids on payments so webhook handling can
-- dedupe portal outstanding-balance writes across retries and related events.

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_stripe_checkout_session_unique
  ON public.payments (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_stripe_payment_intent_unique
  ON public.payments (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.apply_portal_outstanding_balance_payment_success(
  p_user_id uuid,
  p_renter_id uuid,
  p_amount numeric,
  p_payment_date date,
  p_checkout_session_id text DEFAULT NULL,
  p_payment_intent_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment_id uuid;
BEGIN
  IF COALESCE(p_amount, 0) <= 0 THEN
    RAISE EXCEPTION 'Portal payment amount must be greater than zero.';
  END IF;

  IF p_checkout_session_id IS NULL AND p_payment_intent_id IS NULL THEN
    RAISE EXCEPTION 'Portal payment idempotency key is required.';
  END IF;

  SELECT id
  INTO v_payment_id
  FROM public.payments
  WHERE user_id = p_user_id
    AND (
      (p_checkout_session_id IS NOT NULL AND stripe_checkout_session_id = p_checkout_session_id)
      OR (p_payment_intent_id IS NOT NULL AND stripe_payment_intent_id = p_payment_intent_id)
    )
  LIMIT 1;

  IF v_payment_id IS NOT NULL THEN
    RETURN jsonb_build_object('duplicate', true, 'payment_id', v_payment_id);
  END IF;

  PERFORM 1
  FROM public.renters
  WHERE id = p_renter_id
    AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Renter not found.';
  END IF;

  INSERT INTO public.payments (
    renter_id,
    user_id,
    amount,
    due_date,
    paid_date,
    status,
    type,
    payment_source,
    payment_notes,
    stripe_checkout_session_id,
    stripe_payment_intent_id
  ) VALUES (
    p_renter_id,
    p_user_id,
    p_amount,
    p_payment_date,
    p_payment_date,
    'paid',
    'payment',
    'stripe',
    'Portal outstanding balance payment',
    p_checkout_session_id,
    p_payment_intent_id
  )
  RETURNING id INTO v_payment_id;

  UPDATE public.renters
  SET balance = GREATEST(0, COALESCE(balance, 0) - p_amount)
  WHERE id = p_renter_id
    AND user_id = p_user_id;

  INSERT INTO public.timeline_events (
    renter_id,
    user_id,
    type,
    description
  ) VALUES (
    p_renter_id,
    p_user_id,
    'payment_succeeded',
    format('Portal payment of $%s succeeded', to_char(p_amount, 'FM999999990.00'))
  );

  RETURN jsonb_build_object('duplicate', false, 'payment_id', v_payment_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_portal_outstanding_balance_payment_failure(
  p_user_id uuid,
  p_renter_id uuid,
  p_amount numeric,
  p_payment_date date,
  p_payment_intent_id text,
  p_checkout_session_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment_id uuid;
BEGIN
  IF COALESCE(p_amount, 0) <= 0 THEN
    RAISE EXCEPTION 'Portal payment amount must be greater than zero.';
  END IF;

  IF p_payment_intent_id IS NULL AND p_checkout_session_id IS NULL THEN
    RAISE EXCEPTION 'Portal payment idempotency key is required.';
  END IF;

  SELECT id
  INTO v_payment_id
  FROM public.payments
  WHERE user_id = p_user_id
    AND (
      (p_payment_intent_id IS NOT NULL AND stripe_payment_intent_id = p_payment_intent_id)
      OR (p_checkout_session_id IS NOT NULL AND stripe_checkout_session_id = p_checkout_session_id)
    )
  LIMIT 1;

  IF v_payment_id IS NOT NULL THEN
    RETURN jsonb_build_object('duplicate', true, 'payment_id', v_payment_id);
  END IF;

  PERFORM 1
  FROM public.renters
  WHERE id = p_renter_id
    AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Renter not found.';
  END IF;

  INSERT INTO public.payments (
    renter_id,
    user_id,
    amount,
    due_date,
    status,
    type,
    payment_source,
    payment_notes,
    stripe_checkout_session_id,
    stripe_payment_intent_id
  ) VALUES (
    p_renter_id,
    p_user_id,
    p_amount,
    p_payment_date,
    'failed',
    'payment',
    'stripe',
    'Portal outstanding balance payment failed',
    p_checkout_session_id,
    p_payment_intent_id
  )
  RETURNING id INTO v_payment_id;

  INSERT INTO public.timeline_events (
    renter_id,
    user_id,
    type,
    description
  ) VALUES (
    p_renter_id,
    p_user_id,
    'payment_failed',
    format('Portal payment of $%s failed', to_char(p_amount, 'FM999999990.00'))
  );

  RETURN jsonb_build_object('duplicate', false, 'payment_id', v_payment_id);
END;
$$;
