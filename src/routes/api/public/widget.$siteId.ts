import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/api/public/widget/$siteId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const supabase = createClient<Database>(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
        );

        const { data: site, error } = await supabase
          .from("sites")
          .select("id, name, domain, widget_config, is_active")
          .eq("id", params.siteId)
          .eq("is_active", true)
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
        return new Response(
          JSON.stringify({
            id: site.id,
            name: site.name,
            domain: site.domain,
            widget_config: site.widget_config,
            score: latest?.score ?? null,
            summary: latest?.summary ?? null,
            scanned_at: latest?.created_at ?? null,
          }),
          { headers: cors({ "content-type": "application/json", "cache-control": "public, max-age=60" }) },
        );
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
