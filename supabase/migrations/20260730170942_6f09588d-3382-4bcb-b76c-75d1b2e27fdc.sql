CREATE TABLE public.domain_connectors (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  connector_type text NOT NULL,
  connected boolean NOT NULL DEFAULT false,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (site_id, connector_type)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.domain_connectors TO authenticated;
GRANT ALL ON public.domain_connectors TO service_role;

ALTER TABLE public.domain_connectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own connectors" ON public.domain_connectors
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER domain_connectors_set_updated_at
BEFORE UPDATE ON public.domain_connectors
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();