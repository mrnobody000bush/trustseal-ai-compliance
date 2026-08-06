/**
 * Server-only compliance scan engine.
 *
 * Shared by the authenticated `processScan` server function and the weekly
 * auto-rescan cron route, so manual and scheduled scans always produce
 * identical reports.
 */
import { generateText } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildIndustryPromptSection,
  isHighRisk,
  type Industry,
} from "@/lib/industry-rules";
import { EU_AI_ACT_KB } from "@/lib/eu-ai-act-kb";


const FindingSchema = z.object({
  severity: z
    .string()
    .transform((s) => s.toLowerCase())
    .pipe(z.enum(["low", "medium", "high", "critical"]).catch("medium")),
  category: z.string().default("General"),
  title: z.string().default("Finding"),
  description: z.string().default(""),
  recommendation: z.string().default(""),
});

export const ReportSchema = z.object({
  score: z.coerce.number().default(0),
  summary: z.string().default(""),
  findings: z.array(FindingSchema).default([]),
});

/** Transparent scoring: start at 100, subtract per severity. */
export const SEVERITY_PENALTY = { critical: 15, high: 8, medium: 4, low: 2 } as const;

export function computeScore(
  findings: Array<{ severity: keyof typeof SEVERITY_PENALTY }>,
): number {
  const total = findings.reduce((sum, f) => sum + (SEVERITY_PENALTY[f.severity] ?? 0), 0);
  return Math.max(0, Math.min(100, 100 - total));
}

export function extractJson(text: string): unknown {
  const cleaned = text
    .replace(/^\s*```(?:json)?/i, "")
    .replace(/```\s*$/, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end <= start) throw new Error("AI returned no JSON object");
    return JSON.parse(cleaned.slice(start, end + 1));
  }
}

/** Turn raw AI Gateway failures into messages a store owner can act on. */
export function friendlyAiError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const match = /\b(429|402|401|403|5\d\d)\b/.exec(msg);
  const status =
    (typeof err === "object" && err !== null && "statusCode" in err
      ? Number((err as { statusCode?: unknown }).statusCode)
      : undefined) ?? (match ? Number(match[1]) : undefined);

  if (status === 429) {
    return "AI service is rate-limited right now (too many scans at once). Please wait a minute and run the scan again.";
  }
  if (status === 402) {
    return "AI credits for this workspace are exhausted. Top up your Lovable AI credits to continue scanning.";
  }
  if (status && status >= 500) {
    return "The AI service is temporarily unavailable. Please retry the scan in a few moments.";
  }
  if (msg.includes("AI returned no JSON object")) {
    return "The AI returned an unreadable report. Please run the scan again.";
  }
  return `Scan failed: ${msg}`;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchHtml(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "TrustSealBot/1.0 (+https://trustseal.ai)" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return "";
    return await res.text();
  } catch {
    return "";
  }
}

/** Pages that carry the compliance signal we audit against. */
const KEY_PAGE_PATTERNS =
  /(privacy|policy|terms|conditions|legal|imprint|impressum|cookie|gdpr|ai[-_/]?(policy|disclosure|notice)|about|contact|returns?|refund|shipping)/i;

/** Homepage + up to 4 key legal/policy pages, stripped to text. */
export async function crawlSite(
  baseUrl: string,
  maxPages = 5,
): Promise<Array<{ url: string; text: string }>> {
  const home = await fetchHtml(baseUrl);
  const pages: Array<{ url: string; text: string }> = [];
  const homeText = stripHtml(home);
  if (homeText) pages.push({ url: baseUrl, text: homeText.slice(0, 6000) });
  if (!home) return pages;

  const origin = new URL(baseUrl).origin;
  const candidates = new Set<string>();
  const hrefRe = /href\s*=\s*["']([^"'#]+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = hrefRe.exec(home)) !== null) {
    const raw = m[1];
    if (!raw || raw.startsWith("mailto:") || raw.startsWith("tel:") || raw.startsWith("javascript:")) continue;
    let abs: URL;
    try {
      abs = new URL(raw, baseUrl);
    } catch {
      continue;
    }
    if (abs.origin !== origin) continue;
    abs.hash = "";
    if (abs.href === baseUrl) continue;
    if (!KEY_PAGE_PATTERNS.test(abs.pathname)) continue;
    candidates.add(abs.href);
    if (candidates.size >= (maxPages - 1) * 2) break;
  }

  const picked = Array.from(candidates).slice(0, maxPages - 1);
  const results = await Promise.all(
    picked.map(async (u) => ({ url: u, text: stripHtml(await fetchHtml(u)).slice(0, 4000) })),
  );
  for (const r of results) if (r.text) pages.push(r);
  return pages;
}

type AnyClient = SupabaseClient<any, any, any>;

export type ExecuteScanResult =
  | { ok: true; scanId: string; score: number; skipped?: boolean }
  | { ok: false; error: string };

/**
 * Runs a `running` scan row to completion: crawl → LLM → persist.
 * `client` may be an RLS-scoped user client or the service-role admin client.
 */
export async function executeScan(client: AnyClient, scanId: string): Promise<ExecuteScanResult> {
  const apiKey = process.env['LOVABLE_API_KEY'];

  const { data: scanRow, error: scanErr } = await client
    .from("compliance_scans")
    .select("id, site_id, status, industry")
    .eq("id", scanId)
    .single();
  if (scanErr || !scanRow) return { ok: false, error: "Scan not found" };
  if (scanRow.status !== "running") return { ok: true, scanId, score: 0, skipped: true };

  const fail = async (message: string): Promise<ExecuteScanResult> => {
    await client
      .from("compliance_scans")
      .update({ status: "failed", error: message })
      .eq("id", scanRow.id);
    return { ok: false, error: message };
  };

  if (!apiKey) return fail("AI is not configured for this project (missing API key).");

  const { data: site } = await client
    .from("sites")
    .select("id, domain, name")
    .eq("id", scanRow.site_id)
    .single();
  if (!site) return fail("Site not found");

  const industry = (scanRow.industry ?? "ecommerce") as Industry;
  const highRisk = isHighRisk(industry);
  const url = site.domain.startsWith("http") ? site.domain : `https://${site.domain}`;
  const pages = await crawlSite(url, 5);
  const pageText = pages.map((p, i) => `--- PAGE ${i + 1}: ${p.url} ---\n${p.text}`).join("\n\n");

  const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
  const gateway = createLovableAiGatewayProvider(apiKey);

  const prompt = `You are an EU AI Act compliance auditor. Today's date is ${new Date().toISOString().slice(0, 10)}. Use ONLY the facts in the knowledge base below — never invent dates, articles or obligations.

${EU_AI_ACT_KB}

Analyze the following website and return a compliance report as JSON.

STORE: ${site.name} (${url})
PAGES CRAWLED: ${pages.length}

${buildIndustryPromptSection(industry)}

PAGE CONTENT (homepage + key legal/policy pages, truncated):
"""
${pageText || "(could not fetch page content; base your report on the domain name and general expectations for an EU-facing website in this sector)"}
"""

SCORING SCALE (use exactly this, start from 100 and subtract per finding):
- critical: -15
- high: -8
- medium: -4
- low: -2
Floor the result at 0.

Return:
- score: integer 0-100 computed with the scoring scale above (technical readiness score, never described as legal compliance)
- summary: one paragraph that (a) names the sector, (b) states the scoring logic in one sentence ("Score starts at 100: critical -15, high -8, medium -4, low -2"), (c) contains verbatim the sentence: "Focus: obligations applicable as of 2 August 2026 (mainly Art. 50 + Art. 5). High-risk Annex III obligations are future (from 2 Dec 2027)." and (d) ends with the exact disclaimer sentence from the knowledge base
- findings: array of objects with severity ("low"|"medium"|"high"|"critical"), category, title, description, recommendation

Rules for every finding:
- category MUST be formatted exactly as "Framework: <X> | Role: <Y> (<Article>)".
  - Framework is one of: "EU AI Act", "GDPR", "DSA", "Overlapping (AI Act / GDPR)", "Overlapping (AI Act / DSA)".
  - Role is "Provider" or "Deployer", always followed by the article in parentheses.
  - Examples: "Framework: EU AI Act | Role: Deployer (Art. 50(1))", "Framework: EU AI Act | Role: Provider (Art. 50(2))", "Framework: Overlapping (AI Act / GDPR) | Role: Deployer (Art. 50(3) / GDPR Art. 13)".
- Never mix two frameworks inside one finding without using an "Overlapping (...)" label.
- Only currently applicable obligations may carry "high"/"critical" severity. Annex III high-risk requirements are NOT yet binding: report them as "low" or "medium" and start the title with "Future obligation (from 2 Dec 2027):".
- Never state or imply full compliance, guaranteed compliance, or absence of fines.

EVIDENCE DISCIPLINE (mandatory template — applies to EVERY finding, no exceptions):
Every description MUST begin with one of exactly two prefixes:
1. "Confirmed: " — only when the fact is directly visible in the crawled page content. Immediately quote the exact evidence found (short verbatim snippet or the exact page URL/section where it appears).
2. "Not confirmed from crawl: " — when the fact is not directly visible. You MUST then state what is missing and add a sentence starting with "Confirmation would require " describing the concrete check needed (e.g. inspecting the live DOM for a chat widget, reviewing the vendor list, asking the operator).
Additional rules:
- Titles for unconfirmed items start with "Possible" or "Potential"; severity is capped at "medium" (use "low" when there is only a sector-typical expectation and zero evidence).
- NEVER write vague justifications such as "the sector suggests", "typically e-commerce sites", "it is likely that" without naming exactly what is absent from the crawled data.
- Missing legal/transparency documents ARE verifiable absences: write "Confirmed: no privacy policy / cookie notice / AI disclosure page was found across the N crawled pages."
- Synthetic media: never assert images are AI-generated. Phrase conditionally ("If any product imagery is AI-generated or manipulated, Art. 50(4) marking applies…") under the "Not confirmed from crawl: " prefix.
- Prefer fewer, well-evidenced findings over many speculative ones. Returning the lower bound of the requested range is acceptable.

FORMAT EXAMPLES (follow these exactly):

GOOD (confirmed finding):
{"severity":"high","category":"Framework: EU AI Act | Role: Deployer (Art. 50(1))","title":"AI chatbot present without AI disclosure","description":"Confirmed: the homepage embeds a chat widget — crawled markup contains \\"Chat with our AI assistant\\" and a script from cdn.tidio.co — but none of the 5 crawled pages state that the user is interacting with an AI system.","recommendation":"Add a visible notice at the start of every chat session stating the user is talking to an AI system, and mirror it in the privacy/AI disclosure page."}

GOOD (unconfirmed finding):
{"severity":"low","category":"Framework: Overlapping (AI Act / DSA) | Role: Deployer (Art. 50(1) / DSA Art. 27)","title":"Potential AI-driven recommendation system without parameter disclosure","description":"Not confirmed from crawl: the crawled pages contain no evidence of a recommendation engine — no \\"recommended for you\\" module, no personalization vendor script, and no mention of recommendations in the terms or privacy policy. Confirmation would require inspecting the rendered product pages for a personalization widget and reviewing the store's third-party script/vendor list.","recommendation":"If personalized recommendations or ranking are used, publish the main parameters influencing them in the terms, as required by DSA Art. 27."}

BAD (never produce this — vague, no prefix, no evidence, no verification path):
{"severity":"medium","category":"EU AI Act","title":"Recommendation disclosure","description":"The sector suggests that the store likely uses AI-driven recommendations, which typically require disclosure.","recommendation":"Consider disclosing recommendations."}
${
    highRisk
      ? "- This sector falls under Annex III: treat high-risk duties as recommended preparation for 2 Dec 2027, while scoring today's binding Art. 50 transparency duties and GDPR safeguards strictly.\n"
      : "- Prioritise Art. 50 transparency for a typical e-commerce store: AI chatbot/assistant disclosure, AI-generated product descriptions and images (machine-readable marking), AI-generated reviews, deepfake/synthetic media disclosure — but only where evidence supports it, otherwise using the \"Not confirmed from crawl: \" template above.\n"
  }



Be specific and actionable. Return ${highRisk ? "6–10" : "4–8"} findings.

Respond with ONLY a raw JSON object matching this shape, no markdown, no commentary:
{"score":0,"summary":"","findings":[{"severity":"low","category":"","title":"","description":"","recommendation":""}]}`;


  let report: z.infer<typeof ReportSchema>;
  try {
    const { text } = await generateText({
      // High-risk sectors (HR, FinTech, health, …) get the stronger reasoning model.
      model: gateway(highRisk ? "openai/gpt-5.6-sol" : "google/gemini-3-flash-preview"),
      prompt,
      ...(highRisk ? { providerOptions: { lovable: { reasoningEffort: "none" } } } : {}),
    });
    report = ReportSchema.parse(extractJson(text));
  } catch (err) {
    return fail(friendlyAiError(err));
  }

  // Deterministic, transparent scoring — the model's own number is only a fallback.
  const score = computeScore(report.findings);
  const { error: upErr } = await client
    .from("compliance_scans")
    .update({
      status: "completed",
      score,
      summary: report.summary,
      industry,
      findings: report.findings,
      raw_report: report,
    })
    .eq("id", scanRow.id);
  if (upErr) return fail(upErr.message);

  return { ok: true, scanId: scanRow.id, score };
}
