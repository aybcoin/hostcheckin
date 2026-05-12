import type { ReactNode } from 'react';
import { clsx } from '../../lib/clsx';
import { borderTokens, stateFillTokens, surfaceTokens, textTokens } from '../../lib/design-tokens';
import { GUEST_LOCALES } from '../../lib/i18n/guest';
import { useGuestLocaleCtx, useGuestT } from '../../lib/i18n/guest/context';
import type { GuestPortalStep } from '../../types/guest-portal';

interface GuestPortalLayoutProps {
  children: ReactNode;
  currentStep: GuestPortalStep;
  propertyName: string;
}

const STEP_ORDER: GuestPortalStep[] = ['welcome', 'contract', 'identity', 'confirmation'];

export function GuestPortalLayout({ children, currentStep, propertyName }: GuestPortalLayoutProps) {
  const t = useGuestT();
  const { locale, setLocale } = useGuestLocaleCtx();
  const activeIndex = STEP_ORDER.indexOf(currentStep);

  return (
    <div className={clsx('min-h-screen', surfaceTokens.app)}>
      <header className={clsx('border-b px-4 py-4', borderTokens.default, surfaceTokens.panel)}>
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3">
          <p className={clsx('text-sm font-semibold', textTokens.title)}>{t.app.brand}</p>
          <div className="flex items-center gap-3">
            <p className={clsx('max-w-[14rem] truncate text-sm', textTokens.body)}>{propertyName}</p>
            <div
              className={clsx('inline-flex items-center rounded-full border p-1', borderTokens.default, surfaceTokens.subtle)}
              aria-label={t.guestPortal.aria.languageSwitcher}
            >
              {GUEST_LOCALES.map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={locale === item}
                  onClick={() => setLocale(item)}
                  className={clsx(
                    'inline-flex h-7 min-w-9 items-center justify-center rounded-full border px-2.5 text-[11px] font-semibold transition-colors',
                    locale === item
                      ? clsx(stateFillTokens.neutral, borderTokens.info, textTokens.info)
                      : clsx(surfaceTokens.panel, borderTokens.default, textTokens.subtle),
                  )}
                >
                  {item.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main role="main" aria-label={t.guestPortal.aria.main} className="mx-auto w-full max-w-3xl px-4 py-5 sm:py-8">
        <ol className="mb-6 grid grid-cols-4 gap-2" aria-label={t.guestPortal.aria.steps}>
          {STEP_ORDER.map((step, index) => {
            const isActive = currentStep === step;
            const isDone = index < activeIndex;
            const label = t.guestPortal.steps[step];

            return (
              <li key={step} className="flex flex-col items-center gap-1 text-center">
                <span
                  className={clsx(
                    'inline-flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold',
                    isActive || isDone ? stateFillTokens.neutral : surfaceTokens.panel,
                    borderTokens.default,
                    textTokens.body,
                  )}
                  aria-current={isActive ? 'step' : undefined}
                >
                  {index + 1}
                </span>
                <span className={clsx('text-xs leading-tight', isActive ? textTokens.title : textTokens.subtle)}>{label}</span>
              </li>
            );
          })}
        </ol>

        {children}
      </main>
    </div>
  );
}
