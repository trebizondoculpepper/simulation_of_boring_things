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
import { componentOf } from '../../../components/core/views/component-identity';
import { hallArches } from '../../logic/museum-plan';
import { INTERIOR, PLACES, standOf } from '../../logic/museum-6-layout';
import { PUMPS, pumpId } from '../../../../game/plant/museum-6-pumps';
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

/** What hangs on the street wall (the audit, 2026-10-31: all hung 40 mm off it). */
const ON_THE_WALL = [
  'Entrance panel',
  'M6-MP1 ',
  'Grundflow wall clock',
  'Clock placard',
  'RESET sign',
  'Two families of pump',
];

const nameOf = (o: Object3D) => componentOf(o)?.name ?? o.name;

function built() {
  const hall = buildHallExhibit(createPanelKit());
  hall.reset(9 * 3600);
  hall.update?.(1 / 60);
  hall.object.updateMatrixWorld(true);
  return hall;
}

/** Each floor-standing thing's footprint: its meshes that reach the floor, not the pipework and what it carries. */
function standing(hall: ReturnType<typeof built>) {
  return hall.object.children.flatMap((c) => {
    const model = componentOf(c)?.model;
    if (model && ('link' in model || 'fitting' in model)) return [];
    const box = new Box3();
    c.traverse((o) => {
      if (!(o instanceof Mesh)) return;
      const b = new Box3().setFromObject(o);
      if (!b.isEmpty() && b.min.y < 0.05 && b.max.y > 0) box.union(b);
    });
    return box.isEmpty() ? [] : [{ name: nameOf(c), box }];
  });
}

describe('Hall 6 against its walls, its archways and the facing rule (the audit, 2026-10-31)', () => {
  it('hangs everything on the street wall flush, its back within 0.005 m of it', () => {
    const hall = built();
    for (const name of ON_THE_WALL) {
      const o = hall.object.children.find((c) => nameOf(c).startsWith(name));
      expect(o, name).toBeDefined();
      const b = new Box3().setFromObject(o!);
      const off = INTERIOR.maxX - b.max.x;
      expect(Math.abs(off), `${name}: ${off.toFixed(3)} m off`).toBeLessThan(
        0.005,
      );
    }
  });

  it('hangs nothing across an archway, and stands nothing in its approach', () => {
    const hall = built();
    const arches = hallArches('museum6');
    expect(arches.length).toBe(2);
    for (const a of arches) {
      // Both are in the archway walls (north and south), opening into the hall along z.
      expect(a.axis).toBe('x');
      const span = { minX: a.frame.x - a.w / 2, maxX: a.frame.x + a.w / 2 };
      const wall = a.into[1] > 0 ? INTERIOR.minZ : INTERIOR.maxZ;
      const approach = {
        minZ: Math.min(wall, wall + a.into[1] * 2.5),
        maxZ: Math.max(wall, wall + a.into[1] * 2.5),
      };
      for (const c of hall.object.children) {
        const b = new Box3().setFromObject(c);
        if (b.isEmpty()) continue;
        const across = b.max.x > span.minX - 0.3 && b.min.x < span.maxX + 0.3;
        const near = b.max.z > approach.minZ && b.min.z < approach.maxZ;
        expect(across && near, `${nameOf(c)} before the arch to ${a.to}`).toBe(
          false,
        );
      }
    }
  });

  it('stands nothing on the floor through another', () => {
    const boxes = standing(built());
    expect(boxes.length).toBeGreaterThan(15);
    for (let i = 0; i < boxes.length; i++)
      for (let k = i + 1; k < boxes.length; k++) {
        const a = boxes[i].box;
        const b = boxes[k].box;
        const overlaps =
          a.min.x < b.max.x &&
          a.max.x > b.min.x &&
          a.min.z < b.max.z &&
          a.max.z > b.min.z;
        expect(overlaps, `${boxes[i].name} through ${boxes[k].name}`).toBe(
          false,
        );
      }
  });

  it('turns every pump’s front (its view’s +z: display, gauges, nameplate) out from its wall, as its stand faces', () => {
    for (const p of PUMPS) {
      const place = PLACES[pumpId(p.no)];
      // The dosing pumps' views are turned a further quarter on their stands (FACE_WEST).
      const yaw = place.yaw + (p.family === 'displacement' ? -Math.PI / 2 : 0);
      const front = [Math.sin(yaw), Math.cos(yaw)];
      const [ix, iz] = standOf(p.no).inward;
      expect(front[0] * ix + front[1] * iz, `P${p.no}`).toBeGreaterThan(0.99);
    }
  });
});

describe('Hall 6 works from its own controls', () => {
  it('RUN on each pump fills the tank; full trips them all; RESET drains it', () => {
    const hall = built();
    const status = () => hall.status?.() ?? '';
    /** Use the part whose own component, or any it is part of, is called `name`. */
    const press = (name: string) => {
      for (const [o, use] of hall.parts!.uses)
        for (let q: Object3D | null = o; q; q = q.parent)
          if (q.name === name || componentOf(q)?.name === name) return use();
      throw new Error(`no ${name}`);
    };
    // Each pump's own words, as the inspection gives them.
    const pumpSays = (no: number) =>
      hall.object.children
        .map((c) => componentOf(c))
        .find((c) => c?.name?.startsWith(`M6-P${no} `))
        ?.status?.();
    for (const p of PUMPS) {
      press(`P${p.no} RUN`);
      for (let k = 0; k < 30; k++) hall.update?.(0.1);
      expect(pumpSays(p.no), `P${p.no}`).toMatch(/^running/);
      press(`P${p.no} RUN`);
      expect(pumpSays(p.no), `P${p.no}`).toBe('stopped');
    }
    press('P6 RUN');
    for (let k = 0; k < 400; k++) hall.update?.(0.1);
    expect(status()).toBe('tank full, pumps locked out');
    press('RESET SIMULATION');
    for (let k = 0; k < 600; k++) hall.update?.(0.5);
    expect(status()).toBe('0 litres in the tank');
  });
});
