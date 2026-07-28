import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Body = z.object({
  token: z.string().min(8).max(100),
  domain: z.string().max(255).optional(),
  url: z.string().max(500).optional(),
});

const cors = (extra: Record<string, string> = {}) => ({
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
  ...extra,
});

export const Route = createFileRoute("/api/public/auto-verify")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors() }),
      POST: async ({ request }) => {
        const json = (data: unknown, status = 200) =>
          new Response(JSON.stringify(data), {
            status,
            headers: cors({ "content-type": "application/json" }),
          });

        let body: z.infer<typeof Body>;
        try {
          body = Body.parse(await request.json());
        } catch {
          return json({ ok: false, error: "invalid_payload" }, 400);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // The data-trustseal value may be the verification token or the site id.
        let { data: site } = await supabaseAdmin
          .from("sites")
          .select("id, domain, verification_status")
          .eq("verification_token", body.token)
          .maybeSingle();

        if (!site && /^[0-9a-f-]{36}$/i.test(body.token)) {
          const res = await supabaseAdmin
            .from("sites")
            .select("id, domain, verification_status")
            .eq("id", body.token)
            .maybeSingle();
          site = res.data;
        }

        if (!site) return json({ ok: false, error: "invalid_token" }, 404);

        const now = new Date().toISOString();
        const { error } = await supabaseAdmin
          .from("sites")
          .update({
            verification_status: "verified",
            verification_method:
              site.verification_status === "verified" ? undefined : "auto_script",
            verified_at: site.verification_status === "verified" ? undefined : now,
            plugin_last_seen_at: now,
          })
          .eq("id", site.id);

        if (error) return json({ ok: false, error: "update_failed" }, 500);

        await supabaseAdmin.from("widget_events").insert({
          site_id: site.id,
          event_type: site.verification_status === "verified" ? "widget_load" : "auto_verified",
          meta: { domain: body.domain ?? null, url: body.url ?? null },
        });

        return json({ ok: true, status: "verified", site_id: site.id });
      },
    },
  },
});
