import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, Sparkles, Zap, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAdminMode, type Plan } from "@/lib/admin-mode";
import { useFreeScanCount } from "@/lib/plan-limits";

export const Route = createFileRoute("/_authenticated/choose-plan")({
  head: () => ({
    meta: [
      { title: "Choose your plan — TrustSeal" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ChoosePlanPage,
});

type PlanOption = {
  key: Plan;
  name: string;
  price: string;
  desc: string;
  features: string[];
  highlight?: boolean;
};

function ChoosePlanPage() {
  const navigate = useNavigate();
  const { setPlan } = useAdminMode(false);
  const { reset } = useFreeScanCount();

  const plans: PlanOption[] = [
    {
      key: "free",
      name: "Free",
      price: "$0",
      desc: "Try TrustSeal on one site.",
      features: ["1 store", "3 compliance scans", "Basic EU AI Act score", "AI auto-fix locked"],
    },
    {
      key: "growth",
      name: "Growth",
      price: "$99",
      desc: "For growing brands ready for EU AI Act 2026.",
      features: [
        "Up to 5 stores",
        "Full EU AI Act reports",
        "Unlimited “Fix with TrustSeal AI”",
        "Email support",
      ],
      highlight: true,
    },
    {
      key: "scale",
      name: "Scale",
      price: "$299",
      desc: "For agencies and multi-brand retailers.",
      features: [
        "Unlimited stores and scans",
        "Branded PDF certificates",
        "Priority support",
        "White-label widget",
      ],
    },
  ];

  const choose = async (plan: PlanOption) => {
    setPlan(plan.key);
    reset();
    if (typeof window !== "undefined") {
      window.localStorage.setItem("ts-plan-chosen", "1");
    }
    try {
      await setMyPlanFn({ data: { plan: plan.key } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save your plan");
      return;
    }
    toast.success(`${plan.name} plan activated`);
    navigate({ to: "/dashboard" });
  };

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          Welcome to TrustSeal
        </div>
        <h1 className="mt-4 text-4xl font-bold">Choose your plan</h1>
        <p className="mt-3 text-muted-foreground">
          Pick a plan to activate scans and the AI auto-fix. You can upgrade at any time.
        </p>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {plans.map((p) => (
          <div
            key={p.key}
            className={`flex flex-col rounded-2xl border p-6 ${p.highlight ? "border-primary bg-primary/5 shadow-lg" : "border-border bg-card"}`}
          >
            <div className="flex items-center gap-2 text-sm font-semibold">
              {p.key === "growth" ? (
                <Zap className="h-4 w-4 text-primary" />
              ) : p.key === "scale" ? (
                <Sparkles className="h-4 w-4 text-primary" />
              ) : (
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              )}
              {p.name}
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-4xl font-bold">{p.price}</span>
              <span className="text-muted-foreground">/mo</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{p.desc}</p>
            <ul className="mt-5 flex-1 space-y-2 text-sm">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-success" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Button
              className="mt-6 w-full"
              variant={p.highlight ? "default" : p.key === "free" ? "outline" : "outline"}
              onClick={() => choose(p)}
            >
              {p.key === "free" ? "Continue with Free" : `Choose ${p.name}`}
            </Button>
          </div>
        ))}
      </div>
    </main>
  );
}
