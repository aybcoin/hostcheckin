import { useMemo, useState } from 'react';
import { DecisionBadge } from '../components/DecisionBadge';
import { rankRecommendationsForMode, type RecommendationMode } from '../services/recommendationService';
import { useRentiqStore } from '../store/useRentiqStore';
import { formatMad } from '../utils/currency';
import { toISODate } from '../utils/dates';

function modeLabel(mode: RecommendationMode): string {
  return mode === 'opportunities' ? 'Opportunités de hausse' : 'Nuits à sauver';
}

export function RecommendationsPage() {
  const { recommendations, selectedListingId } = useRentiqStore((state) => ({
    recommendations: state.recommendations,
    selectedListingId: state.selectedListingId,
  }));
  const [mode, setMode] = useState<RecommendationMode>('opportunities');
  const today = toISODate(new Date());

  const ranked = useMemo(
    () =>
      rankRecommendationsForMode(
        recommendations.filter((recommendation) => recommendation.listingId === selectedListingId),
        today,
        mode,
      ),
    [recommendations, selectedListingId, today, mode],
  );

  const tabs: RecommendationMode[] = ['opportunities', 'rescue'];

  return (
    <section className="space-y-4">
      <article className="rounded-xl border border-[var(--rq-border)] bg-[var(--rq-surface)] p-4">
        <h3 className="text-sm font-semibold text-slate-100">Recommandations défensives</h3>
        <p className="mt-1 text-sm text-slate-400">
          Tri mixte: gain potentiel + risque de nuit vide, pour éviter un pilotage uniquement orienté hausse.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {tabs.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setMode(item)}
              className={[
                'rounded-full border px-3 py-1 text-xs font-medium transition',
                mode === item
                  ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200'
                  : 'border-[var(--rq-border)] text-slate-300 hover:bg-white/5',
              ].join(' ')}
            >
              {modeLabel(item)}
            </button>
          ))}
        </div>
      </article>

      <div className="space-y-3">
        {ranked.map((item) => (
          <article key={item.recommendation.id} className="rounded-xl border border-[var(--rq-border)] bg-[var(--rq-surface)] p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-100">{item.recommendation.date}</p>
                <p className="mt-1 text-sm text-slate-300">{item.recommendation.explanation}</p>
                <p className="mt-2 text-xs text-slate-400">
                  {formatMad(item.recommendation.currentPrice)} → {formatMad(item.recommendation.recommendedPrice)}
                </p>
                {mode === 'rescue' ? (
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                    {item.flags.orphan ? (
                      <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-amber-200">
                        Nuit orpheline
                      </span>
                    ) : null}
                    {item.flags.lastMinute ? (
                      <span className="rounded-full border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 text-rose-200">
                        Last minute
                      </span>
                    ) : null}
                    {item.flags.overpricedVsCompetition ? (
                      <span className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 text-cyan-200">
                        Prix &gt; concurrence
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <div className="flex min-w-44 flex-col items-end gap-2">
                <DecisionBadge action={item.recommendation.action} />
                <p className={item.recommendation.potentialGainMad >= 0 ? 'text-sm font-semibold text-emerald-300' : 'text-sm font-semibold text-rose-300'}>
                  {item.recommendation.potentialGainMad >= 0 ? '+' : ''}{formatMad(item.recommendation.potentialGainMad)}
                </p>
                <p className="text-xs text-slate-400">
                  Demande {item.recommendation.demandScore} · Risque {item.recommendation.riskScore} · Opportunité {item.recommendation.opportunityScore}
                </p>
                <p className="text-xs text-cyan-300">
                  {mode === 'opportunities'
                    ? `Score mixte ${item.mixedScore.toFixed(1)}`
                    : `Score sauvetage ${item.rescueScore.toFixed(1)} · J-${item.proximityDays}`}
                </p>
              </div>
            </div>
          </article>
        ))}

        {ranked.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--rq-border)] p-6 text-sm text-slate-400">
            Aucune recommandation disponible pour cet onglet.
          </p>
        ) : null}
      </div>
    </section>
  );
}
