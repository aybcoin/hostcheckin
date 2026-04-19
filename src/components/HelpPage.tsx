import { BookOpen, LifeBuoy } from "lucide-react";
import { fr } from "../lib/i18n/fr";
import { ctaTokens } from "../lib/design-tokens";
import { AppPage } from "../lib/navigation";

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

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
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
          <button
            type="button"
            onClick={() => onNavigate("dashboard")}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${ctaTokens.secondary}`}
          >
            {fr.help.backToDashboard}
          </button>
          <button
            type="button"
            onClick={() => onNavigate("checkins")}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${ctaTokens.primary}`}
          >
            <LifeBuoy size={16} aria-hidden="true" />
            {fr.help.openSupport}
          </button>
        </div>
      </section>
    </div>
  );
}
