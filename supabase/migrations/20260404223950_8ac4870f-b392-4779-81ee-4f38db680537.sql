
CREATE OR REPLACE FUNCTION public.set_laundrylord_email()
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

CREATE TRIGGER trg_set_laundrylord_email
  BEFORE INSERT OR UPDATE ON public.renters
  FOR EACH ROW
  EXECUTE FUNCTION public.set_laundrylord_email();
