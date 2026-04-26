import { clsx } from '../../lib/clsx';
import {
  borderTokens,
  chipTokens,
  inputTokens,
  textTokens,
} from '../../lib/design-tokens';
import { fr } from '../../lib/i18n/fr';
import type { Period, PeriodPreset } from '../../types/finance';

interface PeriodFilterProps {
  preset: PeriodPreset;
  custom: Period;
  onPresetChange: (preset: PeriodPreset) => void;
  onCustomChange: (period: Period) => void;
}

const PRESET_ORDER: PeriodPreset[] = [
  'this_month',
  'last_month',
  'last_30_days',
  'last_90_days',
  'this_year',
  'last_year',
  'custom',
];

export function PeriodFilter({
  preset,
  custom,
  onPresetChange,
  onCustomChange,
}: PeriodFilterProps) {
  return (
    <div className={clsx('flex flex-wrap items-center gap-2 rounded-xl border p-3', borderTokens.default)}>
      <div role="tablist" aria-label={fr.finance.period.label} className="flex flex-wrap gap-1.5">
        {PRESET_ORDER.map((item) => (
          <button
            key={item}
            role="tab"
            type="button"
            aria-selected={preset === item}
            onClick={() => onPresetChange(item)}
            className={clsx(
              'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2',
              preset === item ? chipTokens.active : chipTokens.primary,
            )}
          >
            {fr.finance.period.presets[item]}
          </button>
        ))}
      </div>

      {preset === 'custom' ? (
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <label className={clsx('text-xs font-medium', textTokens.muted)} htmlFor="finance-period-start">
            {fr.finance.period.from}
          </label>
          <input
            id="finance-period-start"
            type="date"
            value={custom.start}
            onChange={(event) => onCustomChange({ ...custom, start: event.target.value })}
            className={clsx(inputTokens.base, 'w-auto py-1.5 text-xs')}
          />

          <label className={clsx('text-xs font-medium', textTokens.muted)} htmlFor="finance-period-end">
            {fr.finance.period.to}
          </label>
          <input
            id="finance-period-end"
            type="date"
            value={custom.end}
            onChange={(event) => onCustomChange({ ...custom, end: event.target.value })}
            className={clsx(inputTokens.base, 'w-auto py-1.5 text-xs')}
          />
        </div>
      ) : null}
    </div>
  );
}
