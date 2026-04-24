import type { ReactNode } from 'react';
import { clsx } from '../../lib/clsx';
import { borderTokens, stateFillTokens, surfaceTokens, textTokens } from '../../lib/design-tokens';
import { fr } from '../../lib/i18n/fr';
import type { GuestPortalStep } from '../../types/guest-portal';

interface GuestPortalLayoutProps {
  children: ReactNode;
  currentStep: GuestPortalStep;
  propertyName: string;
}

const STEP_ORDER: GuestPortalStep[] = ['welcome', 'contract', 'identity', 'confirmation'];

export function GuestPortalLayout({ children, currentStep, propertyName }: GuestPortalLayoutProps) {
  const activeIndex = STEP_ORDER.indexOf(currentStep);

  return (
    <div className={clsx('min-h-screen', surfaceTokens.app)}>
      <header className={clsx('border-b px-4 py-4', borderTokens.default, surfaceTokens.panel)}>
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3">
          <p className={clsx('text-sm font-semibold', textTokens.title)}>{fr.app.brand}</p>
          <p className={clsx('truncate text-sm', textTokens.body)}>{propertyName}</p>
        </div>
      </header>

      <main role="main" aria-label="Portail invité" className="mx-auto w-full max-w-3xl px-4 py-5 sm:py-8">
        <ol className="mb-6 grid grid-cols-4 gap-2" aria-label="Étapes du portail invité">
          {STEP_ORDER.map((step, index) => {
            const isActive = currentStep === step;
            const isDone = index < activeIndex;
            const label = fr.guestPortal.steps[step];

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
