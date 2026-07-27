import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";

const Body = z.object({
  site_id: z.string().uuid(),
  event_type: z.string().min(1).max(50),
  meta: z.record(z.string(), z.any()).optional(),
});

const cors = (extra: Record<string, string> = {}) => ({
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
  ...extra,
});

export const Route = createFileRoute("/api/public/widget-event")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors() }),
      POST: async ({ request }) => {
        try {
          const body = Body.parse(await request.json());
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: site } = await supabaseAdmin
            .from("sites")
            .select("id")
            .eq("id", body.site_id)
            .eq("is_active", true)
            .maybeSingle();
          if (!site) {
            return new Response(JSON.stringify({ ok: false }), {
              status: 404,
              headers: cors({ "content-type": "application/json" }),
            });
          }
          await supabaseAdmin.from("widget_events").insert({
            site_id: body.site_id,
            event_type: body.event_type,
            meta: body.meta ?? {},
          });
          return new Response(JSON.stringify({ ok: true }), {
            headers: cors({ "content-type": "application/json" }),
          });
        } catch {
          return new Response(JSON.stringify({ ok: false }), {
            status: 400,
            headers: cors({ "content-type": "application/json" }),
          });
        }
      },
    },
  },
});
