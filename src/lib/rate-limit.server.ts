/**
 * Fixed-window rate limiting for public API endpoints.
 *
 * Counters live in `public.rate_limits` and are incremented atomically by the
 * `consume_rate_limit` SQL function (service-role only), so concurrent requests
 * can't race past the limit. Stale rows are pruned by a nightly cron job.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfter: number;
};

/** Best-effort client IP from the usual proxy headers. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return (
    request.headers.get("cf-connecting-ip") ??
    (forwarded ? forwarded.split(",")[0]!.trim() : null) ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

/** Normalize a key part so different spellings share one counter. */
function part(value: string | null | undefined): string {
  return (value ?? "unknown").trim().toLowerCase().slice(0, 120) || "unknown";
}

export function rateLimitKey(scope: string, ...parts: Array<string | null | undefined>): string {
  return [scope, ...parts.map(part)].join(":");
}

/**
 * Consume one unit from the bucket identified by `key`.
 * Fails open (allows the request) if the counter store is unavailable.
 */
export async function consumeRateLimit(
  supabaseAdmin: SupabaseClient<Database>,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  try {
    const { data, error } = await supabaseAdmin.rpc("consume_rate_limit", {
      _key: key,
      _limit: limit,
      _window_seconds: windowSeconds,
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return { allowed: true, remaining: limit, retryAfter: 0 };
    return {
      allowed: Boolean(row.allowed),
      remaining: Number(row.remaining ?? 0),
      retryAfter: Number(row.retry_after ?? windowSeconds),
    };
  } catch (err) {
    console.error("[rate-limit] check failed, allowing request", err);
    return { allowed: true, remaining: limit, retryAfter: 0 };
  }
}

/** Standard 429 response body/headers for a blocked request. */
export function tooManyRequests(
  result: RateLimitResult,
  headers: Record<string, string> = {},
): Response {
  return new Response(
    JSON.stringify({
      ok: false,
      error: "rate_limited",
      message: `Too many requests. Please retry in ${result.retryAfter} second(s).`,
      retry_after: result.retryAfter,
    }),
    {
      status: 429,
      headers: {
        "content-type": "application/json",
        "retry-after": String(result.retryAfter),
        ...headers,
      },
    },
  );
}
