import { type FormEvent, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { clsx } from '../../lib/clsx';
import {
  borderTokens,
  iconButtonToken,
  inputTokens,
  modalTokens,
  statusTokens,
  textTokens,
} from '../../lib/design-tokens';
import { fr } from '../../lib/i18n/fr';
import type { Property } from '../../lib/supabase';
import { ICAL_PLATFORMS, type IcalFeedCreateInput, type IcalPlatform } from '../../types/ical';
import { Button } from '../ui/Button';

interface CreateFeedModalProps {
  isOpen: boolean;
  onClose: () => void;
  properties: Property[];
  onSubmit: (input: IcalFeedCreateInput) => Promise<{ error: Error | null } | void>;
}

function parseInterval(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.floor(parsed);
}

function isHttpsUrl(value: string): boolean {
  return /^https:\/\//i.test(value.trim());
}

export function CreateFeedModal({ isOpen, onClose, properties, onSubmit }: CreateFeedModalProps) {
  const [propertyId, setPropertyId] = useState('');
  const [platform, setPlatform] = useState<IcalPlatform | ''>('');
  const [icalUrl, setIcalUrl] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [syncIntervalMinutes, setSyncIntervalMinutes] = useState('60');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setPropertyId(properties[0]?.id || '');
    setPlatform('');
    setIcalUrl('');
    setDisplayName('');
    setSyncIntervalMinutes('60');
    setNotes('');
    setSubmitting(false);
    setError(null);
  }, [isOpen, properties]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!propertyId) {
      setError(fr.ical.create.missingProperty);
      return;
    }

    if (!platform) {
      setError(fr.ical.create.missingPlatform);
      return;
    }

    const normalizedUrl = icalUrl.trim();
    if (!normalizedUrl) {
      setError(fr.ical.create.missingUrl);
      return;
    }

    if (!isHttpsUrl(normalizedUrl)) {
      setError(fr.ical.create.invalidUrl);
      return;
    }

    const interval = parseInterval(syncIntervalMinutes);
    if (interval < 15) {
      setError(fr.ical.create.intervalTooShort);
      return;
    }

    setSubmitting(true);
    try {
      const result = await onSubmit({
        property_id: propertyId,
        platform,
        ical_url: normalizedUrl,
        display_name: displayName.trim() || null,
        sync_interval_minutes: interval,
        notes: notes.trim() || null,
      });

      if (result && 'error' in result && result.error) {
        setError(fr.ical.create.createError);
        setSubmitting(false);
        return;
      }

      onClose();
    } catch {
      setError(fr.ical.create.createError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={modalTokens.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-ical-feed-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form onSubmit={handleSubmit} className={clsx(modalTokens.panel, 'max-w-lg')}>
        <div className={clsx('flex items-center justify-between gap-3 border-b px-5 py-4', borderTokens.default)}>
          <h2 id="create-ical-feed-title" className={clsx('text-lg font-semibold', textTokens.title)}>
            {fr.ical.create.title}
          </h2>
          <button
            type="button"
            aria-label={fr.ical.create.cancel}
            onClick={onClose}
            className={iconButtonToken}
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-5">
          <div className="space-y-1.5">
            <label htmlFor="ical-create-property" className={clsx('text-sm font-medium', textTokens.title)}>
              {fr.ical.create.property}
            </label>
            <select
              id="ical-create-property"
              value={propertyId}
              onChange={(event) => setPropertyId(event.target.value)}
              className={inputTokens.base}
            >
              <option value="" disabled>
                {fr.ical.create.property}
              </option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="ical-create-platform" className={clsx('text-sm font-medium', textTokens.title)}>
                {fr.ical.create.platform}
              </label>
              <select
                id="ical-create-platform"
                value={platform}
                onChange={(event) => setPlatform(event.target.value as IcalPlatform | '')}
                className={inputTokens.base}
              >
                <option value="" disabled>
                  {fr.ical.create.platform}
                </option>
                {ICAL_PLATFORMS.map((value) => (
                  <option key={value} value={value}>
                    {fr.ical.platform[value]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="ical-create-interval" className={clsx('text-sm font-medium', textTokens.title)}>
                {fr.ical.create.interval}
              </label>
              <input
                id="ical-create-interval"
                type="number"
                min={15}
                step={1}
                value={syncIntervalMinutes}
                onChange={(event) => setSyncIntervalMinutes(event.target.value)}
                className={inputTokens.base}
              />
              <p className={clsx('text-xs', textTokens.subtle)}>{fr.ical.create.intervalHelp}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="ical-create-url" className={clsx('text-sm font-medium', textTokens.title)}>
              {fr.ical.create.urlField}
            </label>
            <input
              id="ical-create-url"
              type="url"
              value={icalUrl}
              onChange={(event) => setIcalUrl(event.target.value)}
              placeholder={fr.ical.create.urlPlaceholder}
              className={inputTokens.base}
              autoComplete="off"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="ical-create-display-name" className={clsx('text-sm font-medium', textTokens.title)}>
              {fr.ical.create.displayName}
            </label>
            <input
              id="ical-create-display-name"
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder={fr.ical.create.displayNamePlaceholder}
              className={inputTokens.base}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="ical-create-notes" className={clsx('text-sm font-medium', textTokens.title)}>
              {fr.ical.create.notes}
            </label>
            <textarea
              id="ical-create-notes"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={fr.ical.create.notesPlaceholder}
              className={clsx(inputTokens.base, 'resize-none')}
            />
          </div>

          {error ? (
            <p className={clsx('rounded-lg border px-3 py-2 text-sm', statusTokens.danger)}>{error}</p>
          ) : null}
        </div>

        <div className={clsx('flex items-center justify-end gap-2 border-t px-5 py-3', borderTokens.default)}>
          <Button type="button" variant="tertiary" size="sm" onClick={onClose} disabled={submitting}>
            {fr.ical.create.cancel}
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={submitting}>
            {fr.ical.create.submit}
          </Button>
        </div>
      </form>
    </div>
  );
}
