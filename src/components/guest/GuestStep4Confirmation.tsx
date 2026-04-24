import { Check, CheckCircle2 } from 'lucide-react';
import { clsx } from '../../lib/clsx';
import { borderTokens, stateFillTokens, surfaceTokens, textTokens } from '../../lib/design-tokens';
import { fr } from '../../lib/i18n/fr';

interface GuestStep4ConfirmationProps {
  propertyName: string;
}

export function GuestStep4Confirmation({ propertyName }: GuestStep4ConfirmationProps) {
  const subtitle = fr.guestPortal.confirmation.subtitle.replace('{propertyName}', propertyName);

  return (
    <section className={clsx('rounded-2xl border p-5 shadow-sm sm:p-6', surfaceTokens.panel, borderTokens.default)}>
      <div className={clsx('mx-auto flex h-20 w-20 items-center justify-center rounded-full', stateFillTokens.success)}>
        <CheckCircle2 className={textTokens.success} size={42} aria-hidden="true" />
      </div>

      <h2 className={clsx('mt-4 text-center text-2xl font-bold', textTokens.title)}>{fr.guestPortal.confirmation.title}</h2>
      <p className={clsx('mt-1 text-center text-sm', textTokens.body)}>{subtitle}</p>

      <div className={clsx('mt-5 space-y-3 rounded-xl border p-4', borderTokens.default, surfaceTokens.subtle)}>
        <div className="flex items-center gap-2 text-sm">
          <span className={clsx('inline-flex h-6 w-6 items-center justify-center rounded-full', stateFillTokens.success)}>
            <Check className={textTokens.success} size={14} aria-hidden="true" />
          </span>
          <span className={textTokens.body}>{fr.guestPortal.confirmation.contractSigned}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className={clsx('inline-flex h-6 w-6 items-center justify-center rounded-full', stateFillTokens.success)}>
            <Check className={textTokens.success} size={14} aria-hidden="true" />
          </span>
          <span className={textTokens.body}>{fr.guestPortal.confirmation.identityVerified}</span>
        </div>
      </div>

      <p className={clsx('mt-4 text-center text-sm', textTokens.subtle)}>{fr.guestPortal.confirmation.message}</p>
    </section>
  );
}
