import { describe, expect, it } from 'vite-plus/test';
import {
  BATHER,
  CHEMISTRY,
  MOLAR,
  acidFor,
  dose,
  equilibrateWithAir,
  hoclFraction,
  mixWaters,
  readings,
  solvePh,
  stepChemistry,
  thiosulphateStoichiometry,
  waterFrom,
} from './pool-chemistry';
import type { ChemistryInputs, PoolChemistry } from './pool-chemistry';
import jv from './fixtures/jafvert-valentine.json';
import phreeqc from './fixtures/phreeqc-carbonate.json';

const nominal = (over: Partial<Parameters<typeof waterFrom>[0]> = {}) =>
  waterFrom({
    ph: 7.4,
    alkalinity: 120,
    hardness: 200,
    tds: 930,
    temperature: 28,
    ...over,
  });
const V = 100;

describe('hand stoichiometry (pool-dosing-and-water-chemistry.md §2.1, PWTAG TN23)', () => {
  const w = nominal();
  it('1 g of available chlorine in 1 m³ is 1 mg/l of free chlorine', () => {
    expect(
      dose(w, { hypochlorite: 100 }, V, 28).freeChlorine - w.freeChlorine,
    ).toBeCloseTo(1, 9);
  });
  it('0.73 g of HCl lowers alkalinity by 1 mg/l', () => {
    expect(w.alkalinity - dose(w, { hcl: 73 }, V, 28).alkalinity).toBeCloseTo(
      1,
      2,
    );
  });
  it('1.68 g of sodium bicarbonate raises alkalinity by 1 mg/l; 1.06 g of soda ash too', () => {
    expect(
      dose(w, { bicarbonate: 168 }, V, 28).alkalinity - w.alkalinity,
    ).toBeCloseTo(1, 2);
    expect(
      dose(w, { sodaAsh: 106 }, V, 28).alkalinity - w.alkalinity,
    ).toBeCloseTo(1, 2);
  });
  it('1.11 g of calcium chloride raises hardness by 1 mg/l', () => {
    expect(
      dose(w, { calciumChloride: 111 }, V, 28).hardness - w.hardness,
    ).toBeCloseTo(1, 2);
  });
  it('2.4 g of sodium bisulphate lowers alkalinity by 1 mg/l and adds 1.9 mg/l sulphate', () => {
    const d = dose(w, { bisulphate: 240 }, V, 28);
    expect(w.alkalinity - d.alkalinity).toBeCloseTo(1, 1);
    expect(d.sulphate - w.sulphate).toBeCloseTo(1.92, 1);
  });
  it('carbon dioxide adds carbonate, not alkalinity, and lowers pH', () => {
    const d = dose(w, { co2: 1000 }, V, 28);
    expect(d.alkalinity).toBe(w.alkalinity);
    expect(d.carbonate - w.carbonate).toBeCloseTo(10 / MOLAR.CO2, 6);
    expect(d.ph).toBeLessThan(w.ph);
  });
  it('TN23: 5 g of thiosulphate pentahydrate per m³ removes 1 mg/l of free chlorine', () => {
    expect(5 * thiosulphateStoichiometry().chlorinePerMg).toBeCloseTo(1, 2);
    const shocked = dose(w, { hypochlorite: 2000 }, V, 28); // +20 mg/l
    const r = stepChemistry(
      shocked,
      inputs({ added: { thiosulphate: 5 * 18 * V } }),
      1,
    ).water;
    expect(shocked.freeChlorine - r.freeChlorine).toBeCloseTo(18, 1);
  });
  it('TN23: 7.7 g of 65 % calcium hypochlorite per m³ gives 5 mg/l', () => {
    expect(
      dose(w, { calciumHypochlorite: 7.7 * 0.65 * V }, V, 28).freeChlorine -
        w.freeChlorine,
    ).toBeCloseTo(5, 1);
  });
  it('ammonia becomes monochloramine at 5.07 mg Cl₂ per mg N, with one equivalent of acid', () => {
    const fc = { ...w, freeChlorine: 2 };
    const r = stepChemistry({ ...fc, ammonia: 0.1 }, inputs(), 1e-3).water;
    expect(r.chloramine).toBeCloseTo(0.1 * CHEMISTRY.chloraminePerN, 3);
    expect(r.freeChlorine).toBeCloseTo(2 - 0.1 * CHEMISTRY.chloraminePerN, 3);
    expect(fc.alkalinity - r.alkalinity).toBeCloseTo(
      (0.1 / MOLAR.N) * 50.04,
      3,
    );
  });
});

/** Inputs with nothing happening but what is given. */
function inputs(over: Partial<ChemistryInputs> = {}): ChemistryInputs {
  return { volume: V, temperature: 28, surface: 0, circulation: 0, ...over };
}

describe('the carbonate system against PHREEQC 3.8.6 (fixtures/phreeqc-carbonate.json)', () => {
  const asSpec = (w: (typeof phreeqc.waters)[keyof typeof phreeqc.waters]) => ({
    ph: w.input.ph,
    alkalinity: w.input.alkalinity,
    hardness: w.input.hardness,
    temperature: w.input.temperature,
    tds: w.tds,
  });
  for (const [name, ref] of Object.entries(phreeqc.waters)) {
    it(`${name}: total carbonate within 2 %, calcite saturation within 0.1`, () => {
      const w = waterFrom(asSpec(ref));
      expect(
        Math.abs(w.carbonate - ref.carbonate) / ref.carbonate,
      ).toBeLessThan(0.02);
      expect(
        Math.abs(readings(w, ref.input.temperature).calciteSi - ref.calciteSi),
      ).toBeLessThan(0.1);
    });
  }
  const base = waterFrom(asSpec(phreeqc.waters.nominal));
  for (const [name, c] of Object.entries(phreeqc.changes)) {
    it(`${name}: pH within 0.03 of PHREEQC's`, () => {
      let w: PoolChemistry;
      if ('added' in c) w = dose(base, c.added, 1, 28);
      else if ('airCo2' in c) w = equilibrateWithAir(base, c.airCo2, 28);
      else {
        const mains = waterFrom(asSpec(phreeqc.waters.mains));
        w = mixWaters(
          [
            { water: base, volume: 2 },
            { water: mains, volume: 1 },
          ],
          28,
        );
      }
      expect(Math.abs(w.ph - c.ph)).toBeLessThan(0.03);
    });
  }
  it('pH solved from its own alkalinity and carbonate comes back', () => {
    const w = nominal({ freeChlorine: 2 });
    expect(
      solvePh(w.alkalinity, w.carbonate, w.freeChlorine, 28, w.tds, 6),
    ).toBeCloseTo(7.4, 6);
  });
  it('acidFor brings a water to the pH asked', () => {
    const w = nominal({ ph: 7.8 });
    const g = acidFor(w, 7.3, V, 28);
    expect(dose(w, { hcl: g }, V, 28).ph).toBeCloseTo(7.3, 3);
  });
});

describe('chloramines against Jafvert & Valentine (fixtures/jafvert-valentine.json, the EPA scheme)', () => {
  // Our reduced scheme with nothing else happening (no background loss), pH buffered as J&V holds it.
  const K = {
    ...CHEMISTRY,
    chlorineDecay: 0,
    trichloramineToAirStill: 0,
    trichloramineToAirRough: 0,
  };
  const run = (
    inp: (typeof jv.cases)[keyof typeof jv.cases]['input'],
    hours: number,
  ) => {
    let w = {
      ...waterFrom({
        ph: inp.ph,
        alkalinity: inp.alkalinity,
        hardness: 200,
        tds: 0,
        temperature: inp.temperature,
      }),
    };
    w = { ...w, freeChlorine: inp.free, ammonia: inp.ammonia };
    const out: PoolChemistry[] = [w];
    const dt = 5;
    for (let n = 1; n <= (hours * 3600) / dt; n++) {
      w = stepChemistry(
        w,
        { ...inputs(), temperature: inp.temperature },
        dt,
        K,
      ).water;
      w = { ...w, ph: inp.ph };
      out.push(w);
    }
    return (h: number) => out[Math.round((h * 3600) / dt)];
  };
  for (const [name, c] of Object.entries(jv.cases)) {
    it(`${name}: free and combined chlorine at 1, 4 and 24 h`, () => {
      const at = run(c.input, 24);
      for (const h of [1, 4, 24]) {
        const i = c.hours.indexOf(h);
        const w = at(h);
        const combined = w.chloramine + w.organicChloramine + w.trichloramine;
        expect(
          Math.abs(w.freeChlorine - c.free[i]),
          `${name} FC at ${h} h`,
        ).toBeLessThan(Math.max(0.1, 0.1 * c.free[i]));
        expect(
          Math.abs(combined - c.combined[i]),
          `${name} CC at ${h} h`,
        ).toBeLessThan(Math.max(0.05, 0.3 * c.combined[i]));
      }
    });
  }
  it('the breakpoint curve: the dip at 2 h falls near J&V’s (mass ratio 8.5)', () => {
    const total = (ratio: number) => {
      const w = run(
        { free: ratio, ammonia: 1, ph: 7.5, alkalinity: 150, temperature: 25 },
        2,
      )(2);
      return w.freeChlorine + w.chloramine + w.trichloramine;
    };
    const ratios = jv.breakpoint.map((p) => p.ratio);
    const ours = ratios.map(total);
    const dip = ratios[ours.indexOf(Math.min(...ours))];
    expect(dip).toBeGreaterThanOrEqual(7.5);
    expect(dip).toBeLessThanOrEqual(9.5);
    // Below the breakpoint total chlorine is all combined and rises with the dose, as in J&V.
    expect(total(4)).toBeCloseTo(
      jv.breakpoint.find((p) => p.ratio === 4)!.total,
      1,
    );
  });
});

describe('invariants', () => {
  /** A deterministic busy hour: bathers, both chemicals, dilution, UV, the air. */
  const busy = (
    dt: number,
    over: Partial<ChemistryInputs> = {},
  ): ChemistryInputs => ({
    volume: 470,
    temperature: 28,
    surface: 312,
    circulation: 157,
    bathers: 60,
    agitation: 0.8,
    uvFlow: 157,
    airCo2: 800,
    added: { hypochlorite: (900 * dt) / 3600, hcl: (500 * dt) / 3600 },
    ...over,
  });
  it('never negative, whatever is thrown in, at long steps', () => {
    let seed = 12345;
    const rand = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
    let w = nominal({ freeChlorine: 1.5 });
    for (let n = 0; n < 2000; n++) {
      const added = {
        hypochlorite: rand() < 0.3 ? rand() * 5000 : 0,
        hcl: rand() < 0.3 ? rand() * 30000 : 0,
        thiosulphate: rand() < 0.1 ? rand() * 20000 : 0,
        sodaAsh: rand() < 0.1 ? rand() * 10000 : 0,
      };
      w = stepChemistry(
        w,
        busy(600, { added, bathers: rand() * 200 }),
        600,
      ).water;
      for (const [k, v] of Object.entries(w)) {
        expect(Number.isFinite(v), k).toBe(true);
        if (k !== 'alkalinity') expect(v, k).toBeGreaterThanOrEqual(0);
      }
    }
  });
  it('chlorine and nitrogen balance exactly', () => {
    let w = nominal({ freeChlorine: 1.5 });
    const total = (x: PoolChemistry) =>
      x.freeChlorine + x.chloramine + x.organicChloramine + x.trichloramine;
    const nitrogen = (x: PoolChemistry) =>
      x.ammonia +
      x.urea +
      x.chloramine / CHEMISTRY.chloraminePerN +
      x.trichloramine / (3 * CHEMISTRY.chloraminePerN);
    const cl0 = total(w) * 470;
    const n0 = nitrogen(w) * 470;
    let clIn = 0;
    let clOut = 0;
    let nOut = 0;
    let visits = 0;
    for (let n = 0; n < 24 * 60; n++) {
      const inp = busy(60);
      clIn += inp.added!.hypochlorite!;
      visits += (60 / 3600) * inp.bathers!;
      const r = stepChemistry(w, inp, 60);
      w = r.water;
      clOut += r.fluxes.chlorineReduced + r.fluxes.trichloramineToAir;
      nOut += r.fluxes.nitrogenGas + r.fluxes.nitrogenToAir;
    }
    // Organic chloramine's chlorine is counted; its nitrogen is the organics', not tracked.
    expect(total(w) * 470 + clOut - cl0 - clIn).toBeCloseTo(0, 6);
    const nIn = (visits * (BATHER.ureaN + BATHER.ammoniaN)) / 1000;
    expect(nitrogen(w) * 470 + nOut - n0 - nIn).toBeCloseTo(0, 6);
  });
  it('carbon balances: what is in the water and what left for the air', () => {
    let w = nominal();
    const c0 = w.carbonate * 470 * MOLAR.CO2; // g of CO₂ (mmol/l × m³ = mol)... × g/mol
    let out = 0;
    let fromUrea = 0;
    for (let n = 0; n < 24 * 60; n++) {
      const before = w.urea;
      const r = stepChemistry(w, busy(60, { added: { hcl: 300 / 60 } }), 60);
      // urea's carbon: one CO₂ a urea, two N
      const ureaIn = (60 / 3600) * 60 * (BATHER.ureaN / 1000 / 470);
      fromUrea +=
        ((before + ureaIn - r.water.urea) / (2 * MOLAR.N)) * 470 * MOLAR.CO2;
      w = r.water;
      out += r.fluxes.co2ToAir;
    }
    expect(w.carbonate * 470 * MOLAR.CO2 + out - c0 - fromUrea).toBeCloseTo(
      0,
      3,
    );
  });
  it('converges as the step shrinks, and 10 s and 60 s steps agree with 1 s', () => {
    const day = (dt: number) => {
      let w = nominal({ freeChlorine: 1.5 });
      for (let n = 0; n < 86400 / dt; n++)
        w = stepChemistry(w, busy(dt), dt).water;
      return w;
    };
    const ref = day(1);
    for (const dt of [10, 60]) {
      const w = day(dt);
      expect(
        Math.abs(w.freeChlorine - ref.freeChlorine),
        `FC at ${dt} s`,
      ).toBeLessThan(0.02);
      expect(
        Math.abs(w.organicChloramine - ref.organicChloramine),
        `OC at ${dt} s`,
      ).toBeLessThan(0.01);
      expect(Math.abs(w.ph - ref.ph), `pH at ${dt} s`).toBeLessThan(0.005);
      expect(
        Math.abs(w.alkalinity - ref.alkalinity),
        `TA at ${dt} s`,
      ).toBeLessThan(0.2);
    }
    const e10 = Math.abs(day(10).freeChlorine - ref.freeChlorine);
    const e60 = Math.abs(day(60).freeChlorine - ref.freeChlorine);
    expect(e10).toBeLessThanOrEqual(e60 + 1e-9);
  });
  it('dilution relaxes every species to the mains exactly, e^(−Qt/V)', () => {
    const mains = waterFrom({
      ph: 7.6,
      alkalinity: 150,
      hardness: 200,
      tds: 350,
      temperature: 28,
    });
    const w = { ...nominal(), tds: 1500 };
    const once = stepChemistry(w, inputs({ freshWater: 50, mains }), 1).water;
    expect(once.tds).toBeCloseTo(350 + (1500 - 350) * Math.exp(-0.5), 6);
  });
  it('HOCl share follows the textbook α at zero ionic strength', () => {
    const T = 28 + 273.15;
    const pKa = 1.18e-4 * T * T - 7.86e-2 * T + 20.5;
    for (const ph of [7, 7.4, 8])
      expect(hoclFraction(ph, 28, 0)).toBeCloseTo(
        1 / (1 + 10 ** (ph - pKa)),
        9,
      );
  });
});
