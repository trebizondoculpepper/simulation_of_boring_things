import { describe, expect, it } from 'vite-plus/test';
import {
  GAUGE,
  SIGHT_GLASS,
  gaugeBosses,
  sandFilterGeometry,
} from './sand-filter';

describe.each([1.2, 3])('a %s m sand filter', (dia) => {
  const shell = dia * 0.57;
  const g = sandFilterGeometry(dia, shell);
  const bosses = gaugeBosses(dia, shell);
  const sight = { x: -g.r * SIGHT_GLASS.across, y: g.cy + SIGHT_GLASS.above };
  const reach = GAUGE.dia / 2;

  for (const which of ['inlet', 'outlet'] as const) {
    const b = bosses[which];

    it(`sets its ${which} gauge's boss in the vessel's straight wall, square to it`, () => {
      expect(Math.hypot(b.on[0], b.on[2] + 0.35)).toBeCloseTo(g.r, 6);
      expect(b.on[1]).toBeGreaterThan(g.cy - shell / 2);
      expect(b.on[1]).toBeLessThan(g.cy + shell / 2);
      // The gauge stands straight out from the boss.
      const out = [b.at[0] - b.on[0], b.at[2] - b.on[2]];
      expect(Math.atan2(out[0], out[1])).toBeCloseTo(b.yaw, 6);
    });

    it(`keeps its ${which} gauge clear of the nozzles, the service hatch and the sight glass`, () => {
      for (const n of [g.inlet, g.outlet, g.drain])
        expect(
          Math.hypot(b.on[0] - n.x, b.on[1] - n.y),
          'nozzle',
        ).toBeGreaterThan(n.od / 2 + reach);
      expect(Math.hypot(b.on[0], b.on[1] - g.hatch.y), 'hatch').toBeGreaterThan(
        g.hatch.radius + reach,
      );
      expect(
        Math.hypot(b.on[0] - sight.x, b.on[1] - sight.y),
        'sight glass',
      ).toBeGreaterThan(SIGHT_GLASS.radius + reach);
    });
  }

  it('reads the freeboard over the bed at the inlet, and the underdrain at the outlet', () => {
    expect(bosses.inlet.on[1]).toBeGreaterThan(g.cy);
    expect(bosses.outlet.on[1]).toBeLessThan(g.cy);
  });
});
