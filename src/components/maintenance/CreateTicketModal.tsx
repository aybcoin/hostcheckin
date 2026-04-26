import { type FormEvent, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { clsx } from '../../lib/clsx';
import { borderTokens, inputTokens, modalTokens, textTokens } from '../../lib/design-tokens';
import { fr } from '../../lib/i18n/fr';
import {
  MAINTENANCE_CATEGORIES,
  MAINTENANCE_PRIORITIES,
  type MaintenanceCategory,
  type MaintenancePriority,
  type MaintenanceTicketCreateInput,
} from '../../types/maintenance';
import type { Property, Reservation } from '../../lib/supabase';
import { Button } from '../ui/Button';

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    input: MaintenanceTicketCreateInput,
  ) => Promise<{ error: Error | null } | void>;
  properties: Property[];
  reservations: Reservation[];
  initialPropertyId?: string | null;
}

function parseCost(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const num = Number(trimmed.replace(',', '.'));
  if (!Number.isFinite(num)) return null;
  return num;
}

export function CreateTicketModal({
  isOpen,
  onClose,
  onSubmit,
  properties,
  reservations,
  initialPropertyId,
}: CreateTicketModalProps) {
  const [propertyId, setPropertyId] = useState<string>(initialPropertyId ?? '');
  const [reservationId, setReservationId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<MaintenanceCategory>('other');
  const [priority, setPriority] = useState<MaintenancePriority>('normal');
  const [assignee, setAssignee] = useState('');
  const [costEstimate, setCostEstimate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setPropertyId(initialPropertyId ?? properties[0]?.id ?? '');
    setReservationId('');
    setTitle('');
    setDescription('');
    setCategory('other');
    setPriority('normal');
    setAssignee('');
    setCostEstimate('');
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
    if (!title.trim()) {
      setError(fr.maintenance.create.missingTitle);
      return;
    }
    if (!propertyId) {
      setError(fr.maintenance.create.missingProperty);
      return;
    }

    setSubmitting(true);
    try {
      const result = await onSubmit({
        property_id: propertyId,
        reservation_id: reservationId || null,
        title: title.trim(),
        description: description.trim() || null,
        category,
        priority,
        assigned_to: assignee.trim() || null,
        cost_estimate: parseCost(costEstimate),
      });
      if (result && 'error' in result && result.error) {
        setError(fr.maintenance.create.createError);
        setSubmitting(false);
        return;
      }
      onClose();
    } catch {
      setError(fr.maintenance.create.createError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={modalTokens.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-maintenance-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form onSubmit={handleSubmit} className={clsx(modalTokens.panel, 'max-w-lg')}>
        <div className={clsx('flex items-center justify-between gap-3 border-b px-5 py-4', borderTokens.default)}>
          <h2 id="create-maintenance-title" className={clsx('text-lg font-semibold', textTokens.title)}>
            {fr.maintenance.create.title}
          </h2>
          <button
            type="button"
            aria-label={fr.maintenance.create.cancel}
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5 max-h-[70vh] overflow-y-auto">
          <div className="space-y-1.5">
            <label htmlFor="ticket-title" className={clsx('text-sm font-medium', textTokens.title)}>
              {fr.maintenance.create.titleField}
            </label>
            <input
              id="ticket-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={fr.maintenance.create.titlePlaceholder}
              className={inputTokens.base}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="ticket-property" className={clsx('text-sm font-medium', textTokens.title)}>
              {fr.maintenance.create.property}
            </label>
            <select
              id="ticket-property"
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
            <label htmlFor="ticket-reservation" className={clsx('text-sm font-medium', textTokens.title)}>
              {fr.maintenance.create.reservation}
            </label>
            <select
              id="ticket-reservation"
              value={reservationId}
              onChange={(event) => setReservationId(event.target.value)}
              className={inputTokens.base}
              disabled={!propertyId}
            >
              <option value="">{fr.maintenance.create.reservationNone}</option>
              {filteredReservations.map((res) => (
                <option key={res.id} value={res.id}>
                  {res.booking_reference || res.id.slice(0, 6)} — {res.check_in_date} → {res.check_out_date}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="ticket-category" className={clsx('text-sm font-medium', textTokens.title)}>
                {fr.maintenance.create.category}
              </label>
              <select
                id="ticket-category"
                value={category}
                onChange={(event) => setCategory(event.target.value as MaintenanceCategory)}
                className={inputTokens.base}
              >
                {MAINTENANCE_CATEGORIES.map((value) => (
                  <option key={value} value={value}>
                    {fr.maintenance.category[value]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="ticket-priority" className={clsx('text-sm font-medium', textTokens.title)}>
                {fr.maintenance.create.priority}
              </label>
              <select
                id="ticket-priority"
                value={priority}
                onChange={(event) => setPriority(event.target.value as MaintenancePriority)}
                className={inputTokens.base}
              >
                {MAINTENANCE_PRIORITIES.map((value) => (
                  <option key={value} value={value}>
                    {fr.maintenance.priority[value]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="ticket-description" className={clsx('text-sm font-medium', textTokens.title)}>
              {fr.maintenance.create.description}
            </label>
            <textarea
              id="ticket-description"
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={fr.maintenance.create.descriptionPlaceholder}
              className={clsx(inputTokens.base, 'resize-none')}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="ticket-assignee" className={clsx('text-sm font-medium', textTokens.title)}>
                {fr.maintenance.create.assignee}
              </label>
              <input
                id="ticket-assignee"
                type="text"
                value={assignee}
                onChange={(event) => setAssignee(event.target.value)}
                placeholder={fr.maintenance.create.assigneePlaceholder}
                className={inputTokens.base}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="ticket-cost-estimate" className={clsx('text-sm font-medium', textTokens.title)}>
                {fr.maintenance.create.costEstimate}
              </label>
              <input
                id="ticket-cost-estimate"
                type="text"
                inputMode="decimal"
                value={costEstimate}
                onChange={(event) => setCostEstimate(event.target.value)}
                placeholder={fr.maintenance.create.costEstimatePlaceholder}
                className={inputTokens.base}
              />
            </div>
          </div>

          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          ) : null}
        </div>

        <div className={clsx('flex items-center justify-end gap-2 border-t bg-slate-50 px-5 py-3', borderTokens.default)}>
          <Button type="button" variant="tertiary" size="sm" onClick={onClose} disabled={submitting}>
            {fr.maintenance.create.cancel}
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={submitting}>
            {fr.maintenance.create.submit}
          </Button>
        </div>
      </form>
    </div>
  );
}
