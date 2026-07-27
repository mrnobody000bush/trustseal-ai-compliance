import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, ShieldAlert, Copy, Check, RefreshCw, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { revokeVerification } from "@/lib/sites.functions";

type Props = {
  siteId: string;
  domain: string;
  token: string;
  status: string;
  method: string | null;
  verifiedAt: string | null;
  lastSeenAt: string | null;
  onRefresh: () => void;
};

export function DomainVerificationCard({
  siteId, domain, token, status, method, verifiedAt, lastSeenAt, onRefresh,
}: Props) {
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);
  const revokeFn = useServerFn(revokeVerification);
  const revoke = useMutation({
    mutationFn: () => revokeFn({ data: { siteId } }),
    onSuccess: () => {
      toast.success("Verification reset");
      qc.invalidateQueries({ queryKey: ["site", siteId] });
      qc.invalidateQueries({ queryKey: ["sites"] });
    },
  });

  const verified = status === "verified";

  return (
    <section
      className={`mt-8 rounded-2xl border p-6 ${
        verified ? "border-primary/40 bg-primary/5" : "border-warning/40 bg-warning/5"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {verified ? (
            <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
          ) : (
            <ShieldAlert className="mt-0.5 h-5 w-5 text-warning" />
          )}
          <div>
            <h2 className="font-semibold">Domain ownership</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {verified
                ? `Ownership of ${domain} confirmed via ${method === "wordpress_plugin" ? "the TrustSeal WordPress plugin" : "verification"}.`
                : `We must confirm you own ${domain} before the TrustSeal widget can go live.`}
            </p>
          </div>
        </div>
        <Badge variant={verified ? "default" : "secondary"}>
          {verified ? "Active Compliance" : "Pending Verification"}
        </Badge>
      </div>

      {verified ? (
        <div className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
          <div>Verified: {verifiedAt ? new Date(verifiedAt).toLocaleString() : "—"}</div>
          <div>Plugin last seen: {lastSeenAt ? new Date(lastSeenAt).toLocaleString() : "—"}</div>
          <div className="sm:col-span-2 mt-2">
            <Button size="sm" variant="outline" onClick={() => revoke.mutate()} disabled={revoke.isPending}>
              Reset verification
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <ol className="space-y-3 text-sm">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">1</span>
              <span className="flex-1">
                Download the TrustSeal WordPress plugin and upload it in{" "}
                <span className="font-medium">Plugins → Add New → Upload</span> on {domain}.
                <div className="mt-2">
                  <Button asChild size="sm" variant="outline">
                    <a href="/trustseal-wp-plugin.php" download>
                      <Download className="mr-2 h-4 w-4" /> Download plugin
                    </a>
                  </Button>
                </div>
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">2</span>
              <span className="flex-1">
                Activate it and paste this verification key into{" "}
                <span className="font-medium">Settings → TrustSeal</span>:
                <div className="mt-2 flex items-center gap-2">
                  <code className="flex-1 rounded-lg border border-border bg-surface p-2 font-mono text-xs break-all">
                    {token}
                  </code>
                  <Button
                    size="icon"
                    variant="outline"
                    aria-label="Copy verification key"
                    onClick={() => {
                      navigator.clipboard.writeText(token);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    }}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">3</span>
              <span className="flex-1">
                The plugin pings us automatically. Then refresh this page — status flips to{" "}
                <span className="font-medium">Active Compliance</span>.
                <div className="mt-2">
                  <Button size="sm" variant="outline" onClick={onRefresh}>
                    <RefreshCw className="mr-2 h-4 w-4" /> Check status
                  </Button>
                </div>
              </span>
            </li>
          </ol>
        </div>
      )}
    </section>
  );
}
