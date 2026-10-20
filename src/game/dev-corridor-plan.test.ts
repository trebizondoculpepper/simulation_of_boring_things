import { describe, expect, it } from 'vite-plus/test';
import { slide } from '../toolkit/controls/logic/walk-collision';
import {
  LOOP_DOORS,
  LOOP_FIRE_POINTS,
  LOOP_HALF,
  LOOP_INNER_BLOCK,
  LOOP_OUTER_BOUNDS,
  LOOP_ZONES,
  arrivalAt,
  onLoop,
  onSide,
  visibleZones,
  walkedThrough,
  zoneAt,
} from './dev-corridor-plan';

describe("dev_corridor's plan", () => {
  it('loops: four sides of 50 m bring you back where you started', () => {
    const route = [
      [-LOOP_HALF, -LOOP_HALF],
      [LOOP_HALF, -LOOP_HALF],
      [LOOP_HALF, LOOP_HALF],
      [-LOOP_HALF, LOOP_HALF],
      [-LOOP_HALF, -LOOP_HALF],
    ];
    let walked = 0;
    for (let i = 1; i < route.length; i++) {
      const [x0, z0] = route[i - 1];
      const [x1, z1] = route[i];
      walked += Math.hypot(x1 - x0, z1 - z0);
      // Every step of the way is corridor floor.
      for (let f = 0; f <= 1; f += 0.01)
        expect(onLoop(x0 + (x1 - x0) * f, z0 + (z1 - z0) * f)).toBe(true);
    }
    expect(walked).toBe(200);
    expect(route.at(-1)).toEqual(route[0]);
    expect(onLoop(0, 0)).toBe(false);
  });

  it('can be walked round, its walls holding the walker to the corridor', () => {
    // From the north-west corner, try to walk straight into the inner block.
    const from = { x: -LOOP_HALF, z: -LOOP_HALF };
    let at = { ...from };
    for (let i = 0; i < 60; i++) {
      const next = slide([LOOP_INNER_BLOCK], at.x, at.z, 0.1, 0.1, 0.3);
      at = { x: next.x, z: next.z };
    }
    const to = at;
    expect(onLoop(to.x, to.z)).toBe(true);
    expect(Math.abs(LOOP_OUTER_BOUNDS.maxX)).toBeGreaterThan(LOOP_HALF);
  });

  it('never shows the side opposite, and shows two sides from a corner', () => {
    for (const t of [-20, 0, 20]) {
      const seen = visibleZones(onSide('north', t).x, onSide('north', t).z);
      expect([...seen].some((z) => z.startsWith('south'))).toBe(false);
      expect(seen.has('se')).toBe(false);
      expect(seen.has('sw')).toBe(false);
      expect(seen.has('north.middle')).toBe(true);
      // A stub of each side round the corners.
      expect(seen.has('west.a')).toBe(true);
      expect(seen.has('east.a')).toBe(true);
      expect(seen.has('west.middle')).toBe(false);
    }
    const corner = visibleZones(-LOOP_HALF, -LOOP_HALF);
    expect(corner.has('north.middle')).toBe(true);
    expect(corner.has('west.middle')).toBe(true);
    expect(corner.has('south.middle')).toBe(false);
    expect(corner.has('east.middle')).toBe(false);
  });

  it('draws under half the corridor from a side, under three quarters from a corner', () => {
    for (let x = -26; x <= 26; x += 1)
      for (const z of [-25, 25]) {
        const zone = zoneAt(x, z);
        if (!zone) continue;
        const limit = zone.includes('.') ? 0.5 : 0.75;
        expect(visibleZones(x, z).size).toBeLessThan(LOOP_ZONES.length * limit);
      }
  });

  it('has a door every 7 m on its outer walls, one to the courtyard from each side, and fire points within 30 m', () => {
    expect(LOOP_DOORS.filter((d) => d.wall === 'outer')).toHaveLength(28);
    // A door to the courtyard from the middle of every side.
    expect(LOOP_DOORS.filter((d) => d.wall === 'inner')).toHaveLength(4);
    // Walking the centre line, the nearest fire point is never over 30 m away.
    const around = (side: string, t: number) =>
      ['north', 'east', 'south', 'west'].indexOf(side) * 50 + t + 25;
    const points = LOOP_FIRE_POINTS.map((p) => around(p.side, p.t));
    for (let d = 0; d < 200; d += 1) {
      const nearest = Math.min(
        ...points.map((p) => Math.min(Math.abs(p - d), 200 - Math.abs(p - d))),
      );
      expect(nearest).toBeLessThanOrEqual(30);
    }
  });
});

describe("dev_corridor's doorways", () => {
  it('arrives in front of a door, facing away from it, and walking back in goes through it', () => {
    for (const door of LOOP_DOORS) {
      const at = arrivalAt(door);
      expect(onLoop(at.x, at.z)).toBe(true);
      expect(walkedThrough(door, at.x, at.z)).toBe(false);
      // Turn round and walk to the door: forward is (sin yaw, -cos yaw).
      const back = { x: -Math.sin(at.yaw), z: Math.cos(at.yaw) };
      let x = at.x;
      let z = at.z;
      let through = false;
      for (let i = 0; i < 40 && !through; i++) {
        x += back.x * 0.05;
        z += back.z * 0.05;
        through = walkedThrough(door, x, z);
      }
      expect(through).toBe(true);
      expect(onLoop(x, z)).toBe(true);
    }
  });
});
