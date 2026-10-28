import { describe, expect, it } from 'vite-plus/test';
import { POOL_CELL_SHARES, exchangeRing, ringTransfer } from './circuit';
import { waterFrom } from './pool-chemistry';

const water = (alkalinity: number, freeChlorine: number) =>
  waterFrom({
    ph: 7.4,
    alkalinity,
    hardness: 200,
    tds: 800,
    temperature: 28,
    freeChlorine,
  });

describe('the circuit as a ring of well-mixed cells', () => {
  const volumes = [30, ...POOL_CELL_SHARES.map((s) => s * 470)];
  it('moves nothing without flow, or over no time', () => {
    for (const e of [
      ringTransfer(volumes, 0, 1),
      ringTransfer(volumes, 167, 0),
    ])
      e.forEach((row, i) =>
        row.forEach((x, j) => expect(x).toBe(i === j ? 1 : 0)),
      );
  });
  it('conserves every species’ mass exactly, at any step', () => {
    const cells = [
      water(200, 10),
      water(120, 1.5),
      water(110, 1),
      water(100, 0.5),
    ];
    const mass = (cs: typeof cells, k: 'alkalinity' | 'freeChlorine') =>
      cs.reduce((t, c, i) => t + c[k] * volumes[i], 0);
    for (const hours of [1 / 360, 1 / 60, 1, 24]) {
      const out = exchangeRing(cells, volumes, 167, hours, 28);
      expect(mass(out, 'alkalinity')).toBeCloseTo(mass(cells, 'alkalinity'), 6);
      expect(mass(out, 'freeChlorine')).toBeCloseTo(
        mass(cells, 'freeChlorine'),
        6,
      );
    }
  });
  it('is exact over a step: one long step is many short ones', () => {
    const cells = [
      water(200, 10),
      water(120, 1.5),
      water(110, 1),
      water(100, 0.5),
    ];
    const one = exchangeRing(cells, volumes, 167, 1, 28);
    let many = cells;
    for (let n = 0; n < 360; n++)
      many = exchangeRing(many, volumes, 167, 1 / 360, 28);
    one.forEach((c, i) => {
      expect(c.alkalinity).toBeCloseTo(many[i].alkalinity, 8);
      expect(c.freeChlorine).toBeCloseTo(many[i].freeChlorine, 8);
    });
  });
  it('agrees with small explicit steps of the flow equations', () => {
    const c0 = [200, 120, 110, 100];
    const e = ringTransfer(volumes, 167, 1);
    const exact = e.map((row) => row.reduce((t, x, j) => t + x * c0[j], 0));
    let c = [...c0];
    const h = 1 / 100000;
    for (let n = 0; n < 100000; n++)
      c = c.map((x, i) => {
        const from = (i - 1 + c.length) % c.length;
        return x + ((167 * h) / volumes[i]) * (c[from] - x);
      });
    exact.forEach((x, i) => expect(x).toBeCloseTo(c[i], 2));
  });
  it('mixes everything to the volume-weighted mean in the end, and stays finite at any step', () => {
    const cells = [
      water(200, 10),
      water(120, 1.5),
      water(110, 1),
      water(100, 0.5),
    ];
    const mean =
      cells.reduce((t, c, i) => t + c.alkalinity * volumes[i], 0) /
      volumes.reduce((a, b) => a + b, 0);
    const out = exchangeRing(cells, volumes, 167, 200, 28);
    for (const c of out) {
      expect(c.alkalinity).toBeCloseTo(mean, 6);
      expect(Number.isFinite(c.ph)).toBe(true);
    }
  });
  it('carries a dose into the first cell on round the ring in order', () => {
    // A tracer in the tank reaches the return side before the far side.
    const e = ringTransfer(volumes, 167, 0.5);
    const tracer = e.map((row) => row[0]);
    expect(tracer[1]).toBeGreaterThan(tracer[2]);
    expect(tracer[2]).toBeGreaterThan(tracer[3]);
  });
});
