import { createFileRoute } from "@tanstack/react-router";
import {
  MAX_AUTO_REVERIFY_ATTEMPTS,
  RECHECK_INTERVAL_MS,
  REVERIFY_GRACE_MS,
  HEARTBEAT_FRESH_MS,
  checkMetaTag,
  logSystemEvent,
  reverificationMessage,
} from "@/lib/verification.server";
import { SCAN_TIMEOUT_MS } from "@/lib/scan-timeout";

/**
 * Backend reliability maintenance job (pg_cron, daily).
 *
 *  1. Fails any `running` compliance scan older than the hard timeout.
 *  2. Re-checks verified domains every few days, with plan-aware handling:
 *     paid plans get silent automatic retries, free plans get a 7-day grace
 *     period before the domain is fully unverified and monitoring is disabled.
 */

const BATCH = 20;

export const Route = createFileRoute("/api/public/cron/maintenance")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected =
          process.env["SUPABASE_ANON_KEY"] ?? process.env["SUPABASE_PUBLISHABLE_KEY"];
        const provided =
          request.headers.get("apikey") ??
          request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
          "";
        if (!expected || provided !== expected) {
          return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const now = Date.now();

        // --- 1. reap stuck scans ------------------------------------------
        const staleBefore = new Date(now - SCAN_TIMEOUT_MS).toISOString();
        const { data: stuck } = await supabaseAdmin
          .from("compliance_scans")
          .update({ status: "failed", error: "Scan timed out after 5 minutes" })
          .eq("status", "running")
          .lt("created_at", staleBefore)
          .select("id, site_id, user_id");

        for (const scan of stuck ?? []) {
          await logSystemEvent(supabaseAdmin, {
            event_type: "scan_timeout",
            site_id: scan.site_id,
            user_id: scan.user_id,
            detail: { scanId: scan.id, timeoutMs: SCAN_TIMEOUT_MS },
          });
        }

        // --- 2. expire free-plan grace periods -----------------------------
        const graceBefore = new Date(now - REVERIFY_GRACE_MS).toISOString();
        const { data: expired } = await supabaseAdmin
          .from("sites")
          .update({
            verification_status: "unverified",
            monitoring_enabled: false,
            verification_method: null,
            verified_at: null,
            reverification_message:
              "Domain verification was lost and not restored within 7 days. The widget and monitoring are disabled until you verify again.",
          })
          .eq("verification_status", "needs_reverification")
          .lt("needs_reverification_since", graceBefore)
          .select("id, user_id, domain");

        for (const site of expired ?? []) {
          await logSystemEvent(supabaseAdmin, {
            event_type: "verification_expired",
            site_id: site.id,
            user_id: site.user_id,
            detail: { domain: site.domain },
          });
        }

        // --- 3. re-check verified domains ----------------------------------
        const checkBefore = new Date(now - RECHECK_INTERVAL_MS).toISOString();
        const { data: sites, error } = await supabaseAdmin
          .from("sites")
          .select(
            "id, user_id, domain, verification_token, verification_status, verification_method, plugin_last_seen_at, reverify_attempts",
          )
          .eq("is_active", true)
          .in("verification_status", ["verified", "needs_reverification"])
          .or(`last_reverify_check_at.is.null,last_reverify_check_at.lt.${checkBefore}`)
          .limit(BATCH);

        if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

        const checked: Array<{ siteId: string; status: string }> = [];

        for (const site of sites ?? []) {
          const { data: plan } = await supabaseAdmin
            .from("profiles")
            .select("plan")
            .eq("id", site.user_id)
            .maybeSingle();
          const isPaid = plan?.plan === "growth" || plan?.plan === "scale";

          const heartbeatFresh =
            !!site.plugin_last_seen_at &&
            now - new Date(site.plugin_last_seen_at).getTime() < HEARTBEAT_FRESH_MS;
          const result = heartbeatFresh
            ? { ok: true as const }
            : await checkMetaTag(site.domain, site.verification_token);

          const nowIso = new Date().toISOString();

          if (result.ok) {
            const recovered = site.verification_status !== "verified" || site.reverify_attempts > 0;
            await supabaseAdmin
              .from("sites")
              .update({
                verification_status: "verified",
                reverify_attempts: 0,
                needs_reverification_since: null,
                reverification_message: null,
                last_reverify_check_at: nowIso,
              })
              .eq("id", site.id);
            if (recovered) {
              await logSystemEvent(supabaseAdmin, {
                event_type: "auto_reverification_succeeded",
                site_id: site.id,
                user_id: site.user_id,
                detail: { domain: site.domain, previousAttempts: site.reverify_attempts },
              });
            }
            checked.push({ siteId: site.id, status: "verified" });
            continue;
          }

          const attempts = (site.reverify_attempts ?? 0) + 1;
          const stillRetrying = isPaid && attempts < MAX_AUTO_REVERIFY_ATTEMPTS;

          await supabaseAdmin
            .from("sites")
            .update({
              reverify_attempts: attempts,
              last_reverify_check_at: nowIso,
              ...(stillRetrying
                ? {}
                : {
                    verification_status: "needs_reverification",
                    needs_reverification_since:
                      site.verification_status === "needs_reverification" ? undefined : nowIso,
                    reverification_message: isPaid
                      ? reverificationMessage(attempts)
                      : `We could not confirm ownership of ${site.domain} (${result.reason}). Please restore verification within 7 days, otherwise the widget and monitoring will be disabled.`,
                  }),
            })
            .eq("id", site.id);

          await logSystemEvent(supabaseAdmin, {
            event_type: stillRetrying ? "reverification_retry" : "verification_lost",
            site_id: site.id,
            user_id: site.user_id,
            detail: { domain: site.domain, attempts, reason: result.reason, plan: plan?.plan },
          });

          checked.push({ siteId: site.id, status: stillRetrying ? "retrying" : "needs_reverification" });
        }

        return Response.json({
          ok: true,
          scansTimedOut: stuck?.length ?? 0,
          verificationExpired: expired?.length ?? 0,
          domainsChecked: checked.length,
          checked,
        });
      },
    },
  },
});
