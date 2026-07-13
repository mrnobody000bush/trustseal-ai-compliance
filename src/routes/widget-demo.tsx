import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { TrustWidgetPreview } from "@/components/trust-widget-preview";

export const Route = createFileRoute("/widget-demo")({
  head: () => ({
    meta: [
      { title: "Демо виджета — TrustSeal" },
      { name: "description", content: "Интерактивный предпросмотр трастового виджета TrustSeal." },
      { property: "og:title", content: "Демо виджета TrustSeal" },
      { property: "og:description", content: "Посмотрите виджет в действии." },
    ],
  }),
  component: DemoPage,
});

function DemoPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6 py-20">
        <h1 className="text-4xl font-bold">Демо</h1>
        <p className="mt-3 text-muted-foreground">
          Автоматический комплаенс и устранение уязвимостей EU AI Act в один клик.
        </p>
        <div className="mt-12 rounded-3xl border border-border bg-surface p-10">
          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>
                Стильный трастовый бейдж с проверенными отзывами, метками прозрачности и ИИ-ассистентом, отвечающим покупателям в реальном времени.
              </p>
              <p>
                Наш ИИ сканирует сторфронт, находит немаркированный ИИ-контент, отсутствующие водяные знаки и непрозрачные ценовые алгоритмы, выдавая отчёт, готовый к аудиту.
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
