import { clsx } from '../../lib/clsx';
import { cardTokens, textTokens } from '../../lib/design-tokens';

interface KpiCardProps {
  label: string;
  value: string;
  tone?: 'neutral' | 'success' | 'danger' | 'warning';
  helper?: string;
}

export function KpiCard({
  label,
  value,
  tone = 'neutral',
  helper,
}: KpiCardProps) {
  const toneClass =
    tone === 'success'
      ? textTokens.success
      : tone === 'danger'
        ? textTokens.danger
        : tone === 'warning'
          ? textTokens.warning
          : textTokens.title;

  return (
    <div className={clsx(cardTokens.base, cardTokens.padding.sm, cardTokens.variants.default)}>
      <p className={clsx('text-xs uppercase tracking-wide', textTokens.subtle)}>{label}</p>
      <p className={clsx('mt-1 text-2xl font-semibold', toneClass)}>{value}</p>
      {helper ? <p className={clsx('mt-1 text-xs', textTokens.muted)}>{helper}</p> : null}
    </div>
  );
}
