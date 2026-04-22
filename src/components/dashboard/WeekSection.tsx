import { CalendarDays, ChevronRight } from 'lucide-react';
import type { WeekItem } from '../../lib/dashboard-data';
import { clsx } from '../../lib/clsx';
import { borderTokens, statusTokens, surfaceTokens, textTokens } from '../../lib/design-tokens';
import { fr } from '../../lib/i18n/fr';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';

interface WeekSectionProps {
  items: WeekItem[];
  onAction: (id: string) => void;
}

export function WeekSection({ items, onAction }: WeekSectionProps) {
  const groupedByDay = items.reduce<Record<string, WeekItem[]>>((acc, item) => {
    const bucket = acc[item.dayLabel] || [];
    bucket.push(item);
    acc[item.dayLabel] = bucket;
    return acc;
  }, {});

  const sortedDays = Object.keys(groupedByDay);

  return (
    <section role="region" aria-label={fr.dashboard.week.region} className="space-y-3">
      <div>
        <h2 className={clsx('text-lg font-semibold', textTokens.title)}>{fr.dashboard.week.title}</h2>
        <p className={clsx('text-sm', textTokens.muted)}>{fr.dashboard.week.subtitle}</p>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<CalendarDays size={20} aria-hidden="true" />}
          title={fr.dashboard.week.emptyTitle}
          description={fr.dashboard.week.emptyDescription}
        />
      ) : (
        <div className="space-y-3">
          {sortedDays.map((day) => (
            <Card key={day} variant="default" padding="sm" className={clsx('p-4', borderTokens.default)}>
              <h3 className={clsx('mb-3 text-sm font-semibold', textTokens.title)}>{day}</h3>
              <ul className="space-y-2">
                {groupedByDay[day].map((item) => (
                  <li
                    key={item.id}
                    className={clsx('flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between', borderTokens.subtle, surfaceTokens.subtle)}
                  >
                    <div className="min-w-0">
                      <p className={clsx('truncate text-sm font-medium', textTokens.title)}>
                        {item.guestName} · {item.propertyName}
                      </p>
                      <p className={clsx('text-sm', textTokens.muted)}>{item.actionLabel}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.urgency === 'high' ? (
                        <span className={clsx('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium', statusTokens.warning)}>
                          {fr.dashboard.week.urgencyHigh}
                        </span>
                      ) : (
                        <Badge variant="neutral">{fr.dashboard.week.urgencyNormal}</Badge>
                      )}
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onAction(item.id)}
                        aria-label={fr.dashboard.week.openCta}
                      >
                        <ChevronRight size={14} aria-hidden="true" />
                        {fr.dashboard.week.openCta}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
