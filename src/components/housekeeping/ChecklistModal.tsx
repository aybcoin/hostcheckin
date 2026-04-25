import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Camera, RotateCcw, Trash2, X } from 'lucide-react';
import { clsx } from '../../lib/clsx';
import {
  borderTokens,
  inputTokens,
  modalTokens,
  statusTokens,
  textTokens,
} from '../../lib/design-tokens';
import { fr } from '../../lib/i18n/fr';
import {
  computeChecklistProgress,
  nextStatusFor,
} from '../../lib/housekeeping-logic';
import type {
  HousekeepingChecklistLabelKey,
  HousekeepingTaskWithRelations,
} from '../../types/housekeeping';
import { Button } from '../ui/Button';

interface ChecklistModalProps {
  task: HousekeepingTaskWithRelations | null;
  onClose: () => void;
  onToggleItem: (itemId: string, isDone: boolean) => Promise<void> | void;
  onUpdateNotes: (taskId: string, notes: string | null) => Promise<void> | void;
  onUpdateAssignee: (taskId: string, assignee: string | null) => Promise<void> | void;
  onAdvance: (task: HousekeepingTaskWithRelations, transition: 'start' | 'complete' | 'validate' | 'reopen') => Promise<void> | void;
  onReportIssue: (taskId: string, note: string) => Promise<void> | void;
  onDelete: (taskId: string) => Promise<void> | void;
}

const CHECKLIST_LABEL_DICT = fr.housekeeping.checklist.labels as Record<string, string>;

function labelFor(key: HousekeepingChecklistLabelKey, custom: string | null): string {
  if (custom && custom.trim()) return custom;
  return CHECKLIST_LABEL_DICT[key] ?? key;
}

export function ChecklistModal({
  task,
  onClose,
  onToggleItem,
  onUpdateNotes,
  onUpdateAssignee,
  onAdvance,
  onReportIssue,
  onDelete,
}: ChecklistModalProps) {
  const [notes, setNotes] = useState('');
  const [assignee, setAssignee] = useState('');
  const [issueNote, setIssueNote] = useState('');

  useEffect(() => {
    if (!task) return;
    setNotes(task.notes ?? '');
    setAssignee(task.assigned_to ?? '');
    setIssueNote(task.issue_note ?? '');
  }, [task]);

  useEffect(() => {
    if (!task) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, task]);

  const progress = useMemo(
    () => computeChecklistProgress(task?.checklist),
    [task?.checklist],
  );

  if (!task) return null;

  const items = task.checklist ?? [];

  const canStart = nextStatusFor(task, 'start') !== null;
  const canComplete = nextStatusFor(task, 'complete') !== null;
  const canValidate = nextStatusFor(task, 'validate') !== null;
  const canReopen = nextStatusFor(task, 'reopen') !== null;

  return (
    <div
      className={modalTokens.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="checklist-modal-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={clsx(modalTokens.panel, 'max-w-2xl')}>
        <div className={clsx('flex items-start justify-between gap-3 border-b px-5 py-4', borderTokens.default)}>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              {task.property_name || fr.dashboard.common.propertyFallback}
            </p>
            <h2 id="checklist-modal-title" className={clsx('truncate text-lg font-semibold', textTokens.title)}>
              {fr.housekeeping.checklist.title}
            </h2>
            <p className={clsx('mt-1 text-sm', textTokens.muted)}>
              {fr.housekeeping.checklist.progress(progress.done, progress.total, progress.pct)}
            </p>
          </div>
          <button
            type="button"
            aria-label={fr.housekeeping.checklist.close}
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          <section>
            <h3 className={clsx('mb-2 text-sm font-semibold', textTokens.title)}>
              {fr.housekeeping.checklist.title}
            </h3>
            {items.length === 0 ? (
              <p className={clsx('text-sm', textTokens.muted)}>{fr.housekeeping.checklist.empty}</p>
            ) : (
              <ul className="space-y-1.5">
                {items.map((item) => (
                  <li key={item.id}>
                    <label
                      className={clsx(
                        'flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors',
                        item.is_done ? 'border-emerald-200 bg-emerald-50' : borderTokens.default,
                        'hover:bg-slate-50',
                      )}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        checked={item.is_done}
                        onChange={(event) => void onToggleItem(item.id, event.target.checked)}
                      />
                      <span
                        className={clsx(
                          'flex-1',
                          item.is_done ? 'text-slate-500 line-through' : textTokens.body,
                        )}
                      >
                        {labelFor(item.label_key, item.custom_label)}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-2">
            <label htmlFor="task-assignee" className={clsx('text-sm font-medium', textTokens.title)}>
              {fr.housekeeping.checklist.assigneeLabel}
            </label>
            <div className="flex gap-2">
              <input
                id="task-assignee"
                type="text"
                placeholder={fr.housekeeping.checklist.assigneePlaceholder}
                value={assignee}
                onChange={(event) => setAssignee(event.target.value)}
                className={inputTokens.base}
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void onUpdateAssignee(task.id, assignee.trim() || null)}
              >
                {fr.housekeeping.checklist.saveAssignee}
              </Button>
            </div>
          </section>

          <section className="space-y-2">
            <label htmlFor="task-notes" className={clsx('text-sm font-medium', textTokens.title)}>
              {fr.housekeeping.checklist.notesLabel}
            </label>
            <textarea
              id="task-notes"
              rows={3}
              placeholder={fr.housekeeping.checklist.notesPlaceholder}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className={clsx(inputTokens.base, 'resize-none')}
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void onUpdateNotes(task.id, notes.trim() || null)}
            >
              {fr.housekeeping.checklist.saveNotes}
            </Button>
          </section>

          <section className="space-y-2">
            <label htmlFor="task-issue" className={clsx('text-sm font-medium', textTokens.title)}>
              {fr.housekeeping.checklist.issueLabel}
            </label>
            <textarea
              id="task-issue"
              rows={2}
              placeholder={fr.housekeeping.checklist.issuePlaceholder}
              value={issueNote}
              onChange={(event) => setIssueNote(event.target.value)}
              className={clsx(inputTokens.base, 'resize-none')}
            />
            <Button
              variant="warning"
              size="sm"
              onClick={() => {
                if (!issueNote.trim()) return;
                void onReportIssue(task.id, issueNote.trim());
              }}
            >
              <AlertTriangle aria-hidden size={14} />
              {fr.housekeeping.checklist.reportIssue}
            </Button>
          </section>

          <section className={clsx('rounded-lg border p-3 text-xs', statusTokens.info)}>
            <p className="flex items-center gap-1.5 font-medium">
              <Camera aria-hidden size={14} />
              {fr.housekeeping.checklist.photosTitle}
            </p>
            <p className="mt-1">{fr.housekeeping.checklist.photosHint}</p>
          </section>
        </div>

        <div className={clsx('flex flex-wrap items-center justify-between gap-2 border-t bg-slate-50 px-5 py-3', borderTokens.default)}>
          <Button
            variant="dangerSoft"
            size="sm"
            onClick={() => {
              if (typeof window !== 'undefined' && !window.confirm(fr.housekeeping.confirmDelete)) return;
              void onDelete(task.id);
            }}
          >
            <Trash2 aria-hidden size={14} />
            {fr.housekeeping.actions.delete}
          </Button>

          <div className="flex flex-wrap items-center gap-2">
            {canReopen ? (
              <Button variant="secondary" size="sm" onClick={() => void onAdvance(task, 'reopen')}>
                <RotateCcw aria-hidden size={14} />
                {fr.housekeeping.actions.reopen}
              </Button>
            ) : null}
            {canStart ? (
              <Button variant="secondary" size="sm" onClick={() => void onAdvance(task, 'start')}>
                {fr.housekeeping.actions.start}
              </Button>
            ) : null}
            {canComplete ? (
              <Button variant="primary" size="sm" onClick={() => void onAdvance(task, 'complete')}>
                {fr.housekeeping.actions.complete}
              </Button>
            ) : null}
            {canValidate ? (
              <Button variant="primary" size="sm" onClick={() => void onAdvance(task, 'validate')}>
                {fr.housekeeping.actions.validate}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
