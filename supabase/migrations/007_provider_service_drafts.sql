-- Allow providers to prepare private service drafts before approval.
-- Pending providers cannot publish services, and customers only see services
-- belonging to approved providers.

CREATE OR REPLACE FUNCTION public.is_provider_owner(target_provider UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.provider_profiles pp
    JOIN public.profiles p ON p.id = pp.profile_id
    WHERE pp.id = target_provider
      AND pp.profile_id = (SELECT auth.uid())
      AND p.role = 'provider'
  )
$$;

REVOKE ALL ON FUNCTION public.is_provider_owner(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_provider_owner(UUID) TO authenticated;

DROP POLICY IF EXISTS services_public_active_read ON public.services;
CREATE POLICY services_public_active_read ON public.services
  FOR SELECT TO anon, authenticated
  USING (
    is_active
    AND EXISTS (
      SELECT 1 FROM public.provider_profiles pp
      WHERE pp.id = services.provider_id AND pp.is_active
    )
  );

DROP POLICY IF EXISTS services_provider_manage ON public.services;
CREATE POLICY services_provider_manage ON public.services
  FOR ALL TO authenticated
  USING (
    public.is_provider_owner(provider_id)
    OR public.has_app_role(ARRAY['admin','security_admin'])
  )
  WITH CHECK (
    public.has_app_role(ARRAY['admin','security_admin'])
    OR (
      public.is_provider_owner(provider_id)
      AND (NOT is_active OR public.is_assigned_provider(provider_id))
    )
  );
