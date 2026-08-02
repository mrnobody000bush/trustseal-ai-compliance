import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Canonical, permanent origin the widget script is served from.
 * Override with VITE_WIDGET_ORIGIN once the production domain is live so the
 * snippet never depends on the preview/deploy URL a user happens to be on.
 */
export const WIDGET_SCRIPT_ORIGIN: string =
  (import.meta.env['VITE_WIDGET_ORIGIN'] as string | undefined) ??
  (typeof window !== "undefined" ? window.location.origin : "");

export const WIDGET_SCRIPT_URL = `${WIDGET_SCRIPT_ORIGIN}/embed.js`;

/** Single source of truth for the TrustSeal widget snippet. */
export function buildWidgetSnippet(token: string, origin?: string) {
  const base = origin ?? WIDGET_SCRIPT_ORIGIN;
  return `<script async src="${base}/embed.js" data-trustseal="${token}"></script>`;
}

export function WidgetSnippet({
  token,
  locked = false,
  className = "",
}: {
  token: string;
  locked?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const code = buildWidgetSnippet(token);

  return (
    <div className={className}>
      <div
        className={`rounded-lg border border-border bg-surface p-3 font-mono text-xs break-all ${
          locked ? "blur-[3px] select-none" : ""
        }`}
      >
        {code}
      </div>
      {!locked && (
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => {
            navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      )}
    </div>
  );
}
