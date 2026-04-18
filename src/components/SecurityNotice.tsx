import { ShieldCheck } from "lucide-react";
import { fr } from "../lib/i18n/fr";

interface SecurityNoticeProps {
  className?: string;
}

export function SecurityNotice({ className = "" }: SecurityNoticeProps) {
  return (
    <div
      className={`rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 border-l-[3px] border-slate-900 pl-3">
          <ShieldCheck className="h-4 w-4 text-slate-800" aria-hidden="true" />
        </div>
        <p className="text-sm text-slate-700">{fr.security.notice}</p>
      </div>
    </div>
  );
}
