import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QueryErrorState } from "@/components/query-error-state";
import { useServerFn } from "@tanstack/react-start";
import { Github, Rocket, Boxes, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { listConnectors, toggleConnector } from "@/lib/connectors.functions";

type ConnectorType = "github_replit" | "vercel_netlify" | "wordpress_mcp";

const CONNECTORS: Array<{
  type: ConnectorType;
  title: string;
  description: string;
  icon: typeof Github;
}> = [
  {
    type: "github_replit",
    title: "GitHub / Replit Connector",
    description: "Auto-inject the TrustSeal widget snippet into your repository on every deploy.",
    icon: Github,
  },
  {
    type: "vercel_netlify",
    title: "Vercel / Netlify Integration",
    description: "Auto-deploy compliance updates and keep the seal live after each build.",
    icon: Rocket,
  },
  {
    type: "wordpress_mcp",
    title: "WordPress MCP Agent",
    description: "Manage pages, policies and the widget directly through the CMS API.",
    icon: Boxes,
  },
];

export function ConnectorsPanel({
  siteId,
  token,
  onRefresh,
}: { siteId: string; token?: string; onRefresh?: () => void }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listConnectors);
  const toggleFn = useServerFn(toggleConnector);

  const { data: rows, isError, error, refetch } = useQuery({
    queryKey: ["connectors", siteId],
    queryFn: () => listFn({ data: { siteId } }),
    retry: 1,
  });


  const toggle = useMutation({
    mutationFn: (v: { connectorType: ConnectorType; connected: boolean }) =>
      toggleFn({ data: { siteId, ...v } }),
    onSuccess: (_d, v) => {
      toast.success(v.connected ? "Connector activated — Active via Connector" : "Connector disabled");
      qc.invalidateQueries({ queryKey: ["connectors", siteId] });
      qc.invalidateQueries({ queryKey: ["site", siteId] });
      onRefresh?.();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const isOn = (t: ConnectorType) => rows?.find((r) => r.connector_type === t)?.connected ?? false;

  if (isError) {
    return (
      <QueryErrorState
        title="Не удалось загрузить коннекторы"
        error={error}
        onRetry={() => refetch()}
        showHome={false}
      />
    );
  }

  return (
    <div className="space-y-4">
    <div className="grid gap-4 md:grid-cols-3">


      {CONNECTORS.map((c) => {
        const active = isOn(c.type);
        const Icon = c.icon;
        return (
          <div
            key={c.type}
            className={`rounded-2xl border bg-card p-5 transition ${
              active ? "border-primary/60 shadow-[0_0_30px_-12px_hsl(var(--primary))]" : "border-border"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <span className="rounded-xl border border-border bg-surface p-2">
                <Icon className="h-5 w-5 text-primary" />
              </span>
              <Switch
                checked={active}
                disabled={toggle.isPending}
                onCheckedChange={(v) => toggle.mutate({ connectorType: c.type, connected: v })}
                aria-label={`Toggle ${c.title}`}
              />
            </div>
            <h3 className="mt-4 font-semibold leading-tight">{c.title}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{c.description}</p>
            <div className="mt-4">
              {active ? (
                <Badge className="gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Active via Connector
                </Badge>
              ) : (
                <Badge variant="secondary">Not connected</Badge>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
