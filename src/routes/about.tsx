import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "О нас — TrustSeal" },
      { name: "description", content: "Почему существует TrustSeal — комплаенс EU AI Act и доверие покупателей в одном продукте." },
      { property: "og:title", content: "О TrustSeal" },
      { property: "og:description", content: "Комплаенс и конверсия в одном продукте." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-20">
        <h1 className="text-4xl font-bold">Почему TrustSeal</h1>
        <div className="mt-8 space-y-6 text-lg text-muted-foreground leading-relaxed">
          <p>
            В августе 2026 года вступают в силу ключевые обязательства EU AI Act. Любой онлайн-магазин, использующий ИИ для персонализации цен, генерации изображений товаров, работы рекомендательных систем или ответов чат-бота, обязан маркировать эти системы, раскрывать происхождение обучающих данных и вести документацию по рискам.
          </p>
          <p>
            Одновременно покупатели скептичнее, чем когда-либо. Отзывы накручиваются, фотографии генерируются ИИ, магазины теряют 60–70% посетителей на чекауте, потому что доверие так и не сформировалось.
          </p>
          <p>
            TrustSeal решает обе задачи одним продуктом: ИИ-сканер комплаенса для оператора и клиентский трастовый виджет, который превращает прозрачность в конверсию.
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
