import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, Clock3 } from 'lucide-react';
import type { TodayItem } from '../../lib/dashboard-data';
import { clsx } from '../../lib/clsx';
import { borderTokens, textTokens } from '../../lib/design-tokens';
import { fr } from '../../lib/i18n/fr';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { StatusBadge } from '../ui/StatusBadge';

interface TodaySectionProps {
  items: TodayItem[];
  onAction: (id: string) => void;
  onViewAll?: () => void;
  overflowCount?: number;
}

function urgencyStyles(urgency: TodayItem['urgency']) {
  if (urgency === 'critical') {
    return { icon: AlertTriangle, tone: 'danger' as const, label: fr.dashboard.today.urgencyCritical };
  }
  if (urgency === 'high') {
    return { icon: Clock3, tone: 'warning' as const, label: fr.dashboard.today.urgencyHigh };
  }
  return { icon: Clock3, tone: 'neutral' as const, label: fr.dashboard.today.urgencyNormal };
}

function typeLabel(type: TodayItem['type']): string {
  if (type === 'arrival') return fr.dashboard.today.typeArrival;
  if (type === 'departure') return fr.dashboard.today.typeDeparture;
  return fr.dashboard.today.typeAction;
}

function typeIcon(type: TodayItem['type']) {
  if (type === 'arrival') return ArrowDownCircle;
  if (type === 'departure') return ArrowUpCircle;
  return AlertTriangle;
}

export function TodaySection({
  items,
  onAction,
  onViewAll,
  overflowCount = 0,
}: TodaySectionProps) {
  return (
    <section role="region" aria-label={fr.dashboard.today.region} className="space-y-3">
      <div>
        <h2 className={clsx('text-lg font-semibold', textTokens.title)}>{fr.dashboard.today.title}</h2>
        <p className={clsx('text-sm', textTokens.muted)}>{fr.dashboard.today.subtitle}</p>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<ArrowDownCircle size={20} aria-hidden="true" />}
          title={fr.dashboard.today.emptyTitle}
          description={fr.dashboard.today.emptyDescription}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {items.map((item) => {
            const urgency = urgencyStyles(item.urgency);
            const TypeIcon = typeIcon(item.type);
            const UrgencyIcon = urgency.icon;
            return (
              <Card key={item.id} variant="default" padding="sm" className={clsx('p-4', borderTokens.default)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <StatusBadge variant="neutral" icon={<TypeIcon />}>
                        {typeLabel(item.type)}
                      </StatusBadge>
                      <span className={clsx('text-xs', textTokens.subtle)}>{item.time}</span>
                    </div>

                    <p className={clsx('mt-2 truncate text-sm font-semibold', textTokens.title)}>{item.guestName}</p>
                    <p className={clsx('truncate text-sm', textTokens.muted)}>{item.propertyName}</p>
                  </div>

                  <StatusBadge variant={urgency.tone} size="md" icon={<UrgencyIcon />}>
                    {urgency.label}
                  </StatusBadge>
                </div>

                {item.ctaLabel ? (
                  <div className="mt-3">
                    <Button
                      size="sm"
                      variant={item.ctaVariant ?? 'secondary'}
                      className="w-full sm:w-auto"
                      onClick={() => onAction(item.id.split(':')[0])}
                      aria-label={item.ctaLabel}
                      data-testid={`dashboard-now-cta-${item.id.split(':')[0]}`}
                    >
                      {item.ctaLabel}
                    </Button>
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}

      {onViewAll || overflowCount > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {overflowCount > 0 ? (
            <p className={clsx('text-sm', textTokens.muted)}>
              {fr.dashboard.today.moreItems(overflowCount)}
            </p>
          ) : <span />}
          {onViewAll ? (
            <button
              type="button"
              onClick={onViewAll}
              className={clsx(
                'text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2',
                textTokens.body,
              )}
            >
              {fr.dashboard.today.viewFullAgenda}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
