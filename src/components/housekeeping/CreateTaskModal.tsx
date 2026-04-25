import { type FormEvent, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { clsx } from '../../lib/clsx';
import { borderTokens, inputTokens, modalTokens, textTokens } from '../../lib/design-tokens';
import { fr } from '../../lib/i18n/fr';
import type { HousekeepingTaskCreateInput, HousekeepingPriority } from '../../types/housekeeping';
import type { Property, Reservation } from '../../lib/supabase';
import { Button } from '../ui/Button';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: HousekeepingTaskCreateInput) => Promise<{ error: Error | null } | void>;
  properties: Property[];
  reservations: Reservation[];
  initialPropertyId?: string | null;
}

const PRIORITIES: HousekeepingPriority[] = ['normal', 'high', 'critical'];

function todayYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

export function CreateTaskModal({
  isOpen,
  onClose,
  onSubmit,
  properties,
  reservations,
  initialPropertyId,
}: CreateTaskModalProps) {
  const [propertyId, setPropertyId] = useState<string>(initialPropertyId ?? '');
  const [reservationId, setReservationId] = useState<string>('');
  const [scheduledFor, setScheduledFor] = useState<string>(todayYmd());
  const [priority, setPriority] = useState<HousekeepingPriority>('normal');
  const [assignee, setAssignee] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setPropertyId(initialPropertyId ?? properties[0]?.id ?? '');
    setReservationId('');
    setScheduledFor(todayYmd());
    setPriority('normal');
    setAssignee('');
    setNotes('');
    setError(null);
  }, [isOpen, initialPropertyId, properties]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredReservations = reservations.filter((res) => res.property_id === propertyId);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!propertyId) {
      setError(fr.housekeeping.create.missingProperty);
      return;
    }
    if (!scheduledFor) {
      setError(fr.housekeeping.create.missingDate);
      return;
    }

    setSubmitting(true);
    try {
      const result = await onSubmit({
        property_id: propertyId,
        reservation_id: reservationId || null,
        scheduled_for: scheduledFor,
        priority,
        assigned_to: assignee.trim() || null,
        notes: notes.trim() || null,
      });
      if (result && 'error' in result && result.error) {
        setError(fr.housekeeping.create.createError);
        setSubmitting(false);
        return;
      }
      onClose();
    } catch {
      setError(fr.housekeeping.create.createError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={modalTokens.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-housekeeping-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        className={clsx(modalTokens.panel, 'max-w-lg')}
      >
        <div className={clsx('flex items-center justify-between gap-3 border-b px-5 py-4', borderTokens.default)}>
          <h2 id="create-housekeeping-title" className={clsx('text-lg font-semibold', textTokens.title)}>
            {fr.housekeeping.create.title}
          </h2>
          <button
            type="button"
            aria-label={fr.housekeeping.create.cancel}
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="space-y-1.5">
            <label htmlFor="property" className={clsx('text-sm font-medium', textTokens.title)}>
              {fr.housekeeping.create.property}
            </label>
            <select
              id="property"
              value={propertyId}
              onChange={(event) => {
                setPropertyId(event.target.value);
                setReservationId('');
              }}
              className={inputTokens.base}
              required
            >
              <option value="" disabled>
                —
              </option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="reservation" className={clsx('text-sm font-medium', textTokens.title)}>
              {fr.housekeeping.create.reservation}
            </label>
            <select
              id="reservation"
              value={reservationId}
              onChange={(event) => setReservationId(event.target.value)}
              className={inputTokens.base}
              disabled={!propertyId}
            >
              <option value="">{fr.housekeeping.create.reservationNone}</option>
              {filteredReservations.map((res) => (
                <option key={res.id} value={res.id}>
                  {res.booking_reference || res.id.slice(0, 6)} — {res.check_in_date} → {res.check_out_date}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="scheduled" className={clsx('text-sm font-medium', textTokens.title)}>
                {fr.housekeeping.create.scheduledFor}
              </label>
              <input
                id="scheduled"
                type="date"
                value={scheduledFor}
                onChange={(event) => setScheduledFor(event.target.value)}
                className={inputTokens.base}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="priority" className={clsx('text-sm font-medium', textTokens.title)}>
                {fr.housekeeping.create.priority}
              </label>
              <select
                id="priority"
                value={priority}
                onChange={(event) => setPriority(event.target.value as HousekeepingPriority)}
                className={inputTokens.base}
              >
                {PRIORITIES.map((value) => (
                  <option key={value} value={value}>
                    {fr.housekeeping.priority[value]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="assignee" className={clsx('text-sm font-medium', textTokens.title)}>
              {fr.housekeeping.create.assignee}
            </label>
            <input
              id="assignee"
              type="text"
              value={assignee}
              onChange={(event) => setAssignee(event.target.value)}
              placeholder={fr.housekeeping.create.assigneePlaceholder}
              className={inputTokens.base}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="notes" className={clsx('text-sm font-medium', textTokens.title)}>
              {fr.housekeeping.create.notes}
            </label>
            <textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={fr.housekeeping.create.notesPlaceholder}
              className={clsx(inputTokens.base, 'resize-none')}
            />
          </div>

          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          ) : null}
        </div>

        <div className={clsx('flex items-center justify-end gap-2 border-t bg-slate-50 px-5 py-3', borderTokens.default)}>
          <Button type="button" variant="tertiary" size="sm" onClick={onClose} disabled={submitting}>
            {fr.housekeeping.create.cancel}
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={submitting}>
            {fr.housekeeping.create.submit}
          </Button>
        </div>
      </form>
    </div>
  );
}
