import { useEffect, useState } from 'react';
import { Building2, Check, ShieldCheck } from 'lucide-react';
import { clsx } from '../../lib/clsx';
import { borderTokens, inputTokens, statusTokens, surfaceTokens, textTokens } from '../../lib/design-tokens';
import { fr } from '../../lib/i18n/fr';
import type { Host, Property } from '../../lib/supabase';
import { Card } from '../ui/Card';

interface ComplianceSectionProps {
  host: Host | null;
  properties: Property[];
  onUpdateHost: (updates: Partial<Host>) => Promise<void>;
  onUpdateProperty?: (id: string, updates: Partial<Property>) => Promise<void>;
}

const t = fr.profile.compliance;

export function ComplianceSection({ host, properties, onUpdateHost, onUpdateProperty }: ComplianceSectionProps) {
  const [enabled, setEnabled] = useState(Boolean(host?.police_bulletin_enabled));
  const [appartNos, setAppartNos] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const property of properties) {
      map[property.id] = property.appart_no ?? '';
    }
    return map;
  });
  const [savingId, setSavingId] = useState<string | null>(null);
  const [recentlySaved, setRecentlySaved] = useState<string | null>(null);

  useEffect(() => {
    if (host) setEnabled(Boolean(host.police_bulletin_enabled));
  }, [host]);

  useEffect(() => {
    setAppartNos((previous) => {
      const map: Record<string, string> = { ...previous };
      for (const property of properties) {
        if (map[property.id] === undefined) map[property.id] = property.appart_no ?? '';
      }
      return map;
    });
  }, [properties]);

  const handleToggle = async () => {
    const next = !enabled;
    setEnabled(next);
    setSavingId('host');
    try {
      await onUpdateHost({ police_bulletin_enabled: next });
      setRecentlySaved('host');
      window.setTimeout(() => setRecentlySaved((value) => (value === 'host' ? null : value)), 2000);
    } finally {
      setSavingId(null);
    }
  };

  const handleApartmentBlur = async (propertyId: string) => {
    if (!onUpdateProperty) return;
    const property = properties.find((item) => item.id === propertyId);
    if (!property) return;
    const nextValue = (appartNos[propertyId] ?? '').trim();
    if (nextValue === (property.appart_no ?? '')) return;

    setSavingId(propertyId);
    try {
      await onUpdateProperty(propertyId, { appart_no: nextValue || null });
      setRecentlySaved(propertyId);
      window.setTimeout(
        () => setRecentlySaved((value) => (value === propertyId ? null : value)),
        2000,
      );
    } catch (err) {
      console.warn('Failed to update appart_no:', err);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <Card variant="default" padding="lg" className="sm:p-7">
        <div className="flex items-start gap-3">
          <span className={clsx('inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', surfaceTokens.subtle)}>
            <ShieldCheck className={textTokens.body} size={20} aria-hidden="true" strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className={clsx('text-lg font-semibold', textTokens.title)}>{t.title}</h2>
            <p className={clsx('mt-1 text-sm', textTokens.muted)}>{t.subtitle}</p>
          </div>
        </div>

        <div
          className={clsx(
            'mt-5 flex items-start justify-between gap-4 rounded-xl border p-4',
            borderTokens.default,
            surfaceTokens.subtle,
          )}
        >
          <div className="min-w-0 flex-1">
            <p className={clsx('text-sm font-medium', textTokens.title)}>{t.toggleLabel}</p>
            <p className={clsx('mt-0.5 text-xs', textTokens.muted)}>{t.toggleHint}</p>
            <p
              className={clsx(
                'mt-2 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium',
                enabled ? statusTokens.success : statusTokens.neutral,
              )}
            >
              <span
                aria-hidden="true"
                className={clsx('h-1.5 w-1.5 rounded-full', enabled ? 'bg-emerald-500' : 'bg-stone-400')}
              />
              {enabled ? t.enabled : t.disabled}
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={handleToggle}
            disabled={savingId === 'host'}
            className={clsx(
              'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300 focus-visible:ring-offset-2 disabled:opacity-60',
              enabled ? 'bg-stone-900' : 'bg-stone-300',
            )}
          >
            <span
              className={clsx(
                'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-150',
                enabled ? 'translate-x-5' : 'translate-x-0.5',
              )}
            />
          </button>
        </div>
      </Card>

      <Card variant="default" padding="lg" className="sm:p-7">
        <h3 className={clsx('text-base font-semibold', textTokens.title)}>{t.propertiesTitle}</h3>
        <p className={clsx('mt-1 text-sm', textTokens.muted)}>{t.propertiesHint}</p>

        {properties.length === 0 ? (
          <p className={clsx('mt-4 text-sm', textTokens.subtle)}>{t.noProperties}</p>
        ) : (
          <ul role="list" className="mt-4 space-y-2">
            {properties.map((property) => {
              const isSaving = savingId === property.id;
              const justSaved = recentlySaved === property.id;
              return (
                <li
                  key={property.id}
                  className={clsx(
                    'flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between',
                    borderTokens.default,
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={clsx('inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', surfaceTokens.subtle)}>
                      <Building2 className={textTokens.muted} size={14} strokeWidth={1.75} aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className={clsx('truncate text-sm font-medium', textTokens.title)}>{property.name}</p>
                      <p className={clsx('truncate text-xs', textTokens.subtle)}>{property.city}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:w-56">
                    <label htmlFor={`appart-${property.id}`} className="sr-only">
                      {t.apartmentNumber}
                    </label>
                    <input
                      id={`appart-${property.id}`}
                      type="text"
                      value={appartNos[property.id] ?? ''}
                      onChange={(event) =>
                        setAppartNos((previous) => ({ ...previous, [property.id]: event.target.value }))
                      }
                      onBlur={() => handleApartmentBlur(property.id)}
                      placeholder={t.apartmentPlaceholder}
                      disabled={!onUpdateProperty || isSaving}
                      className={clsx(inputTokens.base, 'h-9 text-sm')}
                    />
                    {isSaving ? (
                      <span className={clsx('text-xs', textTokens.subtle)}>{t.saving}</span>
                    ) : justSaved ? (
                      <Check className={textTokens.success} size={14} aria-hidden="true" />
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
