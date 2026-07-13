import { Check, Sparkles, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useAdminMode, type Plan } from "@/lib/admin-mode";
import { useFreeScanCount } from "@/lib/plan-limits";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
}

/**
 * Upgrade modal — shown when a Free-plan user hits a limit.
 * Clicking "Подключить тариф" switches the simulated plan to growth/scale,
 * resets the free-scan counter, and closes the modal.
 */
export function UpgradeModal({ open, onOpenChange, title, description }: Props) {
  const { setPlan } = useAdminMode(false);
  const { reset } = useFreeScanCount();

  const upgrade = (plan: Plan, label: string) => {
    setPlan(plan);
    reset();
    onOpenChange(false);
    toast.success(`Тариф активирован: ${label}. Безлимитные сканирования и AI-исправления доступны.`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {title ?? "Вы исчерпали дневной лимит бесплатного тарифа"}
          </DialogTitle>
          <DialogDescription>
            {description ?? "Для получения безлимитных сканирований и авто-исправления ошибок обновите тарифный план."}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <PlanCard
            icon={<Zap className="h-5 w-5" />}
            name="Growth"
            price="$99"
            highlight
            features={[
              "До 5 магазинов",
              "Полные отчёты EU AI Act",
              "Безлимитный «Fix with TrustSeal AI»",
              "Поддержка по e-mail",
            ]}
            onUpgrade={() => upgrade("growth", "Growth")}
          />
          <PlanCard
            icon={<Sparkles className="h-5 w-5" />}
            name="Scale"
            price="$299"
            features={[
              "Безлимит магазинов и сканирований",
              "PDF-сертификаты под брендом",
              "Приоритетная поддержка",
              "White-label виджет",
            ]}
            onUpgrade={() => upgrade("scale", "Scale")}
          />
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Не сейчас</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PlanCard({
  icon, name, price, features, highlight, onUpgrade,
}: {
  icon: React.ReactNode; name: string; price: string; features: string[]; highlight?: boolean; onUpgrade: () => void;
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
        <span className="text-sm text-muted-foreground">/мес</span>
      </div>
      <ul className="mt-4 space-y-2 text-sm">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 text-success" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Button
        className="mt-5 w-full"
        variant={highlight ? "default" : "outline"}
        onClick={onUpgrade}
      >
        Подключить тариф
      </Button>
    </div>
  );
}
