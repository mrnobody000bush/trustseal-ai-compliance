import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Play, Trash2, Copy, Check, Lock, ChevronDown } from "lucide-react";
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
import { CompliancePatchReport } from "@/components/compliance-patch-report";
import { UpgradeModal } from "@/components/upgrade-modal";
import { useAdminMode } from "@/lib/admin-mode";
import { useFreeScanCount } from "@/lib/plan-limits";
import { checkIsAdmin } from "@/lib/admin.functions";
import { useAuth } from "@/components/auth-provider";
import { DomainVerificationCard } from "@/components/domain-verification-card";
import { ConnectorsPanel } from "@/components/connectors-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QueryErrorState } from "@/components/query-error-state";
import { buildWidgetSnippet } from "@/components/widget-snippet";


import { INDUSTRIES, isHighRisk, type Industry } from "@/lib/industry-rules";

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
  const { siteId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const getSiteFn = useServerFn(getSite);
  const runScanFn = useServerFn(runScan);
  const updateFn = useServerFn(updateWidgetConfig);
  const deleteFn = useServerFn(deleteSite);

  const { user } = useAuth();
  const checkFn = useServerFn(checkIsAdmin);
  const { data: adminData } = useQuery({
    queryKey: ["is-admin", user?.id],
    queryFn: () => checkFn(),
    enabled: !!user,
    staleTime: 60_000,
  });
  const { effectiveAdminMode, plan } = useAdminMode(!!adminData?.isAdmin);
  const { count, limit, increment, reached } = useFreeScanCount();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["site", siteId],
    queryFn: () => getSiteFn({ data: { siteId } }),
    retry: 1,
  });


  const [industry, setIndustry] = useState<Industry>("ecommerce");

  const scan = useMutation({
    mutationFn: () => runScanFn({ data: { siteId, industry } }),
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

  const isFreePlan = !effectiveAdminMode && plan === "free";

  const handleScan = () => {
    if (isFreePlan && reached) {
      setUpgradeOpen(true);
      return;
    }
    if (isFreePlan) increment();
    scan.mutate();
  };

  const [copied, setCopied] = useState(false);
  if (isLoading) return <main className="mx-auto max-w-5xl px-6 py-10 text-muted-foreground">Loading…</main>;
  if (isError || !data)
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <QueryErrorState
          title="Не удалось загрузить данные сайта"
          error={isError ? error : undefined}
          description={!isError && !data ? "Магазин не найден или был удалён." : undefined}
          onRetry={() => refetch()}
        />
      </main>
    );


  const site = data.site;
  const scans = data.scans;
  const latest = scans[0];
  const isVerified = site.verification_status === "verified";
  const config = (site.widget_config as Record<string, unknown>) ?? {};
  const embedCode = buildWidgetSnippet(site.verification_token);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{site.name}</h1>
          <div className="text-sm text-muted-foreground">{site.domain}</div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="w-[260px] space-y-1.5 text-left">
            <Label htmlFor="industry-select">Industry / Sector</Label>
            <Select value={industry} onValueChange={(v) => setIndustry(v as typeof industry)}>
              <SelectTrigger id="industry-select"><SelectValue /></SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map((i) => (
                  <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {isHighRisk(industry)
                ? "Stricter audit: EU AI Act Annex III high-risk + GDPR personal-data rules."
                : industry === "fintech"
                  ? "Audit includes financial standards (PSD2, DORA, credit-scoring transparency)."
                  : "Standard consumer-protection and AI transparency audit."}
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleScan} disabled={scan.isPending}>
              <Play className="mr-2 h-4 w-4" />
              {scan.isPending ? "Scanning…" : "Run new scan"}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => { if (confirm("Delete this store and all its scans?")) del.mutate(); }}
              aria-label="Delete store"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          {isFreePlan && (
            <span className="text-[11px] text-muted-foreground">
              Free plan · {Math.min(count, limit)}/{limit} scans used
            </span>
          )}
        </div>
      </div>

      <Tabs defaultValue="verification" className="mt-6">
        <TabsList>
          <TabsTrigger value="verification">Domain ownership</TabsTrigger>
          <TabsTrigger value="connectors">Connectors &amp; MCP</TabsTrigger>
        </TabsList>
        <TabsContent value="verification">
          <DomainVerificationCard
            siteId={site.id}
            domain={site.domain}
            token={site.verification_token}
            status={site.verification_status}
            method={site.verification_method}
            verifiedAt={site.verified_at}
            lastSeenAt={site.plugin_last_seen_at}
            onRefresh={() => { refetch(); }}
          />
        </TabsContent>
        <TabsContent value="connectors" className="mt-4">
          <ConnectorsPanel siteId={site.id} onRefresh={() => { refetch(); }} />
        </TabsContent>
      </Tabs>


      {latest && (
        <div className="mt-6 rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase text-muted-foreground">Score</div>
              <div className="text-4xl font-bold text-primary transition-all">{latest.score ?? "—"}</div>
            </div>
            <Badge variant={latest.score === 100 ? "default" : latest.status === "completed" ? "default" : "secondary"}>
              {latest.score === 100 ? "Fully Compliant" : latest.status}
            </Badge>
          </div>
          {latest.summary && <p className="mt-4 text-sm text-muted-foreground">{latest.summary}</p>}
          {latest.score === 100 && (
            <CompliancePatchReport siteName={site.name} siteDomain={site.domain} />
          )}
          <div className="mt-6 border-t border-border pt-6">
            <FixWithAIButton siteId={site.id} currentScore={latest.score ?? null} />
          </div>
        </div>
      )}

      {/* Embed & config */}
      <section className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-semibold">Embed code</h2>
          <p className="mt-1 text-xs text-muted-foreground">Paste this before &lt;/body&gt; on your storefront.</p>
          <div className={`mt-4 rounded-lg border border-border bg-surface p-3 font-mono text-xs break-all ${isVerified ? "" : "blur-[3px] select-none"}`}>
            {embedCode}
          </div>
          {isVerified ? (
            <Button
              variant="outline" size="sm" className="mt-3"
              onClick={() => { navigator.clipboard.writeText(embedCode); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            >
              {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          ) : (
            <p className="mt-3 flex items-center gap-2 text-xs text-warning">
              <Lock className="h-3.5 w-3.5" /> Locked until domain ownership is verified.
            </p>
          )}
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
        <h2 className="font-semibold">Reports</h2>
        {scans.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No scans yet. Run your first scan to generate a report.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {scans.map((s) => {
              const findings = Array.isArray(s.findings) ? (s.findings as Array<Record<string, string>>) : [];
              return (
                <details key={s.id} className="group rounded-2xl border border-border bg-card p-5 transition hover:border-primary/40">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                    <div>
                      <div className="font-medium">{new Date(s.created_at).toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">{s.status}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1 text-xs font-medium text-primary">
                        <span className="group-open:hidden">View Details</span>
                        <span className="hidden group-open:inline">Hide Details</span>
                        <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                      </span>
                      <div className="text-2xl font-bold text-primary">{s.score ?? "—"}</div>
                    </div>
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

      <UpgradeModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        title="Free plan limit reached"
        description={`You've used all ${limit} free scans. Upgrade to Growth or Scale to keep scanning and unlock AI auto-fix.`}
      />
    </main>
  );
}

function WidgetForm({ initial, onSave }: { initial: Record<string, unknown>; onSave: (c: Record<string, unknown>) => void }) {
  const [theme, setTheme] = useState((initial.theme as string) ?? "light");
  const [accent, setAccent] = useState((initial.accent as string) ?? "#4F46E5");
  const [position, setPosition] = useState((initial.position as string) ?? "bottom-right");

  return (
    <form
      className="rounded-2xl border border-border bg-card p-6 space-y-4"
      onSubmit={(e) => { e.preventDefault(); onSave({ theme, accent, position, showBadge: true }); }}
    >
      <h2 className="font-semibold">Widget configuration</h2>
      <div className="space-y-1.5">
        <Label>Theme</Label>
        <Select value={theme} onValueChange={setTheme}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="light">Light</SelectItem>
            <SelectItem value="dark">Dark</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Accent color</Label>
        <Input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="h-10 w-24 p-1" />
      </div>
      <div className="space-y-1.5">
        <Label>Position</Label>
        <Select value={position} onValueChange={setPosition}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="bottom-right">Bottom right</SelectItem>
            <SelectItem value="bottom-left">Bottom left</SelectItem>
            <SelectItem value="top-right">Top right</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="w-full">Save widget</Button>
    </form>
  );
}
