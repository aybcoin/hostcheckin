import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, Clock3 } from 'lucide-react';
import type { TodayItem } from '../../lib/dashboard-data';
import { clsx } from '../../lib/clsx';
import { borderTokens, statusTokens, surfaceTokens, textTokens } from '../../lib/design-tokens';
import { fr } from '../../lib/i18n/fr';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';

interface TodaySectionProps {
  items: TodayItem[];
  onAction: (id: string) => void;
}

function urgencyStyles(urgency: TodayItem['urgency']) {
  if (urgency === 'critical') {
    return { icon: AlertTriangle, tone: statusTokens.danger, label: fr.dashboard.today.urgencyCritical };
  }
  if (urgency === 'high') {
    return { icon: Clock3, tone: statusTokens.warning, label: fr.dashboard.today.urgencyHigh };
  }
  return { icon: Clock3, tone: statusTokens.neutral, label: fr.dashboard.today.urgencyNormal };
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

export function TodaySection({ items, onAction }: TodaySectionProps) {
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
                      <span className={clsx('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium', surfaceTokens.subtle, borderTokens.subtle, textTokens.body)}>
                        <TypeIcon size={12} aria-hidden="true" className="mr-1" />
                        {typeLabel(item.type)}
                      </span>
                      <span className={clsx('text-xs', textTokens.subtle)}>{item.time}</span>
                    </div>

                    <p className={clsx('mt-2 truncate text-sm font-semibold', textTokens.title)}>{item.guestName}</p>
                    <p className={clsx('truncate text-sm', textTokens.muted)}>{item.propertyName}</p>
                  </div>

                  <span className={clsx('inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium', urgency.tone)}>
                    <UrgencyIcon size={12} aria-hidden="true" />
                    {urgency.label}
                  </span>
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
    </section>
  );
}
