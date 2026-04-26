import { clsx } from '../../lib/clsx';
import { borderTokens, cardTokens, surfaceTokens, textTokens } from '../../lib/design-tokens';
import { formatCurrency } from '../../lib/format';
import { fr } from '../../lib/i18n/fr';
import { formatOccupancyPct } from '../../lib/property-stats-logic';
import type { KpiDelta } from '../../types/analytics';

interface KpiComparisonCardProps {
  label: string;
  delta: KpiDelta;
  format: 'currency' | 'pct' | 'number' | 'days';
}

function formatValue(value: number, format: KpiComparisonCardProps['format']): string {
  if (format === 'currency') return formatCurrency(value);
  if (format === 'pct') return formatOccupancyPct(value);
  if (format === 'days') {
    return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(value)} j`;
  }
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value);
}

function formatPctChange(value: number | null): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('fr-FR', {
    style: 'percent',
    maximumFractionDigits: 1,
    signDisplay: 'always',
  }).format(value);
}

export function KpiComparisonCard({
  label,
  delta,
  format,
}: KpiComparisonCardProps) {
  const trendClass =
    delta.trend === 'up'
      ? textTokens.success
      : delta.trend === 'down'
        ? textTokens.danger
        : textTokens.muted;
  const trendSymbol = delta.trend === 'up' ? '▲' : delta.trend === 'down' ? '▼' : '•';

  return (
    <div
      data-testid={`kpi-comparison-${label}`}
      className={clsx(cardTokens.base, cardTokens.padding.sm, cardTokens.variants.default)}
    >
      <p className={clsx('text-xs uppercase tracking-wide', textTokens.subtle)}>{label}</p>
      <p className={clsx('mt-2 text-2xl font-semibold', textTokens.title)}>{formatValue(delta.current, format)}</p>
      <div
        className={clsx(
          'mt-3 inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium',
          borderTokens.subtle,
          surfaceTokens.subtle,
          trendClass,
        )}
      >
        <span>{fr.analytics.kpi.vsPrev}</span>
        <span aria-hidden="true">{trendSymbol}</span>
        <span>{formatPctChange(delta.pctChange)}</span>
      </div>
    </div>
  );
}
