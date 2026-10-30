import { describe, expect, it } from 'vite-plus/test';
import {
  ALL_SAFETY_ROOMS,
  EXIT_WAY,
  FIRE_POINT_HALLS,
  HEIGHTS,
  LIFT_RESERVED,
  escapeRoute,
  exitArch,
  safetyLayer,
  safetySolids,
} from './museum-safety';
import {
  MUSEUM_JOINS,
  PAINTED_POOL,
  hallAxes,
  hallInterior,
  hallOrigin,
  hallSolids,
  hallWalls,
  wallWindows,
} from './museum-plan';
import { overlaps } from '../../controls/logic/walk-collision';

describe('the museum’s safety and services layer', () => {
  it('leads every room’s escape route back to Hall 0 and its stair, through real doorways, the short way', () => {
    for (const id of ALL_SAFETY_ROOMS) {
      const route = escapeRoute(id);
      expect(route.at(-1)).toBe('stair');
      expect(route.at(-2)).toBe('museum0');
      expect(route.length).toBeLessThanOrEqual(7);
      for (let k = 0; k + 1 < route.length - 1; k++) {
        const [a, b] = [route[k], route[k + 1]];
        expect(
          MUSEUM_JOINS.some(
            ([p, q]) => (p === a && q === b) || (p === b && q === a),
          ),
          `${a} to ${b}`,
        ).toBe(true);
      }
    }
    // Both ways round the ring are used: Hall 3 by 2, Hall 5 back by 4
    // (as far either way), Hall 6 on by 7, Hall 9 straight into Hall 0.
    expect(EXIT_WAY.museum3).toBe('museum2');
    expect(EXIT_WAY.museum5).toBe('museum4');
    expect(EXIT_WAY.museum6).toBe('museum7');
    expect(EXIT_WAY.museum9).toBe('museum0');
  });

  it('signs the way out over every room’s exit doorway, and points every hanging sign along the hall to it', () => {
    for (const id of ALL_SAFETY_ROOMS) {
      const layer = safetyLayer(id);
      const exit = exitArch(id);
      if (exit) {
        const box = layer.find((f) => f.kind === 'exit-box');
        expect(box, id).toBeDefined();
        expect(Math.hypot(box!.x - exit.at.x, box!.z - exit.at.z)).toBeLessThan(
          4,
        );
      }
      for (const f of layer.filter((g) => g.kind === 'exit-hanging')) {
        if (!exit) continue;
        // Straight on, its face towards those walking to the way out.
        expect(f.arrow).toBe('up');
        const n = [Math.sin(f.yaw), Math.cos(f.yaw)];
        const ax = hallAxes(id).along;
        const o = hallOrigin(id);
        const exitAlong = (exit.at.x - o.x) * ax[0] + (exit.at.z - o.z) * ax[1];
        const signAlong = (f.x - o.x) * ax[0] + (f.z - o.z) * ax[1];
        const toward = Math.sign(exitAlong - signAlong);
        expect(n[0] * ax[0] * toward + n[1] * ax[1] * toward).toBeLessThan(
          -0.9,
        );
      }
      if (id !== 'museum0')
        expect(layer.filter((f) => f.kind === 'exit-hanging').length).toBe(2);
    }
  });

  it('puts a call point at 1.4 m by every room’s way out, and no fire points', () => {
    for (const id of ALL_SAFETY_ROOMS) {
      const layer = safetyLayer(id);
      const calls = layer.filter((f) => f.kind === 'call-point');
      expect(calls.length, id).toBeGreaterThan(0);
      for (const c of calls) expect(c.y).toBe(HEIGHTS.callPoint);
      expect(layer.some((f) => f.kind === 'fire-point')).toBe(
        FIRE_POINT_HALLS.includes(id),
      );
    }
    // None: the owner took the fire points out of every museum room.
    expect(FIRE_POINT_HALLS).toEqual([]);
  });

  it('fits sockets at 450 mm, within Approved Document M’s 400 to 1,000 mm, never in a window', () => {
    let sockets = 0;
    for (const id of ALL_SAFETY_ROOMS)
      for (const f of safetyLayer(id).filter((g) => g.kind === 'socket')) {
        sockets++;
        expect(f.y).toBeGreaterThanOrEqual(0.4);
        expect(f.y).toBeLessThanOrEqual(1.0);
        for (const wall of hallWalls(id))
          for (const w of wallWindows(id, wall)) {
            const u = wall.axis === 'x' ? f.x : f.z;
            const onLine =
              Math.abs((wall.axis === 'x' ? f.z : f.x) - wall.line) < 0.5;
            if (onLine && Math.abs(u - w.u) < w.w / 2)
              expect(f.y).toBeLessThan(w.sill);
          }
      }
    expect(sockets).toBeGreaterThan(10);
  });

  it('gives Hall 0 its fire exit door and signs, the defibrillator and first aid, and keeps the lift’s wall clear', () => {
    const layer = safetyLayer('museum0');
    for (const kind of [
      'fire-exit-door',
      'final-exit-sign',
      'door-keep-shut',
      'ground-floor-sign',
      'aed',
      'first-aid',
      'cctv-notice',
      'hearing-loop',
      'occupancy',
      'wayfinding',
    ] as const)
      expect(
        layer.some((f) => f.kind === kind),
        kind,
      ).toBe(true);
    const r = hallInterior('museum0');
    const o = hallOrigin('museum0');
    const liftX = o.x + LIFT_RESERVED.along;
    for (const f of layer) {
      const onNorth = f.z < r.minZ + LIFT_RESERVED.depth;
      const inLift = Math.abs(f.x - liftX) < LIFT_RESERVED.w / 2 + 0.3;
      // The ceiling's detectors and sprinklers, high above it, are no matter.
      const low = f.y < 4;
      expect(onNorth && inLift && low, `${f.kind} in the lift's place`).toBe(
        false,
      );
    }
    // The lift's place is clear of the painted pool.
    expect(o.z - r.minZ - LIFT_RESERVED.depth).toBeGreaterThan(
      PAINTED_POOL.d / 2 + 0.45,
    );
  });

  it('stands nothing in the way through any room', () => {
    for (const id of ALL_SAFETY_ROOMS) {
      const solids = [...hallSolids(id), ...safetySolids(id)];
      const { along, length } = hallAxes(id);
      for (let s = -length / 2 + 0.6; s <= length / 2 - 0.6; s += 0.25)
        expect(
          solids.some((f) => overlaps(f, along[0] * s, along[1] * s, 0.2)),
          `${id} along ${s}`,
        ).toBe(false);
    }
  });
});
