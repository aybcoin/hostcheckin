import type {
  ChecklistProgress,
  HousekeepingChecklistItem,
  HousekeepingPriority,
  HousekeepingStatus,
  HousekeepingTask,
  HousekeepingTaskWithRelations,
} from '../types/housekeeping';

const DAY_MS = 24 * 60 * 60 * 1000;

const OPEN_STATUSES: ReadonlyArray<HousekeepingStatus> = [
  'pending',
  'assigned',
  'in_progress',
  'issue_reported',
];

const DONE_STATUSES: ReadonlyArray<HousekeepingStatus> = ['completed', 'validated'];

export function isOpenStatus(status: HousekeepingStatus): boolean {
  return OPEN_STATUSES.includes(status);
}

export function isDoneStatus(status: HousekeepingStatus): boolean {
  return DONE_STATUSES.includes(status);
}

export function startOfDay(value: Date): Date {
  const day = new Date(value);
  day.setHours(0, 0, 0, 0);
  return day;
}

export function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

/**
 * Priority is recomputed client-side because next_check_in_date is enriched after fetch.
 * The DB trigger only sees the inserting reservation, not future ones added later.
 */
export function computeTaskPriority(
  task: Pick<HousekeepingTaskWithRelations, 'scheduled_for' | 'next_check_in_date' | 'priority' | 'status'>,
  now: Date = new Date(),
): HousekeepingPriority {
  if (task.status === 'issue_reported') return 'critical';

  const scheduled = parseDateOnly(task.scheduled_for);
  const nextArrival = parseDateOnly(task.next_check_in_date ?? null);

  if (scheduled && nextArrival) {
    const sameDayTurnover =
      startOfDay(scheduled).getTime() === startOfDay(nextArrival).getTime();
    if (sameDayTurnover) return 'critical';

    const gapDays = Math.round(
      (startOfDay(nextArrival).getTime() - startOfDay(scheduled).getTime()) / DAY_MS,
    );
    if (gapDays >= 0 && gapDays <= 1) return 'high';
  }

  if (scheduled) {
    const today = startOfDay(now);
    const diff = Math.round((startOfDay(scheduled).getTime() - today.getTime()) / DAY_MS);
    if (diff < 0 && isOpenStatus(task.status)) return 'critical';
    if (diff <= 1 && isOpenStatus(task.status)) return 'high';
  }

  return task.priority ?? 'normal';
}

export function computeChecklistProgress(
  items: readonly HousekeepingChecklistItem[] | undefined,
): ChecklistProgress {
  if (!items || items.length === 0) {
    return { done: 0, total: 0, pct: 0 };
  }
  const total = items.length;
  const done = items.reduce((acc, item) => acc + (item.is_done ? 1 : 0), 0);
  const pct = Math.round((done / total) * 100);
  return { done, total, pct };
}

export function isTaskReady(task: HousekeepingTaskWithRelations): boolean {
  if (!isDoneStatus(task.status)) return false;
  const checklist = task.checklist ?? [];
  if (checklist.length === 0) return true;
  return checklist.every((item) => item.is_done);
}

/**
 * A property is "ready for guests" when all open housekeeping tasks scheduled today or
 * earlier are completed/validated. Future tasks don't block readiness.
 */
export function isPropertyReady(
  propertyId: string,
  tasks: readonly HousekeepingTaskWithRelations[],
  now: Date = new Date(),
): boolean {
  const today = startOfDay(now);
  return tasks
    .filter((task) => task.property_id === propertyId)
    .every((task) => {
      const scheduled = parseDateOnly(task.scheduled_for);
      if (!scheduled) return true;
      if (startOfDay(scheduled).getTime() > today.getTime()) return true;
      return isDoneStatus(task.status);
    });
}

export interface HousekeepingTodayItem {
  id: string;
  taskId: string;
  propertyName: string;
  guestName: string | null;
  priority: HousekeepingPriority;
  status: HousekeepingStatus;
  dueLabel: string | null;
}

function priorityWeight(priority: HousekeepingPriority): number {
  if (priority === 'critical') return 0;
  if (priority === 'high') return 1;
  return 2;
}

function statusWeight(status: HousekeepingStatus): number {
  if (status === 'issue_reported') return 0;
  if (status === 'pending') return 1;
  if (status === 'assigned') return 2;
  if (status === 'in_progress') return 3;
  return 4;
}

function formatDueLabel(due: Date | null): string | null {
  if (!due) return null;
  return due.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Tasks scheduled today (or overdue and still open) — ranked by priority then status.
 */
export function computeHousekeepingToday(
  tasks: readonly HousekeepingTaskWithRelations[],
  now: Date = new Date(),
  limit: number = 5,
): HousekeepingTodayItem[] {
  const today = startOfDay(now);

  const enriched = tasks
    .map((task) => {
      const scheduled = parseDateOnly(task.scheduled_for);
      if (!scheduled) return null;
      const isToday = startOfDay(scheduled).getTime() === today.getTime();
      const isOverdueOpen =
        startOfDay(scheduled).getTime() < today.getTime() && isOpenStatus(task.status);
      if (!isToday && !isOverdueOpen) return null;

      const priority = computeTaskPriority(task, now);
      const due = parseDateOnly(task.due_before);
      const item: HousekeepingTodayItem = {
        id: `housekeeping:${task.id}`,
        taskId: task.id,
        propertyName: task.property_name ?? '',
        guestName: task.guest_name ?? null,
        priority,
        status: task.status,
        dueLabel: formatDueLabel(due),
      };
      return item;
    })
    .filter((value): value is HousekeepingTodayItem => value !== null);

  return enriched
    .sort((left, right) => {
      const pdiff = priorityWeight(left.priority) - priorityWeight(right.priority);
      if (pdiff !== 0) return pdiff;
      return statusWeight(left.status) - statusWeight(right.status);
    })
    .slice(0, Math.max(0, limit));
}

export interface HousekeepingSummary {
  total: number;
  pending: number;
  inProgress: number;
  done: number;
  overdue: number;
  criticalToday: number;
}

export function computeHousekeepingSummary(
  tasks: readonly HousekeepingTaskWithRelations[],
  now: Date = new Date(),
): HousekeepingSummary {
  const today = startOfDay(now);
  let pending = 0;
  let inProgress = 0;
  let done = 0;
  let overdue = 0;
  let criticalToday = 0;

  tasks.forEach((task) => {
    if (task.status === 'pending' || task.status === 'assigned') pending += 1;
    else if (task.status === 'in_progress') inProgress += 1;
    else if (isDoneStatus(task.status)) done += 1;

    const scheduled = parseDateOnly(task.scheduled_for);
    if (scheduled && isOpenStatus(task.status) && startOfDay(scheduled).getTime() < today.getTime()) {
      overdue += 1;
    }

    const priority = computeTaskPriority(task, now);
    if (
      priority === 'critical'
      && scheduled
      && startOfDay(scheduled).getTime() === today.getTime()
      && isOpenStatus(task.status)
    ) {
      criticalToday += 1;
    }
  });

  return {
    total: tasks.length,
    pending,
    inProgress,
    done,
    overdue,
    criticalToday,
  };
}

export type StatusTransition = 'start' | 'complete' | 'validate' | 'reopen' | 'reportIssue';

export function nextStatusFor(
  task: Pick<HousekeepingTask, 'status'>,
  transition: StatusTransition,
): HousekeepingStatus | null {
  switch (transition) {
    case 'start':
      if (task.status === 'pending' || task.status === 'assigned') return 'in_progress';
      return null;
    case 'complete':
      if (task.status === 'in_progress' || task.status === 'pending' || task.status === 'assigned')
        return 'completed';
      return null;
    case 'validate':
      if (task.status === 'completed') return 'validated';
      return null;
    case 'reopen':
      if (task.status === 'completed' || task.status === 'validated' || task.status === 'issue_reported')
        return 'in_progress';
      return null;
    case 'reportIssue':
      if (task.status !== 'validated') return 'issue_reported';
      return null;
    default:
      return null;
  }
}
