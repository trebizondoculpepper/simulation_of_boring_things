import { describe, expect, it } from 'vite-plus/test';
import { POOL_FLOW_MAX, poolFlow } from './pool-flow';

describe('dev11’s pool circulation', () => {
  it('jets from each inlet, out across the back pool', () => {
    // The west inlet faces east.
    const [fx] = poolFlow(-3.5, -6.4);
    expect(fx).toBeGreaterThan(0.15);
    expect(Math.abs(poolFlow(-3.5, -6.4)[0])).toBeGreaterThan(
      Math.abs(poolFlow(-1.5, -6.4)[0]),
    );
  });

  it('runs north up the channel into the main pool', () => {
    expect(poolFlow(0, -3)[1]).toBeGreaterThan(0.04);
  });

  it('spreads out to the overflow, faster near the edge', () => {
    const near = poolFlow(-3, 4.3);
    const far = poolFlow(-3, 1.5);
    expect(near[1]).toBeGreaterThan(0);
    expect(Math.hypot(...near)).toBeGreaterThan(Math.hypot(...far));
  });

  it('is still outside the pool and never faster than the map holds', () => {
    expect(poolFlow(10, 0)).toEqual([0, 0]);
    for (let x = -9; x < 7; x += 0.5)
      for (let z = -8.4; z < 4.5; z += 0.5)
        expect(Math.hypot(...poolFlow(x, z))).toBeLessThanOrEqual(
          POOL_FLOW_MAX + 1e-9,
        );
  });
});
