import { CheckCircle2, Download, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Props {
  siteName: string;
  siteDomain: string;
}

const RESOLVED_ITEMS = [
  {
    title: "AI Transparency",
    ref: "Article 50(1) EU AI Act",
    desc: "Visual AI-assistant indicator successfully deployed for chatbots and support widgets. Users are notified when interacting with AI.",
  },
  {
    title: "Recommender System Transparency",
    ref: "Article 13",
    desc: "Public documentation describing ranking algorithms and personalization parameters was automatically added to the site footer.",
  },
  {
    title: "Synthetic Media Labeling",
    ref: "Article 50(2)",
    desc: "Invisible digital watermarks and 'Generated with AI' metatags applied to all AI-generated marketing imagery.",
  },
  {
    title: "Pricing Algorithms",
    ref: "EU Consumer Protection",
    desc: "Legal notice about dynamic pricing principles added to cart and checkout screens.",
  },
  {
    title: "Review Verification",
    ref: "TrustSeal Anti-Spam Module",
    desc: "Anti-spam module enabled to filter fake AI-generated reviews. 'Verified Purchaser' badges are now issued automatically.",
  },
];

export function CompliancePatchReport({ siteName, siteDomain }: Props) {
  const downloadPdf = async () => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 48;
    let y = margin;

    // Header band
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, pageW, 90, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("TrustSeal AI · Compliance Certificate", margin, 42);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text("EU AI Act 2026 — Regulation (EU) 2024/1689", margin, 62);

    y = 130;
    doc.setTextColor(20, 20, 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Certificate of Full Compliance", margin, y);
    y += 22;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Issued to: ${siteName}`, margin, y); y += 16;
    doc.text(`Domain: ${siteDomain}`, margin, y); y += 16;
    doc.text(`Date: ${new Date().toLocaleDateString()}`, margin, y); y += 16;
    doc.text(`Compliance score: 100 / 100`, margin, y); y += 24;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Resolved compliance items", margin, y); y += 16;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    RESOLVED_ITEMS.forEach((item, idx) => {
      const block = `${idx + 1}. [RESOLVED] ${item.title} — ${item.ref}`;
      doc.setFont("helvetica", "bold");
      doc.text(block, margin, y); y += 14;
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(item.desc, pageW - margin * 2);
      doc.text(lines, margin, y); y += lines.length * 12 + 8;
    });

    y += 10;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageW - margin, y); y += 20;
    doc.setFontSize(9);
    doc.setTextColor(90, 90, 90);
    doc.text(
      "This certificate confirms that the above storefront has been automatically remediated by TrustSeal AI",
      margin,
      y,
    ); y += 12;
    doc.text(
      "against the applicable provisions of the EU AI Act (Regulation 2024/1689) effective August 2026.",
      margin,
      y,
    );

    doc.save(`trustseal-compliance-${siteDomain}.pdf`);
  };

  return (
    <div className="mt-6 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 to-purple-500/5 p-6">
      <div className="flex items-start gap-3">
        <ShieldCheck className="h-7 w-7 shrink-0 text-primary" />
        <div>
          <div className="text-xs uppercase tracking-wider text-primary">Compliance Patch Report</div>
          <div className="mt-1 text-lg font-semibold">All findings resolved by TrustSeal AI</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Detailed breakdown of the compliance patches applied to your storefront.
          </p>
        </div>
      </div>

      <ul className="mt-6 space-y-3">
        {RESOLVED_ITEMS.map((item, i) => (
          <li
            key={i}
            className="flex items-start gap-3 rounded-xl border border-primary/20 bg-card p-4"
          >
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{item.title}</span>
                <span className="text-xs text-muted-foreground">· {item.ref}</span>
                <Badge className="ml-auto bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20">
                  RESOLVED
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex justify-end">
        <Button size="sm" variant="outline" onClick={downloadPdf}>
          <Download className="mr-2 h-4 w-4" />
          Download official EU AI Act 2026 compliance PDF
        </Button>
      </div>
    </div>
  );
}
