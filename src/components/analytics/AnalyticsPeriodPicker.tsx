import { clsx } from '../../lib/clsx';
import { borderTokens, chipTokens, inputTokens, textTokens } from '../../lib/design-tokens';
import { fr } from '../../lib/i18n/fr';
import type { Property } from '../../lib/supabase';
import type { PeriodPreset } from '../../types/finance';

interface AnalyticsPeriodPickerProps {
  preset: PeriodPreset;
  onChange: (preset: PeriodPreset) => void;
  propertyFilter: string | 'all';
  onPropertyChange: (value: string | 'all') => void;
  properties: Property[];
}

const PRESETS: Array<{ value: PeriodPreset; label: string }> = [
  { value: 'this_month', label: fr.analytics.periodPicker.thisMonth },
  { value: 'last_month', label: fr.analytics.periodPicker.lastMonth },
  { value: 'this_year', label: fr.analytics.periodPicker.thisYear },
  { value: 'last_year', label: fr.analytics.periodPicker.lastYear },
  { value: 'last_90_days', label: fr.analytics.periodPicker.last90 },
];

export function AnalyticsPeriodPicker({
  preset,
  onChange,
  propertyFilter,
  onPropertyChange,
  properties,
}: AnalyticsPeriodPickerProps) {
  return (
    <div className={clsx('flex flex-wrap items-center gap-3 rounded-xl border p-3', borderTokens.default)}>
      <div role="tablist" aria-label={fr.analytics.pageTitle} className="flex flex-wrap gap-1.5">
        {PRESETS.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={preset === item.value}
            onClick={() => onChange(item.value)}
            className={clsx(
              'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300',
              preset === item.value ? chipTokens.active : chipTokens.primary,
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <label htmlFor="analytics-property-filter" className={clsx('text-xs font-medium', textTokens.muted)}>
          {fr.topnav.links.properties}
        </label>
        <select
          id="analytics-property-filter"
          value={propertyFilter}
          onChange={(event) => onPropertyChange(event.target.value as string | 'all')}
          className={clsx(inputTokens.base, 'w-auto py-1.5 text-xs')}
        >
          <option value="all">{fr.analytics.periodPicker.allProperties}</option>
          {properties.map((property) => (
            <option key={property.id} value={property.id}>
              {property.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
