-- Provider-configured listing details that vary by booking category.
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS service_details JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.services.service_details IS
  'Category-specific provider listing details (for example route, property, or healthcare specialty).';
