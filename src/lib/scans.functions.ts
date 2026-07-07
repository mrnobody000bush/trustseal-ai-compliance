import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateObject, NoObjectGeneratedError } from "ai";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ScanSchema = z.object({ siteId: z.string().uuid() });

const FindingSchema = z.object({
  severity: z.enum(["low", "medium", "high", "critical"]),
  category: z.string(),
  title: z.string(),
  description: z.string(),
  recommendation: z.string(),
});

const ReportSchema = z.object({
  score: z.number(),
  summary: z.string(),
  findings: z.array(FindingSchema),
});

async function fetchSiteText(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "TrustSealBot/1.0 (+https://trustseal.ai)" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return "";
    const html = await res.text();
    // Strip tags for the LLM (keep it small)
    const stripped = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return stripped.slice(0, 12000);
  } catch {
    return "";
  }
}

export const runScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ScanSchema.parse(i))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    const { data: site, error: siteErr } = await context.supabase
      .from("sites")
      .select("id, domain, name")
      .eq("id", data.siteId)
      .single();
    if (siteErr || !site) throw new Error("Site not found");

    // create pending scan
    const { data: scanRow, error: scanErr } = await context.supabase
      .from("compliance_scans")
      .insert({ site_id: site.id, user_id: context.userId, status: "running" })
      .select("*")
      .single();
    if (scanErr || !scanRow) throw new Error(scanErr?.message ?? "Failed to create scan");

    const url = site.domain.startsWith("http") ? site.domain : `https://${site.domain}`;
    const pageText = await fetchSiteText(url);

    const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(apiKey);

    const prompt = `You are an EU AI Act (Regulation 2024/1689) compliance auditor for e-commerce websites. The core AI Act obligations for general-purpose AI systems, transparency, and high-risk uses take effect in August 2026.

Analyze the following storefront and return a compliance report as JSON.

STORE: ${site.name} (${url})

PAGE CONTENT (truncated):
"""
${pageText || "(could not fetch page content; base your report on the domain name and general expectations for an EU-facing e-commerce site)"}
"""

Return:
- score: integer 0-100 (100 = fully compliant)
- summary: one-paragraph plain-language summary
- findings: array of objects with severity ("low"|"medium"|"high"|"critical"), category (e.g. "AI Transparency", "Reviews", "Privacy", "Pricing algorithms", "Chatbot disclosure"), title, description, recommendation

Check for:
1. Disclosure of AI-generated product images/descriptions
2. Chatbot / AI assistant disclosure to users
3. Personalized pricing transparency
4. Recommendation system opacity
5. Review authenticity signals
6. Cookie & data-processing disclosures
7. Deepfake / synthetic media labels
8. Age verification for restricted goods

Be specific and actionable. Return 4–8 findings.`;

    let report: z.infer<typeof ReportSchema>;
    try {
      const { object } = await generateObject({
        model: gateway("google/gemini-3-flash-preview"),
        schema: ReportSchema,
        prompt,
      });
      report = object;
    } catch (err) {
      if (NoObjectGeneratedError.isInstance(err)) {
        try {
          report = ReportSchema.parse(JSON.parse(err.text ?? "{}"));
        } catch {
          await context.supabase.from("compliance_scans").update({
            status: "failed",
            error: "AI returned invalid report format",
          }).eq("id", scanRow.id);
          throw new Error("AI returned invalid report format");
        }
      } else {
        const msg = err instanceof Error ? err.message : String(err);
        await context.supabase.from("compliance_scans").update({ status: "failed", error: msg }).eq("id", scanRow.id);
        throw err;
      }
    }

    const score = Math.max(0, Math.min(100, Math.round(report.score)));
    const { data: updated, error: upErr } = await context.supabase
      .from("compliance_scans")
      .update({
        status: "completed",
        score,
        summary: report.summary,
        findings: report.findings,
        raw_report: report,
      })
      .eq("id", scanRow.id)
      .select("*")
      .single();
    if (upErr) throw new Error(upErr.message);
    return updated;
  });
