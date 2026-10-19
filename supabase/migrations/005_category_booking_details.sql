-- Collect only the operational details needed for category-specific requests.
-- Personal/health documents and payment details do not belong in these fields.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS booking_details JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_details_object_size_check;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_details_object_size_check
  CHECK (jsonb_typeof(booking_details) = 'object' AND octet_length(booking_details::text) <= 4000);

CREATE OR REPLACE FUNCTION public.create_booking_with_details(
  p_service_id UUID,
  p_coverage_level INTEGER,
  p_slot_id UUID,
  p_booking_date DATE,
  p_customer_notes TEXT,
  p_booking_details JSONB
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_category TEXT;
  v_details JSONB := '{}'::jsonb;
  v_booking JSONB;
  v_allowed_keys TEXT[];
  v_travel_date DATE;
  v_return_date DATE;
  v_check_in DATE;
  v_check_out DATE;
  v_count INTEGER;
BEGIN
  IF auth.uid() IS NULL OR public.current_app_role() <> 'customer' THEN
    RAISE EXCEPTION 'Customer sign-in is required';
  END IF;
  IF p_booking_details IS NULL OR jsonb_typeof(p_booking_details) <> 'object' THEN
    RAISE EXCEPTION 'Booking details must be an object';
  END IF;

  SELECT category INTO v_category
  FROM public.services
  WHERE id = p_service_id AND is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'Service is unavailable'; END IF;

  IF v_category = 'flights' THEN
    v_allowed_keys := ARRAY['origin','destination','trip_type','travel_date','return_date','travelers'];
    IF (p_booking_details - v_allowed_keys) <> '{}'::jsonb THEN RAISE EXCEPTION 'Unexpected flight booking field'; END IF;
    IF jsonb_typeof(p_booking_details->'origin') IS DISTINCT FROM 'string'
      OR jsonb_typeof(p_booking_details->'destination') IS DISTINCT FROM 'string'
      OR NULLIF(btrim(p_booking_details->>'origin'), '') IS NULL OR char_length(p_booking_details->>'origin') > 120
      OR NULLIF(btrim(p_booking_details->>'destination'), '') IS NULL OR char_length(p_booking_details->>'destination') > 120 THEN
      RAISE EXCEPTION 'Enter an origin and destination (up to 120 characters each)';
    END IF;
    IF p_booking_details->>'trip_type' IS NULL OR p_booking_details->>'trip_type' NOT IN ('one_way','return') THEN RAISE EXCEPTION 'Choose a valid trip type'; END IF;
    IF jsonb_typeof(p_booking_details->'travelers') IS DISTINCT FROM 'number'
      OR (p_booking_details->>'travelers')::numeric NOT BETWEEN 1 AND 20
      OR trunc((p_booking_details->>'travelers')::numeric) <> (p_booking_details->>'travelers')::numeric THEN
      RAISE EXCEPTION 'Travelers must be a whole number from 1 to 20';
    END IF;
    IF COALESCE(p_booking_details->>'travel_date','') !~ '^\d{4}-\d{2}-\d{2}$' THEN RAISE EXCEPTION 'Choose a valid travel date'; END IF;
    v_travel_date := (p_booking_details->>'travel_date')::date;
    IF v_travel_date < CURRENT_DATE + 1 THEN RAISE EXCEPTION 'Travel date must be at least one day ahead'; END IF;
    IF p_booking_details->>'trip_type' = 'return' THEN
      IF COALESCE(p_booking_details->>'return_date','') !~ '^\d{4}-\d{2}-\d{2}$' THEN RAISE EXCEPTION 'Choose a valid return date'; END IF;
      v_return_date := (p_booking_details->>'return_date')::date;
      IF v_return_date < v_travel_date THEN RAISE EXCEPTION 'Return date must be on or after the travel date'; END IF;
    ELSIF p_booking_details ? 'return_date' THEN
      RAISE EXCEPTION 'A one-way trip cannot include a return date';
    END IF;
    v_details := jsonb_build_object(
      'origin', left(btrim(p_booking_details->>'origin'), 120),
      'destination', left(btrim(p_booking_details->>'destination'), 120),
      'trip_type', p_booking_details->>'trip_type',
      'travel_date', v_travel_date,
      'travelers', (p_booking_details->>'travelers')::integer
    );
    IF v_return_date IS NOT NULL THEN v_details := v_details || jsonb_build_object('return_date', v_return_date); END IF;
  ELSIF v_category = 'accommodation' THEN
    v_allowed_keys := ARRAY['destination','check_in','check_out','guests','rooms'];
    IF (p_booking_details - v_allowed_keys) <> '{}'::jsonb THEN RAISE EXCEPTION 'Unexpected accommodation booking field'; END IF;
    IF jsonb_typeof(p_booking_details->'destination') IS DISTINCT FROM 'string'
      OR NULLIF(btrim(p_booking_details->>'destination'), '') IS NULL OR char_length(p_booking_details->>'destination') > 120 THEN
      RAISE EXCEPTION 'Enter a destination (up to 120 characters)';
    END IF;
    IF COALESCE(p_booking_details->>'check_in','') !~ '^\d{4}-\d{2}-\d{2}$'
      OR COALESCE(p_booking_details->>'check_out','') !~ '^\d{4}-\d{2}-\d{2}$' THEN
      RAISE EXCEPTION 'Choose valid check-in and check-out dates';
    END IF;
    v_check_in := (p_booking_details->>'check_in')::date;
    v_check_out := (p_booking_details->>'check_out')::date;
    IF v_check_in < CURRENT_DATE + 1 OR v_check_out <= v_check_in THEN RAISE EXCEPTION 'Check-in must be at least one day ahead and check-out must be later'; END IF;
    IF jsonb_typeof(p_booking_details->'guests') IS DISTINCT FROM 'number' OR jsonb_typeof(p_booking_details->'rooms') IS DISTINCT FROM 'number' THEN
      RAISE EXCEPTION 'Enter a valid number of guests and rooms';
    END IF;
    IF (p_booking_details->>'guests')::numeric NOT BETWEEN 1 AND 20
      OR trunc((p_booking_details->>'guests')::numeric) <> (p_booking_details->>'guests')::numeric
      OR (p_booking_details->>'rooms')::numeric NOT BETWEEN 1 AND 10
      OR trunc((p_booking_details->>'rooms')::numeric) <> (p_booking_details->>'rooms')::numeric THEN
      RAISE EXCEPTION 'Guests must be 1–20 and rooms must be 1–10';
    END IF;
    v_details := jsonb_build_object(
      'destination', left(btrim(p_booking_details->>'destination'), 120),
      'check_in', v_check_in,
      'check_out', v_check_out,
      'guests', (p_booking_details->>'guests')::integer,
      'rooms', (p_booking_details->>'rooms')::integer
    );
  ELSIF v_category = 'healthcare' THEN
    v_allowed_keys := ARRAY['visit_mode'];
    IF (p_booking_details - v_allowed_keys) <> '{}'::jsonb THEN RAISE EXCEPTION 'Unexpected appointment field'; END IF;
    IF p_booking_details->>'visit_mode' IS NULL OR p_booking_details->>'visit_mode' NOT IN ('in_person','telehealth') THEN RAISE EXCEPTION 'Choose an appointment type'; END IF;
    v_details := jsonb_build_object('visit_mode', p_booking_details->>'visit_mode');
  ELSIF p_booking_details <> '{}'::jsonb THEN
    RAISE EXCEPTION 'This service does not accept additional booking details';
  END IF;

  v_booking := public.create_booking(
    p_service_id, p_coverage_level, p_slot_id, p_booking_date, NULL, p_customer_notes
  );
  UPDATE public.bookings
  SET booking_details = v_details
  WHERE id = (v_booking->>'id')::uuid;
  INSERT INTO public.audit_logs (actor_id, action, resource_type, resource_id, metadata)
  VALUES (auth.uid(), 'booking.details_added', 'booking', v_booking->>'id',
    jsonb_build_object('category', v_category, 'fields', COALESCE((SELECT jsonb_agg(field.key) FROM jsonb_object_keys(v_details) AS field(key)), '[]'::jsonb)));

  RETURN v_booking || jsonb_build_object('booking_details', v_details);
END;
$$;

-- New bookings must use the atomic category-aware endpoint.
REVOKE ALL ON FUNCTION public.create_booking(UUID, INTEGER, UUID, DATE, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_booking_with_details(UUID, INTEGER, UUID, DATE, TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_booking_with_details(UUID, INTEGER, UUID, DATE, TEXT, JSONB) TO authenticated;
