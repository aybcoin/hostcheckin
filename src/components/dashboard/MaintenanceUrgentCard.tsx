import {
  AlertTriangle,
  ArrowRight,
  Hammer,
  Refrigerator,
  Sofa,
  Wind,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { clsx } from '../../lib/clsx';
import { borderTokens, statusTokens, textTokens } from '../../lib/design-tokens';
import { fr } from '../../lib/i18n/fr';
import { useMaintenanceTickets } from '../../hooks/useMaintenanceTickets';
import {
  computeMaintenanceSummary,
  computeUrgentTickets,
} from '../../lib/maintenance-logic';
import type { MaintenanceCategory } from '../../types/maintenance';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';

interface MaintenanceUrgentCardProps {
  hostId: string;
  onSeeAll: () => void;
  propertyId?: string | null;
}

const CATEGORY_ICON: Record<MaintenanceCategory, LucideIcon> = {
  plumbing: Wrench,
  electrical: Zap,
  appliance: Refrigerator,
  hvac: Wind,
  structural: Hammer,
  furniture: Sofa,
  other: Wrench,
};

export function MaintenanceUrgentCard({ hostId, onSeeAll, propertyId }: MaintenanceUrgentCardProps) {
  const { tickets, loading } = useMaintenanceTickets(hostId);
  const filteredTickets = tickets.filter((ticket) => !propertyId || ticket.property_id === propertyId);
  const urgentItems = computeUrgentTickets(filteredTickets, 4);
  const summary = computeMaintenanceSummary(filteredTickets);

  return (
    <Card variant="default" padding="md" className={clsx('space-y-3', borderTokens.default)}>
      <header className="flex items-center justify-between gap-2">
        <h2 className={clsx('flex items-center gap-2 text-base font-semibold', textTokens.title)}>
          <Wrench aria-hidden size={16} />
          {fr.dashboardMaintenance.cardTitle}
        </h2>
        <Button variant="tertiary" size="sm" onClick={onSeeAll}>
          {fr.dashboardMaintenance.cardSeeAll}
          <ArrowRight aria-hidden size={14} />
        </Button>
      </header>

      <div className="flex flex-wrap gap-2 text-xs">
        <span className={clsx('rounded-full border px-2 py-0.5', statusTokens.neutral)}>
          {fr.dashboardMaintenance.open}: <strong>{summary.open + summary.inProgress + summary.waitingParts}</strong>
        </span>
        {summary.urgent > 0 ? (
          <span className={clsx('rounded-full border px-2 py-0.5', statusTokens.danger)}>
            <AlertTriangle aria-hidden size={11} className="mr-1 inline-block align-text-bottom" />
            {fr.dashboardMaintenance.urgent}: <strong>{summary.urgent}</strong>
          </span>
        ) : null}
      </div>

      {loading ? (
        <div className="space-y-2" aria-hidden="true">
          {Array.from({ length: 3 }).map((_, idx) => (
            <Skeleton key={idx} variant="text" className="h-4 w-full" />
          ))}
        </div>
      ) : urgentItems.length === 0 ? (
        <p className={clsx('text-sm', textTokens.muted)}>
          {fr.dashboardMaintenance.cardEmpty}
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {urgentItems.map((ticket) => {
            const Icon = CATEGORY_ICON[ticket.category];
            return (
              <li key={ticket.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <div className="min-w-0 flex items-center gap-2">
                  <Icon aria-hidden size={14} className="shrink-0 text-slate-500" />
                  <div className="min-w-0">
                    <p className={clsx('truncate font-medium', textTokens.title)}>
                      {ticket.title}
                    </p>
                    <p className={clsx('truncate text-xs', textTokens.muted)}>
                      {ticket.property_name || '—'}
                    </p>
                  </div>
                </div>
                <span
                  className={clsx(
                    'rounded-full border px-2 py-0.5 text-[11px] font-medium',
                    ticket.priority === 'urgent' ? statusTokens.danger : statusTokens.warning,
                  )}
                >
                  {fr.maintenance.priorityShort[ticket.priority]}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
