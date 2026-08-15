import { useState } from "react";
import { FileDown, FileSpreadsheet, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AI_DISCLAIMER, checksLabel, complianceStatusLabel } from "@/lib/compliance-score";

export type AuditFinding = {
  severity?: string;
  category?: string;
  title?: string;
  description?: string;
  recommendation?: string;
};

interface Props {
  siteName: string;
  siteDomain: string;
  scanDate: string;
  score: number | null;
  summary: string | null;
  findings: AuditFinding[];
  unlocked: boolean;
  onLocked?: () => void;
}

function csvCell(v: unknown): string {
  return `"${String(v ?? "").replace(/"/g, '""')}"`;
}

/** PDF + CSV export of the full findings list, for auditors. */
export function AuditExport({
  siteName,
  siteDomain,
  scanDate,
  score,
  summary,
  findings,
  unlocked,
  onLocked,
}: Props) {
  const [busy, setBusy] = useState(false);

  const guard = () => {
    if (unlocked) return true;
    onLocked?.();
    toast.info("Audit export is available on Growth and higher plans.");
    return false;
  };

  const exportCsv = () => {
    if (!guard()) return;
    const rows = [
      ["#", "Severity", "Category", "Finding", "Description", "Recommendation"],
      ...findings.map((f, i) => [
        i + 1,
        f.severity ?? "",
        f.category ?? "",
        f.title ?? "",
        f.description ?? "",
        f.recommendation ?? "",
      ]),
    ];
    const meta = [
      ["TrustSeal AI — Audit findings export"],
      ["Store", siteName],
      ["Domain", siteDomain],
      ["Scan date", new Date(scanDate).toLocaleString()],
      ["Automated checks", checksLabel(score, findings.length)],
      ["Status", complianceStatusLabel(score)],
      ["Disclaimer", AI_DISCLAIMER],
      [],
    ];
    const csv = [...meta, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trustseal-findings-${siteDomain}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV export downloaded");
  };

  const exportPdf = async () => {
    if (!guard()) return;
    setBusy(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 48;
      let y = margin;

      const newPageIfNeeded = (needed: number) => {
        if (y + needed > pageH - margin) {
          doc.addPage();
          y = margin;
        }
      };

      doc.setFillColor(79, 70, 229);
      doc.rect(0, 0, pageW, 88, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(19);
      doc.text("TrustSeal AI · Audit Findings Report", margin, 40);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("EU AI Act (Reg. 2024/1689) as amended by the Digital Omnibus", margin, 60);

      y = 120;
      doc.setTextColor(20, 20, 20);
      doc.setFontSize(11);
      doc.text(`Store: ${siteName}`, margin, y); y += 15;
      doc.text(`Domain: ${siteDomain}`, margin, y); y += 15;
      doc.text(`Scan date: ${new Date(scanDate).toLocaleString()}`, margin, y); y += 15;
      doc.text(`Automated checks: ${checksLabel(score, findings.length)}`, margin, y); y += 15;
      doc.text(`Status: ${complianceStatusLabel(score)}`, margin, y); y += 15;
      doc.text(`Findings: ${findings.length}`, margin, y); y += 22;

      if (summary) {
        doc.setFont("helvetica", "bold");
        doc.text("Summary", margin, y); y += 14;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        const lines = doc.splitTextToSize(summary, pageW - margin * 2);
        newPageIfNeeded(lines.length * 12);
        doc.text(lines, margin, y); y += lines.length * 12 + 14;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      newPageIfNeeded(30);
      doc.text("Findings", margin, y); y += 16;

      findings.forEach((f, idx) => {
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        const head = `${idx + 1}. [${(f.severity ?? "medium").toUpperCase()}] ${f.title ?? "Finding"}`;
        const headLines = doc.splitTextToSize(head, pageW - margin * 2);
        newPageIfNeeded(headLines.length * 12 + 40);
        doc.text(headLines, margin, y); y += headLines.length * 12 + 2;

        doc.setFont("helvetica", "italic");
        doc.setTextColor(110, 110, 110);
        doc.text(`Category: ${f.category ?? "General"}`, margin, y); y += 13;

        doc.setFont("helvetica", "normal");
        doc.setTextColor(20, 20, 20);
        if (f.description) {
          const d = doc.splitTextToSize(f.description, pageW - margin * 2);
          newPageIfNeeded(d.length * 12);
          doc.text(d, margin, y); y += d.length * 12 + 2;
        }
        if (f.recommendation) {
          const r = doc.splitTextToSize(`Fix: ${f.recommendation}`, pageW - margin * 2);
          newPageIfNeeded(r.length * 12);
          doc.text(r, margin, y); y += r.length * 12;
        }
        y += 10;
      });

      newPageIfNeeded(40);
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, pageW - margin, y); y += 16;
      doc.setFontSize(9);
      doc.setTextColor(95, 95, 95);
      doc.text(doc.splitTextToSize(AI_DISCLAIMER, pageW - margin * 2), margin, y);

      doc.save(`trustseal-findings-${siteDomain}.pdf`);
      toast.success("PDF export downloaded");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-6 rounded-2xl border border-border bg-surface/40 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Audit export</div>
          <p className="text-xs text-muted-foreground">
            Full findings list for your auditor — {findings.length} finding(s), including severity,
            article references and recommended fixes.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={findings.length === 0}>
            {unlocked ? <FileSpreadsheet className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />}
            CSV
          </Button>
          <Button size="sm" onClick={exportPdf} disabled={busy || findings.length === 0}>
            {unlocked ? <FileDown className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />}
            {busy ? "Preparing…" : "PDF report"}
          </Button>
        </div>
      </div>
      {!unlocked && (
        <p className="mt-3 text-xs text-warning">
          Available on Growth, Scale, Team and Enterprise plans.
        </p>
      )}
    </div>
  );
}
