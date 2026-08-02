export type PlanTier = "free" | "growth" | "scale";

export const PLAN_TIERS: PlanTier[] = ["free", "growth", "scale"];

export type SubscriptionPlan = {
  key: PlanTier;
  name: string;
  /** Monthly price in USD — single source of truth for pricing & MRR. */
  price: number;
  /** Daily scan allowance, enforced server-side. */
  scanLimit: number;
  desc: string;
  features: string[];
  cta: string;
  featured?: boolean;
};

/** Single source of truth for plans: pricing page, MRR maths and scan limits. */
export const SubscriptionPlans: Record<PlanTier, SubscriptionPlan> = {
  free: {
    key: "free",
    name: "Free",
    price: 0,
    scanLimit: 3,
    desc: "Try TrustSeal on one site — no card required.",
    features: [
      "1 store",
      "3 compliance scans",
      "Basic EU AI Act score",
      "AI auto-fix locked",
    ],
    cta: "Start free",
  },
  growth: {
    key: "growth",
    name: "Growth",
    price: 99,
    scanLimit: 50,
    desc: "For growing brands ready for EU AI Act 2026.",
    features: [
      "Up to 5 stores",
      "Full EU AI Act reports",
      "Unlimited “Fix with TrustSeal AI”",
      "Trust widget with AI chat",
      "Email support",
    ],
    cta: "Upgrade to Growth",
    featured: true,
  },
  scale: {
    key: "scale",
    name: "Scale",
    price: 299,
    scanLimit: 500,
    desc: "For agencies and multi-brand retailers.",
    features: [
      "Unlimited stores & scans",
      "Custom branded PDF certificates",
      "Priority support",
      "White-label widget",
      "SLA & onboarding",
    ],
    cta: "Upgrade to Scale",
  },
};

/** Daily scan allowance per plan, enforced server-side. */
export const PLAN_SCAN_LIMITS: Record<PlanTier, number> = {
  free: SubscriptionPlans.free.scanLimit,
  growth: SubscriptionPlans.growth.scanLimit,
  scale: SubscriptionPlans.scale.scanLimit,
};

export function isPlanTier(v: unknown): v is PlanTier {
  return typeof v === "string" && (PLAN_TIERS as string[]).includes(v);
}

/** Monthly price for a stored plan value; unknown/missing plans count as free. */
export function planPrice(plan: unknown): number {
  return isPlanTier(plan) ? SubscriptionPlans[plan].price : 0;
}
