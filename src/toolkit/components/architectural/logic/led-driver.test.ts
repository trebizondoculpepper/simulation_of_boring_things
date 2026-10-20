import { describe, expect, it } from 'vite-plus/test';
import {
  LED_DROP_OUT,
  LED_RESTART_SECONDS,
  createLedDriver,
} from './led-driver';

describe('an LED driver', () => {
  it('holds its light steady near nominal voltage', () => {
    const driver = createLedDriver(1);
    for (const v of [1.05, 1, 0.95, 0.93]) expect(driver.step(0.01, v)).toBe(1);
  });

  it('dims and follows the supply when it sags', () => {
    const driver = createLedDriver(2);
    const high = driver.step(0.01, 0.82);
    const low = driver.step(0.01, 0.72);
    expect(high).toBeLessThan(1);
    expect(low).toBeLessThan(high);
    expect(low).toBeGreaterThan(0);
  });

  it('drops out in a deep dip and restarts only once the supply has recovered', () => {
    const driver = createLedDriver(3);
    expect(driver.step(0.01, LED_DROP_OUT - 0.1)).toBe(0);
    expect(driver.running).toBe(false);
    // Back to normal, it waits a moment before it lights again.
    expect(driver.step(0.01, 1)).toBe(0);
    let t = 0.01;
    while (t < LED_RESTART_SECONDS - 0.02) {
      expect(driver.step(0.01, 1)).toBe(0);
      t += 0.01;
    }
    let lit = 0;
    for (let i = 0; i < 10; i++) lit = driver.step(0.01, 1);
    expect(lit).toBe(1);
  });

  it('is off with no supply', () => {
    const driver = createLedDriver(4);
    expect(driver.step(0.01, 0)).toBe(0);
  });

  it('differs a little from one fitting to another', () => {
    const at = 0.62;
    const lit = Array.from({ length: 20 }, (_, i) =>
      createLedDriver(i).step(0.01, at),
    );
    expect(lit.some((l) => l === 0)).toBe(true);
    expect(lit.some((l) => l > 0)).toBe(true);
  });
});
