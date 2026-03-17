
-- Timestamp trigger function (reusable)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============ RENTERS ============
CREATE TABLE public.renters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  status TEXT NOT NULL DEFAULT 'lead' CHECK (status IN ('lead','scheduled','active','late','maintenance','termination_requested','pickup_scheduled','closed','defaulted')),
  lease_start_date DATE,
  min_term_end_date DATE,
  machine_id UUID,
  monthly_rate NUMERIC(10,2) NOT NULL DEFAULT 150,
  balance NUMERIC(10,2) NOT NULL DEFAULT 0,
  paid_through_date DATE,
  next_due_date DATE,
  days_late INTEGER NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.renters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own renters" ON public.renters FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own renters" ON public.renters FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own renters" ON public.renters FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own renters" ON public.renters FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_renters_updated_at BEFORE UPDATE ON public.renters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ MACHINES ============
CREATE TABLE public.machines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('washer','dryer')),
  model TEXT NOT NULL,
  serial TEXT NOT NULL,
  prong TEXT CHECK (prong IN ('3-prong','4-prong')),
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','assigned','maintenance','retired')),
  assigned_renter_id UUID REFERENCES public.renters(id) ON DELETE SET NULL,
  condition TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own machines" ON public.machines FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own machines" ON public.machines FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own machines" ON public.machines FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own machines" ON public.machines FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_machines_updated_at BEFORE UPDATE ON public.machines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add FK from renters.machine_id to machines
ALTER TABLE public.renters ADD CONSTRAINT fk_renters_machine FOREIGN KEY (machine_id) REFERENCES public.machines(id) ON DELETE SET NULL;

-- ============ PAYMENTS ============
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  renter_id UUID NOT NULL REFERENCES public.renters(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming','due_soon','overdue','failed','paid')),
  due_date DATE NOT NULL,
  paid_date DATE,
  type TEXT NOT NULL DEFAULT 'rent' CHECK (type IN ('rent','install_fee','deposit','late_fee','early_termination')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payments" ON public.payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own payments" ON public.payments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own payments" ON public.payments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own payments" ON public.payments FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ MAINTENANCE LOGS ============
CREATE TABLE public.maintenance_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  renter_id UUID REFERENCES public.renters(id) ON DELETE SET NULL,
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  issue_category TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'reported' CHECK (status IN ('reported','scheduled','in_progress','resolved')),
  reported_date DATE NOT NULL DEFAULT CURRENT_DATE,
  resolved_date DATE,
  resolution_notes TEXT DEFAULT '',
  cost NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.maintenance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own maintenance logs" ON public.maintenance_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own maintenance logs" ON public.maintenance_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own maintenance logs" ON public.maintenance_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own maintenance logs" ON public.maintenance_logs FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_maintenance_logs_updated_at BEFORE UPDATE ON public.maintenance_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ TIMELINE EVENTS ============
CREATE TABLE public.timeline_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  renter_id UUID NOT NULL REFERENCES public.renters(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('created','machine_assigned','payment_succeeded','payment_failed','late_fee','maintenance_opened','maintenance_resolved','pickup_scheduled','pickup_completed','note')),
  description TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own timeline events" ON public.timeline_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own timeline events" ON public.timeline_events FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_timeline_events_updated_at BEFORE UPDATE ON public.timeline_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ INDEXES ============
CREATE INDEX idx_renters_user_id ON public.renters(user_id);
CREATE INDEX idx_renters_status ON public.renters(status);
CREATE INDEX idx_machines_user_id ON public.machines(user_id);
CREATE INDEX idx_machines_status ON public.machines(status);
CREATE INDEX idx_payments_user_id ON public.payments(user_id);
CREATE INDEX idx_payments_renter_id ON public.payments(renter_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_maintenance_logs_user_id ON public.maintenance_logs(user_id);
CREATE INDEX idx_timeline_events_renter_id ON public.timeline_events(renter_id);
