import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { Box3, Mesh } from 'three';
import type { Object3D } from 'three';
import { createPanelKit } from '../../../components/core/views/eighties-controls';
import { INTERIOR } from '../../logic/museum-6-layout';
import { buildHallExhibit } from './hall-6-world-of-pumps';
import { stubDocument } from './walkways.test-support';

beforeEach(() => stubDocument());
afterEach(() => vi.unstubAllGlobals());

describe('Hall 6’s exhibit', () => {
  it('keeps every mesh inside the hall: no motor or part through a wall (the tundish is let into the floor)', () => {
    const hall = buildHallExhibit(createPanelKit());
    hall.object.updateMatrixWorld(true);
    const outside: string[] = [];
    const tol = 0.01;
    hall.object.traverse((o) => {
      if (!(o instanceof Mesh)) return;
      const b = new Box3().setFromObject(o);
      if (b.isEmpty()) return;
      if (
        b.min.x < INTERIOR.minX - tol ||
        b.max.x > INTERIOR.maxX + tol ||
        b.min.z < INTERIOR.minZ - tol ||
        b.max.z > INTERIOR.maxZ + tol
      ) {
        let n: Object3D | null = o;
        const names: string[] = [];
        while (n && names.length < 3) {
          if (n.name) names.push(n.name);
          n = n.parent;
        }
        outside.push(
          `${names.join(' < ')}: x ${b.min.x.toFixed(2)}..${b.max.x.toFixed(2)}, z ${b.min.z.toFixed(2)}..${b.max.z.toFixed(2)}`,
        );
      }
    });
    expect(outside).toEqual([]);
  });
});
