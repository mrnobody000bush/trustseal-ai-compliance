import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarClock, ShieldCheck, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryErrorState } from "@/components/query-error-state";
import { getMonitoringStatus, setMonitoring } from "@/lib/monitoring.functions";

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function MonitoringCard({ siteId, verified }: { siteId: string; verified: boolean }) {
  const qc = useQueryClient();
  const statusFn = useServerFn(getMonitoringStatus);
  const toggleFn = useServerFn(setMonitoring);

  const q = useQuery({
    queryKey: ["monitoring", siteId],
    queryFn: () => statusFn({ data: { siteId } }),
    retry: 1,
  });

  const toggle = useMutation({
    mutationFn: (enabled: boolean) => toggleFn({ data: { siteId, enabled } }),
    onSuccess: (r) => {
      toast.success(r.enabled ? "Weekly monitoring enabled" : "Weekly monitoring paused");
      void qc.invalidateQueries({ queryKey: ["monitoring", siteId] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Could not update monitoring"),
  });

  if (q.isLoading) return <Skeleton className="h-44 w-full rounded-2xl" />;
  if (q.isError || !q.data) {
    return <QueryErrorState description="Could not load monitoring status." onRetry={() => { void q.refetch(); }} />;
  }

  const s = q.data;
  const delta =
    s.lastAutoScore !== null && s.previousAutoScore !== null
      ? s.lastAutoScore - s.previousAutoScore
      : null;

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">Continuous compliance</h3>
          </div>
          <p className="mt-1 max-w-lg text-sm text-muted-foreground">
            We re-scan your site automatically every 7 days and update the badge score, so your
            TrustSeal never goes stale between manual checks.
          </p>
        </div>
        <Switch
          checked={s.enabled}
          disabled={!verified || toggle.isPending}
          onCheckedChange={(v) => toggle.mutate(v)}
          aria-label="Weekly auto re-scan"
        />
      </div>

      {!verified && (
        <p className="mt-3 text-xs text-muted-foreground">
          Verify domain ownership to activate weekly monitoring.
        </p>
      )}

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border/60 bg-background/40 p-4">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Last auto scan</div>
          <div className="mt-1 text-sm font-medium">{fmt(s.lastAutoScanAt)}</div>
        </div>
        <div className="rounded-xl border border-border/60 bg-background/40 p-4">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
            <CalendarClock className="h-3 w-3" /> Next scheduled
          </div>
          <div className="mt-1 text-sm font-medium">
            {s.enabled ? (s.nextAutoScanAt ? fmt(s.nextAutoScanAt) : "Within 7 days") : "Paused"}
          </div>
        </div>
        <div className="rounded-xl border border-border/60 bg-background/40 p-4">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Score trend</div>
          <div className="mt-1 flex items-center gap-2 text-sm font-medium">
            {s.lastAutoScore ?? "—"}
            {delta !== null && delta !== 0 && (
              <span
                className={`inline-flex items-center gap-1 text-xs ${
                  delta > 0 ? "text-emerald-400" : "text-destructive"
                }`}
              >
                {delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {delta > 0 ? `+${delta}` : delta}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
