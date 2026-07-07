import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { TrustWidgetPreview } from "@/components/trust-widget-preview";

export const Route = createFileRoute("/widget-demo")({
  head: () => ({
    meta: [
      { title: "Widget demo — TrustSeal" },
      { name: "description", content: "Interactive preview of the TrustSeal trust widget." },
      { property: "og:title", content: "TrustSeal Widget Demo" },
      { property: "og:description", content: "See the trust widget in action." },
    ],
  }),
  component: DemoPage,
});

function DemoPage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6 py-20">
        <h1 className="text-4xl font-bold">{t("nav.demo")}</h1>
        <p className="mt-3 text-muted-foreground">{t("landing.subtitle")}</p>
        <div className="mt-12 rounded-3xl border border-border bg-surface p-10">
          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>{t("landing.features.trustBody")}</p>
              <p>{t("landing.features.complianceBody")}</p>
            </div>
            <TrustWidgetPreview />
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
