import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — TrustSeal" },
      { name: "description", content: "Why TrustSeal exists — EU AI Act compliance and buyer trust in one product." },
      { property: "og:title", content: "About TrustSeal" },
      { property: "og:description", content: "Compliance and conversion in one product." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-20">
        <h1 className="text-4xl font-bold">Why TrustSeal</h1>
        <div className="mt-8 space-y-6 text-lg text-muted-foreground leading-relaxed">
          <p>
            In August 2026 the core obligations of the EU AI Act come into force. Any online store that uses AI for price personalization, product image generation, recommender systems or chatbot responses must label those systems, disclose the origin of their training data and maintain risk documentation.
          </p>
          <p>
            At the same time buyers are more skeptical than ever. Reviews are gamed, photos are AI-generated, and stores lose 60–70% of visitors at checkout because trust was never established.
          </p>
          <p>
            TrustSeal solves both problems in one product: an AI compliance scanner for the operator, and a customer-facing trust widget that turns transparency into conversion.
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
