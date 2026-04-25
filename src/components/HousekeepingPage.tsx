import { useMemo, useState } from 'react';
import { Plus, RefreshCw, Sparkles } from 'lucide-react';
import { clsx } from '../lib/clsx';
import { borderTokens, cardTokens, inputTokens, textTokens } from '../lib/design-tokens';
import { fr } from '../lib/i18n/fr';
import { useHousekeepingTasks } from '../hooks/useHousekeepingTasks';
import {
  computeHousekeepingSummary,
  computeTaskPriority,
  isOpenStatus,
  nextStatusFor,
  parseDateOnly,
  startOfDay,
} from '../lib/housekeeping-logic';
import type {
  HousekeepingTaskCreateInput,
  HousekeepingTaskWithRelations,
} from '../types/housekeeping';
import type { Property, Reservation } from '../lib/supabase';
import { toast } from '../lib/toast';
import { Button } from './ui/Button';
import { EmptyState } from './ui/EmptyState';
import { Skeleton } from './ui/Skeleton';
import { TaskCard } from './housekeeping/TaskCard';
import { ChecklistModal } from './housekeeping/ChecklistModal';
import { CreateTaskModal } from './housekeeping/CreateTaskModal';

interface HousekeepingPageProps {
  hostId: string;
  properties: Property[];
  reservations: Reservation[];
}

type FilterMode = 'all' | 'today' | 'week' | 'overdue' | 'issues' | 'done';

const DAY_MS = 24 * 60 * 60 * 1000;

function matchesFilter(
  task: HousekeepingTaskWithRelations,
  filter: FilterMode,
  now: Date,
): boolean {
  const today = startOfDay(now);
  const scheduled = parseDateOnly(task.scheduled_for);
  const sched = scheduled ? startOfDay(scheduled) : null;

  switch (filter) {
    case 'all':
      return true;
    case 'today':
      return sched ? sched.getTime() === today.getTime() : false;
    case 'week': {
      if (!sched) return false;
      const diff = Math.round((sched.getTime() - today.getTime()) / DAY_MS);
      return diff >= 0 && diff <= 7;
    }
    case 'overdue':
      return Boolean(sched && sched.getTime() < today.getTime() && isOpenStatus(task.status));
    case 'issues':
      return task.status === 'issue_reported';
    case 'done':
      return task.status === 'completed' || task.status === 'validated';
    default:
      return true;
  }
}

export function HousekeepingPage({ hostId, properties, reservations }: HousekeepingPageProps) {
  const {
    tasks,
    loading,
    error,
    refresh,
    createTask,
    updateStatus,
    updateAssignee,
    updateNotes,
    toggleChecklistItem,
    deleteTask,
  } = useHousekeepingTasks(hostId);

  const [filter, setFilter] = useState<FilterMode>('all');
  const [search, setSearch] = useState('');
  const [propertyFilter, setPropertyFilter] = useState<string>('all');
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const summary = useMemo(() => computeHousekeepingSummary(tasks), [tasks]);

  const filteredTasks = useMemo(() => {
    const now = new Date();
    const lowerSearch = search.trim().toLowerCase();
    return tasks
      .filter((task) => matchesFilter(task, filter, now))
      .filter((task) => (propertyFilter === 'all' ? true : task.property_id === propertyFilter))
      .filter((task) => {
        if (!lowerSearch) return true;
        const haystack = [task.property_name, task.guest_name, task.assigned_to, task.notes]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(lowerSearch);
      })
      .slice()
      .sort((a, b) => {
        const ap = computeTaskPriority(a);
        const bp = computeTaskPriority(b);
        const priorityWeight = (p: typeof ap): number => (p === 'critical' ? 0 : p === 'high' ? 1 : 2);
        const pdiff = priorityWeight(ap) - priorityWeight(bp);
        if (pdiff !== 0) return pdiff;
        return a.scheduled_for.localeCompare(b.scheduled_for);
      });
  }, [filter, propertyFilter, search, tasks]);

  const openTask = openTaskId ? tasks.find((task) => task.id === openTaskId) ?? null : null;

  const handleAdvance = async (
    task: HousekeepingTaskWithRelations,
    transition: 'start' | 'complete' | 'validate' | 'reopen',
  ) => {
    const next = nextStatusFor(task, transition);
    if (!next) return;
    const result = await updateStatus(task.id, next);
    if (result.error) {
      toast.error(fr.housekeeping.statusUpdateError);
      return;
    }
    toast.success(fr.housekeeping.statusUpdated);
  };

  const handleReportIssue = async (taskId: string, note: string) => {
    const result = await updateStatus(taskId, 'issue_reported', { issue_note: note });
    if (result.error) {
      toast.error(fr.housekeeping.statusUpdateError);
      return;
    }
    toast.warning(fr.housekeeping.status.issue_reported);
  };

  const handleDelete = async (taskId: string) => {
    const result = await deleteTask(taskId);
    if (result.error) {
      toast.error(fr.housekeeping.deleteError);
      return;
    }
    toast.info(fr.housekeeping.deleted);
    if (openTaskId === taskId) setOpenTaskId(null);
  };

  const handleCreate = async (input: HousekeepingTaskCreateInput) => {
    const result = await createTask(input);
    if (result.error) {
      toast.error(fr.housekeeping.create.createError);
      return { error: result.error };
    }
    toast.success(fr.housekeeping.create.created);
    return { error: null };
  };

  const filterButtons: { id: FilterMode; label: string }[] = [
    { id: 'all', label: fr.housekeeping.filters.all },
    { id: 'today', label: fr.housekeeping.filters.today },
    { id: 'week', label: fr.housekeeping.filters.week },
    { id: 'overdue', label: fr.housekeeping.filters.overdue },
    { id: 'issues', label: fr.housekeeping.filters.issues },
    { id: 'done', label: fr.housekeeping.filters.done },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className={clsx('text-2xl font-semibold', textTokens.title)}>
            {fr.housekeeping.pageTitle}
          </h1>
          <p className={clsx('mt-1 max-w-2xl text-sm', textTokens.muted)}>
            {fr.housekeeping.pageSubtitle}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={refresh}>
            <RefreshCw aria-hidden size={14} />
            {fr.housekeeping.refresh}
          </Button>
          <Button variant="primary" size="sm" onClick={() => setIsCreateOpen(true)}>
            <Plus aria-hidden size={14} />
            {fr.housekeeping.addTask}
          </Button>
        </div>
      </header>

      <section
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
        aria-label="Statistiques de ménage"
      >
        <SummaryCard
          label={fr.housekeeping.summary.pending}
          value={summary.pending}
        />
        <SummaryCard
          label={fr.housekeeping.summary.inProgress}
          value={summary.inProgress}
        />
        <SummaryCard
          label={fr.housekeeping.summary.done}
          value={summary.done}
          tone="success"
        />
        <SummaryCard
          label={fr.housekeeping.summary.overdue}
          value={summary.overdue}
          tone={summary.overdue > 0 ? 'danger' : 'neutral'}
        />
        <SummaryCard
          label={fr.housekeeping.summary.criticalToday}
          value={summary.criticalToday}
          tone={summary.criticalToday > 0 ? 'danger' : 'neutral'}
        />
      </section>

      <section className={clsx('flex flex-wrap items-center gap-2 rounded-xl border p-3', borderTokens.default, 'bg-white')}>
        <div role="tablist" aria-label="Filtres" className="flex flex-wrap gap-1.5">
          {filterButtons.map((btn) => (
            <button
              key={btn.id}
              role="tab"
              aria-selected={filter === btn.id}
              onClick={() => setFilter(btn.id)}
              type="button"
              className={clsx(
                'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300',
                filter === btn.id
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
              )}
            >
              {btn.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <select
            value={propertyFilter}
            onChange={(event) => setPropertyFilter(event.target.value)}
            className={clsx(inputTokens.base, 'w-auto py-1.5 text-xs')}
            aria-label={fr.housekeeping.filters.propertyAll}
          >
            <option value="all">{fr.housekeeping.filters.propertyAll}</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={fr.housekeeping.filters.searchPlaceholder}
            className={clsx(inputTokens.base, 'w-64 max-w-full py-1.5 text-xs')}
            aria-label={fr.housekeeping.filters.searchPlaceholder}
          />
        </div>
      </section>

      {error ? (
        <div className={clsx('rounded-lg border px-4 py-3 text-sm', borderTokens.danger, 'bg-red-50 text-red-700')}>
          {fr.housekeeping.loadError}
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
          {Array.from({ length: 6 }).map((_, idx) => (
            <Skeleton key={idx} height={160} />
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <EmptyState
          icon={<Sparkles size={20} />}
          title={fr.housekeeping.empty.title}
          description={fr.housekeeping.empty.description}
          action={
            <Button variant="primary" size="sm" onClick={() => setIsCreateOpen(true)}>
              <Plus aria-hidden size={14} />
              {fr.housekeeping.empty.cta}
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onOpen={(selected) => setOpenTaskId(selected.id)}
              onAdvance={(selected, transition) => void handleAdvance(selected, transition)}
            />
          ))}
        </div>
      )}

      <ChecklistModal
        task={openTask}
        onClose={() => setOpenTaskId(null)}
        onToggleItem={async (itemId, isDone) => {
          await toggleChecklistItem(itemId, isDone);
        }}
        onUpdateNotes={async (taskId, notes) => {
          await updateNotes(taskId, notes);
        }}
        onUpdateAssignee={async (taskId, assignee) => {
          await updateAssignee(taskId, assignee);
        }}
        onAdvance={async (task, transition) => {
          await handleAdvance(task, transition);
        }}
        onReportIssue={async (taskId, note) => {
          await handleReportIssue(taskId, note);
        }}
        onDelete={async (taskId) => {
          await handleDelete(taskId);
        }}
      />

      <CreateTaskModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreate}
        properties={properties}
        reservations={reservations}
      />
    </div>
  );
}

interface SummaryCardProps {
  label: string;
  value: number;
  tone?: 'neutral' | 'success' | 'danger';
}

function SummaryCard({ label, value, tone = 'neutral' }: SummaryCardProps) {
  const valueClass =
    tone === 'danger'
      ? 'text-red-700'
      : tone === 'success'
        ? 'text-emerald-700'
        : textTokens.title;

  return (
    <div
      className={clsx(
        cardTokens.base,
        cardTokens.padding.sm,
        'flex flex-col bg-white',
      )}
    >
      <span className="text-xs uppercase tracking-wide text-slate-500">{label}</span>
      <span className={clsx('mt-1 text-2xl font-semibold', valueClass)}>{value}</span>
    </div>
  );
}
