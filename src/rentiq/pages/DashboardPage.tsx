import { useMemo } from 'react';
import { KpiCard } from '../components/KpiCard';
import { RevenueOccupancyChart } from '../components/charts/RevenueOccupancyChart';
import { DecisionBadge } from '../components/DecisionBadge';
import { rankRecommendationsForMode } from '../services/recommendationService';
import { useRentiqStore } from '../store/useRentiqStore';
import { formatMad } from '../utils/currency';
import { toISODate } from '../utils/dates';

export function DashboardPage() {
  const { dailyPricing, recommendations, selectedListingId } = useRentiqStore((state) => ({
    dailyPricing: state.dailyPricing,
    recommendations: state.recommendations,
    selectedListingId: state.selectedListingId,
  }));

  const filteredDailyPricing = useMemo(
    () => dailyPricing.filter((day) => day.listingId === selectedListingId).slice(0, 60),
    [dailyPricing, selectedListingId],
  );

  const monthPrefix = new Date().toISOString().slice(0, 7);

  const estimatedMonthlyRevenue = useMemo(
    () =>
      filteredDailyPricing
        .filter((day) => day.date.startsWith(monthPrefix))
        .reduce((sum, day) => sum + (day.status === 'free' ? day.recommendedPrice : day.currentPrice), 0),
    [filteredDailyPricing, monthPrefix],
  );

  const occupancyRate = useMemo(() => {
    if (filteredDailyPricing.length === 0) return 0;
    const occupiedNights = filteredDailyPricing.filter((day) => day.status !== 'free').length;
    return Math.round((occupiedNights / filteredDailyPricing.length) * 100);
  }, [filteredDailyPricing]);

  const averageRecommendedPrice = useMemo(() => {
    const freeDays = filteredDailyPricing.filter((day) => day.status === 'free');
    if (freeDays.length === 0) return 0;
    const total = freeDays.reduce((sum, day) => sum + day.recommendedPrice, 0);
    return Math.round(total / freeDays.length);
  }, [filteredDailyPricing]);

  const riskyFreeNights = useMemo(
    () => filteredDailyPricing.filter((day) => day.status === 'free' && day.riskScore >= 60).length,
    [filteredDailyPricing],
  );

  const topRecommendations = useMemo(
    () =>
      rankRecommendationsForMode(
        recommendations.filter((item) => item.listingId === selectedListingId),
        toISODate(new Date()),
        'opportunities',
      )
        .slice(0, 5)
        .map((item) => item.recommendation),
    [recommendations, selectedListingId],
  );

  return (
    <section className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Revenu estimé du mois"
          value={formatMad(estimatedMonthlyRevenue)}
          hint="Projection basée sur les prix recommandés"
        />
        <KpiCard
          label="Taux d'occupation (60j)"
          value={`${occupancyRate}%`}
          hint="Nuits réservées ou bloquées"
        />
        <KpiCard
          label="Prix moyen recommandé"
          value={formatMad(averageRecommendedPrice)}
          hint="Moyenne des nuits libres"
        />
        <KpiCard
          label="Nuits libres à risque"
          value={`${riskyFreeNights}`}
          hint="Risque >= 60/100"
        />
      </div>

      <RevenueOccupancyChart dailyPricing={filteredDailyPricing} />

      <section className="rounded-xl border border-[var(--rq-border)] bg-[var(--rq-surface)] p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-100">Recommandations prioritaires</h3>
          <span className="text-xs text-slate-400">Top 5 par gain potentiel</span>
        </div>

        <div className="space-y-2">
          {topRecommendations.map((recommendation) => (
            <article
              key={recommendation.id}
              className="flex flex-col gap-2 rounded-lg border border-[var(--rq-border)] bg-[var(--rq-panel)] p-3 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="text-sm font-medium text-slate-100">{recommendation.date}</p>
                <p className="text-xs text-slate-400">{recommendation.explanation}</p>
              </div>
              <div className="flex items-center gap-3">
                <DecisionBadge action={recommendation.action} />
                <p className="text-sm font-semibold text-emerald-300">+{formatMad(recommendation.potentialGainMad)}</p>
              </div>
            </article>
          ))}
          {topRecommendations.length === 0 ? (
            <p className="rounded-lg border border-dashed border-[var(--rq-border)] p-4 text-sm text-slate-400">
              Aucune recommandation prioritaire disponible.
            </p>
          ) : null}
        </div>
      </section>
    </section>
  );
}
