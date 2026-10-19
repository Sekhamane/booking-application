-- Customer self-service for waitlist entries; direct deletes stay disallowed.

CREATE OR REPLACE FUNCTION public.enforce_waitlist_future_date()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.requested_date < CURRENT_DATE + 1 THEN
    RAISE EXCEPTION 'Waitlist dates must be at least one day ahead';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS waitlist_future_date_guard ON public.waitlist;
DROP TRIGGER IF EXISTS waitlist_future_date_insert_guard ON public.waitlist;
DROP TRIGGER IF EXISTS waitlist_future_date_update_guard ON public.waitlist;
CREATE TRIGGER waitlist_future_date_insert_guard
  BEFORE INSERT ON public.waitlist
  FOR EACH ROW EXECUTE FUNCTION public.enforce_waitlist_future_date();
CREATE TRIGGER waitlist_future_date_update_guard
  BEFORE UPDATE OF requested_date ON public.waitlist
  FOR EACH ROW EXECUTE FUNCTION public.enforce_waitlist_future_date();
REVOKE ALL ON FUNCTION public.enforce_waitlist_future_date() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.leave_my_waitlist(p_waitlist_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_entry public.waitlist%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR public.current_app_role() <> 'customer' THEN
    RAISE EXCEPTION 'Customer sign-in is required';
  END IF;
  SELECT * INTO v_entry
  FROM public.waitlist
  WHERE id = p_waitlist_id AND profile_id = auth.uid()
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Waitlist entry not found'; END IF;

  DELETE FROM public.waitlist WHERE id = v_entry.id;
  INSERT INTO public.audit_logs (actor_id, action, resource_type, resource_id)
  VALUES (auth.uid(), 'waitlist.left', 'waitlist', v_entry.id::text);
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.leave_my_waitlist(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leave_my_waitlist(UUID) TO authenticated;
