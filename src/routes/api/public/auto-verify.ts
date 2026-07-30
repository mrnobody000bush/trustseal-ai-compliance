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

/** Normalize any domain/url input to a bare lowercase hostname. */
function toHostname(input?: string | null): string | null {
  if (!input) return null;
  let value = input.trim().toLowerCase();
  if (!value) return null;
  if (!value.includes("://")) value = `https://${value}`;
  try {
    const host = new URL(value).hostname;
    return host.replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

/** Exact host or a subdomain of the registered host. */
function hostMatches(registered: string, incoming: string): boolean {
  return incoming === registered || incoming.endsWith(`.${registered}`);
}

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

        // Trust browser-enforced headers first; fall back to the reported values.
        const headerHost =
          toHostname(request.headers.get("origin")) ??
          toHostname(request.headers.get("referer"));
        const claimedHost = toHostname(body.domain) ?? toHostname(body.url);
        const incomingHost = headerHost ?? claimedHost;
        const registeredHost = toHostname(site.domain);

        if (!registeredHost || !incomingHost || !hostMatches(registeredHost, incomingHost)) {
          // Log the unauthorized activation attempt for auditing.
          await supabaseAdmin.from("widget_events").insert({
            site_id: site.id,
            event_type: "verification_rejected",
            meta: {
              reason: "domain_mismatch",
              registered_domain: registeredHost,
              origin_host: headerHost,
              claimed_host: claimedHost,
              url: body.url ?? null,
              at: new Date().toISOString(),
            },
          });

          return json(
            {
              ok: false,
              error: "domain_mismatch",
              message:
                "This TrustSeal key is registered to a different domain. Verification blocked.",
            },
            403,
          );
        }

        // Header host and claimed host must agree when both are present.
        if (headerHost && claimedHost && !hostMatches(registeredHost, claimedHost)) {
          await supabaseAdmin.from("widget_events").insert({
            site_id: site.id,
            event_type: "verification_rejected",
            meta: { reason: "claim_mismatch", origin_host: headerHost, claimed_host: claimedHost },
          });
          return json({ ok: false, error: "domain_mismatch" }, 403);
        }

        const now = new Date().toISOString();
        const alreadyVerified = site.verification_status === "verified";
        const { error } = await supabaseAdmin
          .from("sites")
          .update({
            verification_status: "verified",
            verification_method: alreadyVerified ? undefined : "auto_script",
            verified_at: alreadyVerified ? undefined : now,
            plugin_last_seen_at: now,
          })
          .eq("id", site.id);

        if (error) return json({ ok: false, error: "update_failed" }, 500);

        await supabaseAdmin.from("widget_events").insert({
          site_id: site.id,
          event_type: alreadyVerified ? "widget_load" : "auto_verified",
          meta: { domain: incomingHost, url: body.url ?? null },
        });

        return json({ ok: true, status: "verified", site_id: site.id });
      },
    },
  },
});
