import { machinePorts } from './machine-ports';
import { deckOf } from './room-structure';
import { describe, expect, it } from 'vite-plus/test';
import {
  DOOR_HEAD,
  OVER_LINTEL,
  controlBus,
  isControlDevice,
} from './control-bus';
import { layoutRoom } from './room-equipment';
import { roomServiceRoutes } from './room-services';
import { roomStructure } from './room-structure';
import { ROOM_SERVICES } from '../../../game/plant/services';

type P = readonly [number, number, number];
const len = (points: readonly P[]) =>
  points.reduce(
    (t, p, i) =>
      i
        ? t +
          Math.hypot(
            p[0] - points[i - 1][0],
            p[1] - points[i - 1][1],
            p[2] - points[i - 1][2],
          )
        : 0,
    0,
  );
/** The distance from a point to a straight from `a` to `b`. */
const toSegment = (p: P, a: P, b: P) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const L2 = d[0] ** 2 + d[1] ** 2 + d[2] ** 2;
  const t = Math.max(
    0,
    Math.min(
      1,
      ((p[0] - a[0]) * d[0] + (p[1] - a[1]) * d[1] + (p[2] - a[2]) * d[2]) / L2,
    ),
  );
  return Math.hypot(
    a[0] + d[0] * t - p[0],
    a[1] + d[1] * t - p[1],
    a[2] + d[2] * t - p[2],
  );
};

const ROOMS = Object.keys(ROOM_SERVICES).filter((room) => controlBus(room));

describe('a room’s control bus', () => {
  it('is in every room with a control device', () => {
    expect(ROOMS).toEqual(
      expect.arrayContaining([
        'control_room',
        'boiler_house',
        'wet_hall',
        'air_plant',
      ]),
    );
  });

  describe.each(ROOMS)('%s', (room) => {
    const bus = controlBus(room)!;
    const structure = roomStructure(room)!;
    const { placed } = layoutRoom(room)!;
    const lengths = bus.trunking.filter((t) => !t.name.includes('riser'));

    it('fits, over everything on the walls and under the services ceiling', () => {
      expect(bus.problems).toEqual([]);
      for (const p of placed.filter((p) => p.item.mount === 'wall'))
        expect(bus.y, p.item.label).toBeGreaterThan(p.y + p.item.h / 2);
      expect(bus.y).toBeLessThan(structure.ceilingZone);
    });

    it('takes every control device by a short conduit to the nearest point of the bus', () => {
      for (const key of placed
        .filter((p) => isControlDevice(p.item.key))
        .map((p) => p.item.key)) {
        const stubs = bus.stubs.filter((s) => s.to === key);
        expect(stubs, key).toHaveLength(1);
        const end = stubs[0].points.at(-1)!;
        const onBus = lengths.some((t) => toSegment(end, t.from, t.to) < 0.06);
        expect(onBus, `${key} ends on the bus`).toBe(true);
        // A device by a wall is close to its bus; one standing out in the
        // room wired from its own control port (the booster set's gland)
        // goes up to the bus's height and square across to it.
        const p = placed.find((q) => q.item.key === key)!;
        const ownPort = machinePorts(p.item).some(
          (q) => q.service === 'control',
        );
        expect(len(stubs[0].points), key).toBeLessThan(ownPort ? 10 : 3);
      }
    });

    it('gives no control device a feed of its own from the ceiling', () => {
      // Bar a machine wired at a control port of its own (the booster
      // set), which takes its power by its own feed too.
      const ported = new Set(
        placed
          .filter((p) =>
            machinePorts(p.item).some((q) => q.service === 'control'),
          )
          .map((p) => p.item.key),
      );
      const feeds = roomServiceRoutes(room).filter(
        (r) =>
          isControlDevice(r.to) &&
          !ported.has(r.to) &&
          !r.name.endsWith(' control'),
      );
      expect(feeds.map((r) => r.name)).toEqual([]);
    });

    it('enters the room once, rising into the services ceiling', () => {
      const risers = bus.trunking.filter((t) => t.name.includes('riser'));
      expect(risers).toHaveLength(1);
      expect(Math.max(risers[0].from[1], risers[0].to[1])).toBeCloseTo(
        structure.ceilingZone,
        6,
      );
    });

    it('rings the room clear of its door lintels, at the level its doors open from, or over a taller panel', () => {
      expect(lengths).toHaveLength(4);
      const wallTop = Math.max(
        0,
        ...placed
          .filter((p) => p.item.mount === 'wall')
          .map((p) => p.y + p.item.h / 2),
      );
      expect(bus.y).toBeCloseTo(
        Math.max(DOOR_HEAD + OVER_LINTEL + (deckOf(room) ?? 0), wallTop + 0.15),
        6,
      );
    });
  });
});
