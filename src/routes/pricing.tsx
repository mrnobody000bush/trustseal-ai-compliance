import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
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

function PricingPage() {
  const { t } = useTranslation();
  const plans = [
    { key: "starter", price: 29, features: ["sites1", "scansM"], scans: 5 },
    { key: "growth", price: 99, features: ["sites5", "scansM", "widget", "reports"], scans: 50, featured: true },
    { key: "scale", price: 299, features: ["sitesU", "scansM", "widget", "reports", "support"], scans: 500 },
  ] as const;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center">
          <h1 className="text-4xl font-bold">{t("pricing.title")}</h1>
          <p className="mt-3 text-muted-foreground">{t("pricing.subtitle")}</p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.key}
              className={`rounded-2xl border p-6 ${p.featured ? "border-primary bg-primary/5 shadow-lg" : "border-border bg-card"}`}
            >
              <div className="text-sm font-medium text-muted-foreground">{t(`pricing.${p.key}`)}</div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-bold">${p.price}</span>
                <span className="text-muted-foreground">{t("pricing.perMonth")}</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{t(`pricing.${p.key}Desc`)}</p>
              <ul className="mt-6 space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-success" />
                    {f === "scansM" ? `${p.scans} ${t("pricing.features.scansM")}` : t(`pricing.features.${f}`)}
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-6 w-full" variant={p.featured ? "default" : "outline"}>
                <Link to="/auth">{t("pricing.cta")}</Link>
              </Button>
            </div>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
