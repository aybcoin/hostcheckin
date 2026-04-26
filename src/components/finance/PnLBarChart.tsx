import { useId } from 'react';
import { clsx } from '../../lib/clsx';
import { chartTokens, textTokens } from '../../lib/design-tokens';
import { fr } from '../../lib/i18n/fr';

interface PnLBarChartPoint {
  month: string;
  revenue: number;
  expenses: number;
}

interface PnLBarChartProps {
  data: PnLBarChartPoint[];
  height?: number;
}

function monthLabel(month: string): string {
  const [year, numericMonth] = month.split('-');
  return `${numericMonth}/${year.slice(-2)}`;
}

export function PnLBarChart({ data, height = 280 }: PnLBarChartProps) {
  const titleId = useId();
  const width = Math.max(360, data.length * 72);
  const margin = { top: 16, right: 14, bottom: 72, left: 46 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = Math.max(80, height - margin.top - margin.bottom);
  const maxValue = Math.max(1, ...data.flatMap((point) => [point.revenue, point.expenses]));
  const groupWidth = innerWidth / Math.max(data.length, 1);
  const barsWidth = Math.max(10, groupWidth * 0.58);
  const barWidth = Math.max(6, (barsWidth - 4) / 2);

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-labelledby={titleId}
        className="h-auto min-w-full"
      >
        <title id={titleId}>{fr.finance.chart.pnlTitle}</title>

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
                {Math.round(maxValue * ratio)}
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

        {data.map((point, index) => {
          const groupStartX = margin.left + index * groupWidth + (groupWidth - barsWidth) / 2;
          const revenueHeight = (point.revenue / maxValue) * innerHeight;
          const expensesHeight = (point.expenses / maxValue) * innerHeight;
          const baseline = margin.top + innerHeight;
          const labelX = groupStartX + barsWidth / 2;

          return (
            <g key={point.month}>
              <rect
                x={groupStartX}
                y={baseline - revenueHeight}
                width={barWidth}
                height={revenueHeight}
                rx={2}
                className={chartTokens.revenue}
              />
              <rect
                x={groupStartX + barWidth + 4}
                y={baseline - expensesHeight}
                width={barWidth}
                height={expensesHeight}
                rx={2}
                className={chartTokens.expenses}
              />
              <text
                x={labelX}
                y={baseline + 18}
                transform={`rotate(45 ${labelX} ${baseline + 18})`}
                textAnchor="start"
                className={clsx('text-[10px]', textTokens.subtle)}
              >
                {monthLabel(point.month)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
