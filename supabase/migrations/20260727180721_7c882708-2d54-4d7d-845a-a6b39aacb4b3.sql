DROP POLICY IF EXISTS "Public can read active sites" ON public.sites;
DROP POLICY IF EXISTS "Public can read completed scans" ON public.compliance_scans;
DROP POLICY IF EXISTS "Anon can insert events for active sites" ON public.widget_events;

REVOKE ALL ON public.sites FROM anon;
REVOKE ALL ON public.compliance_scans FROM anon;
REVOKE ALL ON public.widget_events FROM anon;

GRANT ALL ON public.sites TO service_role;
GRANT ALL ON public.compliance_scans TO service_role;
GRANT ALL ON public.widget_events TO service_role;