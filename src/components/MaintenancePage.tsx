import { useMemo, useState } from 'react';
import { Plus, RefreshCw, Wrench } from 'lucide-react';
import { clsx } from '../lib/clsx';
import { borderTokens, cardTokens, inputTokens, textTokens } from '../lib/design-tokens';
import { fr } from '../lib/i18n/fr';
import { useMaintenanceTickets } from '../hooks/useMaintenanceTickets';
import {
  computeMaintenanceSummary,
  formatCurrency,
  isClosedTicketStatus,
  isOpenTicketStatus,
  nextTicketStatusFor,
  sortTickets,
  type TicketTransition,
} from '../lib/maintenance-logic';
import type {
  MaintenanceTicketCreateInput,
  MaintenanceTicketWithRelations,
} from '../types/maintenance';
import type { Property, Reservation } from '../lib/supabase';
import { toast } from '../lib/toast';
import { Button } from './ui/Button';
import { EmptyState } from './ui/EmptyState';
import { Skeleton } from './ui/Skeleton';
import { TicketCard } from './maintenance/TicketCard';
import { TicketModal } from './maintenance/TicketModal';
import { CreateTicketModal } from './maintenance/CreateTicketModal';

interface MaintenancePageProps {
  hostId: string;
  properties: Property[];
  reservations: Reservation[];
}

type FilterMode = 'all' | 'open' | 'in_progress' | 'waiting_parts' | 'urgent' | 'closed';

function matchesFilter(ticket: MaintenanceTicketWithRelations, filter: FilterMode): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'open':
      return isOpenTicketStatus(ticket.status);
    case 'in_progress':
      return ticket.status === 'in_progress';
    case 'waiting_parts':
      return ticket.status === 'waiting_parts';
    case 'urgent':
      return ticket.priority === 'urgent' && isOpenTicketStatus(ticket.status);
    case 'closed':
      return isClosedTicketStatus(ticket.status);
    default:
      return true;
  }
}

export function MaintenancePage({ hostId, properties, reservations }: MaintenancePageProps) {
  const {
    tickets,
    comments,
    loading,
    error,
    refresh,
    createTicket,
    updateStatus,
    updateAssignee,
    updateCosts,
    addComment,
    deleteTicket,
  } = useMaintenanceTickets(hostId);

  const [filter, setFilter] = useState<FilterMode>('all');
  const [search, setSearch] = useState('');
  const [propertyFilter, setPropertyFilter] = useState<string>('all');
  const [openTicketId, setOpenTicketId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const summary = useMemo(() => computeMaintenanceSummary(tickets), [tickets]);

  const filteredTickets = useMemo(() => {
    const lowerSearch = search.trim().toLowerCase();
    const filtered = tickets
      .filter((ticket) => matchesFilter(ticket, filter))
      .filter((ticket) => (propertyFilter === 'all' ? true : ticket.property_id === propertyFilter))
      .filter((ticket) => {
        if (!lowerSearch) return true;
        const haystack = [
          ticket.title,
          ticket.description,
          ticket.property_name,
          ticket.assigned_to,
          ticket.notes,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(lowerSearch);
      });
    return sortTickets(filtered);
  }, [filter, propertyFilter, search, tickets]);

  const openTicket = openTicketId ? tickets.find((ticket) => ticket.id === openTicketId) ?? null : null;

  const handleAdvance = async (
    ticket: MaintenanceTicketWithRelations,
    transition: TicketTransition,
  ) => {
    const next = nextTicketStatusFor(ticket, transition);
    if (!next) return;
    const result = await updateStatus(ticket.id, next);
    if (result.error) {
      toast.error(fr.maintenance.statusUpdateError);
      return;
    }
    toast.success(fr.maintenance.statusUpdated);
  };

  const handleDelete = async (ticketId: string) => {
    const result = await deleteTicket(ticketId);
    if (result.error) {
      toast.error(fr.maintenance.deleteError);
      return;
    }
    toast.info(fr.maintenance.deleted);
    if (openTicketId === ticketId) setOpenTicketId(null);
  };

  const handleCreate = async (input: MaintenanceTicketCreateInput) => {
    const result = await createTicket(input);
    if (result.error) {
      toast.error(fr.maintenance.create.createError);
      return { error: result.error };
    }
    toast.success(fr.maintenance.create.created);
    return { error: null };
  };

  const handleAddComment = async (ticketId: string, body: string, author: string | null) => {
    const result = await addComment(ticketId, body, author);
    if (result.error) {
      toast.error(fr.maintenance.commentError);
      return;
    }
    toast.success(fr.maintenance.commentAdded);
  };

  const handleUpdateAssignee = async (ticketId: string, assignee: string | null) => {
    const result = await updateAssignee(ticketId, assignee);
    if (result.error) {
      toast.error(fr.maintenance.statusUpdateError);
      return;
    }
    toast.success(fr.maintenance.statusUpdated);
  };

  const handleUpdateCosts = async (
    ticketId: string,
    costs: { cost_estimate?: number | null; cost_actual?: number | null },
  ) => {
    const result = await updateCosts(ticketId, costs);
    if (result.error) {
      toast.error(fr.maintenance.costsError);
      return;
    }
    toast.success(fr.maintenance.costsUpdated);
  };

  const filterButtons: { id: FilterMode; label: string }[] = [
    { id: 'all', label: fr.maintenance.filters.all },
    { id: 'open', label: fr.maintenance.filters.open },
    { id: 'in_progress', label: fr.maintenance.filters.in_progress },
    { id: 'waiting_parts', label: fr.maintenance.filters.waiting_parts },
    { id: 'urgent', label: fr.maintenance.filters.urgent },
    { id: 'closed', label: fr.maintenance.filters.closed },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className={clsx('text-2xl font-semibold', textTokens.title)}>
            {fr.maintenance.pageTitle}
          </h1>
          <p className={clsx('mt-1 max-w-2xl text-sm', textTokens.muted)}>
            {fr.maintenance.pageSubtitle}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={refresh}>
            <RefreshCw aria-hidden size={14} />
            {fr.maintenance.refresh}
          </Button>
          <Button variant="primary" size="sm" onClick={() => setIsCreateOpen(true)}>
            <Plus aria-hidden size={14} />
            {fr.maintenance.addTicket}
          </Button>
        </div>
      </header>

      <section
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
        aria-label="Statistiques de maintenance"
      >
        <SummaryCard label={fr.maintenance.summary.open} value={String(summary.open)} />
        <SummaryCard label={fr.maintenance.summary.inProgress} value={String(summary.inProgress)} />
        <SummaryCard
          label={fr.maintenance.summary.waitingParts}
          value={String(summary.waitingParts)}
          tone={summary.waitingParts > 0 ? 'warning' : 'neutral'}
        />
        <SummaryCard
          label={fr.maintenance.summary.urgent}
          value={String(summary.urgent)}
          tone={summary.urgent > 0 ? 'danger' : 'neutral'}
        />
        <SummaryCard
          label={fr.maintenance.summary.totalCost}
          value={formatCurrency(summary.totalCostActual)}
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
            aria-label={fr.maintenance.filters.propertyAll}
          >
            <option value="all">{fr.maintenance.filters.propertyAll}</option>
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
            placeholder={fr.maintenance.filters.searchPlaceholder}
            className={clsx(inputTokens.base, 'w-64 max-w-full py-1.5 text-xs')}
            aria-label={fr.maintenance.filters.searchPlaceholder}
          />
        </div>
      </section>

      {error ? (
        <div className={clsx('rounded-lg border px-4 py-3 text-sm', borderTokens.danger, 'bg-red-50 text-red-700')}>
          {fr.maintenance.loadError}
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
          {Array.from({ length: 6 }).map((_, idx) => (
            <Skeleton key={idx} height={160} />
          ))}
        </div>
      ) : filteredTickets.length === 0 ? (
        <EmptyState
          icon={<Wrench size={20} />}
          title={fr.maintenance.empty.title}
          description={fr.maintenance.empty.description}
          action={
            <Button variant="primary" size="sm" onClick={() => setIsCreateOpen(true)}>
              <Plus aria-hidden size={14} />
              {fr.maintenance.empty.cta}
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onOpen={(selected) => setOpenTicketId(selected.id)}
              onAdvance={(selected, transition) => void handleAdvance(selected, transition)}
            />
          ))}
        </div>
      )}

      <TicketModal
        ticket={openTicket}
        comments={comments}
        onClose={() => setOpenTicketId(null)}
        onAdvance={async (ticket, transition) => {
          await handleAdvance(ticket, transition);
        }}
        onUpdateAssignee={async (ticketId, assignee) => {
          await handleUpdateAssignee(ticketId, assignee);
        }}
        onUpdateCosts={async (ticketId, costs) => {
          await handleUpdateCosts(ticketId, costs);
        }}
        onAddComment={async (ticketId, body, author) => {
          await handleAddComment(ticketId, body, author);
        }}
        onDelete={async (ticketId) => {
          await handleDelete(ticketId);
        }}
      />

      <CreateTicketModal
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
  value: string;
  tone?: 'neutral' | 'success' | 'danger' | 'warning';
}

function SummaryCard({ label, value, tone = 'neutral' }: SummaryCardProps) {
  const valueClass =
    tone === 'danger'
      ? 'text-red-700'
      : tone === 'warning'
        ? 'text-amber-700'
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
