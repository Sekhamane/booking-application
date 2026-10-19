-- Keep booking state changes explicit and forward-only.
-- Apply after 003_seed_default_time_slots.sql.

CREATE OR REPLACE FUNCTION public.admin_update_booking_status(
  p_booking_id UUID,
  p_status TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_allowed BOOLEAN := false;
  v_reason TEXT := NULLIF(left(btrim(p_reason), 500), '');
BEGIN
  IF NOT public.has_app_role(ARRAY['admin']) THEN
    RAISE EXCEPTION 'Administrator access required';
  END IF;

  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;

  v_allowed :=
    (v_booking.status = 'requested' AND p_status IN ('confirmed', 'rejected', 'cancelled'))
    OR (v_booking.status = 'pending_slip' AND p_status IN ('pending_validation', 'rejected', 'cancelled'))
    OR (v_booking.status = 'pending_validation' AND p_status IN ('confirmed', 'rejected', 'cancelled'))
    OR (v_booking.status = 'confirmed' AND p_status IN ('in_progress', 'cancelled', 'expired'))
    OR (v_booking.status = 'in_progress' AND p_status = 'completed');

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Invalid booking status transition: % to %', v_booking.status, p_status;
  END IF;
  IF p_status IN ('rejected', 'cancelled') AND v_reason IS NULL THEN
    RAISE EXCEPTION 'A reason is required when rejecting or cancelling a booking';
  END IF;

  UPDATE public.bookings
  SET status = p_status,
      rejection_reason = CASE WHEN p_status = 'rejected' THEN v_reason ELSE rejection_reason END,
      cancellation_reason = CASE WHEN p_status = 'cancelled' THEN v_reason ELSE cancellation_reason END,
      cancelled_at = CASE WHEN p_status = 'cancelled' THEN now() ELSE cancelled_at END,
      updated_at = now()
  WHERE id = p_booking_id;

  INSERT INTO public.audit_logs (actor_id, action, resource_type, resource_id, metadata)
  VALUES (auth.uid(), 'booking.admin_status_changed', 'booking', p_booking_id::text,
    jsonb_build_object('from', v_booking.status, 'to', p_status, 'reason', v_reason));
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_booking_status(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_booking_status(UUID, TEXT, TEXT) TO authenticated;
