-- 001_initial_schema.sql — Salon/Service Booking Platform

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  preferred_language TEXT DEFAULT 'en',
  total_bookings INTEGER DEFAULT 0,
  is_recurring BOOLEAN DEFAULT false,
  occasion_dates JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  style_type TEXT,
  coverage_levels JSONB NOT NULL,
  is_bridal BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  time TEXT NOT NULL,
  display_time TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE blocked_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_code TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id),
  service_id UUID REFERENCES services(id),
  coverage_level INTEGER NOT NULL,
  price_per_side INTEGER NOT NULL,
  slot_id UUID REFERENCES time_slots(id),
  booking_date DATE NOT NULL,
  occasion_type TEXT,
  design_inspiration TEXT,
  inspiration_image_url TEXT,
  customer_notes TEXT,
  status TEXT DEFAULT 'pending_slip'
    CHECK (status IN ('pending_slip','pending_validation','confirmed','rejected','expired','completed','cancelled')),
  deposit_amount INTEGER DEFAULT 1000,
  payment_slip_url TEXT,
  payment_slip_uploaded_at TIMESTAMPTZ,
  admin_notes TEXT,
  rejection_reason TEXT,
  voucher_code TEXT,
  review_requested BOOLEAN DEFAULT false,
  review_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  requested_date DATE NOT NULL,
  slot_id UUID REFERENCES time_slots(id),
  service_id UUID REFERENCES services(id),
  notified BOOLEAN DEFAULT false,
  notified_at TIMESTAMPTZ,
  claimed BOOLEAN DEFAULT false,
  claim_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  occasion_type TEXT,
  preferred_date DATE,
  style_preference TEXT,
  inspiration_image_url TEXT,
  message TEXT,
  status TEXT DEFAULT 'new'
    CHECK (status IN ('new','responded','converted','closed')),
  recommended_package TEXT,
  admin_response TEXT,
  converted_booking_id UUID REFERENCES bookings(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  caption TEXT,
  service_type TEXT,
  occasion TEXT,
  coverage_level INTEGER,
  is_featured BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE lookbook (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id UUID REFERENCES gallery(id),
  title TEXT,
  style_tags TEXT[],
  occasion_tags TEXT[],
  is_trending BOOLEAN DEFAULT false,
  save_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE saved_looks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  lookbook_id UUID REFERENCES lookbook(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id),
  customer_id UUID REFERENCES customers(id),
  customer_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT,
  service_type TEXT,
  is_published BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT,
  content JSONB NOT NULL DEFAULT '{}',
  cover_image_url TEXT,
  meta_description TEXT,
  tags TEXT[],
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE gift_vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  purchaser_name TEXT NOT NULL,
  purchaser_email TEXT NOT NULL,
  recipient_name TEXT,
  recipient_email TEXT,
  service_id UUID REFERENCES services(id),
  coverage_level INTEGER,
  amount INTEGER NOT NULL,
  is_redeemed BOOLEAN DEFAULT false,
  redeemed_by_booking_id UUID REFERENCES bookings(id),
  redeemed_at TIMESTAMPTZ,
  expires_at DATE,
  payment_slip_url TEXT,
  is_validated BOOLEAN DEFAULT false,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE reminder_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  occasion_type TEXT NOT NULL,
  occasion_date DATE NOT NULL,
  send_on DATE NOT NULL,
  status TEXT DEFAULT 'scheduled'
    CHECK (status IN ('scheduled','sent','cancelled')),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_bookings_date     ON bookings(booking_date);
CREATE INDEX idx_bookings_status   ON bookings(status);
CREATE INDEX idx_bookings_customer ON bookings(customer_id);
CREATE INDEX idx_bookings_slot     ON bookings(slot_id, booking_date);
CREATE INDEX idx_waitlist_date     ON waitlist(requested_date, slot_id);
CREATE INDEX idx_gallery_service   ON gallery(service_type);
CREATE INDEX idx_blog_slug         ON blog_posts(slug);

-- Trigger: update customer stats on booking status change
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE customers
  SET
    total_bookings = (
      SELECT COUNT(*) FROM bookings
      WHERE customer_id = NEW.customer_id
      AND status IN ('confirmed', 'completed')
    ),
    is_recurring = (
      SELECT COUNT(*) > 1 FROM bookings
      WHERE customer_id = NEW.customer_id
      AND status IN ('confirmed', 'completed')
    ),
    updated_at = now()
  WHERE id = NEW.customer_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER booking_confirmed_trigger
AFTER UPDATE ON bookings
FOR EACH ROW
WHEN (NEW.status = 'confirmed' OR NEW.status = 'completed')
EXECUTE FUNCTION update_customer_stats();
