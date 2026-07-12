import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — TrustSeal" },
      { name: "description", content: "TrustSeal pricing plans for EU AI Act compliance and trust widgets." },
      { property: "og:title", content: "TrustSeal Pricing" },
      { property: "og:description", content: "Simple pricing. Cancel anytime." },
    ],
  }),
  component: PricingPage,
});

type Plan = {
  key: string;
  name: string;
  price: number;
  desc: string;
  features: string[];
  cta: string;
  featured?: boolean;
};

function PricingPage() {
  const plans: Plan[] = [
    {
      key: "free",
      name: "Free",
      price: 0,
      desc: "Try TrustSeal on one site — no card required.",
      features: [
        "1 store",
        "3 compliance scans",
        "Basic EU AI Act score",
        "AI auto-fix locked",
      ],
      cta: "Start free",
    },
    {
      key: "growth",
      name: "Growth",
      price: 99,
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
    {
      key: "scale",
      name: "Scale",
      price: 299,
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
  ];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center">
          <h1 className="text-4xl font-bold">Simple pricing</h1>
          <p className="mt-3 text-muted-foreground">Cancel anytime. All plans include unlimited widget impressions.</p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.key}
              className={`rounded-2xl border p-6 ${p.featured ? "border-primary bg-primary/5 shadow-lg" : "border-border bg-card"}`}
            >
              <div className="text-sm font-medium text-muted-foreground">{p.name}</div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-bold">${p.price}</span>
                <span className="text-muted-foreground">/mo</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{p.desc}</p>
              <ul className="mt-6 space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-success" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-6 w-full" variant={p.featured ? "default" : "outline"}>
                <Link to="/auth">{p.cta}</Link>
              </Button>
            </div>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
