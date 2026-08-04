ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS reverify_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_reverify_check_at timestamptz,
  ADD COLUMN IF NOT EXISTS needs_reverification_since timestamptz,
  ADD COLUMN IF NOT EXISTS reverification_message text;

CREATE TABLE IF NOT EXISTS public.system_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid REFERENCES public.sites(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.system_events TO authenticated;
GRANT ALL ON public.system_events TO service_role;

ALTER TABLE public.system_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read own system events" ON public.system_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "No client inserts on system_events" ON public.system_events
  FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY "No client updates on system_events" ON public.system_events
  FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "No client deletes on system_events" ON public.system_events
  FOR DELETE TO authenticated, anon USING (false);

CREATE INDEX IF NOT EXISTS system_events_site_created_idx ON public.system_events (site_id, created_at DESC);