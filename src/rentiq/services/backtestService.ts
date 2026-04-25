import type { BacktestRunInput, BacktestRunResult } from '../types';
import { runBacktest } from '../engine/backtest';

export async function runBacktestForListing(input: BacktestRunInput): Promise<BacktestRunResult> {
  return Promise.resolve(runBacktest(input));
}
