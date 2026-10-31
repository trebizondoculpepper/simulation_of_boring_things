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
import { hallArches, hallInterior, hallOrigin } from '../../logic/museum-plan';
import { PLACES } from '../../logic/museum-1-layout';
import type { MachineId } from '../../../../game/plant/museum-1-heating';
import { buildHallExhibit } from './hall-1-warm-water';
import { stubDocument } from './walkways.test-support';

beforeEach(() => stubDocument());
afterEach(() => vi.unstubAllGlobals());

/** Hall 1's things that hang on its walls (the audit, 2026-10-31: those on the east wall hung 40 mm off it). */
const ON_THE_WALLS = [
  'M1-MP1 mimic panel',
  'Pool clock',
  'Plant time display',
  'Clock placard',
  'Entrance panel',
  'RESET sign',
  'M1-EC1 gas burn display',
  'M1-TI5 pool temperature display',
];

/** What stands on the floor: the machines, the station, the stands; none may overlap another. */
const STANDING = [
  'M1-GS1 ',
  'M1-B1 ',
  'M1-PU1 ',
  'M1-P1 ',
  'M1-HX1 ',
  'M1-P2 Pool pump',
  'M1-P2 pool pump local control station',
  'M1-IP1 ',
  'M1-QB1 ',
  'RESET SIMULATION pedestal',
  'Placard: ',
];

const MACHINES: readonly MachineId[] = [
  'gasMain',
  'boiler',
  'pressurisation',
  'primaryPump',
  'hx',
  'poolPump',
  'pool',
];

const nameOf = (o: Object3D) => componentOf(o)?.name ?? o.name;

function built() {
  const hall = buildHallExhibit(createPanelKit());
  hall.object.updateMatrixWorld(true);
  return hall;
}

const inside = (() => {
  const i = hallInterior('museum1');
  const o = hallOrigin('museum1');
  return {
    minX: i.minX - o.x,
    maxX: i.maxX - o.x,
    minZ: i.minZ - o.z,
    maxZ: i.maxZ - o.z,
  };
})();

const named = (hall: ReturnType<typeof built>, prefix: string) =>
  hall.object.children.filter((c) => nameOf(c).startsWith(prefix));

describe('Hall 1 against its walls, its archways and the facing rule (the audit, 2026-10-31)', () => {
  it('hangs every wall-mounted thing flush, its back within 0.01 m of a wall', () => {
    const hall = built();
    for (const name of ON_THE_WALLS) {
      const [o] = named(hall, name);
      expect(o, name).toBeDefined();
      const b = new Box3().setFromObject(o);
      const off = Math.min(
        Math.abs(b.min.x - inside.minX),
        Math.abs(b.max.x - inside.maxX),
        Math.abs(b.min.z - inside.minZ),
        Math.abs(b.max.z - inside.maxZ),
      );
      expect(off, `${name}: ${off.toFixed(3)} m off its wall`).toBeLessThan(
        0.01,
      );
    }
  });

  it('keeps every mesh inside the hall (the flue alone goes up through the roof)', () => {
    const hall = built();
    const outside: string[] = [];
    hall.object.traverse((o) => {
      if (!(o instanceof Mesh)) return;
      const b = new Box3().setFromObject(o);
      if (b.isEmpty()) return;
      if (
        b.min.x < inside.minX - 0.01 ||
        b.max.x > inside.maxX + 0.01 ||
        b.min.z < inside.minZ - 0.01 ||
        b.max.z > inside.maxZ + 0.01
      )
        outside.push(o.name || o.parent?.name || '(unnamed)');
    });
    expect(outside).toEqual([]);
  });

  it('hangs nothing across an archway, and stands nothing in its approach', () => {
    const hall = built();
    for (const a of hallArches('museum1')) {
      expect(a.axis).toBe('x');
      // The arch's wall runs along x at its frame's z; it opens into the hall along `into`.
      const span = { minX: a.frame.x - a.w / 2, maxX: a.frame.x + a.w / 2 };
      const wall = a.into[1] > 0 ? inside.minZ : inside.maxZ;
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
    const hall = built();
    const boxes = STANDING.flatMap((p) =>
      named(hall, p).map((c) => ({
        name: nameOf(c),
        box: new Box3().setFromObject(c),
      })),
    );
    expect(boxes.length).toBeGreaterThanOrEqual(STANDING.length + 6);
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

  it('turns every machine’s front (its own +z) out from the street wall into the room', () => {
    // The plant stands along the street wall at the layout's −x, so the
    // room is toward +x (the exhibit is then turned half round, with it).
    for (const id of MACHINES) {
      const yaw = PLACES[id].yaw;
      expect(Math.sin(yaw), id).toBeGreaterThan(0.99);
    }
  });
});
