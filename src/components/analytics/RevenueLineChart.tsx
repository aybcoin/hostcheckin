import { useId, useMemo } from 'react';
import { clsx } from '../../lib/clsx';
import { borderTokens, chartTokens, surfaceTokens, textTokens } from '../../lib/design-tokens';
import { formatCurrency, formatShortDate } from '../../lib/format';
import { fr } from '../../lib/i18n/fr';
import type { MonthlyPoint } from '../../types/analytics';

interface RevenueLineChartProps {
  data: MonthlyPoint[];
  height?: number;
  showPrevYear?: boolean;
}

function monthLabel(month: string): string {
  const formatter = new Intl.DateTimeFormat('fr-FR', { month: 'short' });
  return formatter.format(new Date(`${month}-01T00:00:00Z`)).replace('.', '');
}

function compactValue(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    notation: 'compact',
    maximumFractionDigits: value >= 10000 ? 0 : 1,
  }).format(value);
}

function buildLinePath(
  values: Array<number | null>,
  width: number,
  height: number,
  maxValue: number,
): string {
  if (values.length === 0) return '';

  const denominator = Math.max(values.length - 1, 1);

  return values.reduce((path, value, index) => {
    if (value == null) return path;

    const x = (index / denominator) * width;
    const y = height - (value / maxValue) * height;
    const command = path === '' || values[index - 1] == null ? 'M' : 'L';
    return `${path}${path ? ' ' : ''}${command} ${x} ${y}`;
  }, '');
}

export function RevenueLineChart({
  data,
  height = 200,
  showPrevYear = true,
}: RevenueLineChartProps) {
  const titleId = useId();
  const width = Math.max(420, data.length * 76);
  const margin = { top: 16, right: 12, bottom: 40, left: 52 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = Math.max(80, height - margin.top - margin.bottom);
  const maxValue = Math.max(
    1,
    ...data.flatMap((point) => [point.revenue, showPrevYear ? point.prevYearRevenue ?? 0 : 0]),
  );
  const currentPath = useMemo(
    () => buildLinePath(data.map((point) => point.revenue), innerWidth, innerHeight, maxValue),
    [data, innerHeight, innerWidth, maxValue],
  );
  const previousPath = useMemo(
    () => buildLinePath(data.map((point) => point.prevYearRevenue), innerWidth, innerHeight, maxValue),
    [data, innerHeight, innerWidth, maxValue],
  );

  if (data.length === 0) {
    return (
      <div
        className={clsx(
          'flex min-h-[200px] items-center justify-center rounded-lg border text-sm',
          borderTokens.subtle,
          surfaceTokens.subtle,
          textTokens.muted,
        )}
      >
        {fr.analytics.empty.description}
      </div>
    );
  }

  const currentLegendClass = chartTokens.revenue.replace('fill-', 'bg-');
  const previousLegendClass = chartTokens.netStroke.replace('stroke-', 'border-');

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className={clsx('inline-flex items-center gap-2', textTokens.muted)}>
          <span className={clsx('h-0.5 w-5', currentLegendClass)} aria-hidden="true" />
          {fr.analytics.charts.currentYear}
        </span>
        {showPrevYear ? (
          <span className={clsx('inline-flex items-center gap-2', textTokens.muted)}>
            <span className={clsx('h-0.5 w-5 border-t-2 border-dashed', previousLegendClass)} aria-hidden="true" />
            {fr.analytics.charts.prevYear}
          </span>
        ) : null}
      </div>

      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-labelledby={titleId}
          aria-label={fr.analytics.charts.revenueTitle}
          className="h-auto min-w-full"
        >
          <title id={titleId}>{fr.analytics.charts.revenueTitle}</title>

          {Array.from({ length: 5 }).map((_, index) => {
            const ratio = index / 4;
            const y = margin.top + innerHeight - ratio * innerHeight;
            return (
              <g key={index}>
                <line
                  x1={margin.left}
                  y1={y}
                  x2={width - margin.right}
                  y2={y}
                  className={clsx('stroke-1', chartTokens.grid)}
                />
                <text
                  x={margin.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  className={clsx('text-[10px]', textTokens.subtle)}
                >
                  {compactValue(maxValue * ratio)}
                </text>
              </g>
            );
          })}

          <line
            x1={margin.left}
            y1={margin.top + innerHeight}
            x2={width - margin.right}
            y2={margin.top + innerHeight}
            className={clsx('stroke-1', chartTokens.axis)}
          />

          <g transform={`translate(${margin.left} ${margin.top})`}>
            <path d={currentPath} fill="none" className={clsx('stroke-2', chartTokens.revenueStroke)} />
            {showPrevYear && previousPath ? (
              <path
                d={previousPath}
                fill="none"
                strokeDasharray="4 2"
                className={clsx('stroke-2', chartTokens.netStroke)}
              />
            ) : null}

            {data.map((point, index) => {
              const x = data.length === 1 ? innerWidth / 2 : (index / (data.length - 1)) * innerWidth;
              const currentY = innerHeight - (point.revenue / maxValue) * innerHeight;
              const previousY =
                point.prevYearRevenue == null ? null : innerHeight - (point.prevYearRevenue / maxValue) * innerHeight;
              const label = monthLabel(point.month);
              const dateLabel = formatShortDate(`${point.month}-01`);

              return (
                <g key={point.month}>
                  <circle cx={x} cy={currentY} r={3} className={chartTokens.revenue} aria-hidden="true">
                    <title>{`${dateLabel}: ${formatCurrency(point.revenue)}`}</title>
                  </circle>
                  {showPrevYear && previousY != null ? (
                    <circle cx={x} cy={previousY} r={3} className={chartTokens.net} aria-hidden="true">
                      <title>{`${dateLabel}: ${formatCurrency(point.prevYearRevenue)}`}</title>
                    </circle>
                  ) : null}
                  <text
                    x={x}
                    y={innerHeight + 18}
                    textAnchor="middle"
                    className={clsx('text-[10px]', textTokens.subtle)}
                  >
                    {label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}
