import { useState } from "react";
import { ShieldCheck, Star, CheckCircle2, Lock, X, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AI_DISCLAIMER,
  COMPLIANCE_TOTAL_CHECKS,
  checksLabel,
  complianceStatusLabel,
  passedChecks,
} from "@/lib/compliance-score";

type Props = { score?: number; storeName?: string; accent?: string };

export function TrustWidgetPreview({ score = 94, storeName = "Acme Store", accent = "#4F46E5" }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative w-full">
      <div className="mx-auto max-w-sm rounded-2xl border border-border bg-card p-4 shadow-lg">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface p-3 text-left transition hover:border-primary/40"
          style={{ ["--tw-ring-color" as string]: accent }}
        >
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{ background: accent }}
          >
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="text-xs text-muted-foreground">Verified by TrustSeal</div>
            <div className="text-sm font-semibold">
              {storeName} · {checksLabel(score)}
            </div>
          </div>
        </button>

        {open && (
          <div className="mt-3 space-y-3 rounded-xl border border-border bg-background p-4 text-sm">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Compliance checks</div>
              <button onClick={() => setOpen(false)} aria-label="Close">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold" style={{ color: accent }}>{passedChecks(score)}</div>
              <div className="text-xs text-muted-foreground">/ {COMPLIANCE_TOTAL_CHECKS} checks passed</div>
            </div>
            <div className="text-xs font-medium" style={{ color: accent }}>
              {complianceStatusLabel(score)}
            </div>
            <ul className="space-y-2">
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> AI transparency checks passed</li>
              <li className="flex items-center gap-2"><Star className="h-4 w-4 text-warning" /> Reviews verified</li>
              <li className="flex items-center gap-2"><Lock className="h-4 w-4 text-success" /> Privacy respected</li>
            </ul>
            <Button variant="outline" size="sm" className="w-full">
              <MessageSquare className="mr-2 h-4 w-4" /> Ask about this store
            </Button>
            <p className="text-[10px] text-muted-foreground">{AI_DISCLAIMER}</p>
          </div>
        )}
      </div>
    </div>
  );
}
