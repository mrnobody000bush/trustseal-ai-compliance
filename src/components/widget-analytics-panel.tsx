import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Eye, MousePointerClick, Activity } from "lucide-react";
import { getSiteAnalytics } from "@/lib/analytics.functions";
import { QueryErrorState } from "@/components/query-error-state";

function Stat({
  label,
  value,
  hint,
  icon: Icon,
}: { label: string; value: string | number; hint?: string; icon: typeof Eye }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-2 text-3xl font-bold text-primary">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function WidgetAnalyticsPanel({ siteId, verified }: { siteId: string; verified: boolean }) {
  const fn = useServerFn(getSiteAnalytics);
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["site-analytics", siteId],
    queryFn: () => fn({ data: { siteId } }),
    refetchInterval: 60_000,
    retry: 1,
  });

  if (isError)
    return <QueryErrorState title="Не удалось загрузить аналитику виджета" error={error} onRetry={() => refetch()} showHome={false} />;
  if (isLoading || !data)
    return <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">Loading analytics…</div>;

  const max = Math.max(1, ...data.daily.map((d) => d.impressions + d.clicks));

  return (
    <div className="space-y-6">
      {!verified && (
        <div className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-xs text-warning">
          Analytics start collecting as soon as the widget is live on a verified domain.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat icon={Eye} label="Impressions · 24h" value={data.impressions24h} hint={`${data.impressions7d} in the last 7 days`} />
        <Stat icon={MousePointerClick} label="Shopper clicks · 24h" value={data.clicks24h} hint={`${data.clicks7d} in the last 7 days`} />
        <Stat icon={Activity} label="Engagement · 30d" value={`${data.ctr30d}%`} hint={`${data.impressions30d} impressions · ${data.clicks30d} clicks`} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="font-semibold">Last 30 days</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          How often shoppers saw your compliance seal — proof the script is earning its place.
        </p>
        <div className="mt-5 flex h-32 items-end gap-1">
          {data.daily.map((d) => {
            const total = d.impressions + d.clicks;
            const h = Math.round((total / max) * 100);
            return (
              <div
                key={d.date}
                title={`${d.date}: ${d.impressions} impressions, ${d.clicks} clicks`}
                className="flex-1 rounded-t bg-primary/70 transition-all hover:bg-primary"
                style={{ height: `${Math.max(h, 2)}%` }}
              />
            );
          })}
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
          <span>{data.daily[0]?.date}</span>
          <span>{data.daily[data.daily.length - 1]?.date}</span>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="font-semibold">Activity log</h3>
        {data.recent.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No widget activity recorded yet.</p>
        ) : (
          <ul className="mt-4 space-y-2 text-sm">
            {data.recent.map((e, i) => (
              <li key={i} className="flex items-center justify-between border-b border-border/60 pb-2 last:border-0">
                <span className="font-medium">{e.event_type.replace(/_/g, " ")}</span>
                <span className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
