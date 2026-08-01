import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ToggleSchema = z.object({
  siteId: z.string().uuid(),
  enabled: z.boolean(),
});

const SiteSchema = z.object({ siteId: z.string().uuid() });

export type MonitoringStatus = {
  enabled: boolean;
  lastAutoScanAt: string | null;
  nextAutoScanAt: string | null;
  lastAutoScore: number | null;
  previousAutoScore: number | null;
};

/** Weekly-monitoring state for one site (used by the Monitoring card). */
export const getMonitoringStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => SiteSchema.parse(i))
  .handler(async ({ data, context }): Promise<MonitoringStatus> => {
    const { data: site, error } = await context.supabase
      .from("sites")
      .select("monitoring_enabled, last_auto_scan_at")
      .eq("id", data.siteId)
      .single();
    if (error || !site) throw new Error("Site not found");

    const { data: scans } = await context.supabase
      .from("compliance_scans")
      .select("score, created_at")
      .eq("site_id", data.siteId)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(2);

    const last = site.last_auto_scan_at as string | null;
    return {
      enabled: !!site.monitoring_enabled,
      lastAutoScanAt: last,
      nextAutoScanAt: last
        ? new Date(new Date(last).getTime() + 7 * 24 * 3600_000).toISOString()
        : null,
      lastAutoScore: scans?.[0]?.score ?? null,
      previousAutoScore: scans?.[1]?.score ?? null,
    };
  });

export const setMonitoring = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ToggleSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("sites")
      .update({ monitoring_enabled: data.enabled })
      .eq("id", data.siteId);
    if (error) throw new Error(error.message);
    return { ok: true, enabled: data.enabled };
  });
