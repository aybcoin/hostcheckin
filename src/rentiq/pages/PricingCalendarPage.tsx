import { useMemo, useState } from 'react';
import { DecisionBadge } from '../components/DecisionBadge';
import { useRentiqStore } from '../store/useRentiqStore';
import type { DailyPricing } from '../types';
import { formatMad } from '../utils/currency';
import { dayLabel } from '../utils/dates';

function rowAccent(day: DailyPricing): string {
  if (day.status !== 'free') return 'border-l-slate-500/60';
  if (day.riskScore >= 70) return 'border-l-rose-500/80';
  if (day.demandScore >= 70) return 'border-l-emerald-500/80';
  if (day.opportunityScore >= 70) return 'border-l-amber-500/80';
  return 'border-l-cyan-500/80';
}

export function PricingCalendarPage() {
  const dailyPricing = useRentiqStore((state) => state.dailyPricing);
  const selectedListingId = useRentiqStore((state) => state.selectedListingId);

  const rows = useMemo(
    () => dailyPricing.filter((day) => day.listingId === selectedListingId).slice(0, 60),
    [dailyPricing, selectedListingId],
  );

  const [selectedDate, setSelectedDate] = useState<string | null>(rows[0]?.date ?? null);
  const selectedDay = rows.find((row) => row.date === selectedDate) ?? rows[0] ?? null;

  return (
    <section className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
      <article className="rounded-xl border border-[var(--rq-border)] bg-[var(--rq-surface)] p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-100">Calendrier pricing (60 jours)</h3>
          <p className="text-xs text-slate-400">Cliquer une ligne pour le détail</p>
        </div>

        <div className="max-h-[680px] overflow-auto rounded-lg border border-[var(--rq-border)]">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-[var(--rq-panel)] text-xs uppercase tracking-[0.12em] text-slate-400">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Statut</th>
                <th className="px-3 py-2">Actuel</th>
                <th className="px-3 py-2">Recommandé</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((day) => (
                <tr
                  key={day.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedDate(day.date)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') setSelectedDate(day.date);
                  }}
                  className={[
                    'cursor-pointer border-l-4 border-b border-[var(--rq-border)] transition hover:bg-white/5',
                    rowAccent(day),
                    selectedDate === day.date ? 'bg-white/5' : '',
                  ].join(' ')}
                >
                  <td className="px-3 py-2 text-slate-100">{dayLabel(day.date)}</td>
                  <td className="px-3 py-2 capitalize text-slate-300">{day.status}</td>
                  <td className="px-3 py-2">{formatMad(day.currentPrice)}</td>
                  <td className="px-3 py-2 font-semibold text-slate-100">{formatMad(day.recommendedPrice)}</td>
                  <td className="px-3 py-2">
                    <DecisionBadge action={day.decision} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <article className="rounded-xl border border-[var(--rq-border)] bg-[var(--rq-surface)] p-4">
        <h3 className="text-sm font-semibold text-slate-100">Détail du pricing</h3>
        {!selectedDay ? (
          <p className="mt-4 text-sm text-slate-400">Aucune journée sélectionnée.</p>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="rounded-lg border border-[var(--rq-border)] bg-[var(--rq-panel)] p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Date</p>
              <p className="text-lg font-semibold text-slate-100">{selectedDay.date}</p>
              <p className="mt-1 text-sm text-slate-300">{selectedDay.explanation}</p>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-lg border border-[var(--rq-border)] p-2 text-center">
                <p className="text-xs text-slate-400">Demande</p>
                <p className="text-base font-semibold text-emerald-300">{selectedDay.demandScore}</p>
              </div>
              <div className="rounded-lg border border-[var(--rq-border)] p-2 text-center">
                <p className="text-xs text-slate-400">Risque</p>
                <p className="text-base font-semibold text-rose-300">{selectedDay.riskScore}</p>
              </div>
              <div className="rounded-lg border border-[var(--rq-border)] p-2 text-center">
                <p className="text-xs text-slate-400">Opportunité</p>
                <p className="text-base font-semibold text-amber-300">{selectedDay.opportunityScore}</p>
              </div>
            </div>

            <div className="space-y-2 rounded-lg border border-[var(--rq-border)] bg-[var(--rq-panel)] p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Facteurs appliqués</p>
              {selectedDay.factors.map((factor) => (
                <div key={factor.key} className="rounded-md border border-[var(--rq-border)] p-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-slate-100">{factor.label}</p>
                    <p className="text-xs text-slate-300">{factor.value.toFixed(2)}x</p>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span className="text-slate-400">{factor.reason}</span>
                    <span className={factor.impactMad >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                      {factor.impactMad >= 0 ? '+' : ''}{factor.impactMad} MAD
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </article>
    </section>
  );
}
