import { describe, expect, it } from 'vite-plus/test';
import { LANE_ROPE_SWAY, laneRopeSway } from './lane-rope';

describe('a lane rope’s sway', () => {
  it('holds still at its ends, where it is hooked to the walls', () => {
    for (const t of [0, 1.3, 2.9, 5.5])
      for (const u of [0, 1]) expect(laneRopeSway(u, t)).toBeCloseTo(0, 9);
  });

  it('swings most near its middle, gently, and comes back to where it was', () => {
    const { amplitude, period, second } = LANE_ROPE_SWAY;
    let most = 0;
    for (let t = 0; t < period; t += 0.05)
      for (let u = 0; u <= 1; u += 0.05)
        most = Math.max(most, Math.abs(laneRopeSway(u, t)));
    expect(most).toBeGreaterThan(amplitude * 0.9);
    expect(most).toBeLessThanOrEqual(amplitude * (1 + second) + 1e-9);
    // Periodic: one period on, the same shape.
    for (const u of [0.2, 0.5, 0.8])
      expect(laneRopeSway(u, 1.7 + period)).toBeCloseTo(
        laneRopeSway(u, 1.7),
        9,
      );
  });
});
