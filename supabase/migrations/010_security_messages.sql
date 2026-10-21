CREATE TABLE IF NOT EXISTS public.security_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 1 AND 5000),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

ALTER TABLE public.security_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY security_messages_customer_insert ON public.security_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    profile_id = (SELECT auth.uid())
    AND status = 'open'
    AND admin_notes IS NULL
    AND resolved_at IS NULL
  );

CREATE POLICY security_messages_security_read ON public.security_messages
  FOR SELECT TO authenticated
  USING (public.has_app_role(ARRAY['security_admin']));

REVOKE ALL ON public.security_messages FROM PUBLIC, anon;
GRANT INSERT (profile_id, message) ON public.security_messages TO authenticated;
GRANT SELECT ON public.security_messages TO authenticated;

CREATE OR REPLACE FUNCTION public.security_update_message(
  p_message_id UUID,
  p_status TEXT,
  p_admin_notes TEXT
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_message public.security_messages%ROWTYPE;
BEGIN
  IF NOT public.has_app_role(ARRAY['security_admin']) THEN
    RAISE EXCEPTION 'Security administrator access required';
  END IF;
  IF p_status NOT IN ('open', 'resolved') THEN
    RAISE EXCEPTION 'Invalid message status';
  END IF;

  SELECT * INTO v_message
  FROM public.security_messages WHERE id = p_message_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Security message not found'; END IF;

  UPDATE public.security_messages
  SET status = p_status,
      admin_notes = left(p_admin_notes, 2000),
      resolved_at = CASE WHEN p_status = 'resolved' THEN now() ELSE NULL END
  WHERE id = p_message_id;

  INSERT INTO public.audit_logs (actor_id, action, resource_type, resource_id, metadata)
  VALUES (auth.uid(), 'security_message.updated', 'security_message', p_message_id::text,
    jsonb_build_object('from', v_message.status, 'to', p_status));
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.security_update_message(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.security_update_message(UUID, TEXT, TEXT) TO authenticated;
