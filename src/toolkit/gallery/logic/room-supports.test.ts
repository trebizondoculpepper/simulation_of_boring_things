import { describe, expect, it } from 'vite-plus/test';
import {
  NEAR_FITTING,
  supportSpacing,
} from '../../components/plant/logic/pipe-supports';
import type { Support, Vec3 } from '../../components/plant/logic/pipe-supports';
import { roomSupportRuns, roomSupports } from './room-supports';
import { roomStructure } from './room-structure';
import { ROOM_SERVICES } from '../../../game/plant/services';

const ROOMS = Object.keys(ROOM_SERVICES);
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = (a: Vec3) => Math.hypot(...a);

/** Where along a straight from `a` to `b` a point on it lies, metres, or null if it is not on it. */
function along(p: Vec3, a: Vec3, b: Vec3) {
  const d = sub(b, a);
  const L = len(d);
  if (L < 1e-9) return null;
  const t =
    (sub(p, a)[0] * d[0] + sub(p, a)[1] * d[1] + sub(p, a)[2] * d[2]) / L;
  if (t < -1e-6 || t > L + 1e-6) return null;
  const q: Vec3 = [
    a[0] + (d[0] * t) / L,
    a[1] + (d[1] * t) / L,
    a[2] + (d[2] * t) / L,
  ];
  return len(sub(p, q)) < 1e-4 ? t : null;
}

describe.each(ROOMS)('%s: every run held up', (room) => {
  const plan = roomSupports(room)!;
  const structure = roomStructure(room)!;
  const runs = roomSupportRuns(room);
  const of = (name: string) => plan.supports.filter((s) => s.run === name);

  it('has no span it could not support', () => {
    expect(plan.problems).toEqual([]);
  });

  it('has no level length longer than its spacing between holds', () => {
    for (const run of runs) {
      const spacing = supportSpacing(run.kind, run.od, {
        conduit: run.conduit,
        temperature: run.temperature,
      });
      if (!spacing) continue;
      const mine = of(run.name);
      for (let i = 1; i < run.points.length; i++) {
        const a = run.points[i - 1];
        const b = run.points[i];
        const d = sub(b, a);
        // Level (or falling gently, as a drain does): its ends are held by
        // what they meet, or the support by the bend.
        if (Math.abs(d[1]) > Math.hypot(d[0], d[2])) continue;
        const L = len(d);
        const held = [
          0,
          L,
          ...mine
            .map((s) => along(s.at, a, b))
            .filter((t): t is number => t !== null),
        ].sort((x, y) => x - y);
        for (let k = 1; k < held.length; k++)
          expect(
            held[k] - held[k - 1],
            `${run.name}, length ${i}`,
          ).toBeLessThanOrEqual(spacing.horizontal + 1e-6);
      }
    }
  });

  it('has a support within 300 mm of every bend and fitting', () => {
    for (const run of runs) {
      if (!supportSpacing(run.kind, run.od, { conduit: run.conduit })) continue;
      const mine = of(run.name);
      const near = (p: Vec3) =>
        mine.some((s) => len(sub(s.at, p)) <= NEAR_FITTING + 1e-6);
      // A bend between a riser with nothing beside it and another is held at the riser's ends: from its level side.
      for (let i = 1; i < run.points.length - 1; i++) {
        const p = run.points[i];
        if (
          len(sub(p, run.points[i - 1])) < 1e-6 ||
          len(sub(p, run.points[i + 1])) < 1e-6
        )
          continue;
        expect(
          near(p),
          `${run.name}: bend at ${p.map((v) => v.toFixed(2)).join(', ')}`,
        ).toBe(true);
      }
      // A fitting at the run's very end is held by what the run meets there.
      const ends = [run.points[0], run.points[run.points.length - 1]];
      for (const f of (run.fittings ?? []).filter((f) =>
        ends.every((e) => len(sub(f, e)) >= 0.02),
      ))
        expect(
          near(f),
          `${run.name}: fitting at ${f.map((v) => v.toFixed(2)).join(', ')}`,
        ).toBe(true);
    }
  });

  it('fixes every support to structure: the soffit, a wall, the floor, a landing, a duct or a machine', () => {
    const W = structure.walls;
    const fixed = (s: Support) => {
      switch (s.type) {
        case 'hanger':
          return (
            Math.abs(s.to[1] - structure.soffit) < 1e-6 ||
            structure.obstacles.some(
              (o) => o.kind === 'landing' && s.to[1] < o.maxY,
            )
          );
        case 'wall-bracket':
        case 'wall-clamp':
          return (
            [W.west, W.east].some((x) => Math.abs(s.to[0] - x) < 1e-6) ||
            [W.north, W.south].some((z) => Math.abs(s.to[2] - z) < 1e-6)
          );
        case 'floor-stand':
          return s.to[1] === 0;
        case 'trapeze':
          return s.trapeze !== undefined || s.own?.length === 2;
        case 'in-duct':
          return s.to[1] < 0;
        case 'machine':
          return structure.obstacles.some(
            (o) =>
              o.kind === 'machine' &&
              s.to[0] >= o.minX - 1e-6 &&
              s.to[0] <= o.maxX + 1e-6 &&
              s.to[2] >= o.minZ - 1e-6 &&
              s.to[2] <= o.maxZ + 1e-6,
          );
      }
    };
    for (const s of plan.supports)
      expect(
        fixed(s),
        `${s.run}: ${s.type} at ${s.at.map((v) => v.toFixed(2)).join(', ')}`,
      ).toBe(true);
  });
});
