import { describe, expect, it } from 'vitest';
import { loadRuntimeEventsFromDatasets, mergeRuntimeEvents } from '../../../src/rentiq/services/eventDataService';
import type { LocalEvent } from '../../../src/rentiq/types';

function datasetFetcherFactory(map: Record<string, unknown>) {
  return async (path: string): Promise<unknown> => {
    if (!(path in map)) {
      throw new Error(`missing dataset: ${path}`);
    }
    return map[path];
  };
}

describe('eventDataService', () => {
  it('loads datasets and produces normalized LocalEvent records', async () => {
    const fetcher = datasetFetcherFactory({
      '/data/ma-public-holidays.json': [
        { name: 'Nouvel An', date: '2026-01-01', source: 'Calendrier officiel Maroc' },
      ],
      '/data/ma-school-holidays.json': [
        { name: "Vacances d'été", startDate: '2026-07-01', endDate: '2026-08-31', source: 'MEN Maroc' },
      ],
      '/data/islamic-calendar-2026.json': [
        { name: 'Ramadan 2026', startDate: '2026-02-18', endDate: '2026-03-19', multiplierHint: 1.15, source: 'Hijri' },
      ],
      '/data/rabat-events-baseline.json': [
        {
          name: 'SIAM 2026',
          category: 'conference',
          startDate: '2026-04-21',
          endDate: '2026-04-27',
          zones: ['rabat', 'témara', 'salé'],
          multiplierHint: 1.1,
          source: 'MAP',
        },
      ],
    });

    const result = await loadRuntimeEventsFromDatasets(fetcher);

    expect(result.warnings).toHaveLength(0);
    expect(result.events.length).toBe(4);
    expect(result.events.every((event) => event.id.startsWith('dataset:'))).toBe(true);

    const baseline = result.events.find((event) => event.name === 'SIAM 2026');
    expect(baseline?.zonesImpacted).toEqual(['rabat', 'temara', 'sale']);
    expect(baseline?.category).toBe('conference');
  });

  it('returns warnings and skips invalid dataset rows', async () => {
    const fetcher = datasetFetcherFactory({
      '/data/ma-public-holidays.json': [{ name: 'bad holiday', date: '01-01-2026' }],
      '/data/ma-school-holidays.json': [],
      '/data/islamic-calendar-2026.json': [],
      '/data/rabat-events-baseline.json': [],
    });

    const result = await loadRuntimeEventsFromDatasets(fetcher);
    expect(result.events.length).toBe(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('merges runtime dataset events without dropping custom manual events', () => {
    const existing: LocalEvent[] = [
      {
        id: 'manual:event-1',
        name: 'Custom Event',
        category: 'conference',
        startDate: '2026-09-10',
        endDate: '2026-09-11',
        zonesImpacted: ['temara'],
        expectedImpact: 'medium',
        multiplierHint: 1.12,
        source: 'manual',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'dataset:baseline:siam-2026:2026-04-21',
        name: 'Old SIAM',
        category: 'conference',
        startDate: '2026-04-21',
        endDate: '2026-04-25',
        zonesImpacted: ['rabat'],
        expectedImpact: 'low',
        multiplierHint: 1.05,
        source: 'old',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    const runtime: LocalEvent[] = [
      {
        id: 'dataset:baseline:siam-2026:2026-04-21',
        name: 'SIAM 2026',
        category: 'conference',
        startDate: '2026-04-21',
        endDate: '2026-04-27',
        zonesImpacted: ['rabat', 'temara'],
        expectedImpact: 'medium',
        multiplierHint: 1.1,
        source: 'MAP',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    const merged = mergeRuntimeEvents(existing, runtime);
    expect(merged.length).toBe(2);
    expect(merged.find((event) => event.id === 'manual:event-1')).toBeDefined();
    expect(merged.find((event) => event.id === 'dataset:baseline:siam-2026:2026-04-21')?.name).toBe('SIAM 2026');
  });
});
