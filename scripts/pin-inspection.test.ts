import { writeFileSync } from 'node:fs';
import { afterEach, beforeEach, it, vi } from 'vite-plus/test';
import {
  stubBrowser,
  undescribedParts,
} from '../src/toolkit/gallery/views/inspection-audit';
import PINNED from '../src/toolkit/gallery/views/inspection-coverage.json';

/**
 * Writes the inspection audit's pinned counts
 * (`inspection-coverage.json`): `PIN_INSPECTION=1 npx vp test run
 * scripts/pin-inspection.test.ts`. It refuses a count that has risen:
 * describe the part instead. Never edit the counts by hand.
 */
beforeEach(stubBrowser);
afterEach(() => vi.unstubAllGlobals());

it.skipIf(!process.env.PIN_INSPECTION)(
  'pins the inspection audit',
  () => {
    const counts = undescribedParts();
    const pinned = PINNED as Record<string, number>;
    const worse = Object.entries(counts).filter(
      ([room, n]) => room in pinned && n > pinned[room],
    );
    if (worse.length)
      throw new Error(`Undescribed parts rose: ${JSON.stringify(worse)}`);
    writeFileSync(
      new URL(
        '../src/toolkit/gallery/views/inspection-coverage.json',
        import.meta.url,
      ),
      `${JSON.stringify(counts, null, 2)}\n`,
    );
  },
  60_000,
);
