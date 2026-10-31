import { describe, expect, it } from 'vite-plus/test';
import {
  BED_LIFTED,
  BED_REST,
  glassKey,
  glassLayers,
  glassMoving,
  newGlass,
  settledGlass,
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
    // Its line a thin brown shadow, no more.
    expect(s.crustDark).toBeLessThan(0.1);
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

  it('starts settled on its filter’s state, where it would end up', () => {
    const inputs = service(1, 0.4);
    const settled = settledGlass(inputs);
    const after = run(newGlass(), inputs, 120);
    for (const k of ['bed', 'crust', 'crustDark', 'rough', 'murk'] as const)
      expect(settled[k]).toBeCloseTo(after[k], 3);
    // Settled, a step moves it no further (mission 094: no redraws).
    const next = stepSightGlass(settled, inputs, 1 / 60);
    expect(next.crustDark).toBeCloseTo(settled.crustDark, 6);
    expect(settled.bubbles).toBe(0);
  });

  it('shows a clean bed’s line thin, a dirty one’s sludge band thicker and darker the dirtier', () => {
    const [clean, half, very] = [0, 1, 2.4].map((d) =>
      glassLayers(settledGlass(service(d))),
    );
    expect(clean.sludge).toBeLessThan(0.02);
    expect(half.sludge).toBeGreaterThan(clean.sludge * 4);
    expect(very.sludge).toBeGreaterThan(half.sludge * 1.5);
    const lum = (c: number[]) => c[0] + c[1] + c[2];
    expect(lum(very.sludgeColour)).toBeLessThan(lum(half.sludgeColour));
    // The receding surface takes the sludge's colour too.
    expect(lum(very.surfaceNear)).toBeLessThan(lum(clean.surfaceNear));
  });

  it('shows a pitted bed’s cavities: dips in the line, hollows going back, grime run down into the sand', () => {
    const sound = glassLayers(settledGlass(service(1.6, 0)));
    expect(sound.hollows).toHaveLength(0);
    expect(sound.tongues).toHaveLength(0);
    const pitted = settledGlass(service(1.6, 1));
    const layers = glassLayers(pitted);
    expect(layers.hollows.length).toBeGreaterThan(5);
    expect(layers.tongues.length).toBeGreaterThan(2);
    // Each tongue reaches below the sludge band, into the sand.
    for (const t of layers.tongues)
      expect(t.length).toBeGreaterThan(layers.sludge * 0.6);
    // The line dips where a pit meets the glass.
    const atPit = surfaceAt(pitted, 0.34, 0);
    const between = surfaceAt(pitted, 0.43, 0);
    expect(between - atPit).toBeGreaterThan(0.03);
    // As its condition calls it pitted (fissuring 0.2), the first show.
    expect(
      glassLayers(settledGlass(service(1, 0.2))).hollows.length,
    ).toBeGreaterThan(0);
  });

  it('blurs the surface away and disperses the sludge as the bed fluidises', () => {
    const lifted = glassLayers(
      settledGlass({ mode: 'backwash', dirt: 2, channelling: 1, murk: 1 }),
    );
    expect(lifted.surfaceSharp).toBe(0);
    expect(lifted.sludgeAlpha).toBe(0);
    expect(lifted.tongues).toHaveLength(0);
    expect(lifted.packed).toBeLessThan(0.5);
    expect(lifted.murk).toBe(1);
  });

  it('shows a bed short of sand lower, and the water’s level with air over it', () => {
    expect(settledGlass({ ...service(0), sand: 0.9 }).bed).toBeLessThan(
      BED_REST - 0.1,
    );
    expect(settledGlass(service(0)).bed).toBe(BED_REST);
    expect(glassLayers(settledGlass(service(0))).level).toBeGreaterThan(1);
    expect(
      glassLayers(settledGlass({ ...service(0), water: 0.2 })).level,
    ).toBeCloseTo(0.2, 6);
  });

  it('redraws a loading bed only as what it shows changes, and moves of itself only fluidised or with air', () => {
    const a = settledGlass(service(1));
    const b = settledGlass(service(1.001));
    expect(glassKey(a)).toBe(glassKey(b));
    expect(glassKey(settledGlass(service(1.2)))).not.toBe(glassKey(a));
    expect(glassMoving(a)).toBe(false);
    expect(
      glassMoving(
        settledGlass({ mode: 'rinse', dirt: 0, channelling: 0, murk: 0 }),
      ),
    ).toBe(false);
    expect(
      glassMoving(
        settledGlass({ mode: 'backwash', dirt: 1, channelling: 0, murk: 1 }),
      ),
    ).toBe(true);
  });
});
