import { createFileRoute } from "@tanstack/react-router";
import { clientIp, consumeRateLimit, rateLimitKey, tooManyRequests } from "@/lib/rate-limit.server";
import { canUseWidgetChat } from "@/lib/plan-tiers";

/**
 * Public shopper-facing AI chat for the trust widget.
 * Answers only questions about this store's verified compliance status.
 */
export const Route = createFileRoute("/api/public/widget-chat")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors() }),
      POST: async ({ request }) => {
        let body: { token?: string; message?: string };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return json({ error: "bad_request" }, 400);
        }

        const token = String(body.token ?? "").trim().slice(0, 100);
        const message = String(body.message ?? "").trim().slice(0, 500);
        if (!token || !message) return json({ error: "bad_request" }, 400);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const limit = await consumeRateLimit(
          supabaseAdmin,
          rateLimitKey("widget-chat", token, clientIp(request)),
          20,
          60 * 60,
        );
        if (!limit.allowed) return tooManyRequests(limit, cors());

        const { data: site } = await supabaseAdmin
          .from("sites")
          .select("id, name, domain, user_id")
          .eq("verification_token", token)
          .eq("is_active", true)
          .eq("verification_status", "verified")
          .maybeSingle();
        if (!site) return json({ error: "not_found" }, 404);

        const [{ data: profile }, { data: scans }] = await Promise.all([
          supabaseAdmin.from("profiles").select("plan").eq("id", site.user_id).maybeSingle(),
          supabaseAdmin
            .from("compliance_scans")
            .select("score, summary, created_at")
            .eq("site_id", site.id)
            .eq("status", "completed")
            .order("created_at", { ascending: false })
            .limit(1),
        ]);

        if (!canUseWidgetChat((profile as { plan?: string } | null)?.plan)) {
          return json({ error: "not_enabled" }, 403);
        }

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return json({ error: "unavailable" }, 503);

        const latest = scans?.[0];
        const { generateText } = await import("ai");
        const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
        const gateway = createLovableAiGatewayProvider(apiKey);

        try {
          const { text } = await generateText({
            model: gateway("google/gemini-3-flash-preview"),
            system:
              "You are the TrustSeal assistant embedded on an online store. You answer shoppers' questions " +
              "about this store's AI transparency and EU AI Act audit status. Be short (max 70 words), factual and friendly. " +
              "Use ONLY the audit context provided. If you do not know, say so and suggest contacting the store. " +
              "Never give legal advice, never discuss prices, orders or payments.",
            prompt:
              `Store: ${site.name} (${site.domain})\n` +
              `Latest automated audit score: ${latest?.score ?? "not available"}\n` +
              `Audit summary: ${latest?.summary ?? "no summary available"}\n` +
              `Audit date: ${latest?.created_at ?? "unknown"}\n\n` +
              `Shopper question: ${message}`,
          });
          return json({ reply: text.trim() });
        } catch {
          return json({ error: "unavailable" }, 503);
        }
      },
    },
  },
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: cors({ "content-type": "application/json" }),
  });
}

function cors(extra: Record<string, string> = {}): Record<string, string> {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    ...extra,
  };
}
