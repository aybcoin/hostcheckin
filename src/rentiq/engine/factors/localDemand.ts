interface LocalDemandInput {
  seasonFactor?: number;
  eventFactor?: number;
  occupancyFactor?: number;
  manualMultiplier?: number;
  enabled?: boolean;
}

export function calculateLocalDemandFactor(input: LocalDemandInput = {}): number {
  if (input.enabled === false) return 1;

  // MVP prudent mode: avoid double-counting signals already captured by season/event/occupancy.
  const manualSignal = typeof input.manualMultiplier === 'number' ? input.manualMultiplier : 1;
  const bounded = Math.max(0.95, Math.min(1.08, manualSignal));
  return Number(bounded.toFixed(2));
}
