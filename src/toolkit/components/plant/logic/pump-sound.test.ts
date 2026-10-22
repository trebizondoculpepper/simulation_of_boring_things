import { describe, expect, it } from 'vite-plus/test';
import {
  CIRCULATION_PUMP,
  bladePassHz,
  humHz,
  pumpLevel,
  pumpSpeed,
  shaftHz,
} from './pump-sound';

describe('a circulation pump’s sound', () => {
  it('turns at a four-pole motor’s speed on UK mains, less its slip', () => {
    // 1500 rpm synchronous less 3.5 %: about 1448 rpm.
    expect(shaftHz(CIRCULATION_PUMP) * 60).toBeCloseTo(1447.5, 1);
    // A two-pole motor, twice as fast.
    expect(shaftHz({ ...CIRCULATION_PUMP, poles: 2 }) * 60).toBeCloseTo(
      2895,
      0,
    );
    expect(humHz(CIRCULATION_PUMP)).toBe(100);
  });

  it('sings at its blade-pass tone: vanes times shaft speed', () => {
    expect(bladePassHz(CIRCULATION_PUMP)).toBeCloseTo(144.75, 2);
  });

  it('runs up over a few seconds and coasts down for longer', () => {
    const p = CIRCULATION_PUMP;
    expect(pumpSpeed(p, 0, true)).toBe(0);
    expect(pumpSpeed(p, p.runUp, true)).toBe(1);
    expect(pumpSpeed(p, p.runUp / 2, true)).toBeCloseTo(0.5, 6);
    expect(pumpSpeed(p, 0, false)).toBe(1);
    expect(pumpSpeed(p, p.coastDown, false)).toBe(0);
    // Slowing fastest at first.
    expect(pumpSpeed(p, p.coastDown / 4, false)).toBeLessThan(0.6);
    expect(p.coastDown).toBeGreaterThan(p.runUp);
  });

  it('is louder the bigger it is, within a held sound’s range', () => {
    const small = pumpLevel({ ...CIRCULATION_PUMP, kW: 2 });
    const big = pumpLevel(CIRCULATION_PUMP);
    expect(big).toBeGreaterThan(small);
    expect(big).toBeLessThanOrEqual(0.2);
    expect(small).toBeGreaterThan(0);
  });
});
