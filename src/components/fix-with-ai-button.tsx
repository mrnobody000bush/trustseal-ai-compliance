import { useState } from "react";
import { Sparkles, Lock, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { checkIsAdmin } from "@/lib/admin.functions";
import { applyAiFix } from "@/lib/scans.functions";
import { useAuth } from "@/components/auth-provider";
import { useAdminMode } from "@/lib/admin-mode";
import { UpgradeModal } from "@/components/upgrade-modal";

interface Props {
  siteId: string;
  currentScore: number | null;
  onFixed?: (newScore: number) => void;
}

/**
 * "Fix with TrustSeal AI" — respects admin mode + plan tier.
 * - Admin Mode ON → always works, animates score to 100 AND persists the fix.
 * - Admin Mode OFF + Growth/Scale plan → works.
 * - Admin Mode OFF + Free plan → upgrade modal.
 */
export function FixWithAIButton({ siteId, currentScore, onFixed }: Props) {
  const { user } = useAuth();
  const checkFn = useServerFn(checkIsAdmin);
  const { data: adminData } = useQuery({
    queryKey: ["is-admin", user?.id],
    queryFn: () => checkFn(),
    enabled: !!user,
    staleTime: 60_000,
  });
  const { effectiveAdminMode, canFix, plan } = useAdminMode(!!adminData?.isAdmin);

  const qc = useQueryClient();
  const applyFix = useServerFn(applyAiFix);
  const fixMutation = useMutation({
    mutationFn: () => applyFix({ data: { siteId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["site", siteId] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      qc.invalidateQueries({ queryKey: ["sites"] });
      onFixed?.(100);
    },
    onError: (e: Error) => toast.error(e.message ?? "Failed to apply AI fix"),
  });

  const [fixing, setFixing] = useState(false);
  const [animScore, setAnimScore] = useState<number | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [done, setDone] = useState(false);

  const runFix = () => {
    setFixing(true);
    setDone(false);
    const start = currentScore ?? 40;
    setAnimScore(start);
    const duration = 2400;
    const startedAt = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const val = Math.round(start + (100 - start) * eased);
      setAnimScore(val);
      if (t < 1) requestAnimationFrame(step);
      else {
        setFixing(false);
        setDone(true);
        fixMutation.mutate();
      }
    };
    requestAnimationFrame(step);
  };

  const handleClick = () => {
    if (canFix) runFix();
    else setShowUpgrade(true);
  };

  return (
    <>
      <div className="flex flex-col items-start gap-2">
        <Button
          onClick={handleClick}
          disabled={fixing || fixMutation.isPending}
          className="bg-gradient-to-r from-primary to-purple-500 text-primary-foreground shadow-md hover:opacity-90"
        >
          {fixing || fixMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : canFix ? (
            <Sparkles className="mr-2 h-4 w-4" />
          ) : (
            <Lock className="mr-2 h-4 w-4" />
          )}
          {fixing ? "AI fixing…" : fixMutation.isPending ? "Applying fix…" : "Fix with TrustSeal AI"}
        </Button>
        {effectiveAdminMode && (
          <span className="text-[10px] uppercase tracking-wide text-primary/80">
            Admin Mode · unlimited
          </span>
        )}
        {!effectiveAdminMode && (
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Plan: {plan}
          </span>
        )}
      </div>

      {(fixing || done) && animScore !== null && (
        <div className="mt-4 rounded-2xl border border-primary/30 bg-primary/5 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase text-primary">
                {fixing ? "TrustSeal AI is fixing your site" : "Fixed by TrustSeal AI"}
              </div>
              <div className="mt-1 text-5xl font-bold text-primary tabular-nums">
                {animScore}<span className="text-2xl text-muted-foreground">/100</span>
              </div>
            </div>
            {done ? (
              <ShieldCheck className="h-10 w-10 text-primary" />
            ) : (
              <Sparkles className="h-10 w-10 text-primary animate-pulse" />
            )}
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-gradient-to-r from-primary to-purple-500 transition-all duration-100"
              style={{ width: `${animScore}%` }}
            />
          </div>
        </div>
      )}

      <Dialog open={showUpgrade} onOpenChange={setShowUpgrade}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Upgrade to unlock AI fixes
            </DialogTitle>
            <DialogDescription>
              AI-powered auto-remediation is available on the <b>Growth</b> and <b>Scale</b> plans.
              Upgrade to let TrustSeal AI resolve compliance findings automatically.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpgrade(false)}>Not now</Button>
            <Button asChild>
              <Link to="/pricing" onClick={() => setShowUpgrade(false)}>View plans</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
