import { describe, expect, it } from 'vite-plus/test';
import {
  ENTRANCE_GLOW,
  LIGHTS_UP,
  entranceGlow,
  LIGHT_STAGES,
  lightsUpLevels,
  lightsUpTotal,
  playsEntrance,
} from './bridge-lights-up';

describe('the bridge’s lights coming up (the owner, 2026-10-27)', () => {
  it('is dark for the first seconds, only a trace of fill left', () => {
    for (const t of [0, 1, LIGHTS_UP.dark - 0.01]) {
      const l = lightsUpLevels(t);
      for (const s of LIGHT_STAGES) expect(l[s], `${s} at ${t}`).toBe(0);
      expect(l.fill).toBeCloseTo(LIGHTS_UP.floor);
    }
    expect(LIGHTS_UP.dark).toBeGreaterThanOrEqual(2);
    expect(LIGHTS_UP.dark).toBeLessThanOrEqual(3);
  });

  it('brings the cove rings up first, then the dome, the walls and the aft strip', () => {
    const t = LIGHTS_UP.dark + 1.0;
    const l = lightsUpLevels(t);
    expect(l.rings).toBeGreaterThan(l.dome);
    expect(l.dome).toBeGreaterThan(l.walls);
    expect(l.walls).toBeGreaterThanOrEqual(l.aft);
  });

  it('reaches full light 3 to 4 s after the darkness, and stays there', () => {
    const rise = lightsUpTotal() - LIGHTS_UP.dark;
    expect(rise).toBeGreaterThanOrEqual(3);
    expect(rise).toBeLessThanOrEqual(4);
    for (const t of [lightsUpTotal(), lightsUpTotal() + 60]) {
      const l = lightsUpLevels(t);
      for (const s of LIGHT_STAGES) expect(l[s]).toBe(1);
      expect(l.fill).toBe(1);
    }
  });

  it('rises without a step', () => {
    let prev = lightsUpLevels(0);
    for (let t = 0.05; t < lightsUpTotal() + 0.5; t += 0.05) {
      const l = lightsUpLevels(t);
      for (const s of [...LIGHT_STAGES, 'fill'] as const) {
        expect(l[s]).toBeGreaterThanOrEqual(prev[s]);
        expect(l[s] - prev[s]).toBeLessThan(0.1);
      }
      prev = l;
    }
  });

  it('brings the glow under the consoles up first, then the main lights 2 to 3 s on', () => {
    // Displays only at first.
    expect(entranceGlow(0)).toBe(0);
    expect(entranceGlow(ENTRANCE_GLOW.at - 0.01)).toBe(0);
    expect(ENTRANCE_GLOW.at).toBeGreaterThan(0.5);
    expect(ENTRANCE_GLOW.at).toBeLessThanOrEqual(1.5);
    // Then the glow, quickly, full before the main lights begin.
    const full = ENTRANCE_GLOW.at + ENTRANCE_GLOW.rise;
    expect(entranceGlow(full)).toBe(1);
    expect(full).toBeLessThan(LIGHTS_UP.dark);
    const gap = LIGHTS_UP.dark - ENTRANCE_GLOW.at;
    expect(gap).toBeGreaterThanOrEqual(2);
    expect(gap).toBeLessThanOrEqual(3);
    for (const s of LIGHT_STAGES) expect(lightsUpLevels(full)[s]).toBe(0);
  });

  it('keeps the glow while the main lights come up, then lets it fade (the switch keeping it, if on)', () => {
    for (
      let t = ENTRANCE_GLOW.at + ENTRANCE_GLOW.rise;
      t <= lightsUpTotal();
      t += 0.1
    )
      expect(entranceGlow(t), `at ${t}`).toBe(1);
    expect(entranceGlow(lightsUpTotal() + ENTRANCE_GLOW.fade / 2)).toBeLessThan(
      1,
    );
    expect(entranceGlow(lightsUpTotal() + ENTRANCE_GLOW.fade)).toBe(0);
    expect(entranceGlow(Infinity)).toBe(0);
  });

  it('plays when walked in from the corridor, not on opening the page on the bridge', () => {
    expect(playsEntrance('main_corridor', false)).toBe(true);
    expect(playsEntrance('main_corridor', true)).toBe(false);
    expect(playsEntrance(null, false)).toBe(false);
  });
});
