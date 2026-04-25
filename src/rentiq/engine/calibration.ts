import type { BacktestScenarioResult, CalibrationReport, CalibrationSuggestion, PricingFactor } from '../types';

function average(values: number[]): number {
  if (values.length === 0) return 0;
  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
}

function avgFactor(records: BacktestScenarioResult['nightRecords'], key: PricingFactor['key']): number {
  const values = records.map((record) => record.factors.find((factor) => factor.key === key)?.value ?? 1);
  return average(values);
}

function makeSuggestion(params: {
  factor: CalibrationSuggestion['factor'];
  currentAverage: number;
  recommendationDelta: number;
  justification: string;
  confidence: number;
}): CalibrationSuggestion {
  const recommendedAverage = Math.max(0.7, Math.min(1.6, params.currentAverage + params.recommendationDelta));
  return {
    factor: params.factor,
    currentAverage: Number(params.currentAverage.toFixed(3)),
    recommendedAverage: Number(recommendedAverage.toFixed(3)),
    justification: params.justification,
    confidence: Number(Math.max(0.05, Math.min(0.95, params.confidence)).toFixed(2)),
  };
}

export function buildCalibrationReport(result: BacktestScenarioResult): CalibrationReport {
  const suggestions: CalibrationSuggestion[] = [];

  const nights = result.nightRecords;
  const riskyRatio = nights.length > 0 ? result.topRiskyDates.length / nights.length : 0;
  const missedRatio = nights.length > 0 ? result.topMissedOpportunities.length / nights.length : 0;

  const seasonAvg = avgFactor(nights, 'season');
  const weekendAvg = avgFactor(nights, 'weekend');
  const eventAvg = avgFactor(nights, 'event');
  const leadTimeAvg = avgFactor(nights, 'leadTime');
  const occupancyAvg = avgFactor(nights, 'occupancy');
  const localDemandAvg = avgFactor(nights, 'localDemand');

  if (result.revenueDeltaMad < 0 && riskyRatio > 0.1) {
    suggestions.push(
      makeSuggestion({
        factor: 'event',
        currentAverage: eventAvg,
        recommendationDelta: -0.03,
        justification: 'Les hausses liées aux événements semblent parfois trop agressives sur la période testée.',
        confidence: 0.72,
      }),
    );
    suggestions.push(
      makeSuggestion({
        factor: 'weekend',
        currentAverage: weekendAvg,
        recommendationDelta: -0.02,
        justification: 'Prime week-end à adoucir pour réduire les risques de nuits non captées.',
        confidence: 0.65,
      }),
    );
  }

  if (result.revenueDeltaMad > 0 && missedRatio > 0.08) {
    suggestions.push(
      makeSuggestion({
        factor: 'season',
        currentAverage: seasonAvg,
        recommendationDelta: 0.03,
        justification: 'Opportunités manquées encore présentes: légère hausse saisonnière possible sur fenêtres tendues.',
        confidence: 0.61,
      }),
    );
    suggestions.push(
      makeSuggestion({
        factor: 'occupancy',
        currentAverage: occupancyAvg,
        recommendationDelta: 0.02,
        justification: 'La rareté (occupation élevée) pourrait être un peu mieux valorisée.',
        confidence: 0.58,
      }),
    );
  }

  if (localDemandAvg > 1.01) {
    suggestions.push(
      makeSuggestion({
        factor: 'localDemand',
        currentAverage: localDemandAvg,
        recommendationDelta: -0.01,
        justification: 'Le facteur localDemand doit rester prudent pour éviter la redondance avec saison/événements.',
        confidence: 0.8,
      }),
    );
  } else if (localDemandAvg < 0.99) {
    suggestions.push(
      makeSuggestion({
        factor: 'localDemand',
        currentAverage: localDemandAvg,
        recommendationDelta: 0.01,
        justification: 'Le signal local est peut-être trop pénalisant: revenir vers la neutralité en MVP.',
        confidence: 0.68,
      }),
    );
  } else {
    suggestions.push(
      makeSuggestion({
        factor: 'localDemand',
        currentAverage: localDemandAvg,
        recommendationDelta: 0,
        justification: 'localDemand est déjà prudent/neutralisé: conserver ce niveau en MVP.',
        confidence: 0.88,
      }),
    );
  }

  if (leadTimeAvg < 0.95 && result.topRiskyDates.length > result.topMissedOpportunities.length) {
    suggestions.push(
      makeSuggestion({
        factor: 'leadTime',
        currentAverage: leadTimeAvg,
        recommendationDelta: 0.02,
        justification: 'Ajuster légèrement le comportement last-minute pour éviter des discounts excessifs.',
        confidence: 0.57,
      }),
    );
  }

  const summary = result.revenueDeltaMad >= 0
    ? 'Calibration globale saine: ajustements fins recommandés, sans changement structurel majeur.'
    : 'Calibration nécessaire: réduire l’agressivité de certains multiplicateurs avant usage systématique.';

  return {
    scenario: result.scenario,
    suggestions,
    summary,
  };
}
