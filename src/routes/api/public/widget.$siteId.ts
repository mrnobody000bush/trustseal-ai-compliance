import { createFileRoute } from "@tanstack/react-router";

/** In-memory 60s cache: repeated widget hits never touch the DB. */
const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { at: number; body: string }>();

export const Route = createFileRoute("/api/public/widget/$siteId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const cached = cache.get(params.siteId);
        if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
          return new Response(cached.body, {
            headers: cors({
              "content-type": "application/json",
              "cache-control": "public, max-age=60, s-maxage=60",
              "x-trustseal-cache": "hit",
            }),
          });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const supabase = supabaseAdmin;


        // Accept the verification token (canonical) or the legacy site id.
        const key = params.siteId;
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key);

        const { data: site, error } = await supabase
          .from("sites")
          .select("id, name, domain, widget_config, is_active")
          .eq(isUuid ? "id" : "verification_token", key)
          .eq("is_active", true)
          .eq("verification_status", "verified")
          .maybeSingle();

        if (error || !site) {
          return new Response(JSON.stringify({ error: "not found" }), {
            status: 404,
            headers: cors({ "content-type": "application/json" }),
          });
        }

        const { data: scans } = await supabase
          .from("compliance_scans")
          .select("score, summary, created_at")
          .eq("site_id", site.id)
          .eq("status", "completed")
          .order("created_at", { ascending: false })
          .limit(1);

        const latest = scans?.[0];
        const body = JSON.stringify({
          id: site.id,
          name: site.name,
          domain: site.domain,
          widget_config: site.widget_config,
          score: latest?.score ?? null,
          summary: latest?.summary ?? null,
          scanned_at: latest?.created_at ?? null,
        });

        if (cache.size > 5000) cache.clear();
        cache.set(params.siteId, { at: Date.now(), body });

        return new Response(body, {
          headers: cors({
            "content-type": "application/json",
            "cache-control": "public, max-age=60, s-maxage=60",
            "x-trustseal-cache": "miss",
          }),
        });
      },
      OPTIONS: async () => new Response(null, { status: 204, headers: cors() }),
    },
  },
});

function cors(extra: Record<string, string> = {}): Record<string, string> {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-headers": "content-type",
    ...extra,
  };
}
