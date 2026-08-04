CREATE TABLE public.rate_limits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  count integer NOT NULL DEFAULT 0,
  window_start timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX rate_limits_window_start_idx ON public.rate_limits (window_start);

GRANT ALL ON public.rate_limits TO service_role;

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No client access to rate_limits" ON public.rate_limits
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE TRIGGER rate_limits_set_updated_at
  BEFORE UPDATE ON public.rate_limits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Atomic fixed-window counter. Returns true when the request is allowed.
CREATE OR REPLACE FUNCTION public.consume_rate_limit(_key text, _limit integer, _window_seconds integer)
RETURNS TABLE (allowed boolean, remaining integer, retry_after integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row_rec public.rate_limits%ROWTYPE;
  now_ts timestamptz := now();
BEGIN
  INSERT INTO public.rate_limits (key, count, window_start)
  VALUES (_key, 1, now_ts)
  ON CONFLICT (key) DO UPDATE
    SET count = CASE
          WHEN public.rate_limits.window_start < now_ts - make_interval(secs => _window_seconds) THEN 1
          ELSE public.rate_limits.count + 1
        END,
        window_start = CASE
          WHEN public.rate_limits.window_start < now_ts - make_interval(secs => _window_seconds) THEN now_ts
          ELSE public.rate_limits.window_start
        END,
        updated_at = now_ts
  RETURNING * INTO row_rec;

  RETURN QUERY SELECT
    row_rec.count <= _limit,
    GREATEST(_limit - row_rec.count, 0),
    GREATEST(CEIL(EXTRACT(EPOCH FROM (row_rec.window_start + make_interval(secs => _window_seconds) - now_ts)))::int, 1);
END;
$$;

-- Housekeeping: drop counters whose window ended long ago.
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.rate_limits WHERE window_start < now() - interval '1 day';
$$;

SELECT cron.schedule('cleanup-rate-limits', '17 3 * * *', $$SELECT public.cleanup_rate_limits();$$);