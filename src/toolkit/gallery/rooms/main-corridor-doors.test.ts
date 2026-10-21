import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { BoxGeometry, Mesh, Vector3 } from 'three';
import type { Object3D } from 'three';
import { createPanelKit } from '../../components/core/views/eighties-controls';
import { createMainCorridor } from '../views/main-corridor';
import { doorPlace, MAIN_CORRIDOR } from '../logic/main-corridor';

beforeEach(() => {
  vi.stubGlobal('document', {
    createElement: () => {
      const canvas = { width: 0, height: 0, getContext: () => context };
      const gradient = () => ({ addColorStop() {} });
      const context = new Proxy(
        {
          canvas,
          measureText: (text: string) => ({ width: text.length * 7 }),
          createRadialGradient: gradient,
          createLinearGradient: gradient,
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

describe('the main corridor’s doors', () => {
  it('give every pair a card reader on the corridor face, to the right of the doors', () => {
    const { group, doors } = createMainCorridor(1, createPanelKit());
    group.updateMatrixWorld(true);
    expect(doors.length).toBe(6);
    for (const d of doors) {
      expect(d.part.readers.length, d.door.to).toBe(2);
      const p = doorPlace(d.door);
      // The reader nearest the corridor: in the corridor's face, right of
      // the doors as seen from the corridor, at hand height.
      const seen = d.part.readers
        .map((r) => r.object.getWorldPosition(new Vector3()))
        .find(
          (v) => (v.x - p.x) * p.into[0] + (v.z - p.z) * p.into[1] > -0.05,
        )!;
      expect(seen, d.door.to).toBeDefined();
      // Standing in the corridor facing the doors (facing −into), right
      // is (into.z, −into.x) in x, z.
      const right = [p.into[1], -p.into[0]];
      const across = (seen.x - p.x) * right[0] + (seen.z - p.z) * right[1];
      expect(across, d.door.to).toBeGreaterThan(MAIN_CORRIDOR.opening / 2);
      expect(seen.y).toBeCloseTo(1.1, 1);
    }
  });

  it('opens each pair from the corridor, and only that pair', () => {
    const { doors } = createMainCorridor(1, createPanelKit());
    for (const d of doors) {
      expect(d.part.open()).toBe(false);
      d.part.swingTo(1);
      expect(d.part.open()).toBe(true);
      expect(doors.filter((o) => o.part.open()).length).toBe(1);
      d.part.swingTo(0);
    }
  });

  it('opens each pair from its push plates, as the corridor pushes them', () => {
    const { doors } = createMainCorridor(1, createPanelKit());
    for (const d of doors) {
      // The push plates: 100 × 300 mm stainless, one on each leaf.
      const plates: Mesh[] = [];
      d.part.object.traverse((o) => {
        if (!(o instanceof Mesh) || !(o.geometry instanceof BoxGeometry))
          return;
        const { width, height, depth } = o.geometry.parameters;
        if (width === 0.1 && height === 0.3 && depth < 0.01) plates.push(o);
      });
      expect(plates.length, d.door.to).toBe(2);
      for (const plate of plates) {
        let use: (() => void) | undefined;
        for (let o: Object3D | null = plate; o && !use; o = o.parent)
          use = d.part.uses.get(o) as (() => void) | undefined;
        expect(use, d.door.to).toBeDefined();
      }
      // Pushing one opens the pair's leaf.
      let use: (() => void) | undefined;
      for (let o: Object3D | null = plates[0]; o && !use; o = o.parent)
        use = d.part.uses.get(o) as (() => void) | undefined;
      use!();
      d.part.update(1);
      expect(d.part.open(), d.door.to).toBe(true);
    }
  });
});
