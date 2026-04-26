import {
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  type LucideIcon,
} from 'lucide-react';
import {
  cloneElement,
  isValidElement,
  type ReactNode,
} from 'react';
import { clsx } from '../../lib/clsx';
import {
  accentTokens,
  borderTokens,
  displayTokens,
  surfaceTokens,
  textTokens,
} from '../../lib/design-tokens';
import { Card } from './Card';
import { StatusBadge } from './StatusBadge';

interface KpiCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: { delta: number; pctChange: number | null; trend: 'up' | 'down' | 'flat' };
  href?: string;
  onClick?: () => void;
  variant?: 'default' | 'accent';
  className?: string;
}

function renderIcon(icon: ReactNode): ReactNode {
  if (isValidElement<{ className?: string; size?: number; 'aria-hidden'?: boolean }>(icon)) {
    return cloneElement(icon, {
      size: 16,
      'aria-hidden': true,
      className: clsx('shrink-0', icon.props.className),
    });
  }

  return (
    <span aria-hidden="true" className="shrink-0">
      {icon}
    </span>
  );
}

function trendIcon(trend: KpiCardProps['trend']): LucideIcon {
  if (!trend || trend.trend === 'flat') return Minus;
  return trend.trend === 'up' ? ArrowUpRight : ArrowDownRight;
}

function trendVariant(trend: KpiCardProps['trend']): 'success' | 'danger' | 'neutral' {
  if (!trend || trend.trend === 'flat') return 'neutral';
  return trend.trend === 'up' ? 'success' : 'danger';
}

function formatTrendValue(trend: NonNullable<KpiCardProps['trend']>): string {
  if (trend.pctChange === null) {
    return `${trend.delta > 0 ? '+' : ''}${trend.delta}`;
  }

  const rounded = new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 1,
  }).format(Math.abs(trend.pctChange));

  const prefix = trend.trend === 'down' ? '-' : trend.trend === 'up' ? '+' : '';
  return `${prefix}${rounded}%`;
}

function KpiCardContent({ label, value, icon, trend }: Omit<KpiCardProps, 'href' | 'onClick' | 'variant' | 'className'>) {
  const TrendIcon = trendIcon(trend);

  return (
    <div className="flex h-full flex-col justify-between gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className={clsx('text-xs font-medium uppercase tracking-wider', textTokens.subtle)}>{label}</p>
          <p className={clsx('text-3xl', displayTokens.number, textTokens.title)}>{value}</p>
        </div>
        {icon ? (
          <span
            className={clsx(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
              surfaceTokens.muted,
              textTokens.muted,
            )}
          >
            {renderIcon(icon)}
          </span>
        ) : null}
      </div>

      {trend ? (
        <div>
          <StatusBadge variant={trendVariant(trend)} size="sm" icon={<TrendIcon />}>
            {formatTrendValue(trend)}
          </StatusBadge>
        </div>
      ) : null}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  icon,
  trend,
  href,
  onClick,
  variant = 'default',
  className,
}: KpiCardProps) {
  const rootClassName = clsx(
    'h-full rounded-2xl',
    variant === 'accent'
      ? clsx(accentTokens.bgLight, borderTokens.success)
      : clsx(surfaceTokens.panel, borderTokens.default),
    (href || onClick) && 'cursor-pointer hover:shadow-md',
    className,
  );

  const content = <KpiCardContent label={label} value={value} icon={icon} trend={trend} />;

  if (href) {
    return (
      <Card as="a" href={href} variant="default" padding="md" interactive className={rootClassName}>
        {content}
      </Card>
    );
  }

  if (onClick) {
    return (
      <Card
        as="button"
        type="button"
        onClick={onClick}
        variant="default"
        padding="md"
        interactive
        className={clsx('w-full text-left', rootClassName)}
      >
        {content}
      </Card>
    );
  }

  return (
    <Card variant="default" padding="md" className={rootClassName}>
      {content}
    </Card>
  );
}
