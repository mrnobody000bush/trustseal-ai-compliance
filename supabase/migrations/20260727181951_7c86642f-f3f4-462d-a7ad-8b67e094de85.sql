ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS verification_token text NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', ''),
  ADD COLUMN IF NOT EXISTS verification_method text,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS plugin_last_seen_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS sites_verification_token_key ON public.sites (verification_token);