import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, Sparkles, Zap, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { TrustWidgetPreview } from "@/components/trust-widget-preview";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TrustSeal — EU AI Act compliance & buyer trust" },
      { name: "description", content: "Automatic EU AI Act compliance and one-click vulnerability fixes for e-commerce." },
      { property: "og:title", content: "TrustSeal — EU AI Act compliance" },
      { property: "og:description", content: "Automatic EU AI Act compliance and one-click vulnerability fixes." },
    ],
  }),
  component: Landing,
});

function Landing() {
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
                EU AI Act ready · August 2026
              </div>
              <h1 className="mt-6 text-4xl font-bold tracking-tight md:text-5xl">
                Compliance and trust in one line of code
              </h1>
              <p className="mt-5 text-lg text-muted-foreground">
                Automatic EU AI Act compliance and one-click vulnerability fixes.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link to="/auth">Protect my site with TrustSeal AI <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/widget-demo">See the widget demo</Link>
                </Button>
              </div>
              <p className="mt-6 text-xs text-muted-foreground">Built for modern e-commerce teams</p>
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
            <h2 className="text-center text-3xl font-bold">Two jobs. One widget.</h2>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              <FeatureCard
                icon={<ShieldCheck className="h-5 w-5" />}
                title="AI Act compliance"
                body="Our AI scans your storefront, finds unlabeled AI content, missing watermarks and opaque pricing algorithms, and delivers an audit-ready report."
              />
              <FeatureCard
                icon={<Sparkles className="h-5 w-5" />}
                title="Buyer trust"
                body="A polished trust badge with verified reviews, transparency labels and an AI assistant that answers shopper questions in real time."
              />
              <FeatureCard
                icon={<Zap className="h-5 w-5" />}
                title="60-second install"
                body="One line of JavaScript. No SDK, no plugin, no engineering meeting. Works on Shopify, WooCommerce and custom stacks."
              />
            </div>
          </div>
        </section>

        {/* How */}
        <section className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-3xl font-bold">How it works</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              { n: 1, t: "Add your store", b: "Paste your storefront URL. We'll verify the domain." },
              { n: 2, t: "AI scans your site", b: "Gemini reviews your pages against the EU AI Act checklist and returns a compliance score with findings." },
              { n: 3, t: "Embed the widget", b: "Copy one line of code. Configure colors and position from your dashboard." },
            ].map(({ n, t, b }) => (
              <div key={n} className="rounded-2xl border border-border bg-card p-6">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {n}
                </div>
                <h3 className="mt-4 font-semibold">{t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{b}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-surface to-background p-10 text-center">
            <h2 className="text-3xl font-bold">Protect your site with TrustSeal AI</h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              Automatic EU AI Act compliance and one-click vulnerability fixes.
            </p>
            <Button asChild size="lg" className="mt-6">
              <Link to="/auth">Start free <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <p className="mt-4 text-xs text-muted-foreground">
              Not legal advice. TrustSeal helps you prepare for compliance reviews; final decisions rest with you and your counsel.
            </p>
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
        <Check className="h-3.5 w-3.5" /> Included on every plan
      </div>
    </div>
  );
}
