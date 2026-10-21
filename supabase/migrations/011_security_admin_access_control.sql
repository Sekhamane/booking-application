-- Security audit records are visible to security administrators only.
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS audit_security_admin_read ON public.audit_logs;
CREATE POLICY audit_security_admin_read ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.has_app_role(ARRAY['security_admin']));
REVOKE ALL ON public.audit_logs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.audit_logs TO authenticated;

-- Customers retain access to their own privacy requests; only security admins
-- can read other users' requests or access the review queue.
ALTER TABLE public.privacy_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS privacy_requests_self_or_security_read ON public.privacy_requests;
CREATE POLICY privacy_requests_self_or_security_read ON public.privacy_requests
  FOR SELECT TO authenticated
  USING (
    profile_id = (SELECT auth.uid())
    OR public.has_app_role(ARRAY['security_admin'])
  );
REVOKE ALL ON public.privacy_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.privacy_requests TO authenticated;
GRANT INSERT (profile_id, request_type) ON public.privacy_requests TO authenticated;

-- Ordinary admins may manage standard account roles, but may neither grant nor
-- revoke security-admin access. Only a security administrator may change it.
CREATE OR REPLACE FUNCTION public.admin_set_user_role(p_profile_id UUID, p_role TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_old_role TEXT; v_actor_role TEXT;
BEGIN
  v_actor_role := public.current_app_role();
  IF v_actor_role IS NULL OR v_actor_role NOT IN ('admin', 'security_admin') THEN
    RAISE EXCEPTION 'Administrator access required';
  END IF;
  IF p_role IS NULL OR p_role NOT IN ('customer', 'provider', 'admin', 'security_admin') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  SELECT role INTO v_old_role FROM public.profiles WHERE id = p_profile_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'User profile not found'; END IF;
  IF (v_old_role = 'security_admin' OR p_role = 'security_admin')
      AND v_actor_role <> 'security_admin' THEN
    RAISE EXCEPTION 'Security administrator access required';
  END IF;
  IF p_profile_id = auth.uid() AND v_actor_role <> 'security_admin' THEN
    RAISE EXCEPTION 'You cannot change your own role';
  END IF;
  IF v_old_role = 'admin' AND p_role <> 'admin'
      AND (SELECT count(*) FROM public.profiles WHERE role = 'admin') <= 1 THEN
    RAISE EXCEPTION 'Cannot remove the last administrator';
  END IF;
  IF v_old_role = 'security_admin' AND p_role <> 'security_admin'
      AND (SELECT count(*) FROM public.profiles WHERE role = 'security_admin') <= 1 THEN
    RAISE EXCEPTION 'Cannot remove the last security administrator';
  END IF;

  UPDATE public.profiles SET role = p_role, updated_at = now() WHERE id = p_profile_id;
  IF p_role = 'provider' THEN
    INSERT INTO public.provider_profiles (profile_id, display_name)
      SELECT id, COALESCE(NULLIF(full_name, ''), email)
      FROM public.profiles WHERE id = p_profile_id
      ON CONFLICT (profile_id) DO NOTHING;
  ELSE
    UPDATE public.provider_profiles SET is_active = false, updated_at = now()
      WHERE profile_id = p_profile_id;
  END IF;

  INSERT INTO public.audit_logs (actor_id, action, resource_type, resource_id, metadata)
  VALUES (auth.uid(), 'profile.role_changed', 'profile', p_profile_id::text,
    jsonb_build_object('from', v_old_role, 'to', p_role));
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_user_role(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(UUID, TEXT) TO authenticated;
