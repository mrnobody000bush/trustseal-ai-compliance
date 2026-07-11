import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Play, Trash2, Copy, Check, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { getSite, updateWidgetConfig, deleteSite } from "@/lib/sites.functions";
import { runScan } from "@/lib/scans.functions";
import { FixWithAIButton } from "@/components/fix-with-ai-button";

export const Route = createFileRoute("/_authenticated/sites/$siteId")({
  component: SitePage,
});

const SEVERITY_COLOR: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-warning/20 text-warning-foreground",
  high: "bg-destructive/15 text-destructive",
  critical: "bg-destructive text-destructive-foreground",
};

function SitePage() {
  const { t } = useTranslation();
  const { siteId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const getSiteFn = useServerFn(getSite);
  const runScanFn = useServerFn(runScan);
  const updateFn = useServerFn(updateWidgetConfig);
  const deleteFn = useServerFn(deleteSite);

  const { data, isLoading } = useQuery({
    queryKey: ["site", siteId],
    queryFn: () => getSiteFn({ data: { siteId } }),
  });

  const scan = useMutation({
    mutationFn: () => runScanFn({ data: { siteId } }),
    onSuccess: () => {
      toast.success("Scan complete");
      qc.invalidateQueries({ queryKey: ["site", siteId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: () => deleteFn({ data: { siteId } }),
    onSuccess: () => { toast.success("Deleted"); navigate({ to: "/dashboard" }); },
  });

  const [copied, setCopied] = useState(false);
  if (isLoading || !data) return <main className="mx-auto max-w-5xl px-6 py-10 text-muted-foreground">Loading…</main>;

  const site = data.site;
  const scans = data.scans;
  const latest = scans[0];
  const config = (site.widget_config as Record<string, unknown>) ?? {};
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const embedCode = `<script async src="${origin}/embed.js" data-trustseal="${site.id}"></script>`;

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {t("site.back")}
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{site.name}</h1>
          <div className="text-sm text-muted-foreground">{site.domain}</div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => scan.mutate()} disabled={scan.isPending}>
            <Play className="mr-2 h-4 w-4" />
            {scan.isPending ? t("site.scanning") : t("site.scan")}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => { if (confirm(t("site.confirmDelete"))) del.mutate(); }}
            aria-label={t("site.delete")}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {latest && (
        <div className="mt-6 rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase text-muted-foreground">{t("dashboard.score")}</div>
              <div className="text-4xl font-bold text-primary transition-all">{latest.score ?? "—"}</div>
            </div>
            <Badge variant={latest.score === 100 ? "default" : latest.status === "completed" ? "default" : "secondary"}>
              {latest.score === 100 ? "Fully Compliant" : latest.status}
            </Badge>
          </div>
          {latest.summary && <p className="mt-4 text-sm text-muted-foreground">{latest.summary}</p>}
          {latest.score === 100 && (
            <div className="mt-6 rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 to-purple-500/10 p-5">
              <div className="flex items-start gap-3">
                <ShieldCheck className="h-6 w-6 shrink-0 text-primary" />
                <div>
                  <div className="font-semibold text-primary">Site successfully protected</div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    All vulnerabilities have been resolved by TrustSeal AI algorithms. Your storefront is now fully compliant.
                  </p>
                </div>
              </div>
            </div>
          )}
          <div className="mt-6 border-t border-border pt-6">
            <FixWithAIButton siteId={site.id} currentScore={latest.score ?? null} />
          </div>
        </div>
      )}

      {/* Embed & config */}
      <section className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-semibold">{t("site.embed")}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{t("site.embedHelp")}</p>
          <div className="mt-4 rounded-lg border border-border bg-surface p-3 font-mono text-xs break-all">
            {embedCode}
          </div>
          <Button
            variant="outline" size="sm" className="mt-3"
            onClick={() => { navigator.clipboard.writeText(embedCode); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
          >
            {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>

        <WidgetForm
          initial={config}
          onSave={async (cfg) => {
            await updateFn({ data: { siteId, widget_config: cfg } });
            toast.success("Saved");
            qc.invalidateQueries({ queryKey: ["site", siteId] });
          }}
        />
      </section>

      {/* Reports */}
      <section className="mt-8">
        <h2 className="font-semibold">{t("site.reports")}</h2>
        {scans.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{t("site.noReports")}</p>
        ) : (
          <div className="mt-4 space-y-3">
            {scans.map((s) => {
              const findings = Array.isArray(s.findings) ? (s.findings as Array<Record<string, string>>) : [];
              return (
                <details key={s.id} className="rounded-2xl border border-border bg-card p-5">
                  <summary className="flex cursor-pointer items-center justify-between">
                    <div>
                      <div className="font-medium">{new Date(s.created_at).toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">{s.status}</div>
                    </div>
                    <div className="text-2xl font-bold text-primary">{s.score ?? "—"}</div>
                  </summary>
                  {s.summary && <p className="mt-4 text-sm text-muted-foreground">{s.summary}</p>}
                  {findings.length > 0 && (
                    <div className="mt-4 space-y-3">
                      {findings.map((f, i) => (
                        <div key={i} className="rounded-lg border border-border p-3">
                          <div className="flex items-center gap-2">
                            <Badge className={SEVERITY_COLOR[f.severity] ?? ""}>{f.severity}</Badge>
                            <span className="text-xs text-muted-foreground">{f.category}</span>
                          </div>
                          <div className="mt-2 font-medium">{f.title}</div>
                          <p className="mt-1 text-sm text-muted-foreground">{f.description}</p>
                          <p className="mt-2 text-sm"><span className="font-semibold">→ </span>{f.recommendation}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </details>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

function WidgetForm({ initial, onSave }: { initial: Record<string, unknown>; onSave: (c: Record<string, unknown>) => void }) {
  const { t } = useTranslation();
  const [theme, setTheme] = useState((initial.theme as string) ?? "light");
  const [accent, setAccent] = useState((initial.accent as string) ?? "#4F46E5");
  const [position, setPosition] = useState((initial.position as string) ?? "bottom-right");

  return (
    <form
      className="rounded-2xl border border-border bg-card p-6 space-y-4"
      onSubmit={(e) => { e.preventDefault(); onSave({ theme, accent, position, showBadge: true }); }}
    >
      <h2 className="font-semibold">{t("site.widget")}</h2>
      <div className="space-y-1.5">
        <Label>{t("site.theme")}</Label>
        <Select value={theme} onValueChange={setTheme}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="light">Light</SelectItem>
            <SelectItem value="dark">Dark</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>{t("site.accent")}</Label>
        <Input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="h-10 w-24 p-1" />
      </div>
      <div className="space-y-1.5">
        <Label>{t("site.position")}</Label>
        <Select value={position} onValueChange={setPosition}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="bottom-right">Bottom right</SelectItem>
            <SelectItem value="bottom-left">Bottom left</SelectItem>
            <SelectItem value="top-right">Top right</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="w-full">{t("site.save")}</Button>
    </form>
  );
}
