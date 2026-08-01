import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Body = z
  .object({
    site_id: z.string().uuid().optional(),
    token: z.string().min(8).max(64).optional(),
    event_type: z.string().min(1).max(50),
    meta: z.record(z.string(), z.any()).optional(),
  })
  .refine((b) => !!b.site_id || !!b.token, { message: "site_id or token required" });

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
          const query = supabaseAdmin
            .from("sites")
            .select("id")
            .eq("is_active", true)
            .eq("verification_status", "verified");
          const { data: site } = await (body.site_id
            ? query.eq("id", body.site_id)
            : query.eq("verification_token", body.token!)
          ).maybeSingle();
          if (!site) {
            return new Response(JSON.stringify({ ok: false }), {
              status: 404,
              headers: cors({ "content-type": "application/json" }),
            });
          }
          await supabaseAdmin.from("widget_events").insert({
            site_id: site.id,
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
