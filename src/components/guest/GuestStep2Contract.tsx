import { useState } from 'react';
import { ArrowRight, FileText } from 'lucide-react';
import { toast } from '../../lib/toast';
import { clsx } from '../../lib/clsx';
import { borderTokens, ctaTokens, statusTokens, surfaceTokens, textTokens } from '../../lib/design-tokens';
import { clauses } from '../../lib/i18n/guest/clauses';
import { useGuestLocaleCtx, useGuestT } from '../../lib/i18n/guest/context';
import type { GuestSession } from '../../types/guest-portal';

interface GuestStep2ContractProps {
  session: GuestSession;
  onSign: () => Promise<boolean>;
}

export function GuestStep2Contract({ session, onSign }: GuestStep2ContractProps) {
  const t = useGuestT();
  const { locale } = useGuestLocaleCtx();
  const [accepted, setAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!accepted || isSubmitting) return;

    setIsSubmitting(true);
    const ok = await onSign();
    if (ok) {
      toast.success(t.guestPortal.contract.signed);
    } else {
      toast.error(t.guestPortal.errors.signError);
    }
    setIsSubmitting(false);
  };

  return (
    <section className={clsx('rounded-2xl border p-5 shadow-sm sm:p-6', surfaceTokens.panel, borderTokens.default)}>
      <h2 className={clsx('text-xl font-bold', textTokens.title)}>{t.guestPortal.contract.title}</h2>
      <p className={clsx('mt-1 text-sm', textTokens.body)}>{t.guestPortal.contract.instruction}</p>

      <details open className={clsx('mt-4 rounded-xl border p-4', borderTokens.default, surfaceTokens.subtle)}>
        <summary className={clsx('cursor-pointer text-sm font-semibold', textTokens.title)}>
          {t.guestPortal.contract.clausesSummaryTitle}
        </summary>
        <ol className="mt-3 space-y-3">
          {clauses[locale].map((clause) => (
            <li key={clause.title} className={clsx('rounded-xl border p-3', borderTokens.default, surfaceTokens.panel)}>
              <p className={clsx('text-sm font-semibold', textTokens.title)}>{clause.title}</p>
              <p className={clsx('mt-1 text-sm leading-6', textTokens.body)}>{clause.body}</p>
            </li>
          ))}
        </ol>
      </details>

      {session.contractUrl ? (
        <div className="mt-4 space-y-3">
          <div className={clsx('rounded-xl border p-3 text-sm', statusTokens.info)}>
            {t.guestPortal.contract.legalNotice}
          </div>
          <div className={clsx('overflow-hidden rounded-xl border', borderTokens.default)}>
            <iframe
              src={session.contractUrl}
              title={t.guestPortal.contract.title}
              className={clsx('h-[360px] w-full', surfaceTokens.subtle)}
            />
          </div>
          <a
            href={session.contractUrl}
            target="_blank"
            rel="noreferrer"
            className={clsx('inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium', ctaTokens.secondary)}
          >
            <FileText size={15} aria-hidden="true" />
            {t.guestPortal.contract.viewContract}
          </a>
        </div>
      ) : (
        <div className={clsx('mt-4 rounded-xl border p-3 text-sm', statusTokens.warning)}>
          {t.guestPortal.contract.noContract}
        </div>
      )}

      <label className={clsx('mt-4 flex items-start gap-3 rounded-xl border p-3 text-sm', borderTokens.default, surfaceTokens.subtle)}>
        <input
          type="checkbox"
          checked={accepted}
          onChange={(event) => setAccepted(event.target.checked)}
          className={clsx('mt-0.5 h-4 w-4 rounded border', borderTokens.strong)}
          required
        />
        <span className={textTokens.body}>{t.guestPortal.contract.acceptLabel}</span>
      </label>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!accepted || isSubmitting}
        className={clsx(
          'mt-5 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50',
          ctaTokens.primary,
        )}
      >
        {isSubmitting ? t.guestPortal.contract.signing : t.guestPortal.contract.cta}
        {!isSubmitting ? <ArrowRight size={16} aria-hidden="true" /> : null}
      </button>
    </section>
  );
}
