import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ShieldCheck, Sparkles, Zap, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { TrustWidgetPreview } from "@/components/trust-widget-preview";

export const Route = createFileRoute("/")({ component: Landing });

function Landing() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-6 pt-20 pb-16">
          <div className="grid gap-12 md:grid-cols-2 md:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                {t("landing.eyebrow")}
              </div>
              <h1 className="mt-6 text-4xl font-bold tracking-tight md:text-5xl">
                {t("landing.title")}
              </h1>
              <p className="mt-5 text-lg text-muted-foreground">{t("landing.subtitle")}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link to="/auth">{t("landing.ctaPrimary")} <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/widget-demo">{t("landing.ctaSecondary")}</Link>
                </Button>
              </div>
              <p className="mt-6 text-xs text-muted-foreground">{t("landing.trustedBy")}</p>
            </div>
            <div className="relative">
              <div className="absolute -inset-8 rounded-3xl bg-gradient-to-br from-primary/20 via-transparent to-transparent blur-3xl" />
              <div className="relative rounded-2xl border border-border bg-surface p-8">
                <div className="mb-4 text-xs uppercase tracking-wide text-muted-foreground">
                  Live preview
                </div>
                <TrustWidgetPreview />
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-y border-border bg-surface/50">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <h2 className="text-center text-3xl font-bold">{t("landing.features.title")}</h2>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              <FeatureCard
                icon={<ShieldCheck className="h-5 w-5" />}
                title={t("landing.features.complianceTitle")}
                body={t("landing.features.complianceBody")}
              />
              <FeatureCard
                icon={<Sparkles className="h-5 w-5" />}
                title={t("landing.features.trustTitle")}
                body={t("landing.features.trustBody")}
              />
              <FeatureCard
                icon={<Zap className="h-5 w-5" />}
                title={t("landing.features.installTitle")}
                body={t("landing.features.installBody")}
              />
            </div>
          </div>
        </section>

        {/* How */}
        <section className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-3xl font-bold">{t("landing.how.title")}</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="rounded-2xl border border-border bg-card p-6">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {n}
                </div>
                <h3 className="mt-4 font-semibold">{t(`landing.how.step${n}Title`)}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t(`landing.how.step${n}Body`)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-surface to-background p-10 text-center">
            <h2 className="text-3xl font-bold">{t("landing.ctaPrimary")}</h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">{t("landing.subtitle")}</p>
            <Button asChild size="lg" className="mt-6">
              <Link to="/auth">{t("landing.ctaPrimary")} <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <p className="mt-4 text-xs text-muted-foreground">{t("landing.footNote")}</p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function FeatureCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
      <div className="mt-4 flex items-center gap-2 text-xs text-success">
        <Check className="h-3.5 w-3.5" /> Included in all plans
      </div>
    </div>
  );
}
