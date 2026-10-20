import { describe, expect, it } from 'vite-plus/test';
import {
  BEAM_HALF_WIDTH,
  CLASS_A_RATING,
  COVERAGE,
  EMPHASIS,
  FINAL_EXITS,
  MAX_POINT_HEIGHT,
  arrowToward,
  detectorKind,
  doorPoint,
  floorOf,
  floorSamples,
  onWall,
  planFireSafety,
  travelLimit,
  worstDirectDistance,
} from './fire-safety-plan';
import type { Fitting } from './fire-safety-plan';
import { DOORS, ROOMS, roomById } from './facility-plan';
import { LOWER_Y, STAIRS } from './facility-levels';

const plan = planFireSafety();
const of = (room: string, ...kinds: Fitting['kind'][]) =>
  plan.filter((f) => f.room === room && kinds.includes(f.kind));
const near = (a: { x: number; z: number }, b: { x: number; z: number }) =>
  Math.hypot(a.x - b.x, a.z - b.z);
const lights = (room: string) =>
  of(room, 'emergency-bulkhead', 'emergency-downlight');
const rooms = ROOMS.filter(
  (r) => r.id !== 'corridor' && r.id !== 'lower-corridor',
);

describe('escape (Approved Document B)', () => {
  it('keeps every room within its travel distance of an exit (two thirds, direct)', () => {
    for (const room of rooms)
      expect(worstDirectDistance(room), room.id).toBeLessThanOrEqual(
        (travelLimit(room) * 2) / 3,
      );
  });

  it('leaves no dead end in the lower corridor longer than 18 m', () => {
    const lower = roomById('lower-corridor');
    const feet = STAIRS.map((s) => s.minX).sort((a, b) => a - b);
    expect(feet[0] - lower.minX).toBeLessThanOrEqual(18);
    expect(lower.maxX - feet[feet.length - 1]).toBeLessThanOrEqual(18);
  });

  it('gives the service corridor a final exit at each end', () => {
    const ends = FINAL_EXITS.filter((e) => e.room === 'corridor').map(
      (e) => e.side,
    );
    expect(ends.sort()).toEqual(['east', 'west']);
  });
});

describe('detection and alarm (BS 5839-1)', () => {
  it('covers every point of every room with a detector of the right kind', () => {
    for (const room of ROOMS) {
      const kind = detectorKind(room);
      const ceiling = floorOf(room) + room.height;
      if (kind === 'beam-transmitter') {
        const beams = of(room.id, 'beam-transmitter');
        for (const p of floorSamples(room, 2))
          expect(
            beams.some((b) => Math.abs(b.z - p.z) <= BEAM_HALF_WIDTH),
          ).toBe(true);
        continue;
      }
      expect(room.height).toBeLessThanOrEqual(MAX_POINT_HEIGHT[kind]);
      const heads = of(room.id, kind);
      for (const h of heads) expect(h.y).toBeCloseTo(ceiling);
      for (const p of floorSamples(room, 1))
        expect(
          heads.some((h) => near(h, p) <= COVERAGE[kind] + 1e-6),
          `${room.id} at ${p.x}, ${p.z}`,
        ).toBe(true);
    }
  });

  it('puts a call point by every final exit and at the foot of every stair', () => {
    for (const exit of FINAL_EXITS) {
      const room = roomById(exit.room);
      const door = onWall(room, exit.side, exit.at, 0);
      expect(
        of(exit.room, 'call-point').some(
          (c) => near(c, door) <= exit.width / 2 + 1,
        ),
      ).toBe(true);
    }
    for (const stair of STAIRS)
      expect(
        of('lower-corridor', 'call-point').some(
          (c) => Math.abs(c.x - stair.minX) <= 2,
        ),
      ).toBe(true);
  });

  it('mounts call points at 1.4 m and keeps everyone within 30 m (direct) of one', () => {
    for (const room of ROOMS) {
      const points = of(room.id, 'call-point');
      for (const c of points) expect(c.y - floorOf(room)).toBeCloseTo(1.4);
      for (const p of floorSamples(room, 2))
        expect(
          points.some((c) => near(c, p) <= 30),
          room.id,
        ).toBe(true);
    }
  });

  it('sounds an alarm in every room, with a panel by the entrance', () => {
    for (const room of ROOMS)
      expect(of(room.id, 'sounder').length, room.id).toBeGreaterThan(0);
    expect(of('reception', 'fire-panel')).toHaveLength(1);
  });
});

describe('emergency lighting (BS 5266-1)', () => {
  it('lights every final exit, door, call point and fire point within 2 m', () => {
    for (const exit of FINAL_EXITS) {
      const door = onWall(roomById(exit.room), exit.side, exit.at, 0);
      expect(
        lights(exit.room).some(
          (l) => near(l, door) <= EMPHASIS + exit.width / 2,
        ),
        exit.id,
      ).toBe(true);
    }
    for (const door of DOORS) {
      if (door.stair) continue;
      const p = doorPoint(door);
      if (!p) continue;
      for (const id of door.rooms)
        expect(
          lights(id).some((l) => near(l, p) <= EMPHASIS + door.width / 2),
          `${id} door at ${door.at}`,
        ).toBe(true);
    }
    for (const f of plan.filter(
      (f) => f.kind === 'call-point' || f.kind === 'extinguisher',
    ))
      expect(
        lights(f.room).some((l) => near(l, f) <= EMPHASIS),
        `${f.kind} in ${f.room}`,
      ).toBe(true);
  });

  it('lights the top and the foot of every stair', () => {
    for (const stair of STAIRS) {
      expect(
        lights('corridor').some((l) => l.x >= stair.minX && l.x <= stair.maxX),
      ).toBe(true);
      expect(
        lights('lower-corridor').some(
          (l) => Math.abs(l.x - stair.minX) <= EMPHASIS,
        ),
      ).toBe(true);
    }
  });

  it('lights the corridors along their length, at most 11 m apart', () => {
    for (const id of ['corridor', 'lower-corridor']) {
      const xs = of(id, 'emergency-downlight')
        .map((l) => l.x)
        .sort((a, b) => a - b);
      for (let i = 1; i < xs.length; i++)
        expect(xs[i] - xs[i - 1]).toBeLessThanOrEqual(11);
    }
  });

  it('lights open areas and plant rooms all over', () => {
    for (const room of rooms) {
      const area = (room.maxX - room.minX) * (room.maxZ - room.minZ);
      if (area <= 60) continue;
      const ls = of(room.id, 'emergency-downlight');
      for (const p of floorSamples(room, 2))
        expect(
          ls.some((l) => near(l, p) <= 7.01),
          room.id,
        ).toBe(true);
    }
  });
});

describe('escape signs (BS ISO 3864-1, BS EN ISO 7010, BS 5499-4)', () => {
  it('signs every final exit FIRE EXIT', () => {
    for (const exit of FINAL_EXITS) {
      const door = onWall(roomById(exit.room), exit.side, exit.at, 0);
      expect(
        of(exit.room, 'exit-sign').some(
          (s) => s.finalExit && near(s, door) <= 0.5,
        ),
        exit.id,
      ).toBe(true);
    }
  });

  it('keeps a sign within its 32 m viewing distance of everywhere', () => {
    // An internally lit sign is legible at 200 × its pictogram's height
    // (BS ISO 3864-1); these pictograms are 160 mm high.
    for (const room of ROOMS) {
      const signs = of(room.id, 'exit-sign');
      for (const p of floorSamples(room, 2))
        expect(
          signs.some((s) => near(s, p) <= 32),
          room.id,
        ).toBe(true);
    }
  });

  it('points corridor signs toward the exit as their reader sees it', () => {
    // On the south wall (facing north), the reader faces south: west is their right.
    expect(arrowToward(Math.PI, 50, 0)).toBe('right');
    expect(arrowToward(Math.PI, 50, 96)).toBe('left');
    // On the north wall, east is their right.
    expect(arrowToward(0, 50, 96)).toBe('right');
  });
});

describe('portable extinguishers (BS 5306-8)', () => {
  it('keeps everyone within 30 m travel (20 m direct) of a fire point', () => {
    for (const room of ROOMS) {
      const points = of(room.id, 'extinguisher');
      for (const p of floorSamples(room, 2))
        expect(
          points.some((e) => near(e, p) <= 20),
          room.id,
        ).toBe(true);
    }
  });

  it('gives each floor at least two extinguishers and enough class A rating', () => {
    for (const floor of [0, LOWER_Y]) {
      const here = ROOMS.filter((r) => floorOf(r) === floor);
      const area = here.reduce(
        (n, r) => n + (r.maxX - r.minX) * (r.maxZ - r.minZ),
        0,
      );
      const units = plan.filter(
        (f) => f.kind === 'extinguisher' && here.some((r) => r.id === f.room),
      );
      const rating = units.reduce(
        (n, f) => n + CLASS_A_RATING[f.extinguisher ?? 'co2'],
        0,
      );
      expect(units.length).toBeGreaterThanOrEqual(2);
      expect(rating).toBeGreaterThanOrEqual(Math.max(26, 0.065 * area));
    }
  });

  it('keeps water away from the switchgear', () => {
    for (const f of of('switch-room', 'extinguisher'))
      expect(f.extinguisher).toBe('co2');
  });
});

describe('fire exits in the walls', () => {
  it('keeps every fire exit door clear of its wall’s title card and corners', async () => {
    const { cardWidth } = await import('./title-card');
    const { sideSpan } = await import('./facility-plan');
    for (const exit of FINAL_EXITS) {
      const room = roomById(exit.room);
      const span = sideSpan(room, exit.side);
      expect(exit.at - exit.width / 2).toBeGreaterThan(span.from + 0.15);
      expect(exit.at + exit.width / 2).toBeLessThan(span.to - 0.15);
      if (room.card !== exit.side || room.height > 6) continue;
      const centre = (span.from + span.to) / 2;
      const half = cardWidth(room) / 2;
      const apart =
        exit.at + exit.width / 2 < centre - half ||
        exit.at - exit.width / 2 > centre + half;
      expect(apart, exit.id).toBe(true);
    }
  });
});

describe('reachable fittings', () => {
  it('puts nothing a person must reach on the wall beside a stair flight', () => {
    for (const f of plan) {
      if (!['call-point', 'extinguisher'].includes(f.kind)) continue;
      if (f.room !== 'corridor' && f.room !== 'lower-corridor') continue;
      for (const stair of STAIRS)
        expect(
          f.x > stair.minX - 0.4 && f.x < stair.maxX + 0.4 && f.z < -3.5,
        ).toBe(false);
    }
  });
});
