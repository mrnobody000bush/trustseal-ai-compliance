export type PlanTier = "free" | "growth" | "scale" | "team" | "enterprise";

export const PLAN_TIERS: PlanTier[] = ["free", "growth", "scale", "team", "enterprise"];

export type SubscriptionPlan = {
  key: PlanTier;
  name: string;
  /** Monthly price in USD — single source of truth for pricing & MRR. */
  price: number;
  /** Shown instead of the number when the plan is quote-based. */
  priceLabel?: string;
  /** Daily scan allowance, enforced server-side. */
  scanLimit: number;
  /** Seats included (collaborators, owner included). */
  seats: number;
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
    seats: 1,
    desc: "Try TrustSeal on one site — no card required.",
    features: [
      "1 store",
      "3 compliance scans",
      "Basic EU AI Act score",
      "AI auto-fix locked",
      "Audit export locked",
    ],
    cta: "Start free",
  },
  growth: {
    key: "growth",
    name: "Growth",
    price: 99,
    scanLimit: 50,
    seats: 1,
    desc: "For growing brands ready for EU AI Act 2026.",
    features: [
      "Up to 5 stores",
      "Full EU AI Act reports",
      "Unlimited “Fix with TrustSeal AI”",
      "PDF & CSV audit export",
      "AI chat in the trust widget",
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
    seats: 3,
    desc: "For agencies and multi-brand retailers.",
    features: [
      "Unlimited stores & scans",
      "Multi-site & team workspace (3 seats)",
      "Custom branded PDF certificates",
      "White-label widget",
      "Priority support",
    ],
    cta: "Upgrade to Scale",
  },
  team: {
    key: "team",
    name: "Team",
    price: 599,
    scanLimit: 1500,
    seats: 15,
    desc: "Premium tier for compliance teams working together.",
    features: [
      "Everything in Scale",
      "15 seats with organisation roles",
      "Shared audit workspace & review queue",
      "Bulk export for auditors (PDF + CSV)",
      "Dedicated onboarding session",
      "Slack / email escalation channel",
    ],
    cta: "Upgrade to Team",
  },
  enterprise: {
    key: "enterprise",
    name: "Enterprise",
    price: 1499,
    priceLabel: "from $1,499",
    scanLimit: 10000,
    seats: 999,
    desc: "For corporations and large multi-market operations.",
    features: [
      "Everything in Team",
      "Unlimited seats & sub-organisations",
      "SSO, audit logs and data residency options",
      "Custom regulatory frameworks",
      "SLA with named compliance engineer",
      "Procurement, DPA and security review support",
    ],
    cta: "Talk to sales",
  },
};

/** Daily scan allowance per plan, enforced server-side. */
export const PLAN_SCAN_LIMITS: Record<PlanTier, number> = {
  free: SubscriptionPlans.free.scanLimit,
  growth: SubscriptionPlans.growth.scanLimit,
  scale: SubscriptionPlans.scale.scanLimit,
  team: SubscriptionPlans.team.scanLimit,
  enterprise: SubscriptionPlans.enterprise.scanLimit,
};

export function isPlanTier(v: unknown): v is PlanTier {
  return typeof v === "string" && (PLAN_TIERS as string[]).includes(v);
}

/** Monthly price for a stored plan value; unknown/missing plans count as free. */
export function planPrice(plan: unknown): number {
  return isPlanTier(plan) ? SubscriptionPlans[plan].price : 0;
}

/* ---------------------------------------------------------------------- */
/* Capabilities                                                            */
/* ---------------------------------------------------------------------- */

/** Plans that unlock the multi-site / team workspace (Scale $299 and above). */
export const TEAM_PLANS: PlanTier[] = ["scale", "team", "enterprise"];
/** Plans that unlock paid extras (audit export, widget AI chat, AI auto-fix). */
export const PAID_PLANS: PlanTier[] = ["growth", "scale", "team", "enterprise"];

export function normalizePlan(plan: unknown): PlanTier {
  return isPlanTier(plan) ? plan : "free";
}

export function canUseTeams(plan: unknown): boolean {
  return TEAM_PLANS.includes(normalizePlan(plan));
}

export function canExportAudit(plan: unknown): boolean {
  return PAID_PLANS.includes(normalizePlan(plan));
}

export function canUseWidgetChat(plan: unknown): boolean {
  return PAID_PLANS.includes(normalizePlan(plan));
}

export function planSeats(plan: unknown): number {
  return SubscriptionPlans[normalizePlan(plan)].seats;
}
