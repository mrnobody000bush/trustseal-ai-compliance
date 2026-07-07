import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — TrustSeal" },
      { name: "description", content: "Why TrustSeal exists — EU AI Act compliance meets buyer trust." },
      { property: "og:title", content: "About TrustSeal" },
      { property: "og:description", content: "Compliance + conversion in one product." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-20">
        <h1 className="text-4xl font-bold">{t("about.title")}</h1>
        <div className="mt-8 space-y-6 text-lg text-muted-foreground leading-relaxed">
          <p>{t("about.body1")}</p>
          <p>{t("about.body2")}</p>
          <p>{t("about.body3")}</p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
