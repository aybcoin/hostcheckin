import {
  AlertTriangle,
  ChevronRight,
  Hammer,
  Home,
  MessageSquare,
  Refrigerator,
  Sofa,
  User,
  Wind,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { clsx } from '../../lib/clsx';
import {
  cardTokens,
  statusTokens,
  textTokens,
  warningTokens,
} from '../../lib/design-tokens';
import { fr } from '../../lib/i18n/fr';
import { formatCurrency } from '../../lib/maintenance-logic';
import type {
  MaintenanceCategory,
  MaintenancePriority,
  MaintenanceStatus,
  MaintenanceTicketWithRelations,
} from '../../types/maintenance';
import type { TicketTransition } from '../../lib/maintenance-logic';
import { Button } from '../ui/Button';

interface TicketCardProps {
  ticket: MaintenanceTicketWithRelations;
  onOpen: (ticket: MaintenanceTicketWithRelations) => void;
  onAdvance: (ticket: MaintenanceTicketWithRelations, transition: TicketTransition) => void;
}

const STATUS_CHIP_CLASS: Record<MaintenanceStatus, string> = {
  open: statusTokens.pending,
  in_progress: statusTokens.info,
  waiting_parts: warningTokens.badge,
  resolved: statusTokens.success,
  closed: statusTokens.neutral,
};

const CATEGORY_ICON: Record<MaintenanceCategory, LucideIcon> = {
  plumbing: Wrench,
  electrical: Zap,
  appliance: Refrigerator,
  hvac: Wind,
  structural: Hammer,
  furniture: Sofa,
  other: Wrench,
};

function priorityChipClass(priority: MaintenancePriority): string {
  if (priority === 'urgent') return statusTokens.danger;
  if (priority === 'high') return warningTokens.badge;
  if (priority === 'low') return statusTokens.neutral;
  return statusTokens.neutral;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

export function TicketCard({ ticket, onOpen, onAdvance }: TicketCardProps) {
  const isUrgent = ticket.priority === 'urgent';
  const propertyName = ticket.property_name || fr.dashboard.common.propertyFallback;
  const CategoryIcon = CATEGORY_ICON[ticket.category];

  const primaryActionTransition: TicketTransition | null = (() => {
    if (ticket.status === 'open') return 'start';
    if (ticket.status === 'in_progress') return 'resolve';
    if (ticket.status === 'waiting_parts') return 'start';
    if (ticket.status === 'resolved') return 'close';
    return null;
  })();

  const primaryActionLabel: string | null = (() => {
    if (primaryActionTransition === 'start') return fr.maintenance.actions.start;
    if (primaryActionTransition === 'resolve') return fr.maintenance.actions.resolve;
    if (primaryActionTransition === 'close') return fr.maintenance.actions.close;
    return null;
  })();

  return (
    <article
      className={clsx(
        cardTokens.base,
        cardTokens.padding.md,
        'flex flex-col gap-3 transition-shadow duration-200 hover:shadow-sm focus-within:ring-2 focus-within:ring-slate-300',
        isUrgent ? 'border-red-200 bg-red-50/30' : 'bg-white',
      )}
      data-testid={`maintenance-ticket-${ticket.id}`}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className={clsx('truncate text-base font-semibold', textTokens.title)}>
            <CategoryIcon aria-hidden size={16} className="mr-1.5 inline-block align-text-bottom text-slate-500" />
            {ticket.title}
          </h3>
          <p className={clsx('mt-0.5 flex items-center gap-1 truncate text-sm', textTokens.muted)}>
            <Home aria-hidden size={14} />
            {propertyName}
            <span aria-hidden className="mx-1">·</span>
            <span>{fr.maintenance.category[ticket.category]}</span>
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span
            className={clsx(
              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
              priorityChipClass(ticket.priority),
            )}
          >
            {ticket.priority === 'urgent' ? <AlertTriangle aria-hidden size={12} /> : null}
            {fr.maintenance.priorityShort[ticket.priority]}
          </span>
          <span
            className={clsx(
              'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium',
              STATUS_CHIP_CLASS[ticket.status],
            )}
          >
            {fr.maintenance.status[ticket.status]}
          </span>
        </div>
      </header>

      <dl className={clsx('grid grid-cols-2 gap-2 text-xs', textTokens.muted)}>
        <div>
          <dt className="text-slate-500">{fr.maintenance.card.reportedLabel}</dt>
          <dd className={clsx('font-medium', textTokens.body)}>{formatDate(ticket.reported_at)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">{fr.maintenance.card.costLabel}</dt>
          <dd className={clsx('font-medium', textTokens.body)}>
            {ticket.cost_actual != null
              ? formatCurrency(ticket.cost_actual)
              : ticket.cost_estimate != null
                ? `~ ${formatCurrency(ticket.cost_estimate)}`
                : fr.maintenance.card.noCost}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-slate-500">{fr.maintenance.card.assignedLabel}</dt>
          <dd className={clsx('flex items-center gap-1 font-medium', textTokens.body)}>
            <User aria-hidden size={12} />
            {ticket.assigned_to || fr.maintenance.card.noAssignee}
          </dd>
        </div>
      </dl>

      {ticket.description ? (
        <p className={clsx('line-clamp-2 text-xs', textTokens.muted)}>{ticket.description}</p>
      ) : null}

      <footer className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <Button
          variant="tertiary"
          size="sm"
          onClick={() => onOpen(ticket)}
          aria-label={fr.maintenance.card.openTicket}
        >
          <MessageSquare aria-hidden size={14} />
          {ticket.comments_count && ticket.comments_count > 0
            ? fr.maintenance.card.commentsCount(ticket.comments_count)
            : fr.maintenance.card.openTicket}
          <ChevronRight aria-hidden size={14} />
        </Button>

        {primaryActionTransition && primaryActionLabel ? (
          <Button
            variant={primaryActionTransition === 'close' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => onAdvance(ticket, primaryActionTransition)}
            data-testid={`ticket-${ticket.id}-action-${primaryActionTransition}`}
          >
            {primaryActionLabel}
          </Button>
        ) : null}
      </footer>
    </article>
  );
}
