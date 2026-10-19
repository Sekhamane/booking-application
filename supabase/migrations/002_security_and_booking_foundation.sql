-- Teabag Booking System: identity, authorization, and authoritative booking foundation.
-- New users receive the customer role. Privileged roles must be assigned out of band.

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'customer'
    CHECK (role IN ('customer', 'provider', 'admin', 'security_admin')),
  preferred_language TEXT NOT NULL DEFAULT 'en',
  privacy_notice_accepted_at TIMESTAMPTZ,
  marketing_consent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.provider_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS profile_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS provider_id UUID REFERENCES public.provider_profiles(id) ON DELETE SET NULL;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'general';
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS duration_minutes INTEGER NOT NULL DEFAULT 60 CHECK (duration_minutes > 0);
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'ZAR' CHECK (currency ~ '^[A-Z]{3}$');
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS provider_id UUID REFERENCES public.provider_profiles(id) ON DELETE SET NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS price_currency TEXT NOT NULL DEFAULT 'ZAR';
ALTER TABLE public.bookings ALTER COLUMN price_per_side TYPE NUMERIC(12,2) USING price_per_side::NUMERIC(12,2);
ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS public.provider_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.provider_profiles(id) ON DELETE CASCADE,
  weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  slot_id UUID NOT NULL REFERENCES public.time_slots(id) ON DELETE CASCADE,
  is_available BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (provider_id, weekday, slot_id)
);
CREATE TABLE IF NOT EXISTS public.provider_time_off (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.provider_profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  reason TEXT,
  UNIQUE (provider_id, date)
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  outcome TEXT NOT NULL DEFAULT 'success' CHECK (outcome IN ('success', 'denied', 'failure')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created ON public.audit_logs(actor_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.privacy_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  request_type TEXT NOT NULL CHECK (request_type IN ('export', 'deletion')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  admin_notes TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_privacy_one_open_deletion_request
  ON public.privacy_requests(profile_id) WHERE request_type = 'deletion' AND status IN ('pending','processing');

CREATE TABLE IF NOT EXISTS public.booking_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  canonical_payload JSONB NOT NULL,
  booking_key TEXT NOT NULL CHECK (booking_key ~ '^0x[0-9a-f]{64}$'),
  event_hash TEXT NOT NULL CHECK (event_hash ~ '^0x[0-9a-f]{64}$'),
  transaction_hash TEXT NOT NULL CHECK (transaction_hash ~ '^0x[0-9a-fA-F]{64}$'),
  network TEXT NOT NULL,
  chain_id BIGINT NOT NULL,
  block_number BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (booking_id, event_hash)
);
CREATE INDEX IF NOT EXISTS idx_booking_proofs_booking_created ON public.booking_proofs(booking_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.ai_model_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name TEXT NOT NULL,
  model_version TEXT NOT NULL,
  dataset_rows INTEGER NOT NULL,
  metrics JSONB NOT NULL,
  learning_curve JSONB NOT NULL DEFAULT '[]'::jsonb,
  trained_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (model_name, model_version)
);
CREATE TABLE IF NOT EXISTS public.ai_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_metrics_id UUID NOT NULL REFERENCES public.ai_model_metrics(id) ON DELETE CASCADE,
  forecast_date DATE NOT NULL,
  category TEXT NOT NULL,
  time_period TEXT NOT NULL,
  predicted_bookings NUMERIC(12,2) NOT NULL CHECK (predicted_bookings >= 0),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_forecasts_date_category ON public.ai_forecasts(forecast_date, category);
CREATE TABLE IF NOT EXISTS public.ai_daily_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_date DATE NOT NULL,
  category TEXT NOT NULL,
  time_period TEXT NOT NULL,
  actual_bookings INTEGER NOT NULL CHECK (actual_bookings >= 0),
  UNIQUE (booking_date, category, time_period)
);

CREATE OR REPLACE FUNCTION public.audit_row_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_row JSONB; v_id TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN v_row := to_jsonb(OLD); ELSE v_row := to_jsonb(NEW); END IF;
  v_id := v_row ->> 'id';
  INSERT INTO public.audit_logs (actor_id, action, resource_type, resource_id, metadata)
  VALUES (auth.uid(), lower(TG_TABLE_NAME) || '.' || lower(TG_OP), TG_TABLE_NAME, v_id,
    jsonb_build_object('operation', TG_OP));
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS audit_service_changes ON public.services;
CREATE TRIGGER audit_service_changes AFTER INSERT OR UPDATE OR DELETE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
DROP TRIGGER IF EXISTS audit_provider_changes ON public.provider_profiles;
CREATE TRIGGER audit_provider_changes AFTER INSERT OR UPDATE OR DELETE ON public.provider_profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
DROP TRIGGER IF EXISTS audit_availability_changes ON public.provider_availability;
CREATE TRIGGER audit_availability_changes AFTER INSERT OR UPDATE OR DELETE ON public.provider_availability
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
DROP TRIGGER IF EXISTS audit_time_off_changes ON public.provider_time_off;
CREATE TRIGGER audit_time_off_changes AFTER INSERT OR UPDATE OR DELETE ON public.provider_time_off
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
DROP TRIGGER IF EXISTS audit_waitlist_updates ON public.waitlist;
CREATE TRIGGER audit_waitlist_updates AFTER UPDATE ON public.waitlist
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
DROP TRIGGER IF EXISTS audit_privacy_request_changes ON public.privacy_requests;
CREATE TRIGGER audit_privacy_request_changes AFTER INSERT OR UPDATE ON public.privacy_requests
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF lower(COALESCE(NEW.raw_user_meta_data ->> 'privacy_notice_accepted', 'false')) NOT IN ('true','t','1','yes','on') THEN
    RAISE EXCEPTION 'Privacy notice acceptance is required';
  END IF;
  INSERT INTO public.profiles (id, full_name, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'phone', ''),
    'customer'
  ) ON CONFLICT (id) DO NOTHING;
  UPDATE public.profiles SET
    email = COALESCE(NEW.email, ''),
    privacy_notice_accepted_at = CASE
      WHEN lower(COALESCE(NEW.raw_user_meta_data ->> 'privacy_notice_accepted', 'false')) IN ('true','t','1','yes','on')
      THEN now() ELSE privacy_notice_accepted_at END,
    marketing_consent_at = CASE
      WHEN lower(COALESCE(NEW.raw_user_meta_data ->> 'marketing_consent', 'false')) IN ('true','t','1','yes','on')
      THEN now() ELSE marketing_consent_at END
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS TEXT LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.has_app_role(allowed_roles TEXT[])
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT COALESCE(public.current_app_role() = ANY(allowed_roles), false)
$$;

CREATE OR REPLACE FUNCTION public.is_assigned_provider(target_provider UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.provider_profiles pp
    WHERE pp.id = target_provider AND pp.profile_id = (SELECT auth.uid()) AND pp.is_active
  )
$$;

CREATE OR REPLACE FUNCTION public.provider_has_customer(target_customer UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.provider_profiles pp ON pp.id = b.provider_id
    WHERE b.customer_id = target_customer AND pp.profile_id = (SELECT auth.uid()) AND pp.is_active
  )
$$;

CREATE OR REPLACE FUNCTION public.provider_has_waitlist_customer(target_profile UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.waitlist w
    JOIN public.services s ON s.id = w.service_id
    JOIN public.provider_profiles pp ON pp.id = s.provider_id
    WHERE w.profile_id = target_profile AND pp.profile_id = (SELECT auth.uid()) AND pp.is_active
  )
$$;

DROP POLICY IF EXISTS providers_admin_manage ON public.provider_profiles;
CREATE POLICY providers_admin_manage ON public.provider_profiles FOR ALL TO authenticated
  USING (public.has_app_role(ARRAY['admin','security_admin'])) WITH CHECK (public.has_app_role(ARRAY['admin','security_admin']));

CREATE OR REPLACE FUNCTION public.create_booking(
  p_service_id UUID,
  p_coverage_level INTEGER,
  p_slot_id UUID,
  p_booking_date DATE,
  p_occasion_type TEXT DEFAULT NULL,
  p_customer_notes TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_service public.services%ROWTYPE;
  v_provider UUID;
  v_slot_start TIME;
  v_new_slot_end TIMESTAMP;
  v_customer UUID;
  v_price NUMERIC(12,2);
  v_reference TEXT;
  v_booking public.bookings%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR public.current_app_role() <> 'customer' THEN
    RAISE EXCEPTION 'Customer sign-in is required';
  END IF;
  SELECT * INTO v_profile FROM public.profiles WHERE id = auth.uid();
  IF NULLIF(btrim(v_profile.full_name), '') IS NULL OR NULLIF(btrim(v_profile.phone), '') IS NULL THEN
    RAISE EXCEPTION 'Complete your name and phone number before booking';
  END IF;
  IF p_booking_date < CURRENT_DATE + 1 THEN RAISE EXCEPTION 'Booking date must be at least one day ahead'; END IF;

  SELECT * INTO v_service FROM public.services
  WHERE id = p_service_id AND is_active;
  IF NOT FOUND OR v_service.provider_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.provider_profiles WHERE id = v_service.provider_id AND is_active
  ) THEN RAISE EXCEPTION 'Service is unavailable'; END IF;
  v_provider := v_service.provider_id;

  SELECT (level->>'price')::NUMERIC(12,2) INTO v_price
  FROM jsonb_array_elements(v_service.coverage_levels) AS level
  WHERE (level->>'level')::INTEGER = p_coverage_level;
  IF v_price IS NULL OR v_price < 0 THEN RAISE EXCEPTION 'Invalid service option'; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.time_slots WHERE id = p_slot_id AND is_active) THEN
    RAISE EXCEPTION 'Time slot is unavailable';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.provider_availability
    WHERE provider_id = v_provider AND slot_id = p_slot_id
      AND weekday = EXTRACT(DOW FROM p_booking_date)::SMALLINT AND is_available) THEN
    RAISE EXCEPTION 'Provider is not available at that time';
  END IF;
  SELECT time::TIME INTO v_slot_start FROM public.time_slots WHERE id = p_slot_id;
  v_new_slot_end := p_booking_date + v_slot_start + make_interval(mins => v_service.duration_minutes);
  -- Serialize bookings per provider/date so overlapping different slots cannot race.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_provider::TEXT || p_booking_date::TEXT, 0));
  IF EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.time_slots existing_slot ON existing_slot.id = b.slot_id
    JOIN public.services existing_service ON existing_service.id = b.service_id
    WHERE b.provider_id = v_provider AND b.booking_date = p_booking_date
      AND b.status IN ('requested', 'pending_slip', 'pending_validation', 'confirmed', 'in_progress')
      AND p_booking_date + existing_slot.time::TIME < v_new_slot_end
      AND p_booking_date + v_slot_start < p_booking_date + existing_slot.time::TIME
        + make_interval(mins => existing_service.duration_minutes)
  ) THEN
    RAISE EXCEPTION 'That time overlaps another booking. Please choose another slot';
  END IF;
  IF EXISTS (SELECT 1 FROM public.provider_time_off WHERE provider_id = v_provider AND date = p_booking_date) THEN
    RAISE EXCEPTION 'Provider is unavailable on that date';
  END IF;
  IF EXISTS (SELECT 1 FROM public.blocked_dates WHERE date = p_booking_date) THEN
    RAISE EXCEPTION 'Date is unavailable';
  END IF;

  SELECT id INTO v_customer FROM public.customers
  WHERE profile_id = v_profile.id OR email = (SELECT email FROM auth.users WHERE id = v_profile.id)
  ORDER BY (profile_id = v_profile.id) DESC NULLS LAST LIMIT 1 FOR UPDATE;
  IF v_customer IS NULL THEN
    INSERT INTO public.customers (profile_id, name, phone, email)
    VALUES (v_profile.id, v_profile.full_name, v_profile.phone,
            (SELECT email FROM auth.users WHERE id = v_profile.id))
    RETURNING id INTO v_customer;
  ELSE
    IF EXISTS (SELECT 1 FROM public.customers WHERE id = v_customer AND profile_id IS NOT NULL AND profile_id <> v_profile.id) THEN
      RAISE EXCEPTION 'This email is already linked to another account';
    END IF;
    UPDATE public.customers SET profile_id = v_profile.id, name = v_profile.full_name,
      phone = v_profile.phone, email = (SELECT email FROM auth.users WHERE id = v_profile.id), updated_at = now()
    WHERE id = v_customer;
  END IF;

  v_reference := 'TB-' || to_char(now(), 'YYYY') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  INSERT INTO public.bookings (
    reference_code, customer_id, service_id, provider_id, coverage_level, price_per_side,
    slot_id, booking_date, occasion_type, customer_notes, status, price_currency
  ) VALUES (
    v_reference, v_customer, v_service.id, v_provider, p_coverage_level, v_price,
    p_slot_id, p_booking_date, p_occasion_type, left(p_customer_notes, 2000), 'requested', v_service.currency
  ) RETURNING * INTO v_booking;

  INSERT INTO public.audit_logs (actor_id, action, resource_type, resource_id)
  VALUES (auth.uid(), 'booking.created', 'booking', v_booking.id::text);
  RETURN jsonb_build_object('id', v_booking.id, 'reference_code', v_booking.reference_code,
    'booking_date', v_booking.booking_date, 'status', v_booking.status,
    'price', v_booking.price_per_side, 'currency', v_booking.price_currency);
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'That appointment time was just booked. Please choose another slot';
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_my_booking(p_booking_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_booking public.bookings%ROWTYPE;
BEGIN
  SELECT b.* INTO v_booking
  FROM public.bookings b JOIN public.customers c ON c.id = b.customer_id
  WHERE b.id = p_booking_id AND c.profile_id = auth.uid()
  FOR UPDATE OF b;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF v_booking.status NOT IN ('requested', 'pending_slip', 'pending_validation', 'confirmed') THEN
    RAISE EXCEPTION 'This booking can no longer be cancelled';
  END IF;
  UPDATE public.bookings SET status = 'cancelled', cancelled_at = now(),
    cancellation_reason = left(p_reason, 500), updated_at = now()
  WHERE id = p_booking_id;
  INSERT INTO public.audit_logs (actor_id, action, resource_type, resource_id)
  VALUES (auth.uid(), 'booking.cancelled', 'booking', p_booking_id::text);
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.provider_update_booking_status(p_booking_id UUID, p_status TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_booking public.bookings%ROWTYPE; v_provider UUID;
BEGIN
  SELECT id INTO v_provider FROM public.provider_profiles
    WHERE profile_id = auth.uid() AND is_active;
  IF v_provider IS NULL THEN RAISE EXCEPTION 'Active provider account required'; END IF;
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id AND provider_id = v_provider FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF NOT ((v_booking.status = 'requested' AND p_status IN ('confirmed', 'rejected'))
       OR (v_booking.status = 'confirmed' AND p_status = 'in_progress')
       OR (v_booking.status = 'in_progress' AND p_status = 'completed')) THEN
    RAISE EXCEPTION 'Invalid booking status transition';
  END IF;
  UPDATE public.bookings SET status = p_status, updated_at = now() WHERE id = p_booking_id;
  INSERT INTO public.audit_logs (actor_id, action, resource_type, resource_id, metadata)
  VALUES (auth.uid(), 'booking.status_changed', 'booking', p_booking_id::text,
    jsonb_build_object('from', v_booking.status, 'to', p_status));
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.join_waitlist(p_service_id UUID, p_slot_id UUID, p_requested_date DATE)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_customer UUID; v_waitlist UUID; v_provider UUID; v_duration INTEGER; v_slot_start TIME;
BEGIN
  IF auth.uid() IS NULL OR public.current_app_role() <> 'customer' THEN RAISE EXCEPTION 'Customer sign-in is required'; END IF;
  SELECT id INTO v_customer FROM public.customers WHERE profile_id = auth.uid();
  IF p_requested_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Invalid service or date';
  END IF;
  SELECT s.provider_id, s.duration_minutes INTO v_provider, v_duration FROM public.services s
  JOIN public.provider_profiles pp ON pp.id = s.provider_id AND pp.is_active
  WHERE s.id = p_service_id AND s.is_active;
  IF v_provider IS NULL OR NOT EXISTS (SELECT 1 FROM public.time_slots WHERE id = p_slot_id AND is_active)
    OR NOT EXISTS (SELECT 1 FROM public.provider_availability WHERE provider_id = v_provider
      AND slot_id = p_slot_id AND weekday = EXTRACT(DOW FROM p_requested_date)::SMALLINT AND is_available) THEN
    RAISE EXCEPTION 'This service is not scheduled at that time';
  END IF;
  IF EXISTS (SELECT 1 FROM public.blocked_dates WHERE date = p_requested_date)
    OR EXISTS (SELECT 1 FROM public.provider_time_off WHERE provider_id = v_provider AND date = p_requested_date) THEN
    RAISE EXCEPTION 'This provider is unavailable on that date';
  END IF;
  SELECT ts.time::TIME INTO v_slot_start FROM public.time_slots ts WHERE ts.id = p_slot_id;
  IF NOT EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.time_slots existing_slot ON existing_slot.id = b.slot_id
    JOIN public.services existing_service ON existing_service.id = b.service_id
    WHERE b.provider_id = v_provider AND b.booking_date = p_requested_date
      AND b.status IN ('requested','pending_slip','pending_validation','confirmed','in_progress')
      AND p_requested_date + existing_slot.time::TIME < p_requested_date + v_slot_start + make_interval(mins => v_duration)
      AND p_requested_date + v_slot_start < p_requested_date + existing_slot.time::TIME
        + make_interval(mins => existing_service.duration_minutes)
  ) THEN RAISE EXCEPTION 'This time is available. Place a booking request instead'; END IF;
  INSERT INTO public.waitlist (customer_id, profile_id, requested_date, slot_id, service_id)
    VALUES (v_customer, auth.uid(), p_requested_date, p_slot_id, p_service_id) RETURNING id INTO v_waitlist;
  INSERT INTO public.audit_logs (actor_id, action, resource_type, resource_id)
    VALUES (auth.uid(), 'waitlist.joined', 'waitlist', v_waitlist::text);
  RETURN v_waitlist;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_booking_status(p_booking_id UUID, p_status TEXT, p_reason TEXT DEFAULT NULL)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_booking public.bookings%ROWTYPE;
BEGIN
  IF NOT public.has_app_role(ARRAY['admin']) THEN RAISE EXCEPTION 'Administrator access required'; END IF;
  IF p_status NOT IN ('confirmed', 'rejected', 'cancelled', 'in_progress', 'completed', 'expired') THEN
    RAISE EXCEPTION 'Invalid booking status';
  END IF;
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF v_booking.status IN ('completed', 'cancelled', 'rejected', 'expired') THEN RAISE EXCEPTION 'Booking is already closed'; END IF;
  UPDATE public.bookings SET status = p_status,
    rejection_reason = CASE WHEN p_status = 'rejected' THEN left(p_reason, 500) ELSE rejection_reason END,
    cancelled_at = CASE WHEN p_status = 'cancelled' THEN now() ELSE cancelled_at END,
    updated_at = now()
  WHERE id = p_booking_id;
  INSERT INTO public.audit_logs (actor_id, action, resource_type, resource_id, metadata)
  VALUES (auth.uid(), 'booking.admin_status_changed', 'booking', p_booking_id::text,
    jsonb_build_object('from', v_booking.status, 'to', p_status));
  RETURN true;
END;
$$;

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
        SELECT COALESCE(s.category, 'general') AS name, count(*)::INTEGER AS bookings
        FROM public.bookings b JOIN public.services s ON s.id = b.service_id
        WHERE b.status IN ('requested','pending_slip','pending_validation','confirmed','in_progress','completed')
        GROUP BY COALESCE(s.category, 'general')
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

DROP FUNCTION IF EXISTS public.get_provider_availability(UUID, DATE);
DROP FUNCTION IF EXISTS public.get_provider_availability(UUID, DATE, UUID);
CREATE OR REPLACE FUNCTION public.get_provider_availability(p_provider_id UUID, p_date DATE, p_service_id UUID DEFAULT NULL)
RETURNS TABLE(slot_id UUID, label TEXT, slot_time TEXT, display_time TEXT, is_available BOOLEAN)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT ts.id, ts.label, ts.time, ts.display_time,
    NOT EXISTS (SELECT 1 FROM public.blocked_dates bd WHERE bd.date = p_date)
    AND NOT EXISTS (SELECT 1 FROM public.provider_time_off offday WHERE offday.provider_id = pp.id AND offday.date = p_date)
    AND NOT EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.time_slots existing_slot ON existing_slot.id = b.slot_id
      JOIN public.services existing_service ON existing_service.id = b.service_id
      WHERE b.provider_id = pp.id AND b.booking_date = p_date
        AND b.status IN ('requested','pending_slip','pending_validation','confirmed','in_progress')
        AND p_date + existing_slot.time::TIME < p_date + ts.time::TIME
          + make_interval(mins => COALESCE(requested_service.duration_minutes, 60))
        AND p_date + ts.time::TIME < p_date + existing_slot.time::TIME
          + make_interval(mins => existing_service.duration_minutes)
    )
  FROM public.provider_profiles pp
  JOIN public.provider_availability pa ON pa.provider_id = pp.id
  JOIN public.time_slots ts ON ts.id = pa.slot_id
  LEFT JOIN public.services requested_service ON requested_service.id = p_service_id
    AND requested_service.provider_id = pp.id AND requested_service.is_active
  WHERE pp.id = p_provider_id AND pp.is_active AND pa.is_available AND ts.is_active
    AND pa.weekday = EXTRACT(DOW FROM p_date)::SMALLINT AND p_date >= CURRENT_DATE
  ORDER BY ts.sort_order
$$;

CREATE OR REPLACE FUNCTION public.admin_set_user_role(p_profile_id UUID, p_role TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_old_role TEXT; v_actor_role TEXT;
BEGIN
  v_actor_role := public.current_app_role();
  IF v_actor_role NOT IN ('admin','security_admin') THEN RAISE EXCEPTION 'Administrator access required'; END IF;
  IF p_role NOT IN ('customer','provider','admin','security_admin') THEN RAISE EXCEPTION 'Invalid role'; END IF;
  IF p_role = 'security_admin' AND v_actor_role <> 'security_admin' THEN RAISE EXCEPTION 'Security administrator access required'; END IF;
  IF p_profile_id = auth.uid() AND v_actor_role <> 'security_admin' THEN RAISE EXCEPTION 'You cannot change your own role'; END IF;
  SELECT role INTO v_old_role FROM public.profiles WHERE id = p_profile_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'User profile not found'; END IF;
  IF v_old_role = 'admin' AND p_role <> 'admin' AND
     (SELECT count(*) FROM public.profiles WHERE role = 'admin') <= 1 THEN
    RAISE EXCEPTION 'Cannot remove the last administrator';
  END IF;
  IF v_old_role = 'security_admin' AND p_role <> 'security_admin' AND
     (SELECT count(*) FROM public.profiles WHERE role = 'security_admin') <= 1 THEN
    RAISE EXCEPTION 'Cannot remove the last security administrator';
  END IF;
  UPDATE public.profiles SET role = p_role, updated_at = now() WHERE id = p_profile_id;
  IF p_role = 'provider' THEN
    INSERT INTO public.provider_profiles (profile_id, display_name)
      SELECT id, COALESCE(NULLIF(full_name,''), email) FROM public.profiles WHERE id = p_profile_id
      ON CONFLICT (profile_id) DO NOTHING;
  ELSE
    UPDATE public.provider_profiles SET is_active = false, updated_at = now() WHERE profile_id = p_profile_id;
  END IF;
  INSERT INTO public.audit_logs (actor_id, action, resource_type, resource_id, metadata)
    VALUES (auth.uid(), 'profile.role_changed', 'profile', p_profile_id::text,
      jsonb_build_object('from', v_old_role, 'to', p_role));
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_provider_active(p_provider_id UUID, p_active BOOLEAN)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.has_app_role(ARRAY['admin','security_admin']) THEN RAISE EXCEPTION 'Administrator access required'; END IF;
  UPDATE public.provider_profiles SET is_active = p_active, updated_at = now() WHERE id = p_provider_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Provider profile not found'; END IF;
  INSERT INTO public.audit_logs (actor_id, action, resource_type, resource_id, metadata)
    VALUES (auth.uid(), 'provider.status_changed', 'provider', p_provider_id::text, jsonb_build_object('active', p_active));
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.security_update_privacy_request(p_request_id UUID, p_status TEXT, p_admin_notes TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_request public.privacy_requests%ROWTYPE;
BEGIN
  IF NOT public.has_app_role(ARRAY['security_admin']) THEN RAISE EXCEPTION 'Security administrator access required'; END IF;
  IF p_status NOT IN ('processing', 'completed', 'rejected') THEN RAISE EXCEPTION 'Invalid privacy request status'; END IF;
  SELECT * INTO v_request FROM public.privacy_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Privacy request not found'; END IF;
  IF v_request.status IN ('completed', 'rejected') THEN RAISE EXCEPTION 'Privacy request is already closed'; END IF;
  IF v_request.request_type = 'deletion' AND p_status = 'completed' THEN
    RAISE EXCEPTION 'Deletion completion must use the server-side deletion workflow';
  END IF;
  UPDATE public.privacy_requests SET status = p_status,
    admin_notes = left(p_admin_notes, 2000),
    completed_at = CASE WHEN p_status = 'completed' THEN now() ELSE NULL END
  WHERE id = p_request_id;
  INSERT INTO public.audit_logs (actor_id, action, resource_type, resource_id, metadata)
    VALUES (auth.uid(), 'privacy_request.status_changed', 'privacy_request', p_request_id::TEXT,
      jsonb_build_object('from', v_request.status, 'to', p_status));
  RETURN true;
END;
$$;

-- Active reservations are unique per provider, date, and slot. Cancelled and
-- terminal requests release the slot. Existing unassigned rows remain readable.
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
UPDATE public.bookings SET status = 'requested' WHERE status IN ('pending_slip', 'pending_validation');
ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check CHECK (status IN
  ('requested', 'pending_slip', 'pending_validation', 'confirmed', 'in_progress', 'completed', 'rejected', 'expired', 'cancelled'));
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_provider_slot_active
  ON public.bookings(provider_id, booking_date, slot_id)
  WHERE provider_id IS NOT NULL AND status IN ('requested', 'pending_slip', 'pending_validation', 'confirmed', 'in_progress');
CREATE UNIQUE INDEX IF NOT EXISTS idx_waitlist_unique_request
  ON public.waitlist(profile_id, service_id, requested_date, slot_id);

-- Helpers are security-definer functions with an empty search path to avoid RLS recursion.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_time_off ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lookbook ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_looks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.privacy_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_model_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_daily_history ENABLE ROW LEVEL SECURITY;

-- Legacy payment slips are private and the transformed booking flow does not
-- accept direct client uploads. Remove bucket-scoped public/client policies.
UPDATE storage.buckets SET public = false WHERE id = 'payment-slips';
DO $$
DECLARE old_policy RECORD;
BEGIN
  FOR old_policy IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND (COALESCE(qual, '') || ' ' || COALESCE(with_check, '')) ILIKE '%payment-slips%'
  LOOP
    EXECUTE format('DROP POLICY %I ON storage.objects', old_policy.policyname);
  END LOOP;
END;
$$;

CREATE POLICY profiles_read_self_or_staff ON public.profiles FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()) OR public.has_app_role(ARRAY['admin','security_admin']));
CREATE POLICY profiles_update_self ON public.profiles FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()) AND role = public.current_app_role());
CREATE POLICY profiles_read_assigned_waitlist ON public.profiles FOR SELECT TO authenticated
  USING (public.provider_has_waitlist_customer(id));
CREATE POLICY providers_public_read_active ON public.provider_profiles FOR SELECT TO anon, authenticated USING (is_active);
CREATE POLICY providers_read_self_or_staff ON public.provider_profiles FOR SELECT TO authenticated
  USING (profile_id = (SELECT auth.uid()) OR public.has_app_role(ARRAY['admin','security_admin']));
CREATE POLICY services_public_active_read ON public.services FOR SELECT TO anon, authenticated USING (is_active);
CREATE POLICY services_provider_manage ON public.services FOR ALL TO authenticated
  USING (public.is_assigned_provider(provider_id)
    OR public.has_app_role(ARRAY['admin','security_admin']))
  WITH CHECK (public.is_assigned_provider(provider_id)
    OR public.has_app_role(ARRAY['admin','security_admin']));
CREATE POLICY availability_public_read ON public.provider_availability FOR SELECT TO anon, authenticated USING (is_available);
CREATE POLICY availability_provider_manage ON public.provider_availability FOR ALL TO authenticated
  USING (public.is_assigned_provider(provider_id) OR public.has_app_role(ARRAY['admin']))
  WITH CHECK (public.is_assigned_provider(provider_id) OR public.has_app_role(ARRAY['admin']));
CREATE POLICY time_off_provider_manage ON public.provider_time_off FOR ALL TO authenticated
  USING (public.is_assigned_provider(provider_id) OR public.has_app_role(ARRAY['admin']))
  WITH CHECK (public.is_assigned_provider(provider_id) OR public.has_app_role(ARRAY['admin']));
CREATE POLICY slots_public_read_active ON public.time_slots FOR SELECT TO anon, authenticated USING (is_active);
CREATE POLICY blocked_dates_public_read ON public.blocked_dates FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY blocked_dates_admin_manage ON public.blocked_dates FOR ALL TO authenticated
  USING (public.has_app_role(ARRAY['admin','security_admin'])) WITH CHECK (public.has_app_role(ARRAY['admin','security_admin']));

CREATE POLICY customers_read_own_or_staff ON public.customers FOR SELECT TO authenticated
  USING (profile_id = (SELECT auth.uid()) OR public.has_app_role(ARRAY['admin','security_admin'])
    OR public.provider_has_customer(id));

CREATE POLICY bookings_read_customer_provider_or_staff ON public.bookings FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = bookings.customer_id AND c.profile_id = (SELECT auth.uid()))
    OR public.is_assigned_provider(provider_id) OR public.has_app_role(ARRAY['admin','security_admin']));
CREATE POLICY bookings_no_direct_insert ON public.bookings FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY bookings_no_direct_update ON public.bookings FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY bookings_no_direct_delete ON public.bookings FOR DELETE TO authenticated USING (false);

CREATE POLICY waitlist_customer_or_staff_read ON public.waitlist FOR SELECT TO authenticated
  USING (profile_id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM public.customers c WHERE c.id = waitlist.customer_id AND c.profile_id = (SELECT auth.uid()))
    OR public.has_app_role(ARRAY['admin','security_admin'])
    OR EXISTS (SELECT 1 FROM public.services s WHERE s.id = waitlist.service_id AND public.is_assigned_provider(s.provider_id)));
CREATE POLICY waitlist_customer_insert ON public.waitlist FOR INSERT TO authenticated
  WITH CHECK (false);
CREATE POLICY waitlist_staff_update ON public.waitlist FOR UPDATE TO authenticated
  USING (public.has_app_role(ARRAY['admin']) OR EXISTS (
    SELECT 1 FROM public.services s WHERE s.id = waitlist.service_id AND public.is_assigned_provider(s.provider_id)
  ))
  WITH CHECK (public.has_app_role(ARRAY['admin']) OR EXISTS (
    SELECT 1 FROM public.services s WHERE s.id = waitlist.service_id AND public.is_assigned_provider(s.provider_id)
  ));

CREATE POLICY consultations_staff_only ON public.consultations FOR ALL TO authenticated
  USING (public.has_app_role(ARRAY['admin'])) WITH CHECK (public.has_app_role(ARRAY['admin']));
CREATE POLICY gallery_admin_manage ON public.gallery FOR ALL TO authenticated
  USING (public.has_app_role(ARRAY['admin'])) WITH CHECK (public.has_app_role(ARRAY['admin']));
CREATE POLICY lookbook_admin_manage ON public.lookbook FOR ALL TO authenticated
  USING (public.has_app_role(ARRAY['admin'])) WITH CHECK (public.has_app_role(ARRAY['admin']));
CREATE POLICY saved_looks_admin_manage ON public.saved_looks FOR ALL TO authenticated
  USING (public.has_app_role(ARRAY['admin'])) WITH CHECK (public.has_app_role(ARRAY['admin']));
CREATE POLICY testimonials_admin_manage ON public.testimonials FOR ALL TO authenticated
  USING (public.has_app_role(ARRAY['admin'])) WITH CHECK (public.has_app_role(ARRAY['admin']));
CREATE POLICY blog_public_published_read ON public.blog_posts FOR SELECT TO anon, authenticated USING (is_published);
CREATE POLICY blog_admin_manage ON public.blog_posts FOR ALL TO authenticated
  USING (public.has_app_role(ARRAY['admin'])) WITH CHECK (public.has_app_role(ARRAY['admin']));
CREATE POLICY vouchers_admin_only ON public.gift_vouchers FOR ALL TO authenticated
  USING (public.has_app_role(ARRAY['admin'])) WITH CHECK (public.has_app_role(ARRAY['admin']));
CREATE POLICY reminders_self_or_staff ON public.reminder_queue FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = reminder_queue.customer_id AND c.profile_id = (SELECT auth.uid()))
    OR public.has_app_role(ARRAY['admin']));
CREATE POLICY audit_security_admin_read ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_app_role(ARRAY['security_admin','admin']));
CREATE POLICY privacy_requests_self_or_security_read ON public.privacy_requests FOR SELECT TO authenticated
  USING (profile_id = (SELECT auth.uid()) OR public.has_app_role(ARRAY['security_admin','admin']));
CREATE POLICY privacy_requests_self_insert ON public.privacy_requests FOR INSERT TO authenticated
  WITH CHECK (profile_id = (SELECT auth.uid()) AND status = 'pending' AND completed_at IS NULL AND admin_notes IS NULL);
-- Status changes use a constrained function; deletion completion is reserved for the Edge Function.
CREATE POLICY booking_proofs_owner_read ON public.booking_proofs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_proofs.booking_id
    AND (public.has_app_role(ARRAY['admin','security_admin']) OR public.is_assigned_provider(b.provider_id)
      OR EXISTS (SELECT 1 FROM public.customers c WHERE c.id = b.customer_id AND c.profile_id = (SELECT auth.uid())))));
CREATE POLICY ai_metrics_admin_read ON public.ai_model_metrics FOR SELECT TO authenticated
  USING (public.has_app_role(ARRAY['admin','security_admin']));
CREATE POLICY ai_forecasts_admin_read ON public.ai_forecasts FOR SELECT TO authenticated
  USING (public.has_app_role(ARRAY['admin','security_admin']));
CREATE POLICY ai_history_admin_read ON public.ai_daily_history FOR SELECT TO authenticated
  USING (public.has_app_role(ARRAY['admin','security_admin']));

REVOKE ALL ON FUNCTION public.create_booking(UUID, INTEGER, UUID, DATE, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_booking(UUID, INTEGER, UUID, DATE, TEXT, TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.cancel_my_booking(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_my_booking(UUID, TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.provider_update_booking_status(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.provider_update_booking_status(UUID, TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.join_waitlist(UUID, UUID, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_waitlist(UUID, UUID, DATE) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_update_booking_status(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_booking_status(UUID, TEXT, TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.get_admin_analytics() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_analytics() TO authenticated;
REVOKE ALL ON FUNCTION public.get_provider_availability(UUID, DATE, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_provider_availability(UUID, DATE, UUID) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_set_user_role(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(UUID, TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_set_provider_active(UUID, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_provider_active(UUID, BOOLEAN) TO authenticated;
REVOKE ALL ON FUNCTION public.security_update_privacy_request(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.security_update_privacy_request(UUID, TEXT, TEXT) TO authenticated;
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (full_name, phone, preferred_language) ON public.profiles TO authenticated;
REVOKE UPDATE ON public.waitlist FROM authenticated;
GRANT UPDATE (notified, notified_at, claim_expires_at, claimed) ON public.waitlist TO authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.audit_row_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.current_app_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_app_role() TO authenticated;
REVOKE ALL ON FUNCTION public.has_app_role(TEXT[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_app_role(TEXT[]) TO authenticated;
REVOKE ALL ON FUNCTION public.is_assigned_provider(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_assigned_provider(UUID) TO authenticated;
REVOKE ALL ON FUNCTION public.provider_has_customer(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.provider_has_customer(UUID) TO authenticated;
REVOKE ALL ON FUNCTION public.provider_has_waitlist_customer(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.provider_has_waitlist_customer(UUID) TO authenticated;
