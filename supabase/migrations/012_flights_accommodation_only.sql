-- Restrict active and newly-created services to Flights and Accommodation.
-- Unsupported legacy rows are retained inactive so historical bookings remain intact.

UPDATE public.services
SET is_active = false
WHERE category NOT IN ('flights', 'accommodation') AND is_active;

ALTER TABLE public.services
  ALTER COLUMN category SET DEFAULT 'flights';

ALTER TABLE public.services
  DROP CONSTRAINT IF EXISTS services_supported_category_check;
ALTER TABLE public.services
  ADD CONSTRAINT services_supported_category_check
  CHECK (category IN ('flights', 'accommodation') OR is_active = false);

CREATE OR REPLACE FUNCTION public.prevent_unsupported_service_category()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.category NOT IN ('flights', 'accommodation') THEN
    RAISE EXCEPTION 'Only Flights and Accommodation services are supported';
  END IF;
  RETURN NEW;
END;
$$;

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
BEGIN
  IF auth.uid() IS NULL OR public.current_app_role() <> 'customer' THEN
    RAISE EXCEPTION 'Customer sign-in is required';
  END IF;
  IF p_booking_details IS NULL OR jsonb_typeof(p_booking_details) <> 'object' THEN
    RAISE EXCEPTION 'Booking details must be an object';
  END IF;
  SELECT category INTO v_category FROM public.services WHERE id = p_service_id AND is_active;
  IF NOT FOUND OR v_category NOT IN ('flights', 'accommodation') THEN
    RAISE EXCEPTION 'Service is unavailable';
  END IF;

  IF v_category = 'flights' THEN
    v_allowed_keys := ARRAY['origin','destination','trip_type','travel_date','return_date','travelers'];
    IF (p_booking_details - v_allowed_keys) <> '{}'::jsonb THEN RAISE EXCEPTION 'Unexpected flight booking field'; END IF;
    IF jsonb_typeof(p_booking_details->'origin') IS DISTINCT FROM 'string'
      OR jsonb_typeof(p_booking_details->'destination') IS DISTINCT FROM 'string'
      OR NULLIF(btrim(p_booking_details->>'origin'), '') IS NULL
      OR char_length(p_booking_details->>'origin') > 120
      OR NULLIF(btrim(p_booking_details->>'destination'), '') IS NULL
      OR char_length(p_booking_details->>'destination') > 120 THEN
      RAISE EXCEPTION 'Enter an origin and destination (up to 120 characters each)';
    END IF;
    IF p_booking_details->>'trip_type' NOT IN ('one_way','return') THEN RAISE EXCEPTION 'Choose a valid trip type'; END IF;
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
    v_details := jsonb_build_object('origin', left(btrim(p_booking_details->>'origin'), 120), 'destination', left(btrim(p_booking_details->>'destination'), 120), 'trip_type', p_booking_details->>'trip_type', 'travel_date', v_travel_date, 'travelers', (p_booking_details->>'travelers')::integer);
    IF v_return_date IS NOT NULL THEN v_details := v_details || jsonb_build_object('return_date', v_return_date); END IF;
  ELSE
    v_allowed_keys := ARRAY['destination','check_in','check_out','guests','rooms'];
    IF (p_booking_details - v_allowed_keys) <> '{}'::jsonb THEN RAISE EXCEPTION 'Unexpected accommodation booking field'; END IF;
    IF jsonb_typeof(p_booking_details->'destination') IS DISTINCT FROM 'string'
      OR NULLIF(btrim(p_booking_details->>'destination'), '') IS NULL
      OR char_length(p_booking_details->>'destination') > 120 THEN
      RAISE EXCEPTION 'Enter a destination (up to 120 characters)';
    END IF;
    IF COALESCE(p_booking_details->>'check_in','') !~ '^\d{4}-\d{2}-\d{2}$'
      OR COALESCE(p_booking_details->>'check_out','') !~ '^\d{4}-\d{2}-\d{2}$' THEN
      RAISE EXCEPTION 'Choose valid check-in and check-out dates';
    END IF;
    v_check_in := (p_booking_details->>'check_in')::date;
    v_check_out := (p_booking_details->>'check_out')::date;
    IF v_check_in < CURRENT_DATE + 1 OR v_check_out <= v_check_in THEN RAISE EXCEPTION 'Check-in must be at least one day ahead and check-out must be later'; END IF;
    IF jsonb_typeof(p_booking_details->'guests') IS DISTINCT FROM 'number' OR jsonb_typeof(p_booking_details->'rooms') IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'Enter a valid number of guests and rooms'; END IF;
    IF (p_booking_details->>'guests')::numeric NOT BETWEEN 1 AND 20 OR trunc((p_booking_details->>'guests')::numeric) <> (p_booking_details->>'guests')::numeric OR (p_booking_details->>'rooms')::numeric NOT BETWEEN 1 AND 10 OR trunc((p_booking_details->>'rooms')::numeric) <> (p_booking_details->>'rooms')::numeric THEN RAISE EXCEPTION 'Guests must be 1–20 and rooms must be 1–10'; END IF;
    v_details := jsonb_build_object('destination', left(btrim(p_booking_details->>'destination'), 120), 'check_in', v_check_in, 'check_out', v_check_out, 'guests', (p_booking_details->>'guests')::integer, 'rooms', (p_booking_details->>'rooms')::integer);
  END IF;

  v_booking := public.create_booking(p_service_id, p_coverage_level, p_slot_id, p_booking_date, NULL, p_customer_notes);
  UPDATE public.bookings SET booking_details = v_details WHERE id = (v_booking->>'id')::uuid;
  INSERT INTO public.audit_logs (actor_id, action, resource_type, resource_id, metadata)
  VALUES (auth.uid(), 'booking.details_added', 'booking', v_booking->>'id', jsonb_build_object('category', v_category, 'fields', COALESCE((SELECT jsonb_agg(field.key) FROM jsonb_object_keys(v_details) AS field(key)), '[]'::jsonb)));
  RETURN v_booking || jsonb_build_object('booking_details', v_details);
END;
$$;

DROP TRIGGER IF EXISTS services_exclude_unsupported_categories ON public.services;
CREATE TRIGGER services_exclude_unsupported_categories
  BEFORE INSERT OR UPDATE OF category ON public.services
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_unsupported_service_category();

CREATE OR REPLACE FUNCTION public.get_admin_analytics()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE result JSONB;
BEGIN
  IF NOT public.has_app_role(ARRAY['admin']) THEN RAISE EXCEPTION 'Administrator access required'; END IF;
  SELECT jsonb_build_object(
    'monthly_bookings', COALESCE((
      SELECT jsonb_agg(to_jsonb(month_row) ORDER BY month_row.month)
      FROM (
        SELECT date_trunc('month', booking_date)::DATE AS month, count(*)::INTEGER AS bookings
        FROM public.bookings
        WHERE booking_date >= date_trunc('month', CURRENT_DATE) - interval '5 months'
          AND status IN ('requested','pending_slip','pending_validation','confirmed','in_progress','completed')
        GROUP BY date_trunc('month', booking_date)
      ) month_row
    ), '[]'::JSONB),
    'by_category', COALESCE((
      SELECT jsonb_agg(to_jsonb(category_row) ORDER BY category_row.bookings DESC)
      FROM (
        SELECT s.category AS name, count(*)::INTEGER AS bookings
        FROM public.bookings b
        JOIN public.services s ON s.id = b.service_id
        WHERE b.status IN ('requested','pending_slip','pending_validation','confirmed','in_progress','completed')
          AND s.category IN ('flights', 'accommodation')
        GROUP BY s.category
      ) category_row
    ), '[]'::JSONB),
    'by_slot', COALESCE((
      SELECT jsonb_agg(to_jsonb(slot_row) ORDER BY slot_row.bookings DESC)
      FROM (
        SELECT COALESCE(ts.label, 'Unassigned') AS name, count(*)::INTEGER AS bookings
        FROM public.bookings b LEFT JOIN public.time_slots ts ON ts.id = b.slot_id
        WHERE b.status IN ('requested','pending_slip','pending_validation','confirmed','in_progress','completed')
        GROUP BY COALESCE(ts.label, 'Unassigned')
      ) slot_row
    ), '[]'::JSONB),
    'by_currency', COALESCE((
      SELECT jsonb_agg(to_jsonb(currency_row) ORDER BY currency_row.currency)
      FROM (
        SELECT price_currency AS currency, sum(price_per_side)::NUMERIC(14,2) AS amount
        FROM public.bookings WHERE status IN ('confirmed','completed')
        GROUP BY price_currency
      ) currency_row
    ), '[]'::JSONB),
    'customer_count', (SELECT count(*)::INTEGER FROM public.customers WHERE profile_id IS NOT NULL),
    'provider_count', (SELECT count(*)::INTEGER FROM public.provider_profiles WHERE is_active)
  ) INTO result;
  RETURN result;
END;
$$;

ALTER TABLE public.ai_forecasts
  DROP CONSTRAINT IF EXISTS ai_forecasts_supported_category_check;
ALTER TABLE public.ai_forecasts
  ADD CONSTRAINT ai_forecasts_supported_category_check
  CHECK (category IN ('flights', 'accommodation')) NOT VALID;

ALTER TABLE public.ai_daily_history
  DROP CONSTRAINT IF EXISTS ai_daily_history_supported_category_check;
ALTER TABLE public.ai_daily_history
  ADD CONSTRAINT ai_daily_history_supported_category_check
  CHECK (category IN ('flights', 'accommodation')) NOT VALID;
