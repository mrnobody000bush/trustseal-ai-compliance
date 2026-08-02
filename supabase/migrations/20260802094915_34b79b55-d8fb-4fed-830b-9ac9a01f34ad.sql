-- user_roles: no client write path (roles assigned only by trusted server-side logic)
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated, anon;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

DROP POLICY IF EXISTS "No client inserts on user_roles" ON public.user_roles;
CREATE POLICY "No client inserts on user_roles" ON public.user_roles FOR INSERT TO authenticated, anon WITH CHECK (false);
DROP POLICY IF EXISTS "No client updates on user_roles" ON public.user_roles;
CREATE POLICY "No client updates on user_roles" ON public.user_roles FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS "No client deletes on user_roles" ON public.user_roles;
CREATE POLICY "No client deletes on user_roles" ON public.user_roles FOR DELETE TO authenticated, anon USING (false);

-- widget_events: writes only via trusted service role
REVOKE INSERT, UPDATE, DELETE ON public.widget_events FROM authenticated, anon;
GRANT SELECT ON public.widget_events TO authenticated;
GRANT ALL ON public.widget_events TO service_role;

DROP POLICY IF EXISTS "No client inserts on widget_events" ON public.widget_events;
CREATE POLICY "No client inserts on widget_events" ON public.widget_events FOR INSERT TO authenticated, anon WITH CHECK (false);
DROP POLICY IF EXISTS "No client updates on widget_events" ON public.widget_events;
CREATE POLICY "No client updates on widget_events" ON public.widget_events FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS "No client deletes on widget_events" ON public.widget_events;
CREATE POLICY "No client deletes on widget_events" ON public.widget_events FOR DELETE TO authenticated, anon USING (false);