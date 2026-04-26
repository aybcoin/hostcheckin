import { useId, useMemo } from 'react';
import { clsx } from '../../lib/clsx';
import { chartTokens, textTokens } from '../../lib/design-tokens';
import { fr } from '../../lib/i18n/fr';
import { TRANSACTION_CATEGORIES, type TransactionCategory } from '../../types/finance';

interface CategoryDonutPoint {
  category: TransactionCategory;
  amount: number;
}

interface CategoryDonutProps {
  data: CategoryDonutPoint[];
  total: number;
}

const DONUT_SIZE = 220;
const CENTER = DONUT_SIZE / 2;
const RADIUS = 72;
const STROKE = 24;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function colorForCategory(category: TransactionCategory): string {
  const index = TRANSACTION_CATEGORIES.indexOf(category);
  if (index < 0) return chartTokens.netStroke;
  const paletteIndex = index % chartTokens.donutSlices.length;
  return chartTokens.donutSlices[paletteIndex] ?? chartTokens.netStroke;
}

export function CategoryDonut({ data, total }: CategoryDonutProps) {
  const titleId = useId();

  const positiveData = useMemo(
    () => data.filter((entry) => entry.amount > 0),
    [data],
  );

  let offset = 0;

  return (
    <svg
      viewBox={`0 0 ${DONUT_SIZE} ${DONUT_SIZE}`}
      role="img"
      aria-labelledby={titleId}
      className="h-56 w-56"
    >
      <title id={titleId}>{fr.finance.chart.categoriesTitle}</title>

      <circle
        cx={CENTER}
        cy={CENTER}
        r={RADIUS}
        fill="none"
        className={clsx('stroke-[24]', chartTokens.grid)}
      />

      {total > 0
        ? positiveData.map((entry) => {
          const ratio = entry.amount / total;
          const segmentLength = ratio * CIRCUMFERENCE;
          const segmentOffset = offset;
          offset += segmentLength;
          return (
            <circle
              key={entry.category}
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              fill="none"
              strokeWidth={STROKE}
              strokeDasharray={`${segmentLength} ${CIRCUMFERENCE}`}
              strokeDashoffset={-segmentOffset}
              transform={`rotate(-90 ${CENTER} ${CENTER})`}
              className={colorForCategory(entry.category)}
            />
          );
        })
        : null}

      <text
        x={CENTER}
        y={CENTER - 4}
        textAnchor="middle"
        className={clsx('text-xs uppercase tracking-wide', textTokens.subtle)}
      >
        {fr.finance.chart.total}
      </text>
      <text
        x={CENTER}
        y={CENTER + 20}
        textAnchor="middle"
        className={clsx('text-xl font-semibold', textTokens.title)}
      >
        {Math.round(total)}
      </text>
    </svg>
  );
}
