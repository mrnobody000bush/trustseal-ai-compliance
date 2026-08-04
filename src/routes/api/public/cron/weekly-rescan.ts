import { createFileRoute } from "@tanstack/react-router";

/**
 * Weekly automated re-scan ("Continuous Compliance").
 *
 * Called by pg_cron. Picks verified, monitored sites whose last automatic scan
 * is older than 7 days and runs a fresh compliance scan for each of them.
 * Batched so a single invocation stays well inside the request budget.
 */

const WEEK_MS = 7 * 24 * 3600_000;
const BATCH = 10;

export const Route = createFileRoute("/api/public/cron/weekly-rescan")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Only the scheduler may trigger re-scans: require the project apikey.
        const expected = process.env["SUPABASE_ANON_KEY"] ?? process.env["SUPABASE_PUBLISHABLE_KEY"];
        const provided =
          request.headers.get("apikey") ??
          request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
          "";
        if (!expected || provided !== expected) {
          return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { executeScan } = await import("@/lib/scan-engine.server");


        const cutoff = new Date(Date.now() - WEEK_MS).toISOString();
        const { data: sites, error } = await supabaseAdmin
          .from("sites")
          .select("id, user_id, domain, last_auto_scan_at, monitoring_enabled, is_active, verification_status")
          .eq("monitoring_enabled", true)
          .eq("is_active", true)
          .eq("verification_status", "verified")
          .or(`last_auto_scan_at.is.null,last_auto_scan_at.lt.${cutoff}`)
          .limit(BATCH);

        if (error) {
          return Response.json({ ok: false, error: error.message }, { status: 500 });
        }

        const results: Array<{ siteId: string; ok: boolean; score?: number; error?: string }> = [];

        for (const site of sites ?? []) {
          // Reuse the industry of the most recent scan so reports stay comparable.
          const { data: prev } = await supabaseAdmin
            .from("compliance_scans")
            .select("industry")
            .eq("site_id", site.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          const { data: scanRow, error: insErr } = await supabaseAdmin
            .from("compliance_scans")
            .insert({
              site_id: site.id,
              user_id: site.user_id,
              status: "running",
              industry: prev?.industry ?? "ecommerce",
              trigger_source: "weekly_auto",
            })
            .select("id")
            .single();

          if (insErr || !scanRow) {
            results.push({ siteId: site.id, ok: false, error: insErr?.message ?? "insert failed" });
            continue;
          }

          const res = await executeScan(supabaseAdmin, scanRow.id);
          await supabaseAdmin
            .from("sites")
            .update({ last_auto_scan_at: new Date().toISOString() })
            .eq("id", site.id);

          results.push(
            res.ok
              ? { siteId: site.id, ok: true, score: res.score }
              : { siteId: site.id, ok: false, error: res.error },
          );
        }

        return Response.json({ ok: true, processed: results.length, results });
      },
    },
  },
});
