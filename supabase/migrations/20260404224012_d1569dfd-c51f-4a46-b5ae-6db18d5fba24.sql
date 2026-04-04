
CREATE OR REPLACE FUNCTION public.set_laundrylord_email_machines()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  SELECT owner_email INTO NEW.laundrylord_email
  FROM public.operator_settings
  WHERE user_id = NEW.user_id
  LIMIT 1;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_laundrylord_email_machines
  BEFORE INSERT OR UPDATE ON public.machines
  FOR EACH ROW
  EXECUTE FUNCTION public.set_laundrylord_email_machines();
