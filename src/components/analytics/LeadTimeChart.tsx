import { clsx } from '../../lib/clsx';
import { borderTokens, chartTokens, surfaceTokens, textTokens } from '../../lib/design-tokens';
import { fr } from '../../lib/i18n/fr';
import type { LeadTimeBucket } from '../../types/analytics';

interface LeadTimeChartProps {
  data: LeadTimeBucket[];
}

function percentLabel(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'percent',
    maximumFractionDigits: 0,
  }).format(value);
}

export function LeadTimeChart({ data }: LeadTimeChartProps) {
  const fillClass = chartTokens.revenue.replace('fill-', 'bg-');

  return (
    <div className="space-y-3">
      {data.map((bucket) => (
        <div
          key={bucket.label}
          className="grid grid-cols-[5rem_minmax(0,1fr)_6rem] items-center gap-3"
        >
          <span className={clsx('text-sm font-medium', textTokens.title)}>
            {fr.analytics.leadTime[bucket.label as keyof typeof fr.analytics.leadTime]}
          </span>

          <div className={clsx('h-3 overflow-hidden rounded-full border', borderTokens.subtle, surfaceTokens.muted)}>
            <div
              className={clsx('h-full rounded-full', fillClass)}
              style={{ width: `${bucket.pct * 100}%` }}
            />
          </div>

          <span className={clsx('text-right text-sm', textTokens.muted)}>
            {bucket.count} · {percentLabel(bucket.pct)}
          </span>
        </div>
      ))}
    </div>
  );
}
