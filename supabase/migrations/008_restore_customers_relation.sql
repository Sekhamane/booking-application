-- Restore the customer relation required by booking creation, account history,
-- provider booking views, and their foreign-key embeds.
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  preferred_language TEXT DEFAULT 'en',
  total_bookings INTEGER DEFAULT 0,
  is_recurring BOOLEAN DEFAULT false,
  occasion_dates JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Preserve historical bookings if the old customer table was removed and
-- recreated. The original contact details cannot be reconstructed from a
-- booking row, so mark only those records as unavailable rather than inventing
-- customer data.
INSERT INTO public.customers (id, name, phone, email)
SELECT DISTINCT b.customer_id,
  'Customer details unavailable',
  'unavailable-' || b.customer_id::text,
  'unavailable+' || b.customer_id::text || '@invalid.example'
FROM public.bookings AS b
WHERE b.customer_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.bookings'::regclass
      AND confrelid = 'public.customers'::regclass
      AND contype = 'f'
      AND conkey = ARRAY[(SELECT attnum FROM pg_attribute
                          WHERE attrelid = 'public.bookings'::regclass
                            AND attname = 'customer_id')]::smallint[]
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_customer_id_fkey
      FOREIGN KEY (customer_id) REFERENCES public.customers(id);
  END IF;
END;
$$;

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON TABLE public.customers TO authenticated;

DROP POLICY IF EXISTS customers_read_own_or_staff ON public.customers;
CREATE POLICY customers_read_own_or_staff ON public.customers
  FOR SELECT TO authenticated
  USING (
    profile_id = (SELECT auth.uid())
    OR public.has_app_role(ARRAY['admin','security_admin'])
    OR public.provider_has_customer(id)
  );

DROP POLICY IF EXISTS bookings_read_customer_provider_or_staff ON public.bookings;
CREATE POLICY bookings_read_customer_provider_or_staff ON public.bookings
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = bookings.customer_id AND c.profile_id = (SELECT auth.uid())
    )
    OR public.is_assigned_provider(provider_id)
    OR public.has_app_role(ARRAY['admin','security_admin'])
  );

CREATE INDEX IF NOT EXISTS idx_customers_profile_id
  ON public.customers(profile_id);
