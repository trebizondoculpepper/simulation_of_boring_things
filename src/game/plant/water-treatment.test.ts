import { describe, expect, it } from 'vite-plus/test';
import {
  CHEMISTRY_TICK,
  CONTROLLER,
  DOSING_PUMPS,
  allPumpRates,
  farSide,
  newWaterTreatment,
  poolReadings,
  pumpDraw,
  pumpRates,
  stepControl,
  stepWaterTreatment,
} from './water-treatment';
import type { StepFlows, WaterTreatment } from './water-treatment';
import { POOL_IDS, POOL_TARGET, newPools } from './pools';
import type { PoolId } from './pools';
import type { Chemical } from './chemicals';

const ALL: Record<Chemical, number> = { hypochlorite: 1, acid: 1 };

/**
 * The pools' treatment alone, `hours` on in world steps of `dt` s: each
 * pool circulating at its design flow (unless `still`), its UV lit (unless
 * `dark`), `bathers` in its water, dosing allowed (unless `dry`).
 */
function run(
  hours: number,
  dt = 1,
  o: {
    bathers?: Partial<Record<PoolId, number>>;
    still?: PoolId[];
    dark?: PoolId[];
    dry?: Partial<Record<PoolId, Chemical[]>>;
    start?: WaterTreatment;
  } = {},
) {
  const pools = newPools();
  let t = o.start ?? newWaterTreatment(pools);
  let drawn = { hypochlorite: 0, acid: 0 };
  let full = 0;
  const steps = Math.round((hours * 3600) / dt);
  for (let n = 0; n < steps; n++) {
    const allowed = Object.fromEntries(
      POOL_IDS.map((id) => [
        id,
        o.still?.includes(id)
          ? undefined
          : {
              hypochlorite: o.dry?.[id]?.includes('hypochlorite') ? 0 : 1,
              acid: o.dry?.[id]?.includes('acid') ? 0 : 1,
            },
      ]),
    ) as Partial<Record<PoolId, Record<Chemical, number>>>;
    const pumps = allPumpRates(t, allowed);
    const draw = pumpDraw(pumps);
    drawn = {
      hypochlorite: drawn.hypochlorite + (draw.pool_01?.hypochlorite ?? 0) * dt,
      acid: drawn.acid + (draw.pool_01?.acid ?? 0) * dt,
    };
    if (pumps.pool_02.hypochlorite >= DOSING_PUMPS.pool_02.hypochlorite)
      full += dt;
    const flows = Object.fromEntries(
      POOL_IDS.map((id) => [
        id,
        {
          flow: o.still?.includes(id) ? 0 : POOL_TARGET[id].flow,
          treated: !o.dark?.includes(id),
          madeUp: 0,
          evaporated: 0,
          bathers: o.bathers?.[id] ?? 0,
          pumps: pumps[id],
        } satisfies StepFlows,
      ]),
    ) as Record<PoolId, StepFlows>;
    t = stepWaterTreatment(t, flows, dt, pools);
  }
  const read = (id: PoolId) =>
    poolReadings(t.circuits[id], pools[id].temperature);
  return { t, read, drawn, full };
}

describe('the pools’ water treatment (mission 101)', () => {
  it('starts each pool at its readings', () => {
    const pools = newPools();
    const t = newWaterTreatment(pools);
    for (const id of POOL_IDS) {
      const r = poolReadings(t.circuits[id], pools[id].temperature);
      expect(r.freeChlorine, id).toBeCloseTo(pools[id].freeChlorine, 9);
      expect(r.ph, id).toBeCloseTo(pools[id].ph, 6);
      expect(r.combinedChlorine, id).toBeCloseTo(pools[id].combinedChlorine, 9);
    }
  });

  it('holds the lounge at its setpoints through a busy afternoon', () => {
    const { read, t } = run(8, 10, { bathers: { pool_01: 40 } });
    const r = read('pool_01');
    expect(r.freeChlorine).toBeGreaterThan(CONTROLLER.chlorineSet - 0.1);
    expect(r.freeChlorine).toBeLessThan(CONTROLLER.chlorineSet + 0.5);
    expect(r.ph).toBeGreaterThan(7.2);
    expect(r.ph).toBeLessThan(7.4);
    // The pool's far side runs above the sample (the tank), dosed into the return.
    expect(r.freeChlorine).toBeGreaterThan(
      t.circuits.pool_01.tank.freeChlorine,
    );
  });

  it('draws the day tanks by the litres its pumps give', () => {
    const { t, drawn } = run(1, 1, { bathers: { pool_01: 40 } });
    expect(drawn.hypochlorite).toBeGreaterThan(0);
    // No more than its pump's most an hour.
    expect(drawn.hypochlorite).toBeLessThanOrEqual(
      DOSING_PUMPS.pool_01.hypochlorite + 1e-9,
    );
    const r = pumpRates(t.circuits.pool_01.control, 'pool_01', ALL);
    expect(r.hypochlorite).toBeLessThanOrEqual(
      DOSING_PUMPS.pool_01.hypochlorite,
    );
  });

  it('doses nothing without circulation (the flow interlock), and the chlorine falls', () => {
    const { t, read } = run(4, 10, {
      bathers: { pool_01: 40 },
      still: ['pool_01'],
    });
    expect(pumpRates(t.circuits.pool_01.control, 'pool_01', undefined)).toEqual(
      {
        hypochlorite: 0,
        acid: 0,
      },
    );
    expect(t.circuits.pool_01.control.hypochlorite).toBe(0);
    expect(read('pool_01').freeChlorine).toBeLessThan(1);
  });

  it('doses nothing from a day tank shut off, and the chlorine falls', () => {
    const { read } = run(6, 10, {
      bathers: { pool_01: 40 },
      dry: { pool_01: ['hypochlorite'] },
    });
    expect(read('pool_01').freeChlorine).toBeLessThan(1);
  });

  it('stops chlorine dosing with pH out of its range (the pH lockout), holding its integral', () => {
    const c = newWaterTreatment(newPools()).circuits.pool_01;
    const low = { ...c.tank, freeChlorine: 0.5 };
    // Its cell already at the sample's water: a long step lets it follow.
    const ok = stepControl(c.control, { ...low, ph: 7.3 }, true, 600);
    expect(ok.lockout).toBe(false);
    expect(ok.hypochlorite).toBeGreaterThan(0);
    for (const ph of [8, 6.8]) {
      const s = stepControl(c.control, { ...low, ph }, true, 600);
      expect(s.lockout, `pH ${ph}`).toBe(true);
      expect(s.hypochlorite, `pH ${ph}`).toBe(0);
      expect(s.integral, `pH ${ph}`).toBe(c.control.integral);
    }
    // No circulation: nothing dosed, the cell's water standing.
    const still = stepControl(c.control, { ...low, ph: 7.3 }, false, 600);
    expect(still.hypochlorite).toBe(0);
    expect(still.acid).toBe(0);
    expect(still.cell).toEqual(c.control.cell);
  });

  it('lets the chloramines build without UV, against with it', () => {
    const lit = run(6, 10, { bathers: { pool_02: 120 } }).read('pool_02');
    const dark = run(6, 10, {
      bathers: { pool_02: 120 },
      dark: ['pool_02'],
    }).read('pool_02');
    expect(dark.combinedChlorine).toBeGreaterThan(lit.combinedChlorine);
  });

  it('pins the Olympic’s undersized pump at full on a busy day, its chlorine sagging (the owner, 2026-10-28)', () => {
    const { read, full } = run(8, 10, { bathers: { pool_02: 150 } });
    expect(full / 3600).toBeGreaterThan(6);
    expect(read('pool_02').freeChlorine).toBeLessThan(1);
  });

  it('steps its chemistry on its own clock, whatever the world’s step', () => {
    expect(CHEMISTRY_TICK).toBe(10);
    const at = (dt: number) =>
      run(6, dt, { bathers: { pool_01: 40, pool_03: 4, pool_04: 2 } });
    const a = at(0.1 * 10);
    for (const dt of [10, 60]) {
      const b = at(dt);
      for (const id of POOL_IDS) {
        const x = farSide(a.t.circuits[id]);
        const y = farSide(b.t.circuits[id]);
        expect(
          Math.abs(x.freeChlorine - y.freeChlorine),
          `${id} at ${dt} s`,
        ).toBeLessThan(0.1);
        expect(Math.abs(x.ph - y.ph), `${id} at ${dt} s`).toBeLessThan(0.02);
      }
    }
  });
});
