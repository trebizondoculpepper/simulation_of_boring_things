import { describe, expect, it } from 'vite-plus/test';
import {
  DIMMER_OFF,
  dimmerOutput,
  fadeToward,
  fibreRainbowHue,
  fibreWheelSparkle,
  twinkle,
  wheelColour,
} from './architectural-lighting';

describe('a dimmer', () => {
  it('is off at the bottom of its travel and full at the top', () => {
    expect(dimmerOutput(0)).toBe(0);
    expect(dimmerOutput(DIMMER_OFF)).toBe(0);
    expect(dimmerOutput(1)).toBeCloseTo(1, 6);
  });

  it('rises on a square law, so half its travel is about a quarter of the light', () => {
    expect(dimmerOutput(0.5)).toBeGreaterThan(0.2);
    expect(dimmerOutput(0.5)).toBeLessThan(0.3);
    for (let s = 0.05; s < 1; s += 0.05)
      expect(dimmerOutput(s + 0.05)).toBeGreaterThan(dimmerOutput(s));
  });

  it('fades a lamp toward its setting, not at once', () => {
    const v = fadeToward(0, 1, 0.1);
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(1);
    expect(fadeToward(0, 1, 5)).toBeCloseTo(1, 4);
  });
});

describe('a fibre-optic starlight ceiling', () => {
  it('holds every point steady with its twinkle wheel stopped', () => {
    for (let i = 0; i < 20; i++) expect(twinkle(i, 3.7, false)).toBe(1);
  });

  it('flickers each point on its own while the wheel turns, never quite out', () => {
    const at = (t: number) => [0, 1, 2, 3].map((i) => twinkle(i, t, true));
    const a = at(1);
    const b = at(2.5);
    expect(new Set(a.map((v) => v.toFixed(3))).size).toBeGreaterThan(1);
    expect(a).not.toEqual(b);
    for (const v of [...a, ...b]) {
      expect(v).toBeGreaterThanOrEqual(0.25);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('is white with its colour wheel out, and turns slowly through soft colours with it in', () => {
    expect(wheelColour(5, false)).toEqual([1, 0.97, 0.9]);
    const c0 = wheelColour(0, true);
    const c1 = wheelColour(13, true);
    expect(c0).not.toEqual(c1);
    for (const c of [...c0, ...c1]) {
      expect(c).toBeGreaterThanOrEqual(0.55);
      expect(c).toBeLessThanOrEqual(1);
    }
  });
});

describe('a bright fibre illuminator wheel', () => {
  it('holds points bright while stopped and makes deep, separate flashes while turning', () => {
    expect(fibreWheelSparkle(4, 2, false)).toBe(1);
    const samples = Array.from({ length: 300 }, (_, n) =>
      fibreWheelSparkle(4, n * 0.05, true),
    );
    expect(Math.min(...samples)).toBeLessThan(0.13);
    expect(Math.max(...samples)).toBeGreaterThan(0.98);
    expect(fibreWheelSparkle(4, 1, true)).not.toBe(
      fibreWheelSparkle(5, 1, true),
    );
  });

  it('spreads rainbow colours between fibres and turns them slowly', () => {
    expect(fibreRainbowHue(0, 0)).not.toBe(fibreRainbowHue(1, 0));
    expect(fibreRainbowHue(1, 0)).not.toBe(fibreRainbowHue(1, 3));
    for (let i = 0; i < 20; i++) {
      expect(fibreRainbowHue(i, 2)).toBeGreaterThanOrEqual(0);
      expect(fibreRainbowHue(i, 2)).toBeLessThan(1);
    }
  });
});
