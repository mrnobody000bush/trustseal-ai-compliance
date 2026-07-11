import { useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Shield, X, Sparkles } from "lucide-react";
import { checkIsAdmin } from "@/lib/admin.functions";
import { useAuth } from "@/components/auth-provider";
import { Switch } from "@/components/ui/switch";
import { useAdminMode, type Plan } from "@/lib/admin-mode";

/**
 * Discreet floating pill visible only to admin users.
 * - Navigate between client dashboard and admin panel
 * - Toggle Admin Mode (unlimited AI fixes)
 * - Simulate a client plan (Free/Growth/Scale) when Admin Mode is off
 */
export function AdminToggle() {
  const { user } = useAuth();
  const fn = useServerFn(checkIsAdmin);
  const { data } = useQuery({
    queryKey: ["is-admin", user?.id],
    queryFn: () => fn(),
    enabled: !!user,
    staleTime: 60_000,
  });
  const isAdmin = !!data?.isAdmin;
  const { adminMode, plan, setAdminMode, setPlan } = useAdminMode(isAdmin);
  const [open, setOpen] = useState(false);
  const location = useLocation();

  if (!isAdmin) return null;

  const onAdmin = location.pathname.startsWith("/admin-panel");
  const target = onAdmin ? "/dashboard" : "/admin-panel";
  const label = onAdmin ? "Client view" : "Admin panel";

  const plans: Plan[] = ["free", "growth", "scale"];

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {open && (
        <div className="w-64 rounded-2xl border border-border bg-background/95 p-4 shadow-2xl backdrop-blur">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-primary" />
              Admin Mode
            </div>
            <Switch checked={adminMode} onCheckedChange={setAdminMode} />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {adminMode
              ? "Unlimited AI fixes on every site."
              : "Simulating a normal client."}
          </p>

          <div className={`mt-3 space-y-2 transition-opacity ${adminMode ? "opacity-40 pointer-events-none" : ""}`}>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Simulated plan
            </div>
            <div className="grid grid-cols-3 gap-1">
              {plans.map((p) => (
                <button
                  key={p}
                  onClick={() => setPlan(p)}
                  className={`rounded-lg border px-2 py-1.5 text-xs capitalize transition ${
                    plan === p
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <Link
            to={target}
            onClick={() => setOpen(false)}
            className="mt-4 block rounded-lg border border-border bg-surface px-3 py-2 text-center text-xs font-medium transition hover:border-primary hover:text-primary"
          >
            → {label}
          </Link>
        </div>
      )}
      <button
        aria-label="Admin toggle"
        onClick={() => setOpen((v) => !v)}
        className={`grid h-9 w-9 place-items-center rounded-full border shadow-sm backdrop-blur transition ${
          adminMode
            ? "border-primary/60 bg-primary/10 text-primary opacity-90"
            : "border-border bg-background/70 text-muted-foreground opacity-40 hover:opacity-100 hover:text-primary"
        }`}
      >
        {open ? <X className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
      </button>
    </div>
  );
}
