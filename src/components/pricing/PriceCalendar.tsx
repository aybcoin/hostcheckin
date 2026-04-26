import { clsx } from '../../lib/clsx';
import {
  borderTokens,
  statusTokens,
  surfaceTokens,
  textTokens,
} from '../../lib/design-tokens';
import { fr } from '../../lib/i18n/fr';
import type { PriceComputation } from '../../types/pricing';
import { Card } from '../ui/Card';
import { formatPricingAmount } from './helpers';

interface PriceCalendarProps {
  currentMonth: Date;
  computations: PriceComputation[];
  onSelectDate: (date: string) => void;
}

function ymd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function badgeTone(finalRate: number, minRate: number, maxRate: number): string {
  if (maxRate <= minRate) return statusTokens.neutral;
  const ratio = (finalRate - minRate) / (maxRate - minRate);
  if (ratio >= 0.75) return statusTokens.danger;
  if (ratio >= 0.5) return statusTokens.warning;
  if (ratio >= 0.25) return statusTokens.info;
  return statusTokens.neutral;
}

function tooltip(computation: PriceComputation): string {
  const lines = [
    computation.date,
    `${formatPricingAmount(computation.finalRate, computation.currency)}`,
  ];

  if (computation.appliedOverride) {
    lines.push(
      `${fr.pricingEngine.calendar.overrideLabel}: ${formatPricingAmount(computation.appliedOverride.rate, computation.currency)}`,
    );
  }

  if (computation.appliedRules.length > 0) {
    lines.push(fr.pricingEngine.calendar.rulesLabel);
    computation.appliedRules.forEach((rule) => {
      lines.push(`- ${rule.ruleName}`);
    });
  } else {
    lines.push(`${fr.pricingEngine.calendar.rulesLabel}: ${fr.pricingEngine.calendar.noRules}`);
  }

  lines.push(fr.pricingEngine.calendar.clickToOverride);
  return lines.join('\n');
}

export function PriceCalendar({
  currentMonth,
  computations,
  onSelectDate,
}: PriceCalendarProps) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const computationMap = new Map(computations.map((entry) => [entry.date, entry]));
  const filledRates = computations.map((entry) => entry.finalRate);
  const minRate = filledRates.length > 0 ? Math.min(...filledRates) : 0;
  const maxRate = filledRates.length > 0 ? Math.max(...filledRates) : 0;

  const cells: Array<number | null> = [];
  for (let index = 0; index < firstDay; index += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);

  const today = new Date();
  const todayKey = ymd(new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())));

  return (
    <Card variant="default" padding="sm" className={clsx('overflow-hidden p-0', borderTokens.default)}>
      <div className="grid grid-cols-7">
        {fr.pricingEngine.calendar.weekdaysShort.map((label) => (
          <div
            key={label}
            className={clsx('border-b px-2 py-2 text-center text-xs font-semibold', borderTokens.default, surfaceTokens.subtle, textTokens.subtle)}
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((day, index) => {
          if (day == null) {
            return (
              <div
                key={`empty-${index}`}
                className={clsx('min-h-[108px] border-b border-r', borderTokens.subtle, surfaceTokens.subtle)}
              />
            );
          }

          const date = ymd(new Date(Date.UTC(year, month, day)));
          const computation = computationMap.get(date);
          const isToday = date === todayKey;

          return (
            <button
              key={date}
              type="button"
              title={computation ? tooltip(computation) : fr.pricingEngine.calendar.clickToOverride}
              onClick={() => onSelectDate(date)}
              className={clsx(
                'flex min-h-[108px] flex-col justify-between border-b border-r px-2 py-2 text-left transition-colors hover:opacity-90',
                borderTokens.subtle,
                isToday ? surfaceTokens.muted : surfaceTokens.panel,
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={clsx('text-sm font-semibold', textTokens.title)}>{day}</span>
                {computation?.appliedOverride ? (
                  <span className={clsx('rounded-full border px-2 py-0.5 text-[10px] font-medium', statusTokens.warning)}>
                    {fr.pricingEngine.calendar.overrideLabel}
                  </span>
                ) : null}
              </div>

              <div className="space-y-1">
                <p className={clsx('text-sm font-semibold', textTokens.title)}>
                  {computation ? formatPricingAmount(computation.finalRate, computation.currency) : '--'}
                </p>
                {computation ? (
                  <span className={clsx('inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium', badgeTone(computation.finalRate, minRate, maxRate))}>
                    {computation.appliedRules.length}
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
