import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { explainFinding } from "@/lib/ai-explain.functions";

interface Props {
  domain: string;
  finding: {
    title?: string;
    severity?: string;
    category?: string;
    description?: string;
    recommendation?: string;
  };
}

/** Internal "explain this violation" helper for the store owner. */
export function ExplainFindingButton({ domain, finding }: Props) {
  const explainFn = useServerFn(explainFinding);
  const [answer, setAnswer] = useState<string | null>(null);

  const m = useMutation({
    mutationFn: () =>
      explainFn({
        data: {
          domain,
          title: finding.title ?? "Finding",
          severity: finding.severity ?? "medium",
          category: finding.category ?? "General",
          description: finding.description ?? "",
          recommendation: finding.recommendation ?? "",
        },
      }),
    onSuccess: (r) => setAnswer(r.explanation),
    onError: (e: Error) => toast.error(e.message || "Could not generate an explanation"),
  });

  return (
    <div className="mt-3">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs"
        onClick={() => (answer ? setAnswer(null) : m.mutate())}
        disabled={m.isPending}
      >
        {m.isPending ? (
          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
        ) : (
          <Sparkles className="mr-1.5 h-3.5 w-3.5" />
        )}
        {m.isPending ? "Thinking…" : answer ? "Hide explanation" : "Explain this finding"}
      </Button>
      {answer && (
        <p className="mt-2 whitespace-pre-line rounded-lg border border-primary/25 bg-primary/5 p-3 text-sm">
          {answer}
        </p>
      )}
    </div>
  );
}
