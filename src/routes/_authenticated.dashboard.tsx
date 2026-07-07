import { createFileRoute, Link, useServerFn } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, ExternalLink, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { listSites, createSite } from "@/lib/sites.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — TrustSeal" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { t } = useTranslation();
  const fetchList = useServerFn(listSites);
  const createFn = useServerFn(createSite);
  const qc = useQueryClient();
  const { data: sites = [], isLoading } = useQuery({
    queryKey: ["sites"],
    queryFn: () => fetchList(),
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ domain: "", name: "", description: "" });

  const create = useMutation({
    mutationFn: (data: typeof form) => createFn({ data }),
    onSuccess: () => {
      toast.success("Store added");
      setOpen(false);
      setForm({ domain: "", name: "", description: "" });
      qc.invalidateQueries({ queryKey: ["sites"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("dashboard.title")}</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />{t("dashboard.addSite")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("dashboard.newSite.title")}</DialogTitle></DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => { e.preventDefault(); create.mutate(form); }}
            >
              <div className="space-y-1.5">
                <Label>{t("dashboard.newSite.name")}</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>{t("dashboard.newSite.domain")}</Label>
                <Input value={form.domain} onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))} placeholder="mystore.com" required />
              </div>
              <div className="space-y-1.5">
                <Label>{t("dashboard.newSite.description")}</Label>
                <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
              <Button type="submit" className="w-full" disabled={create.isPending}>
                {t("dashboard.newSite.submit")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-8">
        {isLoading ? (
          <div className="text-muted-foreground">Loading…</div>
        ) : sites.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface/50 p-12 text-center">
            <ShieldCheck className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-muted-foreground">{t("dashboard.empty")}</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sites.map((s) => {
              const last = s.compliance_scans?.[0];
              return (
                <Link
                  key={s.id}
                  to="/sites/$siteId"
                  params={{ siteId: s.id }}
                  className="group rounded-2xl border border-border bg-card p-5 transition hover:border-primary/40"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold group-hover:text-primary">{s.name}</div>
                      <div className="text-xs text-muted-foreground">{s.domain}</div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t("dashboard.score")}</span>
                    <span className="font-semibold">{last?.score ?? "—"}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{t("dashboard.lastScan")}</span>
                    <span>{last ? new Date(last.created_at).toLocaleDateString() : t("dashboard.never")}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
