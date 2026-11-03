-- Healthcare is no longer a supported booking category.
UPDATE public.services
SET is_active = false
WHERE category = 'healthcare' AND is_active;

CREATE OR REPLACE FUNCTION public.prevent_healthcare_services()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.category = 'healthcare' AND NEW.is_active THEN
    RAISE EXCEPTION 'Healthcare services are not supported';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS services_exclude_healthcare ON public.services;
CREATE TRIGGER services_exclude_healthcare
  BEFORE INSERT OR UPDATE OF category, is_active ON public.services
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_healthcare_services();
