import { useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Shield, X } from "lucide-react";
import { checkIsAdmin } from "@/lib/admin.functions";
import { useAuth } from "@/components/auth-provider";

/**
 * Discreet floating pill visible only to admin users.
 * Lets the admin flip between their client dashboard and the admin panel.
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
  const [open, setOpen] = useState(false);
  const location = useLocation();

  if (!data?.isAdmin) return null;

  const onAdmin = location.pathname.startsWith("/admin-panel");
  const target = onAdmin ? "/dashboard" : "/admin-panel";
  const label = onAdmin ? "Client view" : "Admin panel";

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {open && (
        <Link
          to={target}
          onClick={() => setOpen(false)}
          className="rounded-full border border-border bg-background/95 px-4 py-2 text-xs font-medium shadow-lg backdrop-blur transition hover:border-primary hover:text-primary"
        >
          → {label}
        </Link>
      )}
      <button
        aria-label="Admin toggle"
        onClick={() => setOpen((v) => !v)}
        className="grid h-8 w-8 place-items-center rounded-full border border-border bg-background/70 text-muted-foreground opacity-40 shadow-sm backdrop-blur transition hover:opacity-100 hover:text-primary"
      >
        {open ? <X className="h-3.5 w-3.5" /> : <Shield className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}
