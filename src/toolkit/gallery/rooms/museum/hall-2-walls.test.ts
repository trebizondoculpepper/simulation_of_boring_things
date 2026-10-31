import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { Vector3 } from 'three';
import { createPanelKit } from '../../../components/core/views/eighties-controls';
import {
  COLUMN_CLEARANCE,
  COLUMN_SPAN,
  hallColumns,
  hallInterior,
} from '../../logic/museum-plan';
import { PLANT_SHIFT, plumbHall2 } from '../../logic/museum-2-layout';
import { buildHallExhibit } from './hall-2-clean-water';

beforeEach(() => {
  vi.stubGlobal('document', {
    createElement: () => {
      const canvas = { width: 0, height: 0, getContext: () => context };
      const context = new Proxy(
        {
          canvas,
          measureText: (text: string) => ({ width: text.length * 7 }),
          createLinearGradient: () => ({ addColorStop() {} }),
          createRadialGradient: () => ({ addColorStop() {} }),
        },
        {
          get: (target, key) =>
            key in target ? Reflect.get(target, key) : () => {},
        },
      );
      return canvas;
    },
  });
});
afterEach(() => vi.unstubAllGlobals());

/** Hall 2's things that hang on its walls (the audit, 2026-10-30: they floated 5 m off them). */
const ON_THE_WALLS = [
  'Entrance panel',
  'RESET sign',
  'Filter settings card',
  'Ozone in air monitor',
  'Hall 2 mimic board',
  'Activity card',
  'Pool clock',
  'Plant time display',
  'Clock placard',
];

describe('Hall 2 against its walls and its columns', () => {
  it('hangs every wall-mounted thing within 0.05 m of a wall’s inside face', () => {
    const hall = buildHallExhibit(createPanelKit());
    hall.object.updateMatrixWorld(true);
    const r = hallInterior('museum2');
    const hx = (r.maxX - r.minX) / 2;
    const hz = (r.maxZ - r.minZ) / 2;
    for (const name of ON_THE_WALLS) {
      let o = hall.object.getObjectByName(name);
      hall.object.traverse((x) => {
        if (x.userData.onWall === name) o = x;
      });
      expect(o, name).toBeDefined();
      const p = o!.getWorldPosition(new Vector3());
      const off = Math.min(
        Math.abs(p.x - hx),
        Math.abs(p.x + hx),
        Math.abs(p.z - hz),
        Math.abs(p.z + hz),
      );
      expect(
        off,
        `${name} at ${p.x.toFixed(2)}, ${p.z.toFixed(2)}`,
      ).toBeLessThan(0.05);
      expect(
        Math.abs(p.x) <= hx + 1e-6 && Math.abs(p.z) <= hz + 1e-6,
        name,
      ).toBe(true);
    }
  });

  it('puts up no column through the exhibit or its pipes', () => {
    const hall = buildHallExhibit(createPanelKit());
    // The two columns on the visitors' side, south of the L, still stand.
    expect(hallColumns('museum2')).toEqual([
      { x: -6, z: 4.6 },
      { x: 0, z: 4.6 },
    ]);
    const c = COLUMN_SPAN + COLUMN_CLEARANCE;
    const zones = hallColumns('museum2').map((k) => ({
      minX: k.x - c,
      maxX: k.x + c,
      minZ: k.z - c,
      maxZ: k.z + c,
    }));
    for (const f of zones) {
      for (const s of hall.solids?.({ x: 0, z: 0 }) ?? [])
        expect(
          s.minX < f.maxX &&
            s.maxX > f.minX &&
            s.minZ < f.maxZ &&
            s.maxZ > f.minZ,
          `a solid at ${s.minX.toFixed(2)}..${s.maxX.toFixed(2)}, ${s.minZ.toFixed(2)}..${s.maxZ.toFixed(2)}`,
        ).toBe(false);
      for (const line of plumbHall2().lines)
        for (let k = 1; k < line.points.length; k++) {
          const a = line.points[k - 1];
          const b = line.points[k];
          const n = Math.max(
            1,
            Math.ceil(Math.hypot(b[0] - a[0], b[2] - a[2]) / 0.05),
          );
          for (let j = 0; j <= n; j++) {
            const x = a[0] + ((b[0] - a[0]) * j) / n + PLANT_SHIFT.x;
            const z = a[2] + ((b[2] - a[2]) * j) / n + PLANT_SHIFT.z;
            const rr = line.od / 2;
            expect(
              x > f.minX - rr &&
                x < f.maxX + rr &&
                z > f.minZ - rr &&
                z < f.maxZ + rr,
              `a pipe at ${x.toFixed(2)}, ${z.toFixed(2)}`,
            ).toBe(false);
          }
        }
    }
  });
});
