import { useId, useMemo } from 'react';
import { clsx } from '../../lib/clsx';
import { borderTokens, chartTokens, surfaceTokens, textTokens } from '../../lib/design-tokens';
import { fr } from '../../lib/i18n/fr';
import type { SourceBreakdown } from '../../types/analytics';

interface SourceDonutProps {
  data: SourceBreakdown[];
}

const SIZE = 220;
const CENTER = SIZE / 2;
const RADIUS = 72;
const STROKE = 24;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function percentLabel(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'percent',
    maximumFractionDigits: 0,
  }).format(value);
}

export function SourceDonut({ data }: SourceDonutProps) {
  const titleId = useId();
  const positiveData = useMemo(() => data.filter((item) => item.count > 0), [data]);
  const total = positiveData.reduce((sum, item) => sum + item.count, 0);

  if (total === 0) {
    return (
      <div
        className={clsx(
          'flex min-h-[280px] items-center justify-center rounded-lg border text-sm',
          borderTokens.subtle,
          surfaceTokens.subtle,
          textTokens.muted,
        )}
      >
        {fr.analytics.empty.description}
      </div>
    );
  }

  let offset = 0;

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-labelledby={titleId}
          className="h-56 w-56"
        >
          <title id={titleId}>{fr.analytics.charts.sourceTitle}</title>

          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            className={clsx('stroke-[24]', chartTokens.grid)}
          />

          {positiveData.map((entry, index) => {
            const ratio = entry.count / total;
            const segmentLength = ratio * CIRCUMFERENCE;
            const segmentOffset = offset;
            const className = chartTokens.donutSlices[index % chartTokens.donutSlices.length] ?? chartTokens.netStroke;
            offset += segmentLength;

            return (
              <circle
                key={entry.source}
                cx={CENTER}
                cy={CENTER}
                r={RADIUS}
                fill="none"
                strokeWidth={STROKE}
                strokeDasharray={`${segmentLength} ${CIRCUMFERENCE}`}
                strokeDashoffset={-segmentOffset}
                transform={`rotate(-90 ${CENTER} ${CENTER})`}
                className={className}
              >
                <title>{`${fr.analytics.sources[entry.source]}: ${percentLabel(entry.pct)}`}</title>
              </circle>
            );
          })}

          <text
            x={CENTER}
            y={CENTER - 4}
            textAnchor="middle"
            className={clsx('text-xs uppercase tracking-wide', textTokens.subtle)}
          >
            {fr.analytics.kpi.reservations}
          </text>
          <text
            x={CENTER}
            y={CENTER + 20}
            textAnchor="middle"
            className={clsx('text-xl font-semibold', textTokens.title)}
          >
            {total}
          </text>
        </svg>
      </div>

      <ul className="space-y-2">
        {positiveData.map((entry, index) => {
          const colorClass = (chartTokens.donutSlices[index % chartTokens.donutSlices.length] ?? chartTokens.netStroke)
            .replace('stroke-', 'bg-');

          return (
            <li key={entry.source} className="flex items-center justify-between gap-3">
              <span className={clsx('inline-flex items-center gap-2 text-sm', textTokens.body)}>
                <span className={clsx('h-2.5 w-2.5 rounded-full', colorClass)} aria-hidden="true" />
                {fr.analytics.sources[entry.source]}
              </span>
              <span className={clsx('text-sm font-medium', textTokens.muted)}>
                {percentLabel(entry.pct)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
