import { describe, expect, it } from 'vite-plus/test';
import {
  acidFor,
  dose,
  readings as chemistryReadings,
  thiosulphateStoichiometry,
  waterFrom,
} from '../water/pool-chemistry';
import type { PoolChemistry, WaterSpec } from '../water/pool-chemistry';
import { advise, alarms, dilute } from './aqualis-advisor';
import { CHANNELS, DEFAULT_TARGETS } from './aqualis-types';
import type {
  Advice,
  AqualisReadings,
  AqualisSettings,
  ChannelId,
  ChannelStatus,
  ChannelView,
  SampleStatus,
} from './aqualis-types';

const V = 400;
const T = 28;
const SETTINGS: AqualisSettings = {
  dynamics: { volumeM3: V, flowM3h: 100 },
  targets: DEFAULT_TARGETS,
};

const GOOD: WaterSpec = {
  ph: 7.3,
  alkalinity: 120,
  hardness: 250,
  tds: 1000,
  temperature: T,
  freeChlorine: 1.3,
  sulphate: 100,
};

/** A water and the readings an ideal analyser would give of it. */
function scene(
  over: Partial<WaterSpec> = {},
  extra: Partial<AqualisReadings> = {},
) {
  const water = waterFrom({ ...GOOD, ...over });
  const lsi = chemistryReadings(water, T).langelier;
  const r: AqualisReadings = {
    freeChlorine: water.freeChlorine,
    combinedChlorine: 0.1,
    totalChlorine: water.freeChlorine + 0.1,
    ph: water.ph,
    alkalinity: water.alkalinity,
    calciumHardness: water.hardness,
    lsi,
    tds: water.tds,
    sulphate: water.sulphate,
    temperature: T,
    ...extra,
  };
  return { water, r };
}

const view = (id: ChannelId, status: ChannelStatus): ChannelView => ({
  id,
  status,
  demand: 0,
  demandRate: 0,
  delivering: 0,
});
const ALL_ONLINE = (['hypochlorite', 'acid', 'co2'] as const).map((id) =>
  view(id, { kind: 'online' }),
);
const NO_CO2 = [
  view('hypochlorite', { kind: 'online' }),
  view('acid', { kind: 'online' }),
  view('co2', { kind: 'unconnected' }),
];

const ids = (a: readonly Advice[]) => a.map((x) => x.id);
const find = (a: readonly Advice[], id: string) => {
  const x = a.find((y) => y.id === id);
  if (!x) throw new Error(`no ${id} in ${ids(a).join(', ')}`);
  return x;
};

describe('advise: in band', () => {
  it('is pleased when every reading is in its band', () => {
    const { r, water } = scene();
    expect(r.lsi).toBeGreaterThan(-0.5);
    expect(r.lsi).toBeLessThan(0.5);
    const a = advise(r, SETTINGS, ALL_ONLINE, water);
    expect(ids(a)).toEqual(['all-well']);
    expect(a[0].mood).toBe('pleased');
    expect(a[0].dose).toBeNull();
  });

  it('accepts the controller’s channels by id', () => {
    const { r } = scene({ ph: 7.6 });
    const byId = {
      hypochlorite: ALL_ONLINE[0],
      acid: ALL_ONLINE[1],
      co2: ALL_ONLINE[2],
    };
    expect(ids(advise(r, SETTINGS, byId))).toEqual(
      ids(advise(r, SETTINGS, ALL_ONLINE)),
    );
  });

  it('waits when there are no readings yet', () => {
    const a = advise(null, SETTINGS, ALL_ONLINE);
    expect(ids(a)).toEqual(['no-readings']);
    expect(a[0].reading).toBeNull();
  });
});

describe('advise: each rule', () => {
  const t = DEFAULT_TARGETS;
  const cases: [
    string,
    Partial<WaterSpec>,
    Partial<AqualisReadings>,
    string,
  ][] = [
    ['free chlorine low', { freeChlorine: 0.7 }, {}, 'free-chlorine-low'],
    ['free chlorine high', { freeChlorine: 2.2 }, {}, 'free-chlorine-high'],
    ['combined high', {}, { combinedChlorine: 0.8 }, 'combined-chlorine-high'],
    ['pH high', { ph: 7.55 }, {}, 'ph-high'],
    ['pH low', { ph: 7.1 }, {}, 'ph-low'],
    ['alkalinity low', { alkalinity: 62 }, {}, 'alkalinity-low'],
    ['alkalinity high', { alkalinity: 240 }, {}, 'alkalinity-high'],
    ['hardness low', { hardness: 80 }, {}, 'calcium-hardness-low'],
    ['hardness high', { hardness: 1100 }, {}, 'calcium-hardness-high'],
    ['aggressive', {}, { lsi: -0.7 }, 'balance-aggressive'],
    ['scaling', {}, { lsi: 0.7 }, 'balance-scaling'],
    ['TDS high', { tds: 1800 }, {}, 'tds-high'],
    ['sulphate high', { sulphate: 420 }, {}, 'sulphate-high'],
  ];
  for (const [name, spec, extra, id] of cases)
    it(`${name} fires`, () => {
      const { r, water } = scene(spec, extra);
      const a = advise(r, SETTINGS, ALL_ONLINE, water);
      const x = find(a, id);
      expect(x.problem.length + x.direction.length).toBeLessThan(150);
      expect(x.direction).not.toMatch(/\d/);
    });

  it('nothing fires at the edges of the bands', () => {
    const { r, water } = scene(
      {
        freeChlorine: t.freeChlorine.low,
        ph: t.ph.high,
        alkalinity: t.alkalinity.low,
      },
      { combinedChlorine: t.combinedChlorine.high, lsi: 0 },
    );
    expect(ids(advise(r, SETTINGS, ALL_ONLINE, water))).toEqual(['all-well']);
  });

  it('says what is wrong with its number, and names the additive', () => {
    const { r, water } = scene({ alkalinity: 62 }, { lsi: 0 });
    const x = find(advise(r, SETTINGS, ALL_ONLINE, water), 'alkalinity-low');
    expect(x.problem).toBe(
      'Alkalinity low (62 mg/l): the pH will be unstable.',
    );
    expect(x.direction).toBe('Raise the alkalinity with sodium bicarbonate.');
    expect(x.additive).toBe('bicarbonate');
    expect(x.where).toBe('balance-tank');
    expect(x.mood).toBe('pointing');
    expect(x.reading).toBe('alkalinity');
  });

  it('very high chlorine wants thiosulphate, and is an alarm', () => {
    const { r, water } = scene({ freeChlorine: 4.5 });
    const x = find(
      advise(r, SETTINGS, ALL_ONLINE, water),
      'free-chlorine-high',
    );
    expect(x.additive).toBe('thiosulphate');
    expect(x.severity).toBe('alarm');
    expect(x.mood).toBe('alarmed');
  });

  it('merely high chlorine says turn it down, with no dose', () => {
    const { r, water } = scene({ freeChlorine: 2.2 });
    const x = find(
      advise(r, SETTINGS, ALL_ONLINE, water),
      'free-chlorine-high',
    );
    expect(x.additive).toBeNull();
    expect(x.dose).toBeNull();
    expect(x.severity).toBe('warning');
  });

  it('pH high: CO₂ where it is connected and the alkalinity is not high, acid otherwise', () => {
    const low = scene({ ph: 7.55, alkalinity: 100 });
    expect(
      find(advise(low.r, SETTINGS, ALL_ONLINE, low.water), 'ph-high').additive,
    ).toBe('co2');
    expect(
      find(advise(low.r, SETTINGS, NO_CO2, low.water), 'ph-high').additive,
    ).toBe('acid');
    const high = scene({ ph: 7.55, alkalinity: 180 });
    const a = find(advise(high.r, SETTINGS, ALL_ONLINE, high.water), 'ph-high');
    expect(a.additive).toBe('acid');
    expect(a.where).toBe('automatic');
  });

  it('pH high with no automatic dosing goes by hand into the balance tank', () => {
    const { r, water } = scene({ ph: 7.55 });
    const off = [
      view('hypochlorite', { kind: 'online' }),
      view('acid', { kind: 'offline', reason: 'manual', fault: null }),
      view('co2', { kind: 'unconnected' }),
    ];
    const x = find(advise(r, SETTINGS, off, water), 'ph-high');
    expect(x.additive).toBe('acid');
    expect(x.where).toBe('balance-tank');
  });

  it('dilution and superchlorination go into the pool', () => {
    const tds = scene({ tds: 1800 });
    expect(
      find(advise(tds.r, SETTINGS, ALL_ONLINE, tds.water), 'tds-high').where,
    ).toBe('pool');
    const cc = scene({}, { combinedChlorine: 0.8 });
    expect(
      find(
        advise(cc.r, SETTINGS, ALL_ONLINE, cc.water),
        'combined-chlorine-high',
      ).where,
    ).toBe('pool');
  });

  it('a balance caused by pH or alkalinity says put those right first', () => {
    const { r, water } = scene({ ph: 7.1 }, { lsi: -0.7 });
    const x = find(
      advise(r, SETTINGS, ALL_ONLINE, water),
      'balance-aggressive',
    );
    expect(x.additive).toBeNull();
    expect(x.dose).toBeNull();
  });
});

describe('advise: the cabinet', () => {
  it('names an offline channel, its reason and what it will do', () => {
    const { r, water } = scene();
    const ch = [
      view('hypochlorite', { kind: 'online' }),
      view('acid', { kind: 'offline', reason: 'manual', fault: null }),
      view('co2', { kind: 'unconnected' }),
    ];
    const a = advise(r, SETTINGS, ch, water);
    const x = find(a, 'acid-offline');
    expect(x.problem).toBe(
      'The acid pump is offline (manual): the pH will drift up.',
    );
    expect(x.reading).toBeNull();
    expect(x.mood).toBe('concerned');
    expect(ids(a)).toEqual(['acid-offline', 'all-well']);
  });

  it('gives a fault’s own words', () => {
    const { r, water } = scene();
    const ch = [
      view('hypochlorite', {
        kind: 'offline',
        reason: 'fault',
        fault: 'AIR LOCK',
      }),
    ];
    expect(
      find(advise(r, SETTINGS, ch, water), 'hypochlorite-offline').problem,
    ).toContain('fault: AIR LOCK');
  });

  it('mentions no CO₂ only when the pH wants bringing down', () => {
    const good = scene();
    expect(ids(advise(good.r, SETTINGS, NO_CO2, good.water))).not.toContain(
      'co2-unconnected',
    );
    const high = scene({ ph: 7.55 });
    expect(ids(advise(high.r, SETTINGS, NO_CO2, high.water))).toContain(
      'co2-unconnected',
    );
  });
});

describe('advise: order', () => {
  it('alkalinity comes before the pH it causes, even when the pH is the alarm', () => {
    const { r, water } = scene({ alkalinity: 60, ph: 6.9 }, { lsi: -0.3 });
    const a = advise(r, SETTINGS, ALL_ONLINE, water);
    expect(find(a, 'ph-low').severity).toBe('alarm');
    expect(ids(a).slice(0, 2)).toEqual(['alkalinity-low', 'ph-low']);
  });

  it('alarms come before warnings', () => {
    const { r, water } = scene({ freeChlorine: 0.3, tds: 1800 });
    const a = advise(r, SETTINGS, ALL_ONLINE, water);
    expect(a[0].id).toBe('free-chlorine-low');
    expect(a[0].severity).toBe('alarm');
    expect(ids(a)).toContain('tds-high');
  });

  it('an offline acid pump comes before the high pH it lets drift', () => {
    const { r, water } = scene({ ph: 7.7 });
    const ch = [
      view('hypochlorite', { kind: 'online' }),
      view('acid', { kind: 'offline', reason: 'switched-off', fault: null }),
      view('co2', { kind: 'unconnected' }),
    ];
    expect(ids(advise(r, SETTINGS, ch, water)).slice(0, 2)).toEqual([
      'acid-offline',
      'ph-high',
    ]);
  });

  it('the balance comes after the readings that make it', () => {
    const { r, water } = scene({ ph: 7.1, hardness: 80 }, { lsi: -0.8 });
    const a = ids(advise(r, SETTINGS, ALL_ONLINE, water));
    expect(a.indexOf('balance-aggressive')).toBeGreaterThan(
      a.indexOf('ph-low'),
    );
    expect(a.indexOf('balance-aggressive')).toBeGreaterThan(
      a.indexOf('calcium-hardness-low'),
    );
  });
});

describe('Show dose', () => {
  const at = (water: PoolChemistry, added: Parameters<typeof dose>[1]) =>
    dose(water, added, V, T);
  const doseFor = (
    spec: Partial<WaterSpec>,
    id: string,
    extra: Partial<AqualisReadings> = {},
  ) => {
    const { r, water } = scene(spec, extra);
    const x = find(advise(r, SETTINGS, ALL_ONLINE, water), id);
    if (!x.dose) throw new Error(`${id} has no dose`);
    return { d: x.dose, water, x };
  };
  const near = (v: number, target: number, tol = 0.05) =>
    expect(Math.abs(v - target)).toBeLessThanOrEqual(Math.abs(target) * tol);

  it('hypochlorite, in litres at 140 g/l', () => {
    const { d, water } = doseFor({ freeChlorine: 0.7 }, 'free-chlorine-low');
    expect(d.unit).toBe('l');
    near(at(water, { hypochlorite: d.amount * 140 }).freeChlorine, 1.3);
    expect(d.text).toMatch(/^[\d.]+ l of sodium hypochlorite \(14 %\)$/);
  });

  it('bicarbonate, in kilograms', () => {
    const { d, water } = doseFor({ alkalinity: 62 }, 'alkalinity-low', {
      lsi: 0,
    });
    expect(d.unit).toBe('kg');
    near(at(water, { bicarbonate: d.amount * 1000 }).alkalinity, 120);
    // PWTAG’s rule of thumb (about 1.5 kg per 100 m³ for 10 mg/l) is a little under the stoichiometry (1.68).
    near(d.amount, ((1.5 * V) / 100) * (58 / 10), 0.15);
  });

  it('acid for high alkalinity, in litres at 104.8 g/l', () => {
    const { d, water } = doseFor({ alkalinity: 240 }, 'alkalinity-high');
    expect(d.unit).toBe('l');
    near(
      at(water, { hcl: d.amount * CHANNELS.acid.gramsPerUnit }).alkalinity,
      120,
    );
  });

  it('acid for high pH lands the pH at its set point', () => {
    const { d, water } = doseFor({ ph: 7.6, alkalinity: 180 }, 'ph-high');
    expect(d.unit).toBe('l');
    expect(at(water, { hcl: d.amount * 104.8 }).ph).toBeCloseTo(7.3, 1);
    near(d.amount * 104.8, acidFor(water, 7.3, V, T), 0.01);
  });

  it('CO₂ for high pH, in grams', () => {
    const { d, water } = doseFor({ ph: 7.6, alkalinity: 100 }, 'ph-high');
    expect(d.unit).toBe('g');
    expect(at(water, { co2: d.amount }).ph).toBeCloseTo(7.3, 1);
  });

  it('soda ash for low pH, in kilograms', () => {
    const { d, water } = doseFor({ ph: 7.0 }, 'ph-low');
    expect(d.unit).toBe('kg');
    expect(at(water, { sodaAsh: d.amount * 1000 }).ph).toBeCloseTo(7.3, 1);
  });

  it('calcium chloride for low hardness, in kilograms', () => {
    const { d, water } = doseFor({ hardness: 80 }, 'calcium-hardness-low');
    expect(d.unit).toBe('kg');
    near(at(water, { calciumChloride: d.amount * 1000 }).hardness, 250);
  });

  it('calcium chloride for aggressive water brings the balance to zero', () => {
    const w = waterFrom({ ...GOOD, ph: 7.25, alkalinity: 85, hardness: 110 });
    const lsi = chemistryReadings(w, T).langelier;
    expect(lsi).toBeLessThan(-0.5);
    const { d, water } = doseFor(
      { ph: 7.25, alkalinity: 85, hardness: 110 },
      'balance-aggressive',
    );
    expect(d.unit).toBe('kg');
    const after = chemistryReadings(
      at(water, { calciumChloride: d.amount * 1000 }),
      T,
    ).langelier;
    expect(Math.abs(after)).toBeLessThan(0.02);
  });

  it('thiosulphate for very high chlorine, in kilograms', () => {
    const { d } = doseFor({ freeChlorine: 4.5 }, 'free-chlorine-high');
    expect(d.unit).toBe('kg');
    const removed =
      (d.amount * 1000 * thiosulphateStoichiometry().chlorinePerMg) / V;
    near(removed, 4.5 - 1.3);
  });

  it('superchlorination raises free chlorine to ten times the combined', () => {
    const { d, water } = doseFor({}, 'combined-chlorine-high', {
      combinedChlorine: 0.8,
    });
    expect(d.unit).toBe('l');
    near(at(water, { hypochlorite: d.amount * 140 }).freeChlorine, 8);
  });

  it('dilution, in cubic metres of fresh water', () => {
    for (const [spec, id, key, target] of [
      [{ tds: 1800 }, 'tds-high', 'tds', 1000],
      [{ sulphate: 420 }, 'sulphate-high', 'sulphate', 100],
      [{ hardness: 1100 }, 'calcium-hardness-high', 'hardness', 250],
    ] as const) {
      const { d, water } = doseFor(spec, id);
      expect(d.unit).toBe('m³');
      near(dilute(water, d.amount, V, T)[key], target);
    }
  });

  it('works without the water, from the readings alone', () => {
    const { r } = scene({ alkalinity: 62 }, { lsi: 0 });
    const x = find(advise(r, SETTINGS, ALL_ONLINE), 'alkalinity-low');
    expect(x.dose?.unit).toBe('kg');
    expect(x.dose!.amount).toBeGreaterThan(0);
  });

  it('scales with the entered volume, right or wrong', () => {
    const { r, water } = scene({ alkalinity: 62 }, { lsi: 0 });
    const big = { ...SETTINGS, dynamics: { volumeM3: 2 * V, flowM3h: 100 } };
    const a = find(advise(r, SETTINGS, ALL_ONLINE, water), 'alkalinity-low')
      .dose!.amount;
    const b = find(advise(r, big, ALL_ONLINE, water), 'alkalinity-low').dose!
      .amount;
    near(b, 2 * a, 0.01);
  });
});

describe('alarms', () => {
  const flowing: SampleStatus = { flowing: true, flowLh: 30, lostFor: 0 };
  const lost: SampleStatus = { flowing: false, flowLh: 0, lostFor: 20 };
  const of = (
    r: AqualisReadings | null,
    s = flowing,
    ch: readonly ChannelView[] = ALL_ONLINE,
    sel: 'auto' | 'hand' | 'off' = 'auto',
  ) => alarms(r, s, ch, SETTINGS, sel).map((a) => a.id);

  it('none in good water', () => {
    expect(of(scene().r)).toEqual([]);
  });

  it('beyond the bands, not merely outside them', () => {
    expect(of(scene({ freeChlorine: 0.8 }).r)).toEqual([]);
    expect(of(scene({ freeChlorine: 0.4 }).r)).toEqual(['chlorine-low']);
    expect(of(scene({ freeChlorine: 2.5 }).r)).toEqual([]);
    expect(of(scene({ freeChlorine: 3.5 }).r)).toEqual(['chlorine-high']);
    expect(of(scene({ ph: 7.5 }).r)).toEqual([]);
    expect(of(scene({ ph: 7.7 }).r)).toContain('ph-high');
    expect(of(scene({ ph: 6.9 }).r)).toContain('ph-low');
    expect(of(scene({}, { combinedChlorine: 0.8 }).r)).toEqual([]);
    expect(of(scene({}, { combinedChlorine: 1.2 }).r)).toEqual([
      'combined-high',
    ]);
    expect(of(scene({}, { lsi: -0.6 }).r)).toEqual(['balance-aggressive']);
    expect(of(scene({}, { lsi: 0.6 }).r)).toEqual(['balance-scaling']);
  });

  it('sample flow low from the sample status, readings or none', () => {
    expect(of(scene().r, lost)).toEqual(['sample-flow-low']);
    expect(of(null, lost)).toEqual(['sample-flow-low']);
  });

  it('dosing offline while the knob should be dosing', () => {
    const ch = [
      view('hypochlorite', {
        kind: 'offline',
        reason: 'no-power',
        fault: null,
      }),
      view('acid', { kind: 'online' }),
      view('co2', { kind: 'unconnected' }),
    ];
    expect(of(scene().r, flowing, ch, 'auto')).toEqual(['dosing-offline']);
    expect(of(scene().r, flowing, ch, 'hand')).toEqual(['dosing-offline']);
    expect(of(scene().r, flowing, ch, 'off')).toEqual([]);
    expect(of(scene().r, flowing, NO_CO2, 'auto')).toEqual([]);
  });

  it('each has its annunciator words', () => {
    const a = alarms(
      scene({ freeChlorine: 0.2 }).r,
      lost,
      ALL_ONLINE,
      SETTINGS,
    );
    expect(a.map((x) => x.text)).toEqual(['CHLORINE LOW', 'SAMPLE FLOW LOW']);
  });
});
