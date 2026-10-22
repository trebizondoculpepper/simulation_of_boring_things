import { describe, expect, it } from 'vite-plus/test';
import { GAUGE, gaugeOnNozzle, sandFilterGeometry } from './sand-filter';

describe.each([1.2, 3])('a %s m sand filter', (dia) => {
  const g = sandFilterGeometry(dia);
  for (const which of ['inlet', 'outlet'] as const) {
    const n = g[which];
    const { at, yaw } = gaugeOnNozzle(n, g.r);

    it(`stands its ${which} gauge over its ${which} nozzle, between the shell and the flange`, () => {
      // The stem drops straight into the nozzle's top.
      expect(Math.abs(at[0] - n.x)).toBeLessThan(n.od / 2);
      expect(at[2]).toBeGreaterThan(n.shell);
      expect(at[2]).toBeLessThan(n.flange - 0.02);
      expect(at[1]).toBeGreaterThan(n.y + n.od / 2);
    });

    it(`keeps its ${which} gauge's back out of the shell, square to it`, () => {
      // Both edges of the dial, turned with the shell, stay outside it.
      for (const side of [-1, 1]) {
        const x = at[0] + Math.cos(yaw) * side * (GAUGE.dia / 2);
        const z =
          at[2] - Math.sin(yaw) * side * (GAUGE.dia / 2) - Math.cos(yaw) * 0.02;
        const shellZ = -0.35 + Math.sqrt(g.r * g.r - x * x);
        expect(z, `${which}, edge ${side}`).toBeGreaterThan(shellZ);
      }
    });

    it(`keeps its ${which} gauge off the service hatch`, () => {
      const clearX = Math.abs(at[0]) - GAUGE.dia / 2 > g.hatch.radius;
      const clearY =
        Math.abs(at[1] - g.hatch.y) - GAUGE.dia / 2 > g.hatch.radius;
      expect(clearX || clearY).toBe(true);
    });
  }
});
