import { useMemo, useState } from 'react';
import { buildCalibrationReport } from '../engine/calibration';
import { runBacktestForListing } from '../services/backtestService';
import { useRentiqStore } from '../store/useRentiqStore';
import type { BacktestRunResult, BacktestScenario, BacktestScenarioResult } from '../types';
import { formatMad } from '../utils/currency';
import { toISODate } from '../utils/dates';

function scenarioLabel(scenario: BacktestScenario): string {
  if (scenario === 'prudent') return 'Prudent';
  if (scenario === 'aggressive') return 'Agressif';
  return 'Équilibré';
}

function percentage(value: number): string {
  return `${value.toFixed(2)}%`;
}

function ratio(value: number): string {
  return `${value.toFixed(2)}%`;
}

function scenarioByKey(result: BacktestRunResult | null, scenario: BacktestScenario): BacktestScenarioResult | null {
  return result?.scenarios.find((item) => item.scenario === scenario) ?? null;
}

export function BacktestPage() {
  const {
    listings,
    selectedListingId,
    setSelectedListing,
    bookings,
    dailyPricing,
    competitors,
    events,
  } = useRentiqStore((state) => ({
    listings: state.listings,
    selectedListingId: state.selectedListingId,
    setSelectedListing: state.setSelectedListing,
    bookings: state.bookings,
    dailyPricing: state.dailyPricing,
    competitors: state.competitors,
    events: state.events,
  }));

  const today = toISODate(new Date());
  const yearStart = `${today.slice(0, 4)}-01-01`;
  const [periodStart, setPeriodStart] = useState(yearStart);
  const [periodEnd, setPeriodEnd] = useState(today);
  const [result, setResult] = useState<BacktestRunResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeListing = useMemo(
    () => listings.find((listing) => listing.id === selectedListingId) ?? listings[0] ?? null,
    [listings, selectedListingId],
  );

  const prudentResult = scenarioByKey(result, 'prudent');
  const balancedResult = scenarioByKey(result, 'balanced');
  const aggressiveResult = scenarioByKey(result, 'aggressive');
  const calibration = useMemo(() => (balancedResult ? buildCalibrationReport(balancedResult) : null), [balancedResult]);
  const scenarioCards: Array<{ key: BacktestScenario; data: BacktestScenarioResult | null }> = [
    { key: 'prudent', data: prudentResult },
    { key: 'balanced', data: balancedResult },
    { key: 'aggressive', data: aggressiveResult },
  ];

  const handleRunBacktest = async () => {
    if (!activeListing) return;
    if (periodStart > periodEnd) {
      setError('Période invalide: la date de début doit être antérieure à la date de fin.');
      return;
    }

    setRunning(true);
    setError(null);
    try {
      const run = await runBacktestForListing({
        listing: activeListing,
        bookings,
        historicalDailyPricing: dailyPricing,
        competitors,
        events,
        periodStart,
        periodEnd,
      });
      setResult(run);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue pendant le backtest.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <section className="space-y-4">
      <article className="rounded-xl border border-[var(--rq-border)] bg-[var(--rq-surface)] p-4">
        <h3 className="text-sm font-semibold text-slate-100">Backtest moteur pricing</h3>
        <p className="mt-1 text-sm text-slate-400">
          Compare les revenus historiques et les revenus simulés sur trois scénarios d’élasticité.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <label className="space-y-1 text-xs uppercase tracking-[0.12em] text-slate-400">
            Logement
            <select
              value={activeListing?.id ?? ''}
              onChange={(event) => setSelectedListing(event.target.value)}
              className="w-full rounded-lg border border-[var(--rq-border)] bg-[var(--rq-panel)] px-3 py-2 text-sm font-normal tracking-normal text-slate-100"
            >
              {listings.map((listing) => (
                <option key={listing.id} value={listing.id}>
                  {listing.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-xs uppercase tracking-[0.12em] text-slate-400">
            Début
            <input
              type="date"
              value={periodStart}
              onChange={(event) => setPeriodStart(event.target.value)}
              className="w-full rounded-lg border border-[var(--rq-border)] bg-[var(--rq-panel)] px-3 py-2 text-sm font-normal tracking-normal text-slate-100"
            />
          </label>

          <label className="space-y-1 text-xs uppercase tracking-[0.12em] text-slate-400">
            Fin
            <input
              type="date"
              value={periodEnd}
              onChange={(event) => setPeriodEnd(event.target.value)}
              className="w-full rounded-lg border border-[var(--rq-border)] bg-[var(--rq-panel)] px-3 py-2 text-sm font-normal tracking-normal text-slate-100"
            />
          </label>

          <button
            type="button"
            onClick={() => {
              void handleRunBacktest();
            }}
            disabled={running || !activeListing}
            className="mt-auto rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-cyan-950 transition hover:bg-cyan-400 disabled:opacity-60"
          >
            {running ? 'Backtest en cours...' : 'Lancer le backtest'}
          </button>
        </div>
      </article>

      {error ? (
        <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>
      ) : null}

      {result ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-xl border border-[var(--rq-border)] bg-[var(--rq-surface)] p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Revenu réel</p>
              <p className="mt-2 text-2xl font-semibold text-slate-100">{formatMad(balancedResult?.revenueReal ?? 0)}</p>
              <p className="mt-1 text-xs text-slate-400">Période {result.periodStart} → {result.periodEnd}</p>
            </article>

            {scenarioCards.map(({ key, data: scenario }) => (
              <article key={key} className="rounded-xl border border-[var(--rq-border)] bg-[var(--rq-surface)] p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-slate-400">
                  Simulé {scenarioLabel(key)}
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-100">{formatMad(scenario?.revenueSimulated ?? 0)}</p>
                <p className={(scenario?.revenueDeltaMad ?? 0) >= 0 ? 'mt-1 text-xs text-emerald-300' : 'mt-1 text-xs text-rose-300'}>
                  {(scenario?.revenueDeltaMad ?? 0) >= 0 ? '+' : ''}{formatMad(scenario?.revenueDeltaMad ?? 0)}
                  {' '}
                  ({percentage(scenario?.revenueDeltaPct ?? 0)})
                </p>
              </article>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {scenarioCards.map(({ key, data: scenario }) => (
              <article key={`${key}-kpi`} className="rounded-xl border border-[var(--rq-border)] bg-[var(--rq-surface)] p-4">
                <h4 className="text-sm font-semibold text-slate-100">{scenarioLabel(key)}</h4>
                <div className="mt-3 grid gap-2 text-sm text-slate-300">
                  <p>ADR réel / simulé: {formatMad(scenario?.adrReal ?? 0)} / {formatMad(scenario?.adrSimulated ?? 0)}</p>
                  <p>RevPAR réel / simulé: {formatMad(scenario?.revparReal ?? 0)} / {formatMad(scenario?.revparSimulated ?? 0)}</p>
                  <p>Occupation réelle / simulée: {ratio(scenario?.occupancyReal ?? 0)} / {ratio(scenario?.occupancySimulated ?? 0)}</p>
                  <p>Actions: +{scenario?.increaseCount ?? 0} / -{scenario?.decreaseCount ?? 0} / ={scenario?.holdCount ?? 0}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <article className="rounded-xl border border-[var(--rq-border)] bg-[var(--rq-surface)] p-4">
              <h4 className="text-sm font-semibold text-slate-100">Top 10 opportunités manquées (scénario équilibré)</h4>
              <div className="mt-3 overflow-auto rounded-lg border border-[var(--rq-border)]">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[var(--rq-panel)] text-xs uppercase tracking-[0.12em] text-slate-400">
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Réel</th>
                      <th className="px-3 py-2">Reco</th>
                      <th className="px-3 py-2">Gain estimé</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(balancedResult?.topMissedOpportunities ?? []).map((item) => (
                      <tr key={item.date} className="border-t border-[var(--rq-border)]">
                        <td className="px-3 py-2 text-slate-200">{item.date}</td>
                        <td className="px-3 py-2 text-slate-300">{formatMad(item.realPrice)}</td>
                        <td className="px-3 py-2 text-slate-300">{formatMad(item.recommendedPrice)}</td>
                        <td className="px-3 py-2 text-emerald-300">+{formatMad(item.expectedGainMad)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="rounded-xl border border-[var(--rq-border)] bg-[var(--rq-surface)] p-4">
              <h4 className="text-sm font-semibold text-slate-100">Top 10 dates à risque (scénario équilibré)</h4>
              <div className="mt-3 overflow-auto rounded-lg border border-[var(--rq-border)]">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[var(--rq-panel)] text-xs uppercase tracking-[0.12em] text-slate-400">
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Réel</th>
                      <th className="px-3 py-2">Reco</th>
                      <th className="px-3 py-2">Perte estimée</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(balancedResult?.topRiskyDates ?? []).map((item) => (
                      <tr key={item.date} className="border-t border-[var(--rq-border)]">
                        <td className="px-3 py-2 text-slate-200">{item.date}</td>
                        <td className="px-3 py-2 text-slate-300">{formatMad(item.realPrice)}</td>
                        <td className="px-3 py-2 text-slate-300">{formatMad(item.recommendedPrice)}</td>
                        <td className="px-3 py-2 text-rose-300">-{formatMad(item.expectedLossMad)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          </div>

          <article className="rounded-xl border border-[var(--rq-border)] bg-[var(--rq-surface)] p-4">
            <h4 className="text-sm font-semibold text-slate-100">Diagnostic</h4>
            <p className="mt-2 text-sm text-slate-300">{balancedResult?.diagnostic}</p>

            {calibration ? (
              <div className="mt-4 space-y-2">
                <p className="text-xs uppercase tracking-[0.12em] text-slate-400">
                  Calibration suggérée ({scenarioLabel(calibration.scenario)})
                </p>
                {calibration.suggestions.map((suggestion) => (
                  <div key={suggestion.factor} className="rounded-lg border border-[var(--rq-border)] bg-[var(--rq-panel)] p-3 text-sm">
                    <p className="font-medium text-slate-100">
                      {suggestion.factor}: {suggestion.currentAverage.toFixed(3)} → {suggestion.recommendedAverage.toFixed(3)}
                    </p>
                    <p className="mt-1 text-slate-300">{suggestion.justification}</p>
                    <p className="mt-1 text-xs text-slate-400">Confiance: {(suggestion.confidence * 100).toFixed(0)}%</p>
                  </div>
                ))}
              </div>
            ) : null}
          </article>
        </>
      ) : null}
    </section>
  );
}
