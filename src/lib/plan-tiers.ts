export type PlanTier = "free" | "growth" | "scale";

export const PLAN_TIERS: PlanTier[] = ["free", "growth", "scale"];

/** Daily scan allowance per plan, enforced server-side. */
export const PLAN_SCAN_LIMITS: Record<PlanTier, number> = {
  free: 3,
  growth: 50,
  scale: 500,
};

export function isPlanTier(v: unknown): v is PlanTier {
  return typeof v === "string" && (PLAN_TIERS as string[]).includes(v);
}
