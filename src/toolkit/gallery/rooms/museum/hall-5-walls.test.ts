import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { Box3 } from 'three';
import type { Object3D } from 'three';
import { createPanelKit } from '../../../components/core/views/eighties-controls';
import { DECADES, FUTURE, WALL } from '../../logic/museum-5-gallery';
import { buildHallExhibit } from './hall-5-day-in-the-life';
import { stubDocument } from './walkways.test-support';

beforeEach(() => stubDocument());
afterEach(() => vi.unstubAllGlobals());

/** Hall 5's wall boards (the audit, 2026-10-31: they hung 40 mm off their walls). */
const ON_THE_WALLS = [
  ...[...DECADES, FUTURE].map((d) => `${d.decade} photographs`),
  'Entrance panel',
  'Opening checks sheet',
  'No running sign',
];

describe('Hall 5 as built', () => {
  let hall: ReturnType<typeof buildHallExhibit> | undefined;
  const named = (name: string) => {
    if (!hall) {
      hall = buildHallExhibit(createPanelKit());
      hall.object.updateMatrixWorld(true);
    }
    let found: Object3D | undefined;
    hall.object.traverse((x) => {
      if (x.name === name) found = x;
    });
    return found;
  };

  it('hangs its boards flush on its walls, inside the hall', () => {
    for (const name of ON_THE_WALLS) {
      const found = named(name);
      expect(found, name).toBeDefined();
      const b = new Box3().setFromObject(found!);
      expect(b.min.x, name).toBeGreaterThanOrEqual(WALL.west - 1e-6);
      expect(b.max.x, name).toBeLessThanOrEqual(WALL.east + 1e-6);
      expect(b.min.z, name).toBeGreaterThanOrEqual(WALL.north - 1e-6);
      expect(b.max.z, name).toBeLessThanOrEqual(WALL.south + 1e-6);
      const gap = Math.min(
        b.min.x - WALL.west,
        WALL.east - b.max.x,
        b.min.z - WALL.north,
        WALL.south - b.max.z,
      );
      expect(gap, name).toBeLessThan(0.002);
    }
  });

  it('has no clock (the owner, 2026-10-31), and the skimmer’s cut-away on its lectern', () => {
    expect(named('Pool clock')).toBeUndefined();
    expect(named('Skimmer cut-away')).toBeUndefined();
    expect(named('Skimmer cut-away lectern')).toBeDefined();
  });
});
