import { afterEach, beforeEach, expect, it, vi } from 'vite-plus/test';
import {
  AUDITED_ROOMS,
  stubBrowser,
  undescribedParts,
} from './inspection-audit';
import PINNED from './inspection-coverage.json';

/** The inspection audit's counts may only fall (prompt 068; `inspection-audit.ts`). */
beforeEach(stubBrowser);
afterEach(() => vi.unstubAllGlobals());

it('describes no fewer working parts in any room than it did', () => {
  const counts = undescribedParts();
  const pinned = PINNED as Record<string, number>;
  for (const room of AUDITED_ROOMS)
    expect(
      counts[room],
      `${room}: undescribed working parts`,
    ).toBeLessThanOrEqual(pinned[room]);
}, 60_000);
