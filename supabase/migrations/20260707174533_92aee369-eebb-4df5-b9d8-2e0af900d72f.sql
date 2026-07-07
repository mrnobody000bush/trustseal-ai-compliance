
DROP POLICY IF EXISTS "Anyone can insert widget events" ON public.widget_events;
CREATE POLICY "Anon can insert events for active sites" ON public.widget_events FOR INSERT TO anon
  WITH CHECK (site_id IN (SELECT id FROM public.sites WHERE is_active = true));
