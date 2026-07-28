import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck, ShieldAlert, Copy, Check, RefreshCw, Download, Code2, Plug, Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { revokeVerification, verifyMetaTag, forceVerify } from "@/lib/sites.functions";

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

const METHOD_LABEL: Record<string, string> = {
  wordpress_plugin: "the TrustSeal WordPress plugin",
  meta_tag: "an HTML meta tag",
  manual_override: "manual override (debug mode)",
};

export function DomainVerificationCard({
  siteId, domain, token, status, method, verifiedAt, lastSeenAt, onRefresh,
}: Props) {
  const qc = useQueryClient();
  const [copied, setCopied] = useState<"tag" | "token" | null>(null);
  const [tab, setTab] = useState<"meta" | "plugin">("meta");
  const [showForce, setShowForce] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const revokeFn = useServerFn(revokeVerification);
  const verifyFn = useServerFn(verifyMetaTag);
  const forceFn = useServerFn(forceVerify);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["site", siteId] });
    qc.invalidateQueries({ queryKey: ["sites"] });
  };

  const revoke = useMutation({
    mutationFn: () => revokeFn({ data: { siteId } }),
    onSuccess: () => { toast.success("Verification reset"); invalidate(); },
  });

  const check = useMutation({
    mutationFn: () => verifyFn({ data: { siteId } }),
    onSuccess: (res) => {
      if (res.ok) {
        toast.success("Domain verified");
        setLastError(null);
        invalidate();
        onRefresh();
      } else {
        setLastError(res.reason ?? "Verification failed");
        setShowForce(true);
        toast.error(res.reason ?? "Verification failed");
      }
    },
    onError: (e: Error) => {
      setLastError(e.message);
      setShowForce(true);
      toast.error(e.message);
    },
  });

  const force = useMutation({
    mutationFn: () => forceFn({ data: { siteId } }),
    onSuccess: () => { toast.success("Force-verified (debug mode)"); invalidate(); onRefresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const metaTag = `<meta name="trustseal-verification" content="${token}">`;
  const verified = status === "verified";

  const copy = (text: string, key: "tag" | "token") => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

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
                ? `Ownership of ${domain} confirmed via ${METHOD_LABEL[method ?? ""] ?? "verification"}.`
                : `We must confirm you own ${domain} before the TrustSeal widget can go live. Works with any platform — Webflow, Shopify, Vercel, Replit, WordPress and custom sites.`}
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
        <div className="mt-5 space-y-5">
          {/* Method switcher */}
          <div className="inline-flex rounded-xl border border-border bg-surface p-1">
            <button
              type="button"
              onClick={() => setTab("meta")}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                tab === "meta" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Code2 className="h-3.5 w-3.5" /> Method A · HTML meta tag
            </button>
            <button
              type="button"
              onClick={() => setTab("plugin")}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                tab === "plugin" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Plug className="h-3.5 w-3.5" /> Method B · WordPress plugin
            </button>
          </div>

          {tab === "meta" ? (
            <ol className="space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">1</span>
                <span className="flex-1">
                  Copy this meta tag and paste it inside the <code className="font-mono">&lt;head&gt;</code> of your
                  homepage (works on any platform):
                  <div className="mt-2 flex items-center gap-2">
                    <code className="flex-1 rounded-lg border border-border bg-surface p-2 font-mono text-xs break-all">
                      {metaTag}
                    </code>
                    <Button
                      size="icon"
                      variant="outline"
                      aria-label="Copy meta tag"
                      onClick={() => copy(metaTag, "tag")}
                    >
                      {copied === "tag" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">2</span>
                <span className="flex-1">
                  Publish / redeploy your site, then run the check — we fetch{" "}
                  <span className="font-medium">{domain}</span> and look for the tag.
                  <div className="mt-2">
                    <Button size="sm" onClick={() => check.mutate()} disabled={check.isPending}>
                      <RefreshCw className={`mr-2 h-4 w-4 ${check.isPending ? "animate-spin" : ""}`} />
                      {check.isPending ? "Checking…" : "Check status"}
                    </Button>
                  </div>
                </span>
              </li>
            </ol>
          ) : (
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
                      onClick={() => copy(token, "token")}
                    >
                      {copied === "token" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">3</span>
                <span className="flex-1">
                  The plugin pings us automatically. Then refresh — status flips to{" "}
                  <span className="font-medium">Active Compliance</span>.
                  <div className="mt-2">
                    <Button size="sm" variant="outline" onClick={onRefresh}>
                      <RefreshCw className="mr-2 h-4 w-4" /> Check status
                    </Button>
                  </div>
                </span>
              </li>
            </ol>
          )}

          {lastError && (
            <p className="text-xs text-destructive">Last check failed: {lastError}</p>
          )}

          {showForce && (
            <div className="rounded-xl border border-dashed border-border bg-surface/60 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  Can&apos;t reach the site (CORS, private preview, staging)? Override it manually.
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => force.mutate()}
                  disabled={force.isPending}
                >
                  <Zap className="mr-2 h-4 w-4" /> Force Verify (Debug Mode)
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
