import { crawlSite, buildScanPrompt, extractJson, ReportSchema } from "@/lib/scan-engine.server";

const url = "https://www.gymshark.com";
const pages = await crawlSite(url, 5);
console.log("pages crawled:", pages.length);
const prompt = buildScanPrompt({ name: "Gymshark", url, pages, industry: "ecommerce" });

for (let run = 1; run <= 4; run++) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": process.env["LOVABLE_API_KEY"]!,
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    console.log("run", run, "HTTP", res.status, (await res.text()).slice(0, 200));
    continue;
  }
  const json: any = await res.json();
  const report = ReportSchema.parse(extractJson(json.choices[0].message.content));
  const bad: string[] = [];
  for (const f of report.findings) {
    const d = f.description;
    if (!d.startsWith("Confirmed: ") && !d.startsWith("Not confirmed from crawl: "))
      bad.push(`prefix: ${f.title}`);
    if (d.startsWith("Not confirmed from crawl: ") && !d.includes("Confirmation would require"))
      bad.push(`no-confirmation-path: ${f.title}`);
    if (/sector suggests|it is likely that|typically e-commerce/i.test(d))
      bad.push(`vague: ${f.title}`);
    if (!/^Framework: .+ \| Role: (Provider|Deployer) \(.+\)$/.test(f.category))
      bad.push(`category: ${f.category}`);
  }
  console.log(`run ${run}: findings=${report.findings.length} violations=${bad.length}`, bad);
}
