
-- Add columns to renters
ALTER TABLE public.renters ADD COLUMN IF NOT EXISTS has_payment_method boolean NOT NULL DEFAULT false;
ALTER TABLE public.renters ADD COLUMN IF NOT EXISTS late_fee numeric NOT NULL DEFAULT 25;

-- operator_settings table
CREATE TABLE public.operator_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  default_monthly_rate numeric NOT NULL DEFAULT 150,
  default_install_fee numeric NOT NULL DEFAULT 75,
  default_deposit numeric NOT NULL DEFAULT 0,
  late_fee_amount numeric NOT NULL DEFAULT 25,
  late_fee_after_days integer NOT NULL DEFAULT 7,
  reminder_days_before integer NOT NULL DEFAULT 3,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.operator_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings" ON public.operator_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON public.operator_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON public.operator_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own settings" ON public.operator_settings FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_operator_settings_updated_at BEFORE UPDATE ON public.operator_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- billing_reminders table (idempotency)
CREATE TABLE public.billing_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  renter_id uuid NOT NULL REFERENCES public.renters(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  billing_cycle date NOT NULL,
  reminder_type text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (renter_id, billing_cycle, reminder_type)
);

ALTER TABLE public.billing_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reminders" ON public.billing_reminders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reminders" ON public.billing_reminders FOR INSERT WITH CHECK (auth.uid() = user_id);
