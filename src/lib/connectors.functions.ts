import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CONNECTOR_TYPES = ["github_replit", "vercel_netlify", "wordpress_mcp"] as const;

const ListSchema = z.object({ siteId: z.string().uuid() });
const ToggleSchema = z.object({
  siteId: z.string().uuid(),
  connectorType: z.enum(CONNECTOR_TYPES),
  connected: z.boolean(),
});

export const listConnectors = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ListSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("domain_connectors")
      .select("connector_type, connected, updated_at")
      .eq("site_id", data.siteId);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const toggleConnector = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ToggleSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { data: site, error: siteErr } = await context.supabase
      .from("sites")
      .select("id, verification_status")
      .eq("id", data.siteId)
      .single();
    if (siteErr || !site) throw new Error("Site not found");

    const { error } = await context.supabase.from("domain_connectors").upsert(
      {
        site_id: data.siteId,
        user_id: context.userId,
        connector_type: data.connectorType,
        connected: data.connected,
      },
      { onConflict: "site_id,connector_type" },
    );
    if (error) throw new Error(error.message);

    if (data.connected) {
      const now = new Date().toISOString();
      const { error: upErr } = await context.supabase
        .from("sites")
        .update({
          verification_status: "verified",
          verification_method: `connector:${data.connectorType}`,
          verified_at: site.verification_status === "verified" ? undefined : now,
          plugin_last_seen_at: now,
        })
        .eq("id", data.siteId);
      if (upErr) throw new Error(upErr.message);

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("widget_events").insert({
        site_id: data.siteId,
        event_type: "connector_activated",
        meta: { connector: data.connectorType },
      });
    }

    return { ok: true };
  });
