ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS monitoring_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_auto_scan_at timestamptz;

ALTER TABLE public.compliance_scans
  ADD COLUMN IF NOT EXISTS trigger_source text NOT NULL DEFAULT 'manual';

CREATE INDEX IF NOT EXISTS sites_monitoring_idx ON public.sites (monitoring_enabled, last_auto_scan_at);