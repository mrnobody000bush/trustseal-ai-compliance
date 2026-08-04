import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Body = z.object({
  token: z.string().min(16).max(100),
  domain: z.string().min(3).max(255),
  plugin_version: z.string().max(20).optional(),
});

const cors = (extra: Record<string, string> = {}) => ({
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
  ...extra,
});

const normalize = (d: string) =>
  d
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "");

export const Route = createFileRoute("/api/public/plugin-verify")({
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
        const { clientIp, consumeRateLimit, rateLimitKey, tooManyRequests } = await import(
          "@/lib/rate-limit.server"
        );

        // 20 requests per hour per IP + domain.
        const limit = await consumeRateLimit(
          supabaseAdmin,
          rateLimitKey("plugin-verify", clientIp(request), normalize(body.domain)),
          20,
          3600,
        );
        if (!limit.allowed) return tooManyRequests(limit, cors());


        const { data: site } = await supabaseAdmin
          .from("sites")
          .select("id, domain, verification_status")
          .eq("verification_token", body.token)
          .maybeSingle();

        if (!site) return json({ ok: false, error: "invalid_token" }, 404);

        if (normalize(site.domain) !== normalize(body.domain)) {
          return json(
            { ok: false, error: "domain_mismatch", expected: normalize(site.domain) },
            403,
          );
        }

        const now = new Date().toISOString();
        const { error } = await supabaseAdmin
          .from("sites")
          .update({
            verification_status: "verified",
            verification_method: "wordpress_plugin",
            verified_at: site.verification_status === "verified" ? undefined : now,
            plugin_last_seen_at: now,
          })
          .eq("id", site.id);

        if (error) return json({ ok: false, error: "update_failed" }, 500);

        return json({ ok: true, status: "verified", site_id: site.id });
      },
    },
  },
});
