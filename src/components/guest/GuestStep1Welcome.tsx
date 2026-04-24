import { ArrowRight, Home } from 'lucide-react';
import { clsx } from '../../lib/clsx';
import { borderTokens, ctaTokens, stateFillTokens, statusTokens, surfaceTokens, textTokens } from '../../lib/design-tokens';
import { fr } from '../../lib/i18n/fr';
import type { GuestSession } from '../../types/guest-portal';

interface GuestStep1WelcomeProps {
  session: GuestSession;
  onStart: () => void;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function GuestStep1Welcome({ session, onStart }: GuestStep1WelcomeProps) {
  const title = fr.guestPortal.welcome.title.replace('{guestName}', session.guestName);
  const subtitle = fr.guestPortal.welcome.subtitle.replace('{propertyName}', session.propertyName);
  const statusLabel = session.identityVerified
    ? fr.guestPortal.welcome.statusReady
    : fr.guestPortal.welcome.statusPending;
  const statusClass = session.identityVerified ? statusTokens.success : statusTokens.pending;

  return (
    <section className={clsx('rounded-2xl border p-5 shadow-sm sm:p-6', surfaceTokens.panel, borderTokens.default)}>
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className={clsx('text-2xl font-bold', textTokens.title)}>{title}</h1>
          <p className={clsx('text-sm', textTokens.body)}>{subtitle}</p>
        </div>
        <div className={clsx('inline-flex h-14 w-14 items-center justify-center rounded-2xl', stateFillTokens.neutral)}>
          <Home className={textTokens.body} size={26} aria-hidden="true" />
        </div>
      </div>

      <div className={clsx('mt-4 inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium', statusClass)}>
        {statusLabel}
      </div>

      <div className={clsx('mt-5 rounded-xl border p-4', surfaceTokens.subtle, borderTokens.default)}>
        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className={textTokens.subtle}>{fr.guestPortal.welcome.checkin}</p>
            <p className={clsx('font-semibold', textTokens.title)}>{formatDate(session.checkinDate)}</p>
          </div>
          <div>
            <p className={textTokens.subtle}>{fr.guestPortal.welcome.checkout}</p>
            <p className={clsx('font-semibold', textTokens.title)}>{formatDate(session.checkoutDate)}</p>
          </div>
          <div className="sm:col-span-2">
            <p className={textTokens.subtle}>{fr.guestPortal.welcome.hostedBy}</p>
            <p className={clsx('font-semibold', textTokens.title)}>{session.hostName}</p>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onStart}
        className={clsx('mt-5 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium', ctaTokens.primary)}
      >
        {fr.guestPortal.welcome.cta}
        <ArrowRight size={16} aria-hidden="true" />
      </button>
    </section>
  );
}
