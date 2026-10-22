import { describe, expect, it } from 'vite-plus/test';
import { OLYMPIC_ORBIT, orbitPose } from './title-orbit';

const o = OLYMPIC_ORBIT;
const bearing = (p: { x: number; z: number }) =>
  (Math.atan2(p.x - o.centre.x, p.z - o.centre.z) * 180) / Math.PI;

describe('the title backdrop’s orbit', () => {
  it('swings through 1° in all, 10 seconds to a cycle', () => {
    const swings = Array.from({ length: 1001 }, (_, i) =>
      bearing(orbitPose(o, (i / 1000) * 10)),
    );
    expect(Math.max(...swings) - Math.min(...swings)).toBeCloseTo(1, 3);
    expect(bearing(orbitPose(o, 2.5))).toBeCloseTo(0.5, 6);
    expect(bearing(orbitPose(o, 7.5))).toBeCloseTo(-0.5, 6);
    expect(bearing(orbitPose(o, 10))).toBeCloseTo(bearing(orbitPose(o, 0)), 9);
  });

  it('keeps its distance and height, and always looks at the centre', () => {
    for (const t of [0, 1.3, 4.9, 8.2]) {
      const p = orbitPose(o, t);
      expect(Math.hypot(p.x - o.centre.x, p.z - o.centre.z)).toBeCloseTo(
        o.radius,
        9,
      );
      expect(p.y).toBe(o.height);
      // The walker's forward at its yaw points back at the centre.
      const forward = { x: Math.sin(p.yaw), z: -Math.cos(p.yaw) };
      const toCentre = { x: o.centre.x - p.x, z: o.centre.z - p.z };
      const len = Math.hypot(toCentre.x, toCentre.z);
      expect(forward.x).toBeCloseTo(toCentre.x / len, 9);
      expect(forward.z).toBeCloseTo(toCentre.z / len, 9);
      expect(Math.tan(-p.pitch)).toBeCloseTo(
        (o.height - o.centre.y) / o.radius,
        9,
      );
    }
  });
});
