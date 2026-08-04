import { ShieldAlert, ShieldX } from "lucide-react";

type Props = {
  status: string;
  message?: string | null;
  since?: string | null;
};

/** Warns the user when a previously verified domain lost (or is losing) verification. */
export function ReverificationBanner({ status, message, since }: Props) {
  if (status !== "needs_reverification" && status !== "unverified") return null;

  const isLost = status === "unverified";
  const deadline = since
    ? new Date(new Date(since).getTime() + 7 * 24 * 3600_000).toLocaleDateString()
    : null;

  return (
    <div
      role="alert"
      className={`mt-4 flex items-start gap-3 rounded-xl border p-4 text-sm ${
        isLost
          ? "border-destructive/40 bg-destructive/10 text-destructive"
          : "border-warning/40 bg-warning/10 text-warning"
      }`}
    >
      {isLost ? (
        <ShieldX className="mt-0.5 h-5 w-5 shrink-0" />
      ) : (
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
      )}
      <div className="space-y-1">
        <div className="font-semibold">
          {isLost ? "Domain verification lost" : "Domain needs re-verification"}
        </div>
        <p className="opacity-90">
          {message ??
            (isLost
              ? "The widget and monitoring are disabled until this domain is verified again."
              : "We could not confirm ownership of this domain during our periodic check.")}
        </p>
        {!isLost && deadline && (
          <p className="opacity-75">Restore verification before {deadline}.</p>
        )}
      </div>
    </div>
  );
}
