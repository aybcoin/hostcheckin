import { ShieldCheck } from "lucide-react";
import { clsx } from "../lib/clsx";
import { borderTokens, surfaceTokens, textTokens } from "../lib/design-tokens";
import { fr } from "../lib/i18n/fr";

interface SecurityNoticeProps {
  className?: string;
}

export function SecurityNotice({ className = "" }: SecurityNoticeProps) {
  return (
    <div
      className={clsx("rounded-lg border px-4 py-3", borderTokens.default, surfaceTokens.subtle, className)}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className={clsx("mt-0.5 border-l-[3px] pl-3", textTokens.title)}>
          <ShieldCheck className={clsx("h-4 w-4", textTokens.body)} aria-hidden="true" />
        </div>
        <p className={clsx("text-sm", textTokens.body)}>{fr.security.notice}</p>
      </div>
    </div>
  );
}
