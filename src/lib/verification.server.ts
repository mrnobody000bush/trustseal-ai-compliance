/**
 * Shared domain-verification helpers used by server functions and cron routes.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type AnySupabase = SupabaseClient<Database>;

/** Verification lifecycle statuses stored on `sites.verification_status`. */
export const VERIFICATION_STATUSES = [
  "pending",
  "verified",
  "needs_reverification",
  "unverified",
] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

/** Paid plans get silent automatic retries before the user is bothered. */
export const MAX_AUTO_REVERIFY_ATTEMPTS = 3;
/** Grace period before a `needs_reverification` site is fully unverified. */
export const REVERIFY_GRACE_MS = 7 * 24 * 3600_000;
/** How often a verified domain is re-checked. */
export const RECHECK_INTERVAL_MS = 3 * 24 * 3600_000;
/** A plugin/connector heartbeat within this window counts as proof of ownership. */
export const HEARTBEAT_FRESH_MS = 14 * 24 * 3600_000;

export function normalizeHost(domain: string) {
  return domain.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
}

/** Fetches the domain homepage and looks for the TrustSeal verification meta tag. */
export async function checkMetaTag(
  domain: string,
  token: string,
): Promise<{ ok: boolean; reason?: string }> {
  const host = normalizeHost(domain);
  let html = "";
  let fetchError = "";

  for (const url of [`https://${host}`, `http://${host}`]) {
    try {
      const res = await fetch(url, {
        headers: { "user-agent": "TrustSealBot/1.0 (+verification)" },
        redirect: "follow",
      });
      if (!res.ok) {
        fetchError = `Site responded with ${res.status}`;
        continue;
      }
      html = (await res.text()).slice(0, 400_000);
      fetchError = "";
      break;
    } catch (e) {
      fetchError = e instanceof Error ? e.message : "Could not reach site";
    }
  }

  if (!html) return { ok: false, reason: fetchError || "Could not reach your site" };

  const found =
    new RegExp(
      `<meta[^>]+name=["']trustseal-verification["'][^>]+content=["']${token}["']`,
      "i",
    ).test(html) ||
    new RegExp(
      `<meta[^>]+content=["']${token}["'][^>]+name=["']trustseal-verification["']`,
      "i",
    ).test(html);

  return found ? { ok: true } : { ok: false, reason: "Meta tag not found in the page <head>" };
}

/** Appends a durable backend event (scan timeout, verification loss, auto re-verify). */
export async function logSystemEvent(
  supabase: AnySupabase,
  event: {
    event_type: string;
    site_id?: string | null;
    user_id?: string | null;
    detail?: Record<string, unknown>;
  },
) {
  try {
    await supabase.from("system_events").insert({
      event_type: event.event_type,
      site_id: event.site_id ?? null,
      user_id: event.user_id ?? null,
      detail: (event.detail ?? {}) as never,
    } as never);
  } catch (e) {
    console.error("[system_events] failed to log", event.event_type, e);
  }
}

export function reverificationMessage(attempts: number) {
  return `We automatically tried to confirm your domain verification ${attempts} time${
    attempts === 1 ? "" : "s"
  }, but every attempt failed. Please restore verification manually. Sorry for the inconvenience.`;
}
