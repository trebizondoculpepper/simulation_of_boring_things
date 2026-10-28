import { describe, expect, it } from 'vite-plus/test';
import {
  CARDS,
  SCENARIO_WATERS,
  TEMPERATURE,
  VOLUME,
  actOnHall4,
  readWater,
  runHall4,
  tankById,
} from './museum-4-lab';
import type { CardId, Hall4State } from './museum-4-lab';
import {
  PLANT,
  SCENARIOS,
  alkaliFor,
  circuitWater,
  runBench,
  warmedUp,
} from '../water/chemistry-bench';
import { acidFor } from '../water/pool-chemistry';
import type { PoolChemistry } from '../water/pool-chemistry';
import { dosed, quiet } from './museum-4-lab.test-support';

/** Each card's water: its scenario's at the end of its problem phase (the faecal incident's at its start). */
const PROBLEM_END: Record<string, number> = {
  'combined-chlorine': 48 + 96,
  'low-alkalinity': 48 + 48,
  'high-ph': 48 + 48,
  'acid-overdose': 48 + 12,
  'low-hardness': 48 + 24,
  'high-tds': 48 + 24,
  dechlorination: 48 + 13,
  'faecal-incident': 48,
};

describe('Hall 4’s cards are the bench’s scenarios', () => {
  for (const [id, tp] of Object.entries(PROBLEM_END))
    it(`${id}: its pinned water is the scenario’s`, () => {
      const sc = SCENARIOS.find((s) => s.id === id)!;
      const s0 = warmedUp(sc.pool, PLANT);
      const start = { ...s0, plant: { ...s0.plant, ...sc.plant } };
      const run = runBench(
        start,
        sc.pool,
        tp,
        sc.events.filter((e) => e.at < tp - 1e-9),
        60,
      );
      const w = circuitWater(run.final, sc.pool);
      const pinned = SCENARIO_WATERS[id];
      for (const k of Object.keys(w) as (keyof PoolChemistry)[])
        expect(Math.abs(pinned[k] - w[k]), k).toBeLessThan(
          1e-5 * Math.max(1, Math.abs(w[k])),
        );
    }, 60000);
});

const start = (id: CardId): Hall4State => {
  let s = quiet();
  s = actOnHall4(s, { type: 'card', by: CARDS.findIndex((c) => c.id === id) });
  return actOnHall4(s, { type: 'start-card' });
};
const acidTo = (s: Hall4State, ph: number) =>
  dosed(
    s,
    'hcl',
    acidFor(s.bench.pool, ph, VOLUME, TEMPERATURE) / tankById('hcl').perUnit,
  );
const ashTo = (s: Hall4State, ph: number) =>
  dosed(s, 'sodaAsh', alkaliFor(s.bench.pool, ph, VOLUME, TEMPERATURE) / 1000);
const bicarbTo = (s: Hall4State, ta: number) =>
  dosed(
    s,
    'bicarbonate',
    (Math.max(0, ta - s.bench.pool.alkalinity) * 1.68 * VOLUME) / 1000,
  );
const thioTo = (s: Hall4State, fc: number) =>
  dosed(
    s,
    'thiosulphate',
    (5 * Math.max(0, s.bench.pool.freeChlorine - fc) * VOLUME) / 1000,
  );
const hypoTo = (s: Hall4State, fc: number) =>
  dosed(
    s,
    'hypo',
    ((fc - s.bench.pool.freeChlorine) * VOLUME) / tankById('hypo').perUnit,
  );
const hours = (s: Hall4State, h: number) => runHall4(s, h * 3600, 10);
const solved = (s: Hall4State) => {
  const n = hours(s, 2);
  expect(n.solved, JSON.stringify(readWater(n.bench.pool))).toBe(true);
  expect(n.log.some((l) => / PUT RIGHT \d+ h \d+ min$/.test(l))).toBe(true);
};

describe('each card’s treatment, through the station, puts it right', () => {
  it('high pH: acid by hand', () => solved(acidTo(start('high-ph'), 7.3)));
  it('low alkalinity: bicarbonate to 120, then acid', () =>
    solved(acidTo(bicarbTo(start('low-alkalinity'), 120), 7.3)));
  it('acid overdose: soda ash to 7.3, bicarbonate to 110', () =>
    solved(acidTo(bicarbTo(ashTo(start('acid-overdose'), 7.3), 110), 7.3)));
  it('low hardness: calcium chloride to 150, bicarbonate to 100', () => {
    let s = start('low-hardness');
    s = dosed(
      s,
      'calciumChloride',
      ((150 - s.bench.pool.hardness) * VOLUME * 110.98) / 100.087 / 1000,
    );
    solved(acidTo(bicarbTo(s, 100), 7.3));
  });
  it('high TDS: fresh water', () =>
    solved(dosed(start('high-tds'), 'fresh', 300)));
  it('dechlorination: thiosulphate to 2.2, then acid', () =>
    solved(acidTo(hours(thioTo(start('dechlorination'), 2.2), 0.5), 7.3)));
  it('combined chlorine: superchlorinate, wait, thiosulphate, acid', () => {
    let s = dosed(hypoTo(start('combined-chlorine'), 10), 'fresh', 200);
    s = hours(s, 24);
    s = acidTo(hours(thioTo(s, 2), 0.5), 7.3);
    solved(s);
  }, 30000);
  it('faecal incident: 20 mg/l at pH 7.2 for 13.5 h, then thiosulphate and acid', () => {
    let s = acidTo(hypoTo(start('faecal-incident'), 20), 7.2);
    for (let k = 0; k < 7; k++) s = acidTo(hours(s, 2), 7.2);
    s = acidTo(hours(thioTo(s, 2.2), 0.5), 7.3);
    expect(s.ct).toBeGreaterThan(15300);
    solved(s);
  }, 30000);
  it('stabiliser: only a refill takes it out', () => {
    let s = dosed(start('stabiliser'), 'fresh', VOLUME);
    s = acidTo(hypoTo(s, 1.5), 7.3);
    solved(s);
  });
  it('hard water: acid, then fresh water', () => {
    let s = acidTo(start('hard-water'), 7.2);
    s = dosed(s, 'fresh', 400);
    solved(acidTo(s, 7.3));
  });
  it('sulphate: fresh water, and hydrochloric acid for the pH', () =>
    solved(acidTo(dosed(start('sulphate'), 'fresh', 200), 7.3)));
});
