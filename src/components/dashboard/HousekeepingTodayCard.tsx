import { Sparkles } from 'lucide-react';
import { clsx } from '../../lib/clsx';
import { displayTokens, textTokens } from '../../lib/design-tokens';
import { fr } from '../../lib/i18n/fr';
import { useHousekeepingTasks } from '../../hooks/useHousekeepingTasks';
import {
  computeHousekeepingSummary,
  computeHousekeepingToday,
} from '../../lib/housekeeping-logic';
import { DashboardWidgetCard } from './DashboardWidgetCard';
import { StatusBadge } from '../ui/StatusBadge';

interface HousekeepingTodayCardProps {
  hostId: string;
  onSeeAll: () => void;
  propertyId?: string | null;
}

export function HousekeepingTodayCard({ hostId, onSeeAll, propertyId }: HousekeepingTodayCardProps) {
  const {
    tasks,
    loading,
    error,
    refresh,
  } = useHousekeepingTasks(hostId);
  const filteredTasks = tasks.filter((task) => !propertyId || task.property_id === propertyId);
  const todayItems = computeHousekeepingToday(filteredTasks, new Date(), 4);
  const summary = computeHousekeepingSummary(filteredTasks);
  const primaryTask = todayItems[0];

  return (
    <DashboardWidgetCard
      title={fr.dashboardHousekeeping.cardTitle}
      icon={Sparkles}
      seeAllLabel={fr.dashboardHousekeeping.cardSeeAll}
      onSeeAll={onSeeAll}
      loading={loading}
      error={error}
      onRetry={refresh}
      errorDescription={fr.errors.genericDescription}
    >
      <div className="space-y-1">
        <p className={clsx('text-xs uppercase tracking-wide', textTokens.subtle)}>
          {fr.dashboardHousekeeping.today}
        </p>
        <p className={clsx('text-2xl', displayTokens.number, textTokens.title)}>{todayItems.length}</p>
        <p className={clsx('text-sm', textTokens.muted)}>
          {primaryTask
            ? `${primaryTask.propertyName} · ${primaryTask.guestName || fr.app.guestFallbackName}`
            : fr.dashboardHousekeeping.cardEmpty}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <StatusBadge variant="neutral">{fr.dashboardHousekeeping.today}: {todayItems.length}</StatusBadge>
        {summary.overdue > 0 ? (
          <StatusBadge variant="danger">{fr.dashboardHousekeeping.overdue}: {summary.overdue}</StatusBadge>
        ) : null}
        {summary.criticalToday > 0 ? (
          <StatusBadge variant="danger">{fr.housekeeping.summary.criticalToday}: {summary.criticalToday}</StatusBadge>
        ) : null}
      </div>
    </DashboardWidgetCard>
  );
}
