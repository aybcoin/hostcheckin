import { BadgeCheck, Lock, ShieldCheck } from 'lucide-react';
import type { TrustMetrics } from '../../lib/trust-metrics';
import { clsx } from '../../lib/clsx';
import { borderTokens, stateFillTokens, surfaceTokens, textTokens } from '../../lib/design-tokens';
import { fr } from '../../lib/i18n/fr';

interface TrustBarProps {
  metrics: TrustMetrics;
}

interface TrustItemConfig {
  key: 'signatures' | 'identities' | 'deposits';
  icon: typeof ShieldCheck;
  label: string;
  value: string;
}

export function TrustBar({ metrics }: TrustBarProps) {
  const tooltip = fr.trust.tooltip(metrics.windowDays);
  const items: TrustItemConfig[] = [
    {
      key: 'signatures',
      icon: ShieldCheck,
      label: fr.trust.signatures,
      value: String(metrics.signatures),
    },
    {
      key: 'identities',
      icon: BadgeCheck,
      label: fr.trust.identities,
      value: String(metrics.identities),
    },
    {
      key: 'deposits',
      icon: Lock,
      label: fr.trust.deposits,
      value: metrics.deposits > 0 ? String(metrics.deposits) : fr.trust.empty,
    },
  ];

  return (
    <section
      role="region"
      aria-label={fr.trust.region}
      className={clsx(
        'h-14 w-full overflow-x-auto rounded-xl border px-2 py-1.5',
        surfaceTokens.panel,
        borderTokens.subtle,
      )}
    >
      <div className="flex min-w-max items-center gap-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.key} className="group relative">
              <div
                role="status"
                tabIndex={0}
                aria-label={fr.trust.itemAria(item.label, item.value, metrics.windowDays)}
                className={clsx(
                  'inline-flex h-11 items-center gap-2 rounded-lg border px-3 focus-visible:outline-none focus-visible:ring-2',
                  surfaceTokens.subtle,
                  borderTokens.subtle,
                )}
              >
                <span className={clsx('inline-flex h-6 w-6 items-center justify-center rounded-full', stateFillTokens.success)}>
                  <Icon size={13} className={textTokens.success} aria-hidden="true" />
                </span>
                <span className="flex items-baseline gap-1.5">
                  <span className={clsx('text-sm font-semibold tabular-nums', textTokens.body)}>{item.value}</span>
                  <span className={clsx('text-xs', textTokens.muted)}>{item.label}</span>
                </span>
              </div>

              <span
                role="tooltip"
                className={clsx(
                  'pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-lg border px-2 py-1 text-xs opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100',
                  surfaceTokens.panel,
                  borderTokens.subtle,
                  textTokens.muted,
                )}
              >
                {tooltip}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
