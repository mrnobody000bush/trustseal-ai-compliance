ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free';

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_plan_check CHECK (plan IN ('free','growth','scale'));

CREATE INDEX IF NOT EXISTS compliance_scans_user_created_idx
  ON public.compliance_scans (user_id, created_at DESC);