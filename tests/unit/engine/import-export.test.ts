import { describe, expect, it } from 'vitest';
import { importSnapshot } from '../../../src/rentiq/services/importExportService';

describe('import snapshot validation', () => {
  it('rejects invalid snapshot payload', async () => {
    await expect(importSnapshot({ version: 1 } as never)).rejects.toThrow('Snapshot JSON invalide');
  });
});
