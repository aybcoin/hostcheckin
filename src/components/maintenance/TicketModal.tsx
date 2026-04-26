import { type FormEvent, useEffect, useState } from 'react';
import { MessageSquare, Trash2, X } from 'lucide-react';
import { clsx } from '../../lib/clsx';
import {
  borderTokens,
  inputTokens,
  modalTokens,
  statusTokens,
  textTokens,
} from '../../lib/design-tokens';
import { fr } from '../../lib/i18n/fr';
import { formatCurrency, nextTicketStatusFor } from '../../lib/maintenance-logic';
import type {
  MaintenanceComment,
  MaintenanceTicketWithRelations,
} from '../../types/maintenance';
import type { TicketTransition } from '../../lib/maintenance-logic';
import { Button } from '../ui/Button';

interface TicketModalProps {
  ticket: MaintenanceTicketWithRelations | null;
  comments: MaintenanceComment[];
  onClose: () => void;
  onAdvance: (
    ticket: MaintenanceTicketWithRelations,
    transition: TicketTransition,
  ) => Promise<void> | void;
  onUpdateAssignee: (ticketId: string, assignee: string | null) => Promise<void> | void;
  onUpdateCosts: (
    ticketId: string,
    costs: { cost_estimate?: number | null; cost_actual?: number | null },
  ) => Promise<void> | void;
  onAddComment: (
    ticketId: string,
    body: string,
    author: string | null,
  ) => Promise<void> | void;
  onDelete: (ticketId: string) => Promise<void> | void;
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function parseCost(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(',', '.');
  const num = Number(normalized);
  if (!Number.isFinite(num)) return null;
  return num;
}

export function TicketModal({
  ticket,
  comments,
  onClose,
  onAdvance,
  onUpdateAssignee,
  onUpdateCosts,
  onAddComment,
  onDelete,
}: TicketModalProps) {
  const [assignee, setAssignee] = useState('');
  const [costEstimate, setCostEstimate] = useState('');
  const [costActual, setCostActual] = useState('');
  const [commentBody, setCommentBody] = useState('');
  const [commentAuthor, setCommentAuthor] = useState('');

  useEffect(() => {
    if (!ticket) return;
    setAssignee(ticket.assigned_to ?? '');
    setCostEstimate(ticket.cost_estimate != null ? String(ticket.cost_estimate) : '');
    setCostActual(ticket.cost_actual != null ? String(ticket.cost_actual) : '');
    setCommentBody('');
    setCommentAuthor('');
  }, [ticket]);

  useEffect(() => {
    if (!ticket) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [ticket, onClose]);

  if (!ticket) return null;

  const ticketComments = comments
    .filter((comment) => comment.ticket_id === ticket.id)
    .slice()
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  const transitions: { transition: TicketTransition; label: string; variant: 'primary' | 'secondary' | 'tertiary' }[] = (
    [
      { transition: 'start' as const, label: fr.maintenance.actions.start, variant: 'secondary' as const },
      { transition: 'wait_parts' as const, label: fr.maintenance.actions.waitParts, variant: 'tertiary' as const },
      { transition: 'resolve' as const, label: fr.maintenance.actions.resolve, variant: 'secondary' as const },
      { transition: 'close' as const, label: fr.maintenance.actions.close, variant: 'primary' as const },
      { transition: 'reopen' as const, label: fr.maintenance.actions.reopen, variant: 'tertiary' as const },
    ]
  ).filter((entry) => nextTicketStatusFor(ticket, entry.transition) !== null);

  const handleSubmitComment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = commentBody.trim();
    if (!body) return;
    void Promise.resolve(onAddComment(ticket.id, body, commentAuthor.trim() || null)).then(() => {
      setCommentBody('');
    });
  };

  const handleSaveAssignee = () => {
    const value = assignee.trim() || null;
    void onUpdateAssignee(ticket.id, value);
  };

  const handleSaveCosts = () => {
    void onUpdateCosts(ticket.id, {
      cost_estimate: parseCost(costEstimate),
      cost_actual: parseCost(costActual),
    });
  };

  const handleDelete = () => {
    if (window.confirm(fr.maintenance.confirmDelete)) {
      void onDelete(ticket.id);
    }
  };

  return (
    <div
      className={modalTokens.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="maintenance-modal-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={clsx(modalTokens.panel, 'max-w-2xl')}>
        <div className={clsx('flex items-start justify-between gap-3 border-b px-5 py-4', borderTokens.default)}>
          <div className="min-w-0">
            <h2 id="maintenance-modal-title" className={clsx('truncate text-lg font-semibold', textTokens.title)}>
              {ticket.title}
            </h2>
            <p className={clsx('mt-0.5 text-xs', textTokens.muted)}>
              {fr.maintenance.category[ticket.category]} ·{' '}
              {fr.maintenance.status[ticket.status]} ·{' '}
              {fr.maintenance.priority[ticket.priority]}
            </p>
          </div>
          <button
            type="button"
            aria-label={fr.maintenance.modal.close}
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 px-5 py-5 max-h-[70vh] overflow-y-auto">
          {/* Description */}
          <section>
            <h3 className={clsx('mb-1 text-sm font-medium', textTokens.title)}>
              {fr.maintenance.modal.description}
            </h3>
            <p className={clsx('text-sm', textTokens.body)}>
              {ticket.description || fr.maintenance.modal.noDescription}
            </p>
          </section>

          {/* Assignee */}
          <section className="space-y-1.5">
            <label htmlFor="ticket-assignee" className={clsx('text-sm font-medium', textTokens.title)}>
              {fr.maintenance.modal.assigneeLabel}
            </label>
            <div className="flex gap-2">
              <input
                id="ticket-assignee"
                type="text"
                value={assignee}
                onChange={(event) => setAssignee(event.target.value)}
                placeholder={fr.maintenance.create.assigneePlaceholder}
                className={inputTokens.base}
              />
              <Button type="button" variant="secondary" size="sm" onClick={handleSaveAssignee}>
                {fr.maintenance.modal.saveAssignee}
              </Button>
            </div>
          </section>

          {/* Costs */}
          <section className="space-y-1.5">
            <h3 className={clsx('text-sm font-medium', textTokens.title)}>
              {fr.maintenance.modal.costsTitle}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="cost-estimate" className={clsx('mb-1 block text-xs', textTokens.muted)}>
                  {fr.maintenance.modal.costEstimateLabel}
                </label>
                <input
                  id="cost-estimate"
                  type="text"
                  inputMode="decimal"
                  value={costEstimate}
                  onChange={(event) => setCostEstimate(event.target.value)}
                  placeholder="0"
                  className={inputTokens.base}
                />
              </div>
              <div>
                <label htmlFor="cost-actual" className={clsx('mb-1 block text-xs', textTokens.muted)}>
                  {fr.maintenance.modal.costActualLabel}
                </label>
                <input
                  id="cost-actual"
                  type="text"
                  inputMode="decimal"
                  value={costActual}
                  onChange={(event) => setCostActual(event.target.value)}
                  placeholder="0"
                  className={inputTokens.base}
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 pt-1">
              <span className={clsx('text-xs', textTokens.muted)}>
                {ticket.cost_actual != null
                  ? `${fr.maintenance.card.costLabel}: ${formatCurrency(ticket.cost_actual)}`
                  : ''}
              </span>
              <Button type="button" variant="secondary" size="sm" onClick={handleSaveCosts}>
                {fr.maintenance.modal.saveCosts}
              </Button>
            </div>
          </section>

          {/* Comments */}
          <section className="space-y-2">
            <h3 className={clsx('flex items-center gap-1.5 text-sm font-medium', textTokens.title)}>
              <MessageSquare aria-hidden size={14} />
              {fr.maintenance.modal.comments}
            </h3>
            {ticketComments.length === 0 ? (
              <p className={clsx('text-xs', textTokens.muted)}>{fr.maintenance.modal.noComments}</p>
            ) : (
              <ul className="space-y-2">
                {ticketComments.map((comment) => (
                  <li
                    key={comment.id}
                    className={clsx('rounded-lg border px-3 py-2 text-sm', borderTokens.subtle, 'bg-slate-50')}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className={clsx('text-xs font-medium', textTokens.title)}>
                        {comment.author || '—'}
                      </span>
                      <span className={clsx('text-[11px]', textTokens.muted)}>
                        {formatDateTime(comment.created_at)}
                      </span>
                    </div>
                    <p className={clsx('mt-0.5 whitespace-pre-line', textTokens.body)}>
                      {comment.body}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            <form onSubmit={handleSubmitComment} className="space-y-2 pt-1">
              <input
                type="text"
                value={commentAuthor}
                onChange={(event) => setCommentAuthor(event.target.value)}
                placeholder={fr.maintenance.modal.authorPlaceholder}
                className={clsx(inputTokens.base, 'text-sm')}
              />
              <textarea
                rows={2}
                value={commentBody}
                onChange={(event) => setCommentBody(event.target.value)}
                placeholder={fr.maintenance.modal.commentPlaceholder}
                className={clsx(inputTokens.base, 'resize-none text-sm')}
              />
              <div className="flex justify-end">
                <Button type="submit" variant="secondary" size="sm" disabled={!commentBody.trim()}>
                  {fr.maintenance.modal.postComment}
                </Button>
              </div>
            </form>
          </section>

          {/* Photos placeholder */}
          <section
            className={clsx('rounded-lg border px-3 py-3 text-xs', borderTokens.subtle, statusTokens.neutral)}
          >
            <p className="font-medium">{fr.maintenance.modal.photosTitle}</p>
            <p className="mt-0.5">{fr.maintenance.modal.photosHint}</p>
          </section>
        </div>

        <div
          className={clsx(
            'flex flex-wrap items-center justify-between gap-2 border-t bg-slate-50 px-5 py-3',
            borderTokens.default,
          )}
        >
          <button
            type="button"
            onClick={handleDelete}
            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
          >
            <Trash2 aria-hidden size={13} />
            {fr.maintenance.actions.delete}
          </button>
          <div className="flex flex-wrap items-center gap-2">
            {transitions.map(({ transition, label, variant }) => (
              <Button
                key={transition}
                type="button"
                variant={variant}
                size="sm"
                onClick={() => void onAdvance(ticket, transition)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
