import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ExplainSchema = z.object({
  title: z.string().trim().min(1).max(300),
  severity: z.string().trim().max(40).default("medium"),
  category: z.string().trim().max(120).default("General"),
  description: z.string().trim().max(4000).default(""),
  recommendation: z.string().trim().max(4000).default(""),
  domain: z.string().trim().max(255).default(""),
});

/**
 * "Explain this finding" — plain-language explanation of a single audit
 * finding for the store owner. Authenticated only.
 */
export const explainFinding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ExplainSchema.parse(i))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured.");

    const { generateText } = await import("ai");
    const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(apiKey);

    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system:
        "You are a pragmatic EU AI Act compliance engineer talking to a non-lawyer e-commerce owner. " +
        "Answer in at most 160 words, in the same language as the finding. Structure the answer as: " +
        "1) What this means in plain words. 2) Why it matters (cite the article only if it appears in the finding). " +
        "3) Concrete steps to fix it today. " +
        "Never invent facts that are not in the finding. End with: 'AI-assisted explanation. Not legal advice.'",
      prompt:
        `Store domain: ${data.domain || "unknown"}\n` +
        `Severity: ${data.severity}\nCategory: ${data.category}\n` +
        `Title: ${data.title}\nDescription: ${data.description}\n` +
        `Recommendation: ${data.recommendation}`,
    });

    return { explanation: text.trim() };
  });
