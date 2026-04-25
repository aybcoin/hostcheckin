import { useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Home,
  Sparkles,
  User,
} from 'lucide-react';
import { clsx } from '../../lib/clsx';
import {
  borderTokens,
  cardTokens,
  statusTokens,
  textTokens,
  warningTokens,
} from '../../lib/design-tokens';
import { fr } from '../../lib/i18n/fr';
import {
  computeChecklistProgress,
  computeTaskPriority,
  isOpenStatus,
} from '../../lib/housekeeping-logic';
import type {
  HousekeepingPriority,
  HousekeepingStatus,
  HousekeepingTaskWithRelations,
} from '../../types/housekeeping';
import { Button } from '../ui/Button';

interface TaskCardProps {
  task: HousekeepingTaskWithRelations;
  onOpen: (task: HousekeepingTaskWithRelations) => void;
  onAdvance: (task: HousekeepingTaskWithRelations, transition: 'start' | 'complete' | 'validate') => void;
}

const STATUS_CHIP_CLASS: Record<HousekeepingStatus, string> = {
  pending: statusTokens.pending,
  assigned: statusTokens.info,
  in_progress: statusTokens.info,
  completed: statusTokens.success,
  validated: statusTokens.success,
  issue_reported: statusTokens.danger,
};

function priorityChipClass(priority: HousekeepingPriority): string {
  if (priority === 'critical') return statusTokens.danger;
  if (priority === 'high') return warningTokens.badge;
  return statusTokens.neutral;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

export function TaskCard({ task, onOpen, onAdvance }: TaskCardProps) {
  const priority = useMemo(() => computeTaskPriority(task), [task]);
  const progress = useMemo(() => computeChecklistProgress(task.checklist), [task.checklist]);

  const isCritical = priority === 'critical';
  const propertyName = task.property_name || fr.dashboard.common.propertyFallback;
  const guestName = task.guest_name || fr.app.guestFallbackName;

  const primaryActionTransition: 'start' | 'complete' | 'validate' | null = (() => {
    if (task.status === 'pending' || task.status === 'assigned') return 'start';
    if (task.status === 'in_progress') return 'complete';
    if (task.status === 'completed') return 'validate';
    return null;
  })();

  const primaryActionLabel: string | null = (() => {
    if (primaryActionTransition === 'start') return fr.housekeeping.actions.start;
    if (primaryActionTransition === 'complete') return fr.housekeeping.actions.complete;
    if (primaryActionTransition === 'validate') return fr.housekeeping.actions.validate;
    return null;
  })();

  return (
    <article
      className={clsx(
        cardTokens.base,
        cardTokens.padding.md,
        'flex flex-col gap-3 transition-shadow duration-200 hover:shadow-sm focus-within:ring-2 focus-within:ring-slate-300',
        isCritical ? 'border-red-200 bg-red-50/30' : 'bg-white',
      )}
      data-testid={`housekeeping-task-${task.id}`}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className={clsx('truncate text-base font-semibold', textTokens.title)}>
            <Home aria-hidden size={16} className="mr-1.5 inline-block align-text-bottom text-slate-500" />
            {propertyName}
          </h3>
          <p className={clsx('mt-0.5 truncate text-sm', textTokens.muted)}>
            <User aria-hidden size={14} className="mr-1 inline-block align-text-bottom" />
            {guestName}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span
            className={clsx(
              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
              priorityChipClass(priority),
            )}
          >
            {priority === 'critical' ? <AlertTriangle aria-hidden size={12} /> : null}
            {fr.housekeeping.priorityShort[priority]}
          </span>
          <span
            className={clsx(
              'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium',
              STATUS_CHIP_CLASS[task.status],
            )}
          >
            {fr.housekeeping.status[task.status]}
          </span>
        </div>
      </header>

      <dl className={clsx('grid grid-cols-2 gap-2 text-xs', textTokens.muted)}>
        <div>
          <dt className="text-slate-500">{fr.housekeeping.card.checkOutLabel}</dt>
          <dd className={clsx('font-medium', textTokens.body)}>{formatDate(task.scheduled_for)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">{fr.housekeeping.card.nextCheckInLabel}</dt>
          <dd className={clsx('font-medium', textTokens.body)}>
            {task.next_check_in_date
              ? formatDate(task.next_check_in_date)
              : fr.housekeeping.card.noNextCheckIn}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-slate-500">{fr.housekeeping.card.assignedLabel}</dt>
          <dd className={clsx('font-medium', textTokens.body)}>
            {task.assigned_to || fr.housekeeping.card.noAssignee}
          </dd>
        </div>
      </dl>

      <div>
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className={clsx('flex items-center gap-1.5', textTokens.muted)}>
            <Sparkles aria-hidden size={14} />
            {fr.housekeeping.card.checklistProgress(progress.done, progress.total)}
          </span>
          <span className={clsx('font-medium', textTokens.body)}>{progress.pct}%</span>
        </div>
        <div
          className={clsx('h-1.5 overflow-hidden rounded-full', borderTokens.subtle.replace('border-', 'bg-'))}
          role="progressbar"
          aria-valuenow={progress.pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={fr.housekeeping.checklist.title}
        >
          <div
            className={clsx(
              'h-full rounded-full transition-[width] duration-300',
              progress.pct >= 100 ? 'bg-emerald-500' : 'bg-slate-700',
            )}
            style={{ width: `${progress.pct}%` }}
          />
        </div>
      </div>

      {task.status === 'issue_reported' && task.issue_note ? (
        <p
          className={clsx(
            'rounded-md border px-2.5 py-1.5 text-xs',
            statusTokens.danger,
          )}
        >
          <AlertTriangle aria-hidden size={12} className="mr-1 inline-block align-text-bottom" />
          {task.issue_note}
        </p>
      ) : null}

      <footer className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <Button
          variant="tertiary"
          size="sm"
          onClick={() => onOpen(task)}
          aria-label={fr.housekeeping.card.openChecklist}
        >
          {fr.housekeeping.card.openChecklist}
          <ChevronRight aria-hidden size={14} />
        </Button>

        {primaryActionTransition && primaryActionLabel ? (
          <Button
            variant={primaryActionTransition === 'validate' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => onAdvance(task, primaryActionTransition)}
            data-testid={`task-${task.id}-action-${primaryActionTransition}`}
          >
            {primaryActionTransition === 'validate' ? (
              <CheckCircle2 aria-hidden size={14} />
            ) : (
              <Clock aria-hidden size={14} />
            )}
            {primaryActionLabel}
          </Button>
        ) : null}
        {!isOpenStatus(task.status) && primaryActionTransition === null ? (
          <span className={clsx('inline-flex items-center gap-1 text-xs', textTokens.success)}>
            <CheckCircle2 aria-hidden size={14} />
            {fr.housekeeping.badges.readyForGuests}
          </span>
        ) : null}
      </footer>
    </article>
  );
}
