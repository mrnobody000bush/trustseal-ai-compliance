import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { TrustWidgetPreview } from "@/components/trust-widget-preview";

export const Route = createFileRoute("/widget-demo")({
  head: () => ({
    meta: [
      { title: "Live demo — TrustSeal" },
      { name: "description", content: "Interactive preview of the TrustSeal trust widget." },
      { property: "og:title", content: "TrustSeal widget demo" },
      { property: "og:description", content: "See the widget in action." },
    ],
  }),
  component: DemoPage,
});

function DemoPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6 py-20">
        <h1 className="text-4xl font-bold">Live demo</h1>
        <p className="mt-3 text-muted-foreground">
          Automatic EU AI Act compliance and one-click vulnerability fixes.
        </p>
        <div className="mt-12 rounded-3xl border border-border bg-surface p-10">
          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>
                A polished trust badge with verified reviews, transparency labels, and an AI assistant that answers shopper questions in real time.
              </p>
              <p>
                Our AI scans your storefront, finds unlabeled AI content, missing watermarks and opaque pricing algorithms, and delivers an audit-ready report.
              </p>
            </div>
            <TrustWidgetPreview />
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
