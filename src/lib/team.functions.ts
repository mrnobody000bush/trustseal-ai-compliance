import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { canUseTeams, normalizePlan, planSeats } from "@/lib/plan-tiers";

const InviteSchema = z.object({
  email: z.string().trim().email().max(255),
  role: z.enum(["admin", "member", "viewer"]).default("member"),
});

const IdSchema = z.object({ id: z.string().uuid() });

async function planOf(
  supabase: { from: (t: string) => any },
  userId: string,
) {
  const { data } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .maybeSingle();
  return normalizePlan((data as { plan?: string } | null)?.plan);
}

/** Team roster for the current workspace owner. */
export const listTeam = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const plan = await planOf(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("team_members")
      .select("id, email, member_role, status, invited_at")
      .eq("owner_id", context.userId)
      .order("invited_at", { ascending: true });
    if (error) throw new Error(error.message);
    return {
      plan,
      unlocked: canUseTeams(plan),
      seats: planSeats(plan),
      members: data ?? [],
    };
  });

/** Invite a colleague — gated to Scale and above. */
export const inviteTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => InviteSchema.parse(i))
  .handler(async ({ data, context }) => {
    const plan = await planOf(context.supabase, context.userId);
    if (!canUseTeams(plan)) {
      throw new Error(
        "PLAN_LIMIT: Team workspaces are available on Scale, Team and Enterprise plans.",
      );
    }

    const { count } = await context.supabase
      .from("team_members")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", context.userId);

    // Owner occupies one seat.
    if ((count ?? 0) + 1 >= planSeats(plan)) {
      throw new Error(
        `PLAN_LIMIT: Your plan includes ${planSeats(plan)} seats. Upgrade to invite more people.`,
      );
    }

    const { error } = await context.supabase.from("team_members").insert({
      owner_id: context.userId,
      email: data.email.toLowerCase(),
      member_role: data.role,
      status: "invited",
    });
    if (error) {
      throw new Error(
        error.code === "23505" ? "This person is already invited." : error.message,
      );
    }
    return { ok: true };
  });

export const removeTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => IdSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("team_members")
      .delete()
      .eq("id", data.id)
      .eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
