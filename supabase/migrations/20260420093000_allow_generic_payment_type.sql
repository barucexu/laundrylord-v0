ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_type_check;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_type_check
  CHECK (type IN ('payment', 'rent', 'install_fee', 'deposit', 'late_fee', 'early_termination', 'other'));
