import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ShieldCheck } from "lucide-react";

export function SiteFooter() {
  const { t } = useTranslation();
  return (
    <footer className="border-t border-border/60 bg-surface/50">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-10 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 text-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span className="font-semibold">{t("brand")}</span>
          <span className="text-muted-foreground">© {new Date().getFullYear()}</span>
        </div>
        <div className="flex gap-6">
          <Link to="/pricing" className="hover:text-foreground">{t("nav.pricing")}</Link>
          <Link to="/about" className="hover:text-foreground">{t("nav.about")}</Link>
          <Link to="/widget-demo" className="hover:text-foreground">{t("nav.demo")}</Link>
        </div>
      </div>
    </footer>
  );
}
