CREATE TABLE IF NOT EXISTS public.renter_balance_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  renter_id uuid NOT NULL REFERENCES public.renters(id) ON DELETE CASCADE,
  description text NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  kind text NOT NULL DEFAULT 'fee_add_on',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.renter_balance_adjustments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'renter_balance_adjustments'
      AND policyname = 'Users can view their own renter balance adjustments'
  ) THEN
    CREATE POLICY "Users can view their own renter balance adjustments"
      ON public.renter_balance_adjustments
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'renter_balance_adjustments'
      AND policyname = 'Users can create their own renter balance adjustments'
  ) THEN
    CREATE POLICY "Users can create their own renter balance adjustments"
      ON public.renter_balance_adjustments
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'renter_balance_adjustments'
      AND policyname = 'Users can update their own renter balance adjustments'
  ) THEN
    CREATE POLICY "Users can update their own renter balance adjustments"
      ON public.renter_balance_adjustments
      FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'renter_balance_adjustments'
      AND policyname = 'Users can delete their own renter balance adjustments'
  ) THEN
    CREATE POLICY "Users can delete their own renter balance adjustments"
      ON public.renter_balance_adjustments
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_renter_balance_adjustments_user_id
  ON public.renter_balance_adjustments(user_id);

CREATE INDEX IF NOT EXISTS idx_renter_balance_adjustments_renter_id
  ON public.renter_balance_adjustments(renter_id);

DROP TRIGGER IF EXISTS update_renter_balance_adjustments_updated_at ON public.renter_balance_adjustments;
CREATE TRIGGER update_renter_balance_adjustments_updated_at
  BEFORE UPDATE ON public.renter_balance_adjustments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.record_manual_payment(
  p_renter_id uuid,
  p_amount numeric,
  p_paid_date date,
  p_type text,
  p_payment_source text DEFAULT 'other',
  p_payment_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_renter public.renters%ROWTYPE;
  v_payment public.payments%ROWTYPE;
  v_new_balance numeric;
  v_description text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than 0';
  END IF;

  SELECT *
  INTO v_renter
  FROM public.renters
  WHERE id = p_renter_id
    AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Renter not found';
  END IF;

  INSERT INTO public.payments (
    user_id,
    renter_id,
    amount,
    due_date,
    paid_date,
    status,
    type,
    payment_source,
    payment_notes
  )
  VALUES (
    v_user_id,
    p_renter_id,
    p_amount,
    p_paid_date,
    p_paid_date,
    'paid',
    p_type,
    COALESCE(NULLIF(trim(p_payment_source), ''), 'other'),
    NULLIF(trim(COALESCE(p_payment_notes, '')), '')
  )
  RETURNING *
  INTO v_payment;

  v_new_balance := GREATEST(0, COALESCE(v_renter.balance, 0) - p_amount);

  UPDATE public.renters
  SET
    balance = v_new_balance,
    rent_collected = CASE
      WHEN p_type = 'rent' THEN COALESCE(rent_collected, 0) + p_amount
      ELSE rent_collected
    END,
    days_late = CASE
      WHEN p_type = 'rent' AND v_new_balance = 0 THEN 0
      ELSE days_late
    END,
    paid_through_date = CASE
      WHEN p_type = 'rent' AND v_new_balance = 0 THEN p_paid_date
      ELSE paid_through_date
    END,
    status = CASE
      WHEN status = 'late' AND v_new_balance = 0 THEN 'active'
      ELSE status
    END,
    install_fee_collected = CASE
      WHEN p_type = 'install_fee' AND p_amount >= COALESCE(v_renter.install_fee, 0) THEN true
      ELSE install_fee_collected
    END,
    deposit_collected = CASE
      WHEN p_type = 'deposit' AND p_amount >= COALESCE(v_renter.deposit_amount, 0) THEN true
      ELSE deposit_collected
    END
  WHERE id = p_renter_id
    AND user_id = v_user_id;

  v_description := format(
    'Manual %s payment recorded: $%s via %s',
    replace(p_type, '_', ' '),
    to_char(p_amount, 'FM999999990.00'),
    COALESCE(NULLIF(trim(p_payment_source), ''), 'other')
  );

  INSERT INTO public.timeline_events (
    user_id,
    renter_id,
    type,
    description,
    date
  )
  VALUES (
    v_user_id,
    p_renter_id,
    'payment_succeeded',
    v_description,
    p_paid_date
  );

  RETURN jsonb_build_object(
    'payment_id', v_payment.id,
    'renter_id', p_renter_id,
    'balance', v_new_balance
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.add_renter_balance_adjustment(
  p_renter_id uuid,
  p_description text,
  p_amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_renter public.renters%ROWTYPE;
  v_adjustment public.renter_balance_adjustments%ROWTYPE;
  v_next_balance numeric;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NULLIF(trim(COALESCE(p_description, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Description is required';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than 0';
  END IF;

  SELECT *
  INTO v_renter
  FROM public.renters
  WHERE id = p_renter_id
    AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Renter not found';
  END IF;

  IF v_renter.stripe_subscription_id IS NOT NULL THEN
    RAISE EXCEPTION 'Fee add-ons in this flow are only available before autopay starts';
  END IF;

  INSERT INTO public.renter_balance_adjustments (
    user_id,
    renter_id,
    description,
    amount,
    kind
  )
  VALUES (
    v_user_id,
    p_renter_id,
    trim(p_description),
    p_amount,
    'fee_add_on'
  )
  RETURNING *
  INTO v_adjustment;

  v_next_balance := COALESCE(v_renter.balance, 0) + p_amount;

  UPDATE public.renters
  SET balance = v_next_balance
  WHERE id = p_renter_id
    AND user_id = v_user_id;

  INSERT INTO public.timeline_events (
    user_id,
    renter_id,
    type,
    description,
    date
  )
  VALUES (
    v_user_id,
    p_renter_id,
    'note',
    format(
      'Added fee add-on: %s ($%s)',
      trim(p_description),
      to_char(p_amount, 'FM999999990.00')
    ),
    now()
  );

  RETURN jsonb_build_object(
    'adjustment_id', v_adjustment.id,
    'renter_id', p_renter_id,
    'balance', v_next_balance
  );
END;
$$;
