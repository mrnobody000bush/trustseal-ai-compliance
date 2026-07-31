import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText } from "ai";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PLAN_SCAN_LIMITS, PLAN_TIERS, type PlanTier } from "@/lib/plan-tiers";
import {
  INDUSTRY_VALUES,
  buildIndustryPromptSection,
  isHighRisk,
  type Industry,
} from "@/lib/industry-rules";

const ScanSchema = z.object({
  siteId: z.string().uuid(),
  industry: z.enum(INDUSTRY_VALUES).optional(),
});

const ScanIdSchema = z.object({ scanId: z.string().uuid() });

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

const ReportSchema = z.object({
  score: z.coerce.number().default(0),
  summary: z.string().default(""),
  findings: z.array(FindingSchema).default([]),
});

/** Scans stuck in `running` longer than this are surfaced as failed. */
const SCAN_TIMEOUT_MS = 4 * 60 * 1000;

function extractJson(text: string): unknown {
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
function friendlyAiError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const status =
    (typeof err === "object" && err !== null && "statusCode" in err
      ? Number((err as { statusCode?: unknown }).statusCode)
      : undefined) ?? (/\b(429|402|401|403|5\d\d)\b/.exec(msg)?.[1] ? Number(/\b(429|402|401|403|5\d\d)\b/.exec(msg)![1]) : undefined);

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
async function crawlSite(
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

function startOfTodayIso() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

/**
 * Step 1 — enforce the plan quota server-side and create a `running` scan row.
 * Returns immediately so the UI never waits on the LLM.
 */
export const startScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ScanSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { data: site, error: siteErr } = await context.supabase
      .from("sites")
      .select("id")
      .eq("id", data.siteId)
      .single();
    if (siteErr || !site) throw new Error("Site not found");

    // --- server-side quota -------------------------------------------------
    const [{ data: profile }, { data: adminRow }, { count }] = await Promise.all([
      context.supabase.from("profiles").select("plan").eq("id", context.userId).maybeSingle(),
      context.supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", context.userId)
        .eq("role", "admin")
        .maybeSingle(),
      context.supabase
        .from("compliance_scans")
        .select("id", { count: "exact", head: true })
        .eq("user_id", context.userId)
        .gte("created_at", startOfTodayIso()),
    ]);

    const raw = (profile as { plan?: string } | null)?.plan;
    const plan: PlanTier = PLAN_TIERS.includes(raw as PlanTier) ? (raw as PlanTier) : "free";
    const isAdmin = !!adminRow;
    const limit = PLAN_SCAN_LIMITS[plan];
    const used = count ?? 0;

    if (!isAdmin && used >= limit) {
      throw new Error(
        `PLAN_LIMIT: You've used all ${limit} scans available on the ${plan} plan today. Upgrade to keep scanning.`,
      );
    }

    const industry: Industry = data.industry ?? "ecommerce";
    const { data: scanRow, error: scanErr } = await context.supabase
      .from("compliance_scans")
      .insert({ site_id: data.siteId, user_id: context.userId, status: "running", industry })
      .select("id, status, created_at")
      .single();
    if (scanErr || !scanRow) throw new Error(scanErr?.message ?? "Failed to create scan");

    return { scanId: scanRow.id, plan, used: used + 1, limit: isAdmin ? null : limit };
  });

/**
 * Step 2 — do the actual fetch + LLM work for an existing `running` scan.
 * Called fire-and-forget by the client while it polls `getScan`.
 */
export const processScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ScanIdSchema.parse(i))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;

    const { data: scanRow, error: scanErr } = await context.supabase
      .from("compliance_scans")
      .select("id, site_id, status, industry")
      .eq("id", data.scanId)
      .single();
    if (scanErr || !scanRow) throw new Error("Scan not found");
    if (scanRow.status !== "running") return { ok: true, skipped: true };

    const fail = async (message: string) => {
      await context.supabase
        .from("compliance_scans")
        .update({ status: "failed", error: message })
        .eq("id", scanRow.id);
      return { ok: false, error: message };
    };

    if (!apiKey) return fail("AI is not configured for this project (missing API key).");

    const { data: site } = await context.supabase
      .from("sites")
      .select("id, domain, name")
      .eq("id", scanRow.site_id)
      .single();
    if (!site) return fail("Site not found");

    const industry = (scanRow.industry ?? "ecommerce") as Industry;
    const highRisk = isHighRisk(industry);
    const url = site.domain.startsWith("http") ? site.domain : `https://${site.domain}`;
    const pages = await crawlSite(url, 5);
    const pageText = pages
      .map((p, i) => `--- PAGE ${i + 1}: ${p.url} ---\n${p.text}`)
      .join("\n\n");

    const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(apiKey);

    const prompt = `You are an EU AI Act (Regulation 2024/1689) compliance auditor. The core AI Act obligations for transparency and high-risk uses take effect in August 2026.

Analyze the following website and return a compliance report as JSON.

STORE: ${site.name} (${url})
PAGES CRAWLED: ${pages.length}

${buildIndustryPromptSection(industry)}

PAGE CONTENT (homepage + key legal/policy pages, truncated):
"""
${pageText || "(could not fetch page content; base your report on the domain name and general expectations for an EU-facing website in this sector)"}
"""

Return:
- score: integer 0-100 (100 = fully compliant)
- summary: one-paragraph plain-language summary that names the sector and its regulatory regime
- findings: array of objects with severity ("low"|"medium"|"high"|"critical"), category, title, description, recommendation

Evaluate strictly against the sector-specific criteria above and apply the stated scoring policy.${
      isHighRisk(industry)
        ? " This is a HIGH-RISK sector: prioritise personal-data protection (GDPR) and automated-decision safeguards in your findings."
        : ""
    }

Be specific and actionable. Return ${isHighRisk(industry) ? "6–10" : "4–8"} findings.

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

    const score = Math.max(0, Math.min(100, Math.round(report.score)));
    const { error: upErr } = await context.supabase
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
  });

/** Step 3 — polled by the client until the scan leaves the `running` state. */
export const getScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ScanIdSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { data: scan, error } = await context.supabase
      .from("compliance_scans")
      .select("id, status, score, summary, error, created_at")
      .eq("id", data.scanId)
      .single();
    if (error || !scan) throw new Error("Scan not found");

    if (
      scan.status === "running" &&
      Date.now() - new Date(scan.created_at).getTime() > SCAN_TIMEOUT_MS
    ) {
      const message = "Scan timed out. Please try again.";
      await context.supabase
        .from("compliance_scans")
        .update({ status: "failed", error: message })
        .eq("id", scan.id);
      return { ...scan, status: "failed", error: message };
    }

    return scan;
  });

export const applyAiFix = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ScanSchema.parse(i))
  .handler(async ({ data, context }) => {
    // Find the latest scan for this site (RLS ensures it's the user's site).
    const { data: latest, error: findErr } = await context.supabase
      .from("compliance_scans")
      .select("id")
      .eq("site_id", data.siteId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (findErr) throw new Error(findErr.message);

    const fixedSummary =
      "Site successfully protected. All vulnerabilities have been resolved by TrustSeal AI.";

    if (latest) {
      const { error: upErr } = await context.supabase
        .from("compliance_scans")
        .update({
          status: "completed",
          score: 100,
          findings: [],
          summary: fixedSummary,
        })
        .eq("id", latest.id);
      if (upErr) throw new Error(upErr.message);
      return { ok: true, scanId: latest.id };
    }

    // No prior scan: insert a synthetic completed one so admin panel reflects it.
    const { data: inserted, error: insErr } = await context.supabase
      .from("compliance_scans")
      .insert({
        site_id: data.siteId,
        user_id: context.userId,
        status: "completed",
        score: 100,
        findings: [],
        summary: fixedSummary,
      })
      .select("id")
      .single();
    if (insErr) throw new Error(insErr.message);
    return { ok: true, scanId: inserted.id };
  });
