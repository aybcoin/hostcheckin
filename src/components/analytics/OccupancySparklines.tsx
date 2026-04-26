import { clsx } from '../../lib/clsx';
import { borderTokens, stateFillTokens, surfaceTokens, textTokens } from '../../lib/design-tokens';
import { fr } from '../../lib/i18n/fr';
import { formatOccupancyPct } from '../../lib/property-stats-logic';
import type { Property } from '../../lib/supabase';
import type { OccupancyPoint } from '../../types/analytics';

interface OccupancySparklinesProps {
  data: OccupancyPoint[];
  properties: Property[];
}

function monthLabel(month: string): string {
  const formatter = new Intl.DateTimeFormat('fr-FR', { month: 'short' });
  return formatter.format(new Date(`${month}-01T00:00:00Z`)).replace('.', '');
}

function fillToken(rate: number): string {
  const token =
    rate >= 0.7
      ? stateFillTokens.success
      : rate >= 0.4
        ? stateFillTokens.warning
        : stateFillTokens.danger;

  return token.replace('bg-', 'fill-');
}

export function OccupancySparklines({
  data,
  properties,
}: OccupancySparklinesProps) {
  const visibleProperties = properties.filter((property) =>
    data.some((point) => point.propertyId === property.id));
  const months = Array.from(new Set(data.map((point) => point.month))).sort();

  if (visibleProperties.length === 0 || months.length === 0) {
    return (
      <div
        className={clsx(
          'flex min-h-[160px] items-center justify-center rounded-lg border text-sm',
          borderTokens.subtle,
          surfaceTokens.subtle,
          textTokens.muted,
        )}
      >
        {fr.analytics.empty.description}
      </div>
    );
  }

  const width = Math.max(120, months.length * 20);
  const height = 44;
  const gap = 6;
  const barWidth = Math.max(6, (width - gap * (months.length - 1)) / months.length);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 overflow-x-auto pl-[9.5rem] text-[11px]">
        {months.map((month) => (
          <span key={month} className={clsx('shrink-0 text-center', textTokens.subtle)} style={{ width: barWidth }}>
            {monthLabel(month)}
          </span>
        ))}
      </div>

      <div className="space-y-3">
        {visibleProperties.map((property) => {
          const points = months.map((month) =>
            data.find((point) => point.propertyId === property.id && point.month === month) ?? {
              month,
              propertyId: property.id,
              propertyName: property.name,
              rate: 0,
              occupiedDays: 0,
              totalDays: 0,
            });

          return (
            <div key={property.id} className="flex items-center gap-4">
              <div className="w-36 shrink-0">
                <p className={clsx('truncate text-sm font-medium', textTokens.title)}>{property.name}</p>
              </div>

              <svg
                viewBox={`0 0 ${width} ${height}`}
                role="img"
                aria-label={`${fr.analytics.charts.occupancyTitle} ${property.name}`}
                className="h-11 min-w-[10rem] flex-1"
              >
                {points.map((point, index) => {
                  const barHeight = Math.max(2, point.rate * (height - 8));
                  const x = index * (barWidth + gap);
                  const y = height - barHeight;

                  return (
                    <rect
                      key={`${point.propertyId}-${point.month}`}
                      x={x}
                      y={y}
                      width={barWidth}
                      height={barHeight}
                      rx={2}
                      className={fillToken(point.rate)}
                    >
                      <title>{`${monthLabel(point.month)}: ${formatOccupancyPct(point.rate)}`}</title>
                    </rect>
                  );
                })}
              </svg>
            </div>
          );
        })}
      </div>
    </div>
  );
}
