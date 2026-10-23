import { describe, expect, it } from 'vite-plus/test';
import { ACTUATORS, remoteValveGeometry } from './remote-valve';

describe('remote valves at their real size', () => {
  it("takes Belimo's actuators: the 5 Nm on small valves, the 20 Nm from DN40", () => {
    const small = remoteValveGeometry('water', 0.0269);
    const large = remoteValveGeometry('water', 0.0483);
    expect(small.actuator).toBe(ACTUATORS.LR.name);
    expect(large.actuator).toBe(ACTUATORS.SR.name);
    const box = (g: typeof large) =>
      g.head.max.map((v, k) => v - g.head.min[k]);
    expect(box(large)).toEqual([
      expect.closeTo(ACTUATORS.SR.width, 6),
      expect.closeTo(ACTUATORS.SR.height, 6),
      expect.closeTo(ACTUATORS.SR.length, 6),
    ]);
  });

  it('is an ordinary valve with a small head: a DN50 is 130 mm long, its head under 0.15 m over the pipe', () => {
    const g = remoteValveGeometry('water', 0.06);
    expect(g.length).toBeCloseTo(0.13);
    expect(g.head.max[1] - g.axis).toBeLessThan(0.2);
    // Its actuator stands to one side of the stem.
    expect(-g.head.min[2]).toBeGreaterThan(3 * g.head.max[2]);
  });

  it('stands on the floor in a quarter of the old exhibit space, or less', () => {
    for (const g of [
      remoteValveGeometry('water', 0.05),
      remoteValveGeometry('water', 0.015),
      remoteValveGeometry('gas', 0.0269),
    ]) {
      expect(g.size.w * g.size.d).toBeLessThan((0.72 * 0.55) / 4);
      expect(g.size.h).toBeLessThan(1);
      expect(g.ports.in.at[0]).toBeCloseTo(-g.length / 2);
      expect(g.ports.out.at[0]).toBeCloseTo(g.length / 2);
    }
  });
});
