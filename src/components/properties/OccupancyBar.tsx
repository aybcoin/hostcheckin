import { clsx } from '../../lib/clsx';
import { borderTokens, stateFillTokens, textTokens } from '../../lib/design-tokens';
import { fr } from '../../lib/i18n/fr';
import { formatOccupancyPct } from '../../lib/property-stats-logic';

interface OccupancyBarProps {
  rate: number;
  size?: 'sm' | 'md';
}

const TRACK_BG_TOKEN = borderTokens.default.replace('border-', 'bg-');

export function OccupancyBar({ rate, size = 'sm' }: OccupancyBarProps) {
  const clampedRate = Math.max(0, Math.min(1, rate));
  const label = formatOccupancyPct(clampedRate);
  const fillClassName = clampedRate >= 0.7
    ? stateFillTokens.success
    : clampedRate >= 0.4
      ? stateFillTokens.warning
      : stateFillTokens.danger;

  return (
    <div className="flex items-center gap-3">
      <div
        role="img"
        aria-label={fr.portfolio.card.occupancyAria(label)}
        className={clsx(
          'w-full overflow-hidden rounded-full',
          TRACK_BG_TOKEN,
          size === 'md' ? 'h-3' : 'h-2',
        )}
      >
        <div
          className={clsx(
            'h-full rounded-full transition-[width]',
            fillClassName,
          )}
          style={{ width: `${Math.round(clampedRate * 100)}%` }}
        />
      </div>
      <span className={clsx(size === 'md' ? 'text-sm' : 'text-xs', textTokens.muted)}>
        {label}
      </span>
    </div>
  );
}
