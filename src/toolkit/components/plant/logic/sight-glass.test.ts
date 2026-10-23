import { describe, expect, it } from 'vite-plus/test';
import {
  BED_LIFTED,
  BED_REST,
  newGlass,
  stepSightGlass,
  surfaceAt,
} from './sight-glass';
import type { GlassInputs, GlassState } from './sight-glass';

const run = (s: GlassState, i: GlassInputs, seconds: number, dt = 0.1) => {
  let state = s;
  for (let t = 0; t < seconds; t += dt) state = stepSightGlass(state, i, dt);
  return state;
};
const service = (dirt: number, channelling = 0): GlassInputs => ({
  mode: 'service',
  dirt,
  channelling,
  murk: 0,
});

describe('a filter’s sight glass', () => {
  it('shows a clean bed flat under clear water, with only a thin crust', () => {
    const s = run(newGlass(), service(0), 60);
    expect(s.bed).toBeCloseTo(BED_REST, 3);
    expect(s.murk).toBeLessThan(0.01);
    expect(s.rough).toBeLessThan(0.01);
    expect(s.crustDark).toBeLessThan(0.01);
  });

  it('darkens and thickens the crust as the bed takes dirt', () => {
    const clean = run(newGlass(), service(0.2), 60);
    const dirty = run(newGlass(), service(1.8), 60);
    expect(dirty.crustDark).toBeGreaterThan(clean.crustDark);
    expect(dirty.crust).toBeGreaterThan(clean.crust);
  });

  it('roughens the surface when it channels: valleys, and a ridge at the wall', () => {
    const s = run(newGlass(), service(1.5, 1), 60);
    const heights = Array.from({ length: 50 }, (_, k) =>
      surfaceAt(s, k / 49, 0),
    );
    expect(Math.max(...heights) - Math.min(...heights)).toBeGreaterThan(0.05);
    const flat = run(newGlass(), service(0), 60);
    const flatHeights = Array.from({ length: 50 }, (_, k) =>
      surfaceAt(flat, k / 49, 0),
    );
    expect(Math.max(...flatHeights) - Math.min(...flatHeights)).toBeLessThan(
      0.001,
    );
  });

  it('lifts and churns the bed in a backwash, with air at first, and clouds the water', () => {
    const before = run(newGlass(), service(1.6), 60);
    const washing: GlassInputs = {
      mode: 'backwash',
      dirt: 1.6,
      channelling: 0,
      murk: 1,
    };
    const early = run(before, washing, 1);
    expect(early.bubbles).toBeGreaterThan(0.3);
    expect(early.murk).toBeGreaterThan(0.4);
    const later = run(early, washing, 20);
    expect(later.bed).toBeCloseTo(BED_LIFTED, 2);
    expect(later.churn).toBeGreaterThan(0.9);
    expect(later.bubbles).toBeLessThan(0.05);
  });

  it('blends from one state to the next, never jumping', () => {
    let s = run(newGlass(), service(1.6), 30);
    const washing: GlassInputs = {
      mode: 'backwash',
      dirt: 1.6,
      channelling: 0,
      murk: 1,
    };
    for (let k = 0; k < 100; k++) {
      const next = stepSightGlass(s, washing, 0.1);
      expect(Math.abs(next.bed - s.bed)).toBeLessThan(0.02);
      expect(Math.abs(next.murk - s.murk)).toBeLessThan(0.1);
      s = next;
    }
  });

  it('clears as the backwash water clears, and settles the bed in the rinse', () => {
    let s = run(
      newGlass(),
      { mode: 'backwash', dirt: 1, channelling: 0, murk: 1 },
      20,
    );
    s = run(s, { mode: 'backwash', dirt: 0, channelling: 0, murk: 0 }, 30);
    expect(s.murk).toBeLessThan(0.01);
    s = run(s, { mode: 'rinse', dirt: 0, channelling: 0, murk: 0 }, 60);
    expect(s.bed).toBeCloseTo(BED_REST, 2);
  });
});
