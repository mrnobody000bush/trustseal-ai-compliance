import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function QueryErrorState({
  title = "Не удалось загрузить данные сайта",
  description,
  error,
  onRetry,
  showHome = true,
}: {
  title?: string;
  description?: string;
  error?: unknown;
  onRetry?: () => void;
  showHome?: boolean;
}) {
  const message =
    description ??
    (error instanceof Error && error.message
      ? error.message
      : "Проверьте соединение и попробуйте снова.");

  return (
    <div
      role="alert"
      className="rounded-2xl border border-destructive/30 bg-destructive/5 p-10 text-center"
    >
      <AlertTriangle className="mx-auto h-10 w-10 text-destructive" />
      <h2 className="mt-4 text-lg font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{message}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {onRetry && (
          <Button onClick={onRetry}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Попробовать снова
          </Button>
        )}
        {showHome && (
          <Button variant="outline" asChild>
            <Link to="/dashboard">
              <Home className="mr-2 h-4 w-4" />
              Вернуться на главную
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
