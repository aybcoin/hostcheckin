import {
  Wrench,
} from 'lucide-react';
import { clsx } from '../../lib/clsx';
import { displayTokens, textTokens } from '../../lib/design-tokens';
import { fr } from '../../lib/i18n/fr';
import { useMaintenanceTickets } from '../../hooks/useMaintenanceTickets';
import {
  computeMaintenanceSummary,
  computeUrgentTickets,
} from '../../lib/maintenance-logic';
import { StatusBadge } from '../ui/StatusBadge';
import { DashboardWidgetCard } from './DashboardWidgetCard';

interface MaintenanceUrgentCardProps {
  hostId: string;
  onSeeAll: () => void;
  propertyId?: string | null;
}

export function MaintenanceUrgentCard({ hostId, onSeeAll, propertyId }: MaintenanceUrgentCardProps) {
  const {
    tickets,
    loading,
    error,
    refresh,
  } = useMaintenanceTickets(hostId);
  const filteredTickets = tickets.filter((ticket) => !propertyId || ticket.property_id === propertyId);
  const urgentItems = computeUrgentTickets(filteredTickets, 4);
  const summary = computeMaintenanceSummary(filteredTickets);
  const primaryTicket = urgentItems[0];
  const openCount = summary.open + summary.inProgress + summary.waitingParts;

  return (
    <DashboardWidgetCard
      title={fr.dashboardMaintenance.cardTitle}
      icon={Wrench}
      seeAllLabel={fr.dashboardMaintenance.cardSeeAll}
      onSeeAll={onSeeAll}
      loading={loading}
      error={error}
      onRetry={refresh}
      errorDescription={fr.errors.genericDescription}
    >
      <div className="space-y-1">
        <p className={clsx('text-xs uppercase tracking-wide', textTokens.subtle)}>
          {fr.dashboardMaintenance.urgent}
        </p>
        <p className={clsx('text-2xl', displayTokens.number, textTokens.title)}>{summary.urgent}</p>
        <p className={clsx('text-sm', textTokens.muted)}>
          {primaryTicket
            ? `${primaryTicket.title} · ${primaryTicket.property_name || fr.dashboard.common.propertyFallback}`
            : fr.dashboardMaintenance.cardEmpty}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <StatusBadge variant="neutral">{fr.dashboardMaintenance.open}: {openCount}</StatusBadge>
        {primaryTicket ? (
          <StatusBadge variant={primaryTicket.priority === 'urgent' ? 'danger' : 'warning'}>
            {fr.maintenance.priorityShort[primaryTicket.priority]}
          </StatusBadge>
        ) : null}
      </div>
    </DashboardWidgetCard>
  );
}
