import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PLAN_SCAN_LIMITS, PLAN_TIERS, type PlanTier } from "@/lib/plan-tiers";

const PlanSchema = z.object({ plan: z.enum(["free", "growth", "scale"]) });

function startOfTodayIso() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

/** Plan + today's scan usage, resolved on the server (source of truth). */
export const getMyPlan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: profile }, { count }, { data: adminRow }] = await Promise.all([
      context.supabase.from("profiles").select("plan").eq("id", context.userId).maybeSingle(),
      context.supabase
        .from("compliance_scans")
        .select("id", { count: "exact", head: true })
        .eq("user_id", context.userId)
        .gte("created_at", startOfTodayIso()),
      context.supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", context.userId)
        .eq("role", "admin")
        .maybeSingle(),
    ]);

    const raw = (profile as { plan?: string } | null)?.plan;
    const plan: PlanTier = PLAN_TIERS.includes(raw as PlanTier) ? (raw as PlanTier) : "free";
    const isAdmin = !!adminRow;
    const limit = isAdmin ? Infinity : PLAN_SCAN_LIMITS[plan];
    const used = count ?? 0;

    return {
      plan,
      isAdmin,
      used,
      limit: isAdmin ? null : limit,
      remaining: isAdmin ? null : Math.max(0, PLAN_SCAN_LIMITS[plan] - used),
    };
  });

/** Persist the user's chosen plan server-side. */
export const setMyPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => PlanSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ plan: data.plan })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { plan: data.plan };
  });
