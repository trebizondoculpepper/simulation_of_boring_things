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
import { PLACES, interior } from '../../logic/museum-9-layout';
import type { MachineId } from '../../../../game/plant/museum-9-plant';
import { buildHallExhibit } from './hall-9-whole-plant';
import { stubDocument } from './walkways.test-support';

beforeEach(() => stubDocument());
afterEach(() => vi.unstubAllGlobals());

/** Hall 9's things that hang on, or stand back to, its walls (the audit, 2026-10-31: the entrance panel and the RESET sign hung 40 mm off the east wall, DC1 10 mm off the south, the desk stood 0.29 m off it). */
const ON_THE_WALLS = [
  'M9-SC1 ',
  'M9-DC1 ',
  'M9-DS1 ',
  'Entrance panel',
  'RESET sign',
];

/** Along the north (street) wall, their fronts out into the room. */
const NORTH_WALL: readonly MachineId[] = [
  'gasMain',
  'pressurisation',
  'boiler',
  'primaryPump',
  'hx',
  'filter',
  'drain',
  'poolPump',
  'balanceTank',
  'pool',
];

/** Along the south wall, their fronts turned north into the room. */
const SOUTH_WALL: readonly MachineId[] = [
  'hypoStore',
  'hypoTank',
  'hypoPump',
  'acidStore',
  'acidTank',
  'acidPump',
  'sampleCell',
];

const nameOf = (o: Object3D) => componentOf(o)?.name ?? o.name;

function built() {
  const hall = buildHallExhibit(createPanelKit());
  hall.reset(9 * 3600);
  hall.update?.(1 / 60);
  hall.object.updateMatrixWorld(true);
  return hall;
}

const named = (hall: ReturnType<typeof built>, prefix: string) =>
  hall.object.children.filter((c) => nameOf(c).startsWith(prefix));

/** What stands on the floor, other than the pipework and what it carries. */
function standing(hall: ReturnType<typeof built>) {
  return hall.object.children.flatMap((c) => {
    const model = componentOf(c)?.model;
    if (model && ('link' in model || 'fitting' in model)) return [];
    const box = new Box3().setFromObject(c);
    if (box.isEmpty() || box.min.y > 0.05) return [];
    return [{ name: nameOf(c), box }];
  });
}

describe('Hall 9 against its walls, its archways and the facing rule (the audit, 2026-10-31)', () => {
  it('hangs every wall-mounted thing flush, its back within 0.005 m of a wall', () => {
    const hall = built();
    for (const name of ON_THE_WALLS) {
      const [o] = named(hall, name);
      expect(o, name).toBeDefined();
      const b = new Box3().setFromObject(o);
      const off = Math.min(
        Math.abs(b.min.x - interior.minX),
        Math.abs(b.max.x - interior.maxX),
        Math.abs(b.min.z - interior.minZ),
        Math.abs(b.max.z - interior.maxZ),
      );
      expect(off, `${name}: ${off.toFixed(3)} m off its wall`).toBeLessThan(
        0.005,
      );
    }
  });

  it('keeps every mesh inside the hall and above its floor', () => {
    const hall = built();
    const outside: string[] = [];
    hall.object.traverse((o) => {
      if (!(o instanceof Mesh)) return;
      const b = new Box3().setFromObject(o);
      if (b.isEmpty()) return;
      if (
        b.min.x < interior.minX - 0.01 ||
        b.max.x > interior.maxX + 0.01 ||
        b.min.z < interior.minZ - 0.01 ||
        b.max.z > interior.maxZ + 0.01 ||
        b.min.y < -0.01
      )
        outside.push(o.name || o.parent?.name || '(unnamed)');
    });
    expect(outside).toEqual([]);
  });

  it('hangs nothing across an archway, and stands nothing in its approach', () => {
    const hall = built();
    const arches = hallArches('museum9');
    expect(arches.length).toBe(2);
    for (const a of arches) {
      expect(a.axis).toBe('z');
      // Both archways are in the east end wall, opening west into the hall.
      const span = { minZ: a.frame.z - a.w / 2, maxZ: a.frame.z + a.w / 2 };
      const wall = a.into[0] < 0 ? interior.maxX : interior.minX;
      const approach = {
        minX: Math.min(wall, wall + a.into[0] * 2.5),
        maxX: Math.max(wall, wall + a.into[0] * 2.5),
      };
      for (const c of hall.object.children) {
        const b = new Box3().setFromObject(c);
        if (b.isEmpty()) continue;
        const across = b.max.z > span.minZ - 0.3 && b.min.z < span.maxZ + 0.3;
        const near = b.max.x > approach.minX && b.min.x < approach.maxX;
        expect(across && near, `${nameOf(c)} before the arch to ${a.to}`).toBe(
          false,
        );
      }
    }
  });

  it('stands nothing on the floor through another', () => {
    const boxes = standing(built());
    expect(boxes.length).toBeGreaterThan(25);
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

  it('turns every machine’s front (its own +z) out from its wall into the room', () => {
    // The plant along the north (street) wall faces +z; the chemistry
    // along the south wall faces −z. The strainer, a pot with its lid on
    // top, has no front (museum-9-layout.ts).
    for (const id of NORTH_WALL)
      expect(Math.cos(PLACES[id].yaw), id).toBeGreaterThan(0.99);
    for (const id of SOUTH_WALL)
      expect(Math.cos(PLACES[id].yaw), id).toBeLessThan(-0.99);
  });
});
