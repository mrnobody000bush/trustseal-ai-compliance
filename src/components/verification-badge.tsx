import { ShieldCheck, ShieldAlert, ShieldX, ShieldQuestion } from "lucide-react";

type Props = { status: string | null | undefined; className?: string };

const MAP: Record<
  string,
  { label: string; hint: string; className: string; Icon: typeof ShieldCheck }
> = {
  verified: {
    label: "Verified",
    hint: "Domain ownership confirmed — widget active",
    className: "bg-primary/15 text-primary",
    Icon: ShieldCheck,
  },
  needs_reverification: {
    label: "Needs re-verification",
    hint: "Ownership check failed — restore it within the grace period",
    className: "bg-warning/15 text-warning",
    Icon: ShieldAlert,
  },
  unverified: {
    label: "Verification lost",
    hint: "Widget and monitoring are disabled until re-verified",
    className: "bg-destructive/15 text-destructive",
    Icon: ShieldX,
  },
  pending: {
    label: "Not verified yet",
    hint: "Complete one verification method to activate the widget",
    className: "bg-muted text-muted-foreground",
    Icon: ShieldQuestion,
  },
};

/** Consistent, self-explanatory badge for a site's domain verification state. */
export function VerificationBadge({ status, className = "" }: Props) {
  const s = MAP[status ?? "pending"] ?? MAP["pending"]!;
  const { Icon } = s;
  return (
    <span
      title={s.hint}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${s.className} ${className}`}
    >
      <Icon className="h-3 w-3" /> {s.label}
    </span>
  );
}

export function verificationHint(status: string | null | undefined) {
  return (MAP[status ?? "pending"] ?? MAP["pending"]!).hint;
}
