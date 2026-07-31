import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabaseAdmin: any, userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { isAdmin: !!data };
  });

const ImpersonateSchema = z.object({ userId: z.string().uuid() });

/**
 * Generates a one-time magic link for the target user and returns the
 * `token_hash` so the client can `verifyOtp` and swap the current session
 * into the target user's account. Admin-only.
 */
export const impersonateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ImpersonateSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(supabaseAdmin, context.userId);

    const { data: userRes, error: userErr } =
      await supabaseAdmin.auth.admin.getUserById(data.userId);
    if (userErr || !userRes?.user?.email) {
      throw new Error(userErr?.message ?? "User not found or has no email");
    }

    const { data: linkRes, error: linkErr } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: userRes.user.email,
      });
    if (linkErr || !linkRes?.properties?.hashed_token) {
      throw new Error(linkErr?.message ?? "Failed to generate impersonation link");
    }

    return {
      email: userRes.user.email,
      token_hash: linkRes.properties.hashed_token,
    };
  });

export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(supabaseAdmin, context.userId);

    const [sitesRes, scansRes, eventsRes, profilesRes] = await Promise.all([
      supabaseAdmin
        .from("sites")
        .select("id,name,domain,user_id,is_active,created_at")
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("compliance_scans")
        .select("id,site_id,score,status,created_at")
        .order("created_at", { ascending: false })
        .limit(500),
      supabaseAdmin
        .from("widget_events")
        .select("id,site_id,event_type,created_at")
        .order("created_at", { ascending: false })
        .limit(2000),
      supabaseAdmin.from("profiles").select("id,email,full_name,created_at"),
    ]);

    const sites = sitesRes.data ?? [];
    const scans = scansRes.data ?? [];
    const events = eventsRes.data ?? [];
    const profiles = profilesRes.data ?? [];

    const activeClientIds = new Set(sites.filter((s: any) => s.is_active).map((s: any) => s.user_id));
    const activeClients = activeClientIds.size;

    // Projected MRR: $49 per active client (starter tier proxy)
    const mrr = activeClients * 49;
    const arr = mrr * 12;

    // Build 14-day AI load series from scans + widget events
    const days: { date: string; scans: number; events: number }[] = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({ date: key, scans: 0, events: 0 });
    }
    const dayMap = new Map(days.map((d) => [d.date, d]));
    for (const s of scans) {
      const k = new Date(s.created_at).toISOString().slice(0, 10);
      const row = dayMap.get(k);
      if (row) row.scans += 1;
    }
    for (const e of events) {
      const k = new Date(e.created_at).toISOString().slice(0, 10);
      const row = dayMap.get(k);
      if (row) row.events += 1;
    }

    // Aggregate per site
    const siteMap = new Map<string, any>();
    for (const s of sites) {
      siteMap.set(s.id, {
        id: s.id,
        name: s.name,
        domain: s.domain,
        user_id: s.user_id,
        is_active: s.is_active,
        created_at: s.created_at,
        scan_count: 0,
        event_count: 0,
        avg_score: null as number | null,
        last_scan: null as string | null,
      });
    }
    for (const e of events) {
      const row = siteMap.get((e as any).site_id);
      if (row) row.event_count += 1;
    }
    const scoreAgg = new Map<string, { total: number; count: number }>();
    for (const s of scans) {
      const row = siteMap.get(s.site_id);
      if (!row) continue;
      row.scan_count += 1;
      if (!row.last_scan || s.created_at > row.last_scan) row.last_scan = s.created_at;
      if (typeof s.score === "number") {
        const agg = scoreAgg.get(s.site_id) ?? { total: 0, count: 0 };
        agg.total += s.score;
        agg.count += 1;
        scoreAgg.set(s.site_id, agg);
      }
    }
    for (const [id, agg] of scoreAgg) {
      const row = siteMap.get(id);
      if (row) row.avg_score = Math.round(agg.total / agg.count);
    }
    const siteList = Array.from(siteMap.values());

    // Map user email onto sites
    const profMap = new Map(profiles.map((p: any) => [p.id, p]));
    for (const s of siteList) {
      const p: any = profMap.get(s.user_id);
      s.owner_email = p?.email ?? null;
    }

    return {
      mrr,
      arr,
      activeClients,
      totalClients: profiles.length,
      totalSites: sites.length,
      activeSites: sites.filter((s: any) => s.is_active).length,
      totalScans: scans.length,
      totalEvents: events.length,
      load: days,
      sites: siteList,
    };
  });
