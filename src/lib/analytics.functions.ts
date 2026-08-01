import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const IdSchema = z.object({ siteId: z.string().uuid() });

export type WidgetAnalytics = {
  impressions24h: number;
  clicks24h: number;
  impressions7d: number;
  clicks7d: number;
  impressions30d: number;
  clicks30d: number;
  ctr30d: number;
  daily: Array<{ date: string; impressions: number; clicks: number }>;
  recent: Array<{ event_type: string; created_at: string }>;
};

const CLICK_TYPES = new Set(["widget_click", "badge_click", "certificate_view"]);

export const getSiteAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => IdSchema.parse(i))
  .handler(async ({ data, context }): Promise<WidgetAnalytics> => {
    const since = new Date(Date.now() - 30 * 24 * 3600_000);
    const { data: rows, error } = await context.supabase
      .from("widget_events")
      .select("event_type, created_at")
      .eq("site_id", data.siteId)
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false })
      .limit(5000);
    if (error) throw new Error(error.message);

    const events = rows ?? [];
    const now = Date.now();
    const dayMap = new Map<string, { impressions: number; clicks: number }>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now - i * 24 * 3600_000).toISOString().slice(0, 10);
      dayMap.set(d, { impressions: 0, clicks: 0 });
    }

    let i24 = 0, c24 = 0, i7 = 0, c7 = 0, i30 = 0, c30 = 0;
    for (const e of events) {
      const t = new Date(e.created_at).getTime();
      const isClick = CLICK_TYPES.has(e.event_type);
      const day = new Date(e.created_at).toISOString().slice(0, 10);
      const bucket = dayMap.get(day);
      if (bucket) {
        if (isClick) bucket.clicks++;
        else bucket.impressions++;
      }
      if (isClick) c30++; else i30++;
      if (now - t <= 7 * 24 * 3600_000) { if (isClick) c7++; else i7++; }
      if (now - t <= 24 * 3600_000) { if (isClick) c24++; else i24++; }
    }

    return {
      impressions24h: i24,
      clicks24h: c24,
      impressions7d: i7,
      clicks7d: c7,
      impressions30d: i30,
      clicks30d: c30,
      ctr30d: i30 > 0 ? Math.round((c30 / i30) * 1000) / 10 : 0,
      daily: Array.from(dayMap.entries()).map(([date, v]) => ({ date, ...v })),
      recent: events.slice(0, 12),
    };
  });
