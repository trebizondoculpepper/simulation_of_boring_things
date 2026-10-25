import { describe, expect, it } from 'vite-plus/test';
import {
  HEAT_CAPACITY,
  WATERS,
  doseAcid,
  doseHypochlorite,
  filterSolids,
  heat,
  intoVolume,
  irradiate,
  loseHeat,
  mix,
  ozonate,
  react,
  redox,
  turbidity,
} from './water-condition';
import type { WaterCondition } from './water-condition';

/** The water's condition (prompt 070), checked by hand. */
describe('the water’s condition', () => {
  it('mixes in proportion to flow: 30 m³/h at 10 °C with 10 at 30 °C gives 15 °C', () => {
    const w = mix([
      { condition: { ...WATERS.clean, temperature: 10, solids: 0 }, share: 30 },
      {
        condition: { ...WATERS.clean, temperature: 30, solids: 40 },
        share: 10,
      },
    ]);
    expect(w.temperature).toBeCloseTo(15);
    expect(w.solids).toBeCloseTo(10);
  });

  it('dilutes a volume by what comes in', () => {
    const w = intoVolume(
      { ...WATERS.pool, solids: 10 },
      90,
      { ...WATERS.clean, solids: 0 },
      10,
    );
    expect(w.solids).toBeCloseTo(9);
  });

  it('filters suspended solids only: what is dissolved passes', () => {
    const w = filterSolids(WATERS.dirty, 0.97);
    expect(w.solids).toBeCloseTo(0.6);
    expect(w.freeChlorine).toBe(WATERS.dirty.freeChlorine);
    expect(w.organics).toBe(WATERS.dirty.organics);
  });

  it('heats a flow by its power over flow, never past its primary', () => {
    // 116.3 kW into 100 m³/h: 1 K.
    expect(heat(WATERS.clean, 116.3, 100).temperature).toBeCloseTo(21);
    expect(heat(WATERS.clean, 1e6, 1, 60).temperature).toBe(60);
    // A filter vessel's 30 W/K at 10 K over ambient, 28 m³/h: under a hundredth of a kelvin.
    const lost =
      20 -
      loseHeat({ ...WATERS.clean, temperature: 20 }, 30, 10, 28).temperature;
    expect(lost).toBeCloseTo(0.3 / (HEAT_CAPACITY * 28), 5);
    expect(lost).toBeLessThan(0.01);
  });

  it('breaks chloramines down with UV and ozone, and doses chlorine and acid', () => {
    expect(irradiate(WATERS.dirty, 1).combinedChlorine).toBeCloseTo(0.24);
    expect(irradiate(WATERS.dirty, 0).combinedChlorine).toBe(0.8);
    expect(ozonate(WATERS.dirty, 1).organics).toBeCloseTo(2.4);
    expect(doseHypochlorite(WATERS.clean, 2).freeChlorine).toBe(2);
    expect(doseAcid(WATERS.clean, 0.2).ph).toBeCloseTo(7.2);
  });

  it('uses free chlorine on the pollution, forming chloramines, by mass balance', () => {
    let w: WaterCondition = {
      ...WATERS.pool,
      organics: 2,
      combinedChlorine: 0,
    };
    const total = w.freeChlorine;
    for (let t = 0; t < 3600; t += 10) w = react(w, 10);
    expect(w.organics).toBeLessThan(2);
    expect(w.freeChlorine).toBeLessThan(total);
    expect(w.combinedChlorine).toBeGreaterThan(0);
    // Nothing negative, ever.
    let spent: WaterCondition = {
      ...WATERS.dirty,
      freeChlorine: 0.05,
      organics: 50,
    };
    for (let t = 0; t < 86400; t += 60) spent = react(spent, 60);
    expect(spent.freeChlorine).toBeGreaterThanOrEqual(0);
    expect(spent.organics).toBeGreaterThanOrEqual(0);
  });

  it('gives instruments turbidity and redox, as derived readings', () => {
    expect(turbidity(WATERS.dirty)).toBe(10);
    expect(redox(WATERS.pool)).toBeGreaterThan(700);
    expect(redox({ ...WATERS.pool, freeChlorine: 0.3 })).toBeLessThan(
      redox(WATERS.pool),
    );
    expect(redox({ ...WATERS.pool, ph: 7.8 })).toBeLessThan(redox(WATERS.pool));
  });
});
