import { BookOpen, LifeBuoy } from "lucide-react";
import { fr } from "../lib/i18n/fr";
import { AppPage } from "../lib/navigation";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";

interface HelpPageProps {
  onNavigate: (page: AppPage) => void;
}

export function HelpPage({ onNavigate }: HelpPageProps) {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{fr.help.title}</h1>
        <p className="mt-1 text-sm text-slate-600">{fr.help.subtitle}</p>
      </header>

      <Card as="section" variant="default" padding="md">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-slate-100 p-2">
            <BookOpen size={18} className="text-slate-700" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900">{fr.help.comingSoon}</p>
            <p className="mt-1 text-sm text-slate-600">
              En attendant, vous pouvez nous contacter directement depuis le bouton d’aide.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            data-testid="help-cta-back-dashboard"
            onClick={() => onNavigate("dashboard")}
          >
            {fr.help.backToDashboard}
          </Button>
          <Button
            variant="primary"
            data-testid="help-cta-open-support"
            onClick={() => onNavigate("checkins")}
          >
            <LifeBuoy size={16} aria-hidden="true" />
            {fr.help.openSupport}
          </Button>
        </div>
      </Card>
    </div>
  );
}
