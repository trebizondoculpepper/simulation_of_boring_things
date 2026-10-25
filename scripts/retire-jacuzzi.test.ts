import { writeFileSync } from 'node:fs';
import { it } from 'vite-plus/test';
import { layoutRoomLive } from '../src/toolkit/gallery/logic/room-equipment';
import { cabinetPipes } from '../src/toolkit/gallery/logic/cabinet-pipes';

/**
 * Freezes the jacuzzi's plant room as `retired1` (`retired-rooms.ts`): its
 * layout and its cabinet's runs as they are now, before its re-plumbing by
 * the plumber (prompt 064):
 * `RETIRE_JACUZZI=1 npx vp test run scripts/retire-jacuzzi.test.ts`.
 * Run once; the snapshot is then never regenerated.
 */
it.skipIf(!process.env.RETIRE_JACUZZI)('retires the jacuzzi plant room', () => {
  const room = 'plant_pool_03';
  writeFileSync(
    new URL(
      '../src/toolkit/gallery/logic/retired/retired1.json',
      import.meta.url,
    ),
    `${JSON.stringify(
      {
        note: 'The jacuzzi plant room on 2026-10-25, before its re-plumbing by the plumber (prompt 064): its cabinet runs laid by cabinet-pipes.ts rules, bound to its schematic.',
        from: room,
        layout: layoutRoomLive(room),
        pipes: [],
        cabinetRuns: cabinetPipes(room),
      },
      null,
      2,
    )}\n`,
  );
});
