import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Activity,
  DollarSign,
  Globe2,
  LogIn,
  ShieldAlert,
  Users,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getAdminStats, checkIsAdmin, impersonateUser } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin-panel")({
  head: () => ({
    meta: [
      { title: "Admin panel — TrustSeal" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminPanel,
});

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent = "text-primary",
}: {
  icon: any;
  label: string;
  value: string;
  hint?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${accent}`} />
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

function AdminPanel() {
  const { i18n } = useTranslation();
  const isRu = i18n.language?.startsWith("ru");
  const L = isRu
    ? {
        title: "Панель супер-админа",
        subtitle: "Внутренние метрики TrustSeal — только для команды.",
        mrr: "MRR (прогноз)",
        mrrHint: "$49 × активных клиентов",
        arr: "ARR (прогноз)",
        clients: "Активные клиенты",
        clientsHint: "Всего аккаунтов",
        sites: "Магазины",
        sitesHint: "активных из всего",
        scans: "AI-сканирований",
        events: "События виджета",
        load: "Нагрузка на ИИ-серверы (14 дней)",
        allSites: "Все сканируемые сайты",
        cols: {
          name: "Магазин",
          domain: "Домен",
          owner: "Клиент",
          scans: "Сканов",
          avg: "Ср. балл",
          last: "Последний",
          actions: "Действия",
        },
        loginAs: "Войти как клиент",
        impersonating: "Переключаемся на клиента…",
        empty: "Пока нет данных.",
        forbidden: "Доступ запрещён.",
      }
    : {
        title: "Super-admin panel",
        subtitle: "Internal TrustSeal metrics — team only.",
        mrr: "MRR (projected)",
        mrrHint: "$49 × active clients",
        arr: "ARR (projected)",
        clients: "Active clients",
        clientsHint: "Total accounts",
        sites: "Stores",
        sitesHint: "active of total",
        scans: "AI scans",
        events: "Widget events",
        load: "AI server load (14 days)",
        allSites: "All scanned sites",
        cols: {
          name: "Store",
          domain: "Domain",
          owner: "Client",
          scans: "Scans",
          avg: "Avg score",
          last: "Last",
          actions: "Actions",
        },
        loginAs: "Login as user",
        impersonating: "Switching to client session…",
        empty: "No data yet.",
        forbidden: "Access denied.",
      };

  const isAdminFn = useServerFn(checkIsAdmin);
  const statsFn = useServerFn(getAdminStats);
  const impersonateFn = useServerFn(impersonateUser);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const impersonate = useMutation({
    mutationFn: (userId: string) => impersonateFn({ data: { userId } }),
    onSuccess: async ({ email, token_hash }) => {
      toast.loading(L.impersonating, { id: "impersonate" });
      // Sign out of the admin session first so the target user's session cleanly replaces it.
      await supabase.auth.signOut();
      const { error } = await supabase.auth.verifyOtp({
        type: "magiclink",
        token_hash,
      });
      toast.dismiss("impersonate");
      if (error) {
        toast.error(error.message);
        return;
      }
      qc.clear();
      toast.success(`Signed in as ${email}`);
      navigate({ to: "/dashboard" });
    },
    onError: (e: Error) => toast.error(e.message ?? "Impersonation failed"),
  });

  const { data: adminCheck, isLoading: checking } = useQuery({
    queryKey: ["is-admin"],
    queryFn: () => isAdminFn(),
    staleTime: 60_000,
  });

  const isAdmin = adminCheck?.isAdmin;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => statsFn(),
    enabled: !!isAdmin,
  });

  if (checking) {
    return <main className="mx-auto max-w-6xl px-6 py-10 text-muted-foreground">Loading…</main>;
  }

  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-lg px-6 py-24 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
        <h1 className="mt-4 text-2xl font-semibold">{L.forbidden}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {isRu
            ? "Эта страница доступна только супер-администраторам."
            : "This page is only available to super-admins."}
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-block rounded-full border border-border px-4 py-2 text-sm hover:border-primary"
        >
          ← Dashboard
        </Link>
      </main>
    );
  }

  const fmtMoney = (n: number) =>
    new Intl.NumberFormat(isRu ? "ru-RU" : "en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-primary">
            <ShieldAlert className="h-3.5 w-3.5" /> Admin
          </div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">{L.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{L.subtitle}</p>
        </div>
        <Link
          to="/dashboard"
          className="rounded-full border border-border px-4 py-2 text-xs hover:border-primary"
        >
          {isRu ? "← В личный кабинет" : "← Client view"}
        </Link>
      </div>

      {isLoading || !data ? (
        <div className="mt-10 text-muted-foreground">Loading metrics…</div>
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={DollarSign}
              label={L.mrr}
              value={fmtMoney(data.mrr)}
              hint={L.mrrHint}
              accent="text-emerald-500"
            />
            <StatCard
              icon={Activity}
              label={L.arr}
              value={fmtMoney(data.arr)}
              accent="text-emerald-500"
            />
            <StatCard
              icon={Users}
              label={L.clients}
              value={String(data.activeClients)}
              hint={`${data.totalClients} ${L.clientsHint.toLowerCase()}`}
            />
            <StatCard
              icon={Globe2}
              label={L.sites}
              value={String(data.activeSites)}
              hint={`${data.activeSites} / ${data.totalSites} ${L.sitesHint}`}
            />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <StatCard
              icon={Zap}
              label={L.scans}
              value={String(data.totalScans)}
              accent="text-amber-500"
            />
            <StatCard
              icon={Activity}
              label={L.events}
              value={String(data.totalEvents)}
              accent="text-indigo-500"
            />
          </div>

          <section className="mt-8 rounded-2xl border border-border bg-card p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {L.load}
            </h2>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.load} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gScans" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.55} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gEvents" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => v.slice(5)}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="scans"
                    name="AI scans"
                    stroke="hsl(var(--primary))"
                    fill="url(#gScans)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="events"
                    name="Widget events"
                    stroke="#10B981"
                    fill="url(#gEvents)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="mt-8 rounded-2xl border border-border bg-card">
            <div className="border-b border-border px-6 py-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {L.allSites}
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                    <th className="px-6 py-3 font-medium">{L.cols.name}</th>
                    <th className="px-6 py-3 font-medium">{L.cols.domain}</th>
                    <th className="px-6 py-3 font-medium">{L.cols.owner}</th>
                    <th className="px-6 py-3 text-right font-medium">{L.cols.scans}</th>
                    <th className="px-6 py-3 text-right font-medium">{L.cols.avg}</th>
                    <th className="px-6 py-3 font-medium">{L.cols.last}</th>
                    <th className="px-6 py-3 text-right font-medium">{L.cols.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sites.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                        {L.empty}
                      </td>
                    </tr>
                  ) : (
                    data.sites.map((s: any) => (
                      <tr
                        key={s.id}
                        className="border-b border-border/60 last:border-0 hover:bg-muted/30"
                      >
                        <td className="px-6 py-3 font-medium">
                          {s.name}
                          {!s.is_active && (
                            <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase text-muted-foreground">
                              off
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-muted-foreground">{s.domain}</td>
                        <td className="px-6 py-3 text-muted-foreground">
                          {s.owner_email ?? "—"}
                        </td>
                        <td className="px-6 py-3 text-right tabular-nums">{s.scan_count}</td>
                        <td className="px-6 py-3 text-right tabular-nums">
                          {s.avg_score ?? "—"}
                        </td>
                        <td className="px-6 py-3 text-xs text-muted-foreground">
                          {s.last_scan
                            ? new Date(s.last_scan).toLocaleDateString(
                                isRu ? "ru-RU" : "en-US",
                              )
                            : "—"}
                        </td>
                        <td className="px-6 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              if (!s.user_id) return;
                              if (confirm(`${L.loginAs}: ${s.owner_email ?? s.user_id}?`)) {
                                impersonate.mutate(s.user_id);
                              }
                            }}
                            disabled={impersonate.isPending || !s.user_id}
                            title={L.loginAs}
                            aria-label={L.loginAs}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:border-primary hover:text-primary disabled:opacity-40"
                          >
                            <LogIn className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
