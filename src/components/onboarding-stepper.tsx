import { Check, Circle, Loader2 } from "lucide-react";

export type StepState = "done" | "current" | "todo";

export type OnboardingStep = {
  title: string;
  description: string;
  state: StepState;
  action?: React.ReactNode;
};

/**
 * Linear onboarding: add site → connect & verify → first scan → widget live.
 * Keeps the whole journey visible in one place instead of across tabs.
 */
export function OnboardingStepper({
  steps,
  allDone,
}: {
  steps: OnboardingStep[];
  allDone?: boolean;
}) {
  if (allDone) return null;

  return (
    <section className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-semibold">Get your store live in 4 steps</h2>
        <span className="text-xs text-muted-foreground">
          {steps.filter((s) => s.state === "done").length}/{steps.length} completed
        </span>
      </div>

      <ol className="mt-5 space-y-4">
        {steps.map((s, i) => (
          <li key={s.title} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                  s.state === "done"
                    ? "border-success bg-success/15 text-success"
                    : s.state === "current"
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground"
                }`}
              >
                {s.state === "done" ? (
                  <Check className="h-4 w-4" />
                ) : s.state === "current" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Circle className="h-3 w-3" />
                )}
              </span>
              {i < steps.length - 1 && <span className="mt-1 h-full w-px flex-1 bg-border" />}
            </div>
            <div className="pb-1">
              <div
                className={`text-sm font-medium ${s.state === "todo" ? "text-muted-foreground" : ""}`}
              >
                {i + 1}. {s.title}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{s.description}</p>
              {s.state === "current" && s.action && <div className="mt-2">{s.action}</div>}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
