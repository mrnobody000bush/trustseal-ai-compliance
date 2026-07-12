import { Check, Sparkles, Zap } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
}

/**
 * Upgrade modal shown when a Free-plan user hits a limit
 * (2nd scan, or trying to use "Fix with TrustSeal AI").
 */
export function UpgradeModal({ open, onOpenChange, title, description }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {title ?? "Free plan limit reached"}
          </DialogTitle>
          <DialogDescription>
            {description ?? "Upgrade your plan to keep scanning sites and unlock automatic AI-powered fixes."}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <PlanCard
            icon={<Zap className="h-5 w-5" />}
            name="Growth"
            price="$99"
            highlight
            features={[
              "Up to 5 sites",
              "Full EU AI Act reports",
              "Unlimited “Fix with TrustSeal AI”",
              "Email support",
            ]}
          />
          <PlanCard
            icon={<Sparkles className="h-5 w-5" />}
            name="Scale"
            price="$299"
            features={[
              "Unlimited sites & scans",
              "Custom PDF certificates",
              "Priority support",
              "White-label widget",
            ]}
          />
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Not now</Button>
          <Button asChild>
            <Link to="/pricing" onClick={() => onOpenChange(false)}>View all plans</Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PlanCard({
  icon, name, price, features, highlight,
}: {
  icon: React.ReactNode; name: string; price: string; features: string[]; highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${highlight ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card"}`}
    >
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span className={highlight ? "text-primary" : "text-muted-foreground"}>{icon}</span>
        {name}
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-3xl font-bold">{price}</span>
        <span className="text-sm text-muted-foreground">/mo</span>
      </div>
      <ul className="mt-4 space-y-2 text-sm">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 text-success" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Button asChild className="mt-5 w-full" variant={highlight ? "default" : "outline"}>
        <Link to="/pricing">Upgrade now</Link>
      </Button>
    </div>
  );
}
