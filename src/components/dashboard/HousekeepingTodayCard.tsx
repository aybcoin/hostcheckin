import { AlertTriangle, ArrowRight, Sparkles } from 'lucide-react';
import { clsx } from '../../lib/clsx';
import { borderTokens, statusTokens, textTokens } from '../../lib/design-tokens';
import { fr } from '../../lib/i18n/fr';
import { useHousekeepingTasks } from '../../hooks/useHousekeepingTasks';
import {
  computeHousekeepingSummary,
  computeHousekeepingToday,
} from '../../lib/housekeeping-logic';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';

interface HousekeepingTodayCardProps {
  hostId: string;
  onSeeAll: () => void;
}

export function HousekeepingTodayCard({ hostId, onSeeAll }: HousekeepingTodayCardProps) {
  const { tasks, loading } = useHousekeepingTasks(hostId);
  const todayItems = computeHousekeepingToday(tasks, new Date(), 4);
  const summary = computeHousekeepingSummary(tasks);

  return (
    <Card variant="default" padding="md" className={clsx('space-y-3', borderTokens.default)}>
      <header className="flex items-center justify-between gap-2">
        <h2 className={clsx('flex items-center gap-2 text-base font-semibold', textTokens.title)}>
          <Sparkles aria-hidden size={16} />
          {fr.dashboardHousekeeping.cardTitle}
        </h2>
        <Button variant="tertiary" size="sm" onClick={onSeeAll}>
          {fr.dashboardHousekeeping.cardSeeAll}
          <ArrowRight aria-hidden size={14} />
        </Button>
      </header>

      <div className="flex flex-wrap gap-2 text-xs">
        <span className={clsx('rounded-full border px-2 py-0.5', statusTokens.neutral)}>
          {fr.dashboardHousekeeping.today}: <strong>{todayItems.length}</strong>
        </span>
        {summary.overdue > 0 ? (
          <span className={clsx('rounded-full border px-2 py-0.5', statusTokens.danger)}>
            <AlertTriangle aria-hidden size={11} className="mr-1 inline-block align-text-bottom" />
            {fr.dashboardHousekeeping.overdue}: <strong>{summary.overdue}</strong>
          </span>
        ) : null}
        {summary.criticalToday > 0 ? (
          <span className={clsx('rounded-full border px-2 py-0.5', statusTokens.danger)}>
            {fr.housekeeping.summary.criticalToday}: <strong>{summary.criticalToday}</strong>
          </span>
        ) : null}
      </div>

      {loading ? (
        <div className="space-y-2" aria-hidden="true">
          {Array.from({ length: 3 }).map((_, idx) => (
            <Skeleton key={idx} variant="text" className="h-4 w-full" />
          ))}
        </div>
      ) : todayItems.length === 0 ? (
        <p className={clsx('text-sm', textTokens.muted)}>
          {fr.dashboardHousekeeping.cardEmpty}
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {todayItems.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-2 py-2 text-sm">
              <div className="min-w-0">
                <p className={clsx('truncate font-medium', textTokens.title)}>{item.propertyName || '—'}</p>
                <p className={clsx('truncate text-xs', textTokens.muted)}>
                  {item.guestName || fr.app.guestFallbackName}
                </p>
              </div>
              <span
                className={clsx(
                  'rounded-full border px-2 py-0.5 text-[11px] font-medium',
                  item.priority === 'critical'
                    ? statusTokens.danger
                    : item.priority === 'high'
                      ? statusTokens.warning
                      : statusTokens.neutral,
                )}
              >
                {fr.housekeeping.priorityShort[item.priority]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
