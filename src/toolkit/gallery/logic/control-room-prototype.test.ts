import { describe, expect, it } from 'vite-plus/test';
import {
  CONTROL_ROOM,
  DESK,
  PLACEHOLDERS,
  STOREY,
  STAIR,
  CONFERENCE,
  PLATFORM,
  RING_LIGHT,
  chairPlace,
  conferenceChairs,
  conferenceTable,
  lanes,
  platformEdge,
  platformRail,
  platformStepAt,
  ringLightCentre,
  RAMP,
  HORSESHOE,
  edgeAt,
  STATIONS,
  stationPlaces,
  deskInner,
  deskOuter,
  deskSegments,
  distanceToSegment,
  insidePolygon,
  placeholderCorners,
  protoFloorAt,
  protoSolids,
  protoStart,
  riserHeight,
  roomPolygon,
  sides,
  stairPlan,
} from './control-room-prototype';
import { overlaps } from '../../controls/logic/walk-collision';

const room = roomPolygon();
const lengths = sides(room).map(([a, b]) => Math.hypot(b.x - a.x, b.z - a.z));

describe('the control room prototype: a flattened heptagon (mission 092)', () => {
  it('has seven sides, mirror-symmetric about its axis, the big wall north', () => {
    expect(room).toHaveLength(7);
    for (const p of room)
      expect(
        room.some(
          (q) => Math.abs(q.x + p.x) < 1e-9 && Math.abs(q.z - p.z) < 1e-9,
        ),
      ).toBe(true);
    expect(lengths[0]).toBeCloseTo(CONTROL_ROOM.front);
    expect(room[0].z).toBeCloseTo(CONTROL_ROOM.frontZ);
    // The opposite corner on the axis, the room's depth behind.
    expect(room[4].x).toBeCloseTo(0);
    expect(room[4].z - room[0].z).toBeCloseTo(CONTROL_ROOM.depth);
  });

  it('is flattened: wider than deep, every other wall shorter than the big one', () => {
    const xs = room.map((p) => p.x);
    const width = Math.max(...xs) - Math.min(...xs);
    expect(width).toBeGreaterThan(CONTROL_ROOM.depth);
    // About 28 × 22 m (the owner, 2026-10-27: grander still).
    expect(width).toBeGreaterThan(27);
    expect(width).toBeLessThan(29);
    for (const l of lengths.slice(1)) expect(l).toBeLessThan(lengths[0]);
    // Its big wall's neighbours angled out to the widest, the next two back in.
    expect(room[2].x).toBeGreaterThan(room[1].x);
    expect(room[6].x).toBeLessThan(room[0].x);
    expect(room[3].x).toBeLessThan(room[2].x);
  });

  it('is convex', () => {
    for (const [i, [a, b]] of sides(room).entries()) {
      const c = room[(i + 2) % 7];
      expect(
        (b.x - a.x) * (c.z - b.z) - (b.z - a.z) * (c.x - b.x),
      ).toBeGreaterThan(0);
    }
  });
});

describe('the operator desk', () => {
  const outer = deskOuter();
  it('is the room shape, smaller, its big side toward the big wall', () => {
    expect(outer).toHaveLength(7);
    const front = Math.hypot(outer[1].x - outer[0].x, outer[1].z - outer[0].z);
    expect(front).toBeCloseTo(CONTROL_ROOM.front * DESK.scale);
    expect(outer[0].z).toBeCloseTo(outer[1].z);
    expect(outer[0].z).toBeLessThan(outer[4].z);
  });

  it('has one segment per side but the two at the back, the way in', () => {
    expect(deskSegments().map((s) => s.side)).toEqual([0, 1, 2, 5, 6]);
  });

  it('stands inside the room, at least 1.5 m clear of every console', () => {
    for (const p of outer) {
      expect(insidePolygon(room, p.x, p.z)).toBe(true);
      for (const [i, [a, b]] of sides(room).entries()) {
        const depth = Math.max(
          0,
          ...PLACEHOLDERS.filter((q) => q.side === i).map((q) => q.depth),
        );
        expect(distanceToSegment(p, a, b) - depth).toBeGreaterThan(1.5);
      }
    }
  });

  it('keeps its top about 0.8 m deep, and the chair inside its well', () => {
    const inner = deskInner();
    expect(inner[0].z - outer[0].z).toBeCloseTo(DESK.top);
    const c = chairPlace();
    expect(insidePolygon(inner, c.x, c.z)).toBe(true);
  });

  it('is clear of the stair: a walkway between its built segments and the stair mouth and guard', () => {
    const { opening } = stairPlan();
    const mouth = { x: (opening.minX + opening.maxX) / 2, z: opening.minZ };
    for (const s of deskSegments()) {
      expect(distanceToSegment(mouth, s.outer[0], s.outer[1])).toBeGreaterThan(
        1.5,
      );
      for (const z of [opening.minZ, opening.maxZ])
        expect(
          distanceToSegment({ x: opening.maxX, z }, s.outer[0], s.outer[1]),
        ).toBeGreaterThan(1.2);
    }
  });

  it('hangs the ring light, about 6 m across, centred on the chair, between the desk and the ceiling', () => {
    expect(ringLightCentre()).toEqual(chairPlace());
    expect(RING_LIGHT.diameter).toBeGreaterThan(5);
    expect(RING_LIGHT.height).toBeGreaterThan(2.5);
    expect(RING_LIGHT.height).toBeLessThan(CONTROL_ROOM.ceiling);
  });

  it('puts every placeholder inside the room', () => {
    for (const p of PLACEHOLDERS)
      for (const c of placeholderCorners(p))
        expect(insidePolygon(room, c.x, c.z), p.label).toBe(true);
  });
});

describe('the stair (Approved Document K)', () => {
  const plan = stairPlan();
  it('climbs a whole 8 m storey', () => {
    const total = STAIR.risers.reduce((a, b) => a + b, 0) * riserHeight();
    expect(total).toBeCloseTo(STOREY);
    expect(plan.flights.at(-1)!.surface.y.y1).toBeCloseTo(STOREY);
  });

  it('has three or more flights of at most 16 risers each', () => {
    expect(plan.flights.length).toBeGreaterThanOrEqual(3);
    for (const f of plan.flights) expect(f.risers).toBeLessThanOrEqual(16);
  });

  it('keeps risers at most 220 mm, goings at least 220 mm, and 2R + G between 550 and 700 mm', () => {
    const r = riserHeight();
    expect(r).toBeLessThanOrEqual(0.22);
    expect(r).toBeGreaterThan(0.15);
    expect(STAIR.going).toBeGreaterThanOrEqual(0.22);
    expect(2 * r + STAIR.going).toBeGreaterThanOrEqual(0.55);
    expect(2 * r + STAIR.going).toBeLessThanOrEqual(0.7);
  });

  it('gives each flight one going fewer than its risers, its rise its risers', () => {
    const r = riserHeight();
    for (const f of plan.flights) {
      const y = f.surface.y;
      expect(Math.abs(y.at1 - y.at0)).toBeCloseTo((f.risers - 1) * STAIR.going);
      expect(y.y1 - y.y0).toBeCloseTo(f.risers * r);
    }
  });

  it('switches back: the flights alternate direction, the last climbing north toward the big wall', () => {
    const dirs = plan.flights.map((f) =>
      Math.sign(f.surface.y.at1 - f.surface.y.at0),
    );
    expect(dirs).toEqual([-1, 1, -1]);
  });

  it('has landings at least the stair width deep', () => {
    for (const l of plan.landings)
      expect(l.area.maxZ - l.area.minZ).toBeGreaterThanOrEqual(
        STAIR.width - 1e-9,
      );
  });

  it('keeps 2 m headroom under the room floor over everything but the opening', () => {
    // The highest stair surface not under the opening is the south landing.
    expect(STOREY - 0.3 - plan.heights[2]).toBeGreaterThanOrEqual(2);
  });

  it('comes up off centre, on the left, between the desk and the left wall, in front of the platform', () => {
    const o = plan.opening;
    expect(o.maxX).toBeLessThan(Math.min(...deskOuter().map((p) => p.x)));
    for (const x of [o.minX - 1.2, o.maxX + 1.2])
      for (const z of [o.minZ, o.maxZ])
        expect(insidePolygon(room, x, z)).toBe(true);
    expect(o.maxZ).toBeLessThan(platformEdge());
  });

  it('keeps the whole stair hall under the room', () => {
    const h = plan.hall;
    for (const x of [h.minX, h.maxX])
      for (const z of [h.minZ, h.maxZ])
        expect(insidePolygon(room, x, z)).toBe(true);
  });
});

describe('walking the prototype', () => {
  it('can be climbed from the door to the room, stepping no more than a step at a time', () => {
    const plan = stairPlan();
    const start = protoStart();
    // The arrival lane's middle, and the second flight's lane's.
    const { axis: a, side: b } = lanes();
    const axis = (a.minX + a.maxX) / 2;
    const east = (b.minX + b.maxX) / 2;
    // The route: up the axis lane, across the north landing, up the east
    // lane, across the south landing, up the axis lane into the room.
    const north = STAIR.topZ - STAIR.landing / 2;
    const south = plan.south + STAIR.landing / 2;
    const route: [number, number][] = [
      [axis, start.z],
      [axis, north],
      [east, north],
      [east, south],
      [axis, south],
      [axis, plan.opening.minZ - 1],
      // Then round the opening, across the room, up the stage's steps,
      // to its table.
      [-4.5, plan.opening.minZ - 1],
      [-4.5, 0.3],
      [0, 0.3],
      [0, CONFERENCE.z - CONFERENCE.d / 2 - 0.3],
    ];
    let y = protoFloorAt(start.x, start.z, 0);
    expect(y).toBe(0);
    let x = start.x;
    let z = start.z;
    for (const [tx, tz] of route.slice(1)) {
      const steps = Math.ceil(Math.hypot(tx - x, tz - z) / 0.05);
      const [x0, z0] = [x, z];
      for (let k = 1; k <= steps; k++) {
        x = x0 + ((tx - x0) * k) / steps;
        z = z0 + ((tz - z0) * k) / steps;
        const next = protoFloorAt(x, z, y);
        expect(Math.abs(next - y)).toBeLessThan(0.25);
        // Nothing solid in the way at this height.
        for (const s of protoSolids(next))
          expect(overlaps(s, x, z, 0.1), `${x},${z},${next}`).toBe(false);
        y = next;
      }
    }
    expect(y).toBeCloseTo(STOREY + PLATFORM.height);
  });

  it('raises the stage over a metre in six risers, and rails the rest of its front and either side of the steps', () => {
    const edge = edgeAt(0);
    const g = PLATFORM.going;
    const heights = [-5.5, -4.5, -3.5, -2.5, -1.5, -0.5, 0.5].map((k) =>
      platformStepAt(0, edge + k * g),
    );
    const r = PLATFORM.height / PLATFORM.risers;
    expect(heights.map((h) => +(h / r).toFixed(3))).toEqual([
      0, 1, 2, 3, 4, 5, 6,
    ]);
    expect(PLATFORM.height).toBeGreaterThanOrEqual(1);
    expect(r).toBeLessThanOrEqual(0.22);
    expect(
      platformStepAt(PLATFORM.stepWidth, edgeAt(PLATFORM.stepWidth) - 0.15),
    ).toBe(0);
    const rail = platformRail();
    expect(rail.some((s) => overlaps(s, 4, edgeAt(4), 0.175))).toBe(true);
    expect(rail.some((s) => overlaps(s, 0, edge, 0.175))).toBe(false);
    // Handrails both sides of the steps.
    const half = PLATFORM.stepWidth / 2;
    expect(rail.some((s) => overlaps(s, -half, edge - g, 0.05))).toBe(true);
    expect(rail.some((s) => overlaps(s, half, edge - g, 0.05))).toBe(true);
  });

  it('makes the stage at least 7 m deep and 10 m wide where the table stands, with room to walk round it', () => {
    const edge = edgeAt(0);
    const room2 = roomPolygon();
    expect(room2[4].z - edge).toBeGreaterThanOrEqual(7);
    const t = conferenceTable();
    // 10 m across at the table's far side.
    expect(insidePolygon(room2, -5, t.maxZ)).toBe(true);
    expect(insidePolygon(room2, 5, t.maxZ)).toBe(true);
    // A metre clear round the table and its chairs.
    for (const c of conferenceChairs())
      for (const [dx, dz] of [
        [0, 1.2],
        [0, -1.2],
      ])
        expect(platformStepAt(c.x + dx, c.z + dz) > 0).toBe(true);
  });

  it('puts the conference table on the platform, its chairs round it', () => {
    const t = conferenceTable();
    for (const x of [t.minX, t.maxX])
      for (const z of [t.minZ, t.maxZ]) {
        expect(insidePolygon(room, x, z)).toBe(true);
        expect(platformStepAt(x, z)).toBe(PLATFORM.height);
      }
    for (const c of conferenceChairs()) {
      expect(insidePolygon(room, c.x, c.z)).toBe(true);
      expect(platformStepAt(c.x, c.z)).toBe(PLATFORM.height);
    }
  });

  it('does not let a walker in the room fall into the opening', () => {
    const { opening } = stairPlan();
    const guard = protoSolids(STOREY);
    const z = (opening.minZ + opening.maxZ) / 2;
    expect(guard.some((s) => overlaps(s, opening.minX, z, 0.175))).toBe(true);
    expect(guard.some((s) => overlaps(s, opening.maxX, z, 0.175))).toBe(true);
    expect(
      guard.some((s) => overlaps(s, STAIR.laneX, opening.maxZ, 0.175)),
    ).toBe(true);
  });

  it('keeps a walker on the ground out from under the second flight', () => {
    const solids = protoSolids(0);
    const { side } = lanes();
    const x = (side.minX + side.maxX) / 2;
    expect(solids.some((s) => overlaps(s, x, STAIR.topZ + 1, 0.175))).toBe(
      true,
    );
  });
});

describe('the operator stations, one per pool system', () => {
  const places = stationPlaces();
  const minDistance = (
    a: readonly { x: number; z: number }[],
    b: readonly { x: number; z: number }[],
  ) => {
    let best = Infinity;
    for (const p of a)
      for (const [i, q] of b.entries())
        best = Math.min(best, distanceToSegment(p, q, b[(i + 1) % b.length]));
    for (const p of b)
      for (const [i, q] of a.entries())
        best = Math.min(best, distanceToSegment(p, q, a[(i + 1) % a.length]));
    return best;
  };

  it('has the six systems, each facing the big wall', () => {
    expect(places.map((p) => p.system)).toEqual([...STATIONS]);
    for (const p of places) expect(Math.cos(p.yaw)).toBeGreaterThan(0.9);
  });

  it('stands inside the room, at least 1.2 m clear of the walls and their consoles', () => {
    for (const p of places)
      for (const c of p.corners) {
        expect(insidePolygon(room, c.x, c.z)).toBe(true);
        for (const [i, [a, b]] of sides(room).entries()) {
          const depth = Math.max(
            0,
            ...PLACEHOLDERS.filter((q) => q.side === i).map((q) => q.depth),
          );
          expect(distanceToSegment(c, a, b) - depth).toBeGreaterThan(1.2);
        }
      }
  });

  it('leaves walkways round the desk, between the stations and to the stair', () => {
    const { opening } = stairPlan();
    const hole = [
      { x: opening.minX, z: opening.minZ },
      { x: opening.maxX, z: opening.minZ },
      { x: opening.maxX, z: opening.maxZ },
      { x: opening.minX, z: opening.maxZ },
    ];
    for (const [i, p] of places.entries()) {
      expect(minDistance(p.corners, deskOuter()), `desk ${i}`).toBeGreaterThan(
        1.0,
      );
      expect(minDistance(p.corners, hole), `hole ${i}`).toBeGreaterThan(0.9);
      if (i > 0)
        expect(
          minDistance(p.corners, places[i - 1].corners),
          `between ${i}`,
        ).toBeGreaterThan(0.7);
    }
  });

  it('keeps the stair mouth free to walk out of, north', () => {
    const { opening } = stairPlan();
    const x = (opening.minX + opening.maxX) / 2;
    for (let z = opening.minZ - 0.2; z > opening.minZ - 2; z -= 0.1)
      expect(
        protoSolids(STOREY, 'bridge').some((s) => overlaps(s, x, z, 0.175)),
        `${z}`,
      ).toBe(false);
  });
});

describe('the bridge: ramps either side up to the stage', () => {
  const walk = (route: [number, number][], from: number) => {
    let [x, z] = route[0];
    let y = from;
    for (const [tx, tz] of route.slice(1)) {
      const steps = Math.ceil(Math.hypot(tx - x, tz - z) / 0.05);
      const [x0, z0] = [x, z];
      for (let k = 1; k <= steps; k++) {
        x = x0 + ((tx - x0) * k) / steps;
        z = z0 + ((tz - z0) * k) / steps;
        const next = protoFloorAt(x, z, y, 'bridge');
        expect(Math.abs(next - y), `${x},${z}`).toBeLessThan(0.25);
        for (const s of protoSolids(next, 'bridge'))
          expect(overlaps(s, x, z, 0.1), `${x},${z},${next}`).toBe(false);
        y = next;
      }
    }
    return y;
  };

  it('climbs each ramp, round the horseshoe, from its low outer end to the stage', () => {
    for (const s of [-1, 1]) {
      const along: [number, number][] = [];
      for (let x = RAMP.low - 0.8; x >= RAMP.end + 0.6; x -= 0.5)
        along.push([s * x, edgeAt(s * x) - RAMP.depth / 2]);
      const y = walk(
        [
          [s * (RAMP.low - 0.8), 0.2],
          ...along,
          [s * (RAMP.end + 0.6), edgeAt(RAMP.end + 0.6) + 1],
        ],
        STOREY,
      );
      expect(y).toBeCloseTo(STOREY + PLATFORM.height);
    }
  });

  it('curves the stage’s front back round the command area, a horseshoe', () => {
    expect(edgeAt(0)).toBeCloseTo(platformEdge() + HORSESHOE.sweep);
    expect(edgeAt(roomPolygon()[3].x)).toBeCloseTo(platformEdge());
    expect(edgeAt(-5)).toBeCloseTo(edgeAt(5));
    expect(edgeAt(5)).toBeGreaterThan(edgeAt(8));
    // The conference table's chairs stand clear of it, on the stage.
    for (const c of conferenceChairs())
      expect(platformStepAt(c.x, c.z)).toBe(PLATFORM.height);
  });

  it("guards each ramp's open side, and leaves the lair without ramps or stations", () => {
    const x = (RAMP.open + RAMP.top) / 2;
    const near = edgeAt(x) - RAMP.depth;
    expect(
      protoSolids(STOREY, 'bridge').some((s) => overlaps(s, x, near, 0.1)),
    ).toBe(true);
    expect(protoFloorAt(x, near + 0.5, STOREY + 0.5, 'lair')).toBe(STOREY);
    expect(
      protoSolids(STOREY, 'lair').some((s) =>
        stationPlaces().some((p) => overlaps(s, p.x, p.z, 0)),
      ),
    ).toBe(false);
  });
});
