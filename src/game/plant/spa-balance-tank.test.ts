import { describe, expect, it } from 'vite-plus/test';
import {
  DISPLACEMENT_PER_BATHER,
  JACUZZI_BALANCE_TANK,
  JACUZZI_SPA,
  sizeSpaTank,
} from './spa-balance-tank';
import { poolVolume } from './pools';

describe('a spa’s balance tank', () => {
  it('holds every allowance with its margin, to the next 0.1 m³', () => {
    const t = sizeSpaTank(JACUZZI_SPA);
    expect(t.allowances.bathers).toBeCloseTo(8 * DISPLACEMENT_PER_BATHER);
    expect(t.allowances.total).toBeCloseTo(1.096, 2);
    expect(t.volume).toBe(1.3);
    expect(t.volume).toBeGreaterThanOrEqual(t.allowances.total * 1.1);
  });

  it('is far larger a share of the water than a pool’s 5 to 10 %', () => {
    const share = JACUZZI_BALANCE_TANK.volume / poolVolume('pool_03');
    expect(share).toBeGreaterThan(0.35);
    expect(share).toBeLessThan(0.6);
  });

  it('has room above its float for every seat taken and the air’s lift', () => {
    const t = JACUZZI_BALANCE_TANK;
    const room = (1 - t.float) * t.volume;
    expect(room).toBeGreaterThanOrEqual(
      t.allowances.bathers + t.allowances.lift - 1e-9,
    );
  });

  it('keeps the water in transit and its reserve between its float and its low-low', () => {
    const t = JACUZZI_BALANCE_TANK;
    expect(t.lowLow).toBeGreaterThan(0.05);
    expect((t.float - t.lowLow) * t.volume).toBeCloseTo(
      t.allowances.transit + t.allowances.reserve,
    );
  });

  it('fits its cylinder, 1.1 m across, with freeboard', () => {
    const t = JACUZZI_BALANCE_TANK;
    expect(t.depth).toBeLessThan(t.height - 0.1);
  });
});
