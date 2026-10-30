import { describe, expect, it } from 'vite-plus/test';
import {
  BOILER_KW,
  FITTINGS,
  INSTRUMENTS,
  NOTCHES,
  POOL_KJ_PER_K,
  TAGS,
  TC_DIFFERENTIAL,
  actOnHall1,
  hall1Expansion,
  hall1Readings,
  newHall1,
  poolLosses,
  runHall1,
} from './museum-1-heating';
import type { Hall1Action, Hall1State } from './museum-1-heating';
import { BOILER_EFFICIENCY, GAS_ENERGY } from './heat-loop';
import { RUN_ON_SECONDS } from '../../toolkit/components/plant/logic/boiler-house';
import {
  hallSession,
  runSession,
  setSpeed,
} from '../../toolkit/gallery/logic/museum-time';
import { HALL1_MODEL } from './museum-1-heating';

const act = (s: Hall1State, ...actions: Hall1Action[]) =>
  actions.reduce(actOnHall1, s);

describe('Hall 1’s schematic', () => {
  it('derives every tag from the model, room code M1', () => {
    expect(TAGS['boiler']).toBe('M1-B1');
    expect(TAGS['boiler.gas.iso']).toBe('M1-B1-V1');
    expect(TAGS['boiler.flow.iso']).toBe('M1-B1-V2');
    expect(TAGS['boiler.return.iso']).toBe('M1-B1-V3');
    expect(TAGS['boiler.bypass']).toBe('M1-B1-V4');
    expect(TAGS['gas.ecv']).toBe('M1-GS1-V1');
    expect(TAGS['hx.primary.mv']).toBe('M1-HX1-V1');
    expect(TAGS['poolPump.suction.iso']).toBe('M1-P2-V1');
    expect(TAGS['poolPump.nrv']).toBe('M1-P2-NRV1');
    expect(TAGS['poolPump.discharge.iso']).toBe('M1-P2-V2');
    expect(TAGS['gas.meter']).toBe('M1-FQ1');
    expect(TAGS['hx.primary.heat']).toBe('M1-HM1');
    expect(TAGS['poolDischarge.meter']).toBe('M1-FT1');
    expect(INSTRUMENTS.map((i) => TAGS[i.id].slice(3)).sort()).toEqual([
      'FS1',
      'PI1',
      'PI2',
      'PI3',
      'TC1',
      'TI1',
      'TI2',
      'TI3',
      'TI4',
      'TI5',
    ]);
  });

  it('gives every fitting, so the plumber adds nothing', () => {
    const e = hall1Expansion();
    expect(e.added).toEqual([]);
    const ids = new Set(e.fittings.map((f) => f.id));
    for (const f of FITTINGS) expect(ids.has(f.id), f.id).toBe(true);
  });
});

describe('Hall 1, moving water (Try it 1)', () => {
  it('throttles notch by notch: the flow falls and the discharge pressure rises, to the shut-off head', () => {
    const at = NOTCHES.map((n) => {
      const s = newHall1();
      s.opening['poolPump.discharge.iso'] = n;
      return hall1Readings(s);
    }).reverse();
    expect(at.map((r) => Math.round(r.flow))).toEqual([
      185, 184, 183, 176, 136, 0,
    ]);
    for (let k = 1; k < at.length; k++)
      expect(at[k].dischargeBar).toBeGreaterThan(at[k - 1].dischargeBar);
    const shut = at.at(-1)!;
    // 22 m of shut-off head, about 2.2 bar over the suction.
    expect(shut.dischargeBar - shut.suctionBar).toBeCloseTo(2.16, 2);
    expect(shut.flowSwitch).toBe(false);
  });

  it('trips the pool pump on its own dead-head thermostat, and resets once cool', () => {
    let s = act(newHall1(), {
      type: 'notch',
      id: 'poolPump.discharge.iso',
      by: -5,
    });
    s = runHall1(s, 600);
    expect(s.tripped).toBe(true);
    expect(s.poolPump).toBe(false);
    s = act(s, { type: 'notch', id: 'poolPump.discharge.iso', by: 5 });
    s = runHall1(s, 600);
    s = act(s, { type: 'trip-reset' }, { type: 'pump', run: true });
    expect(s.tripped).toBe(false);
    expect(hall1Readings(s).flow).toBeCloseTo(185, 0);
  });
});

describe('Hall 1, heating the pool (Try it 2, 3)', () => {
  it('starts calling at once, fires, opens the exchanger’s valve and warms the pool', () => {
    let s = runHall1(newHall1(), 120);
    expect(s.calling).toBe(true);
    expect(s.boiler.code).toBe(3);
    expect(s.mv).toBeGreaterThan(0.99);
    s = runHall1(s, 3600);
    const r = hall1Readings(s);
    // The gas is the burner's heat over its efficiency and the gas's energy.
    expect(r.gasFlow).toBeCloseTo(r.output / BOILER_EFFICIENCY / GAS_ENERGY, 9);
    expect(r.output).toBeGreaterThan(0.8 * BOILER_KW);
    expect(r.output).toBeLessThanOrEqual(BOILER_KW);
    // The boiler's water about 20 K cooler back; the pool's under a degree warmer.
    expect(
      r.temps['boilerFlow.ti'] - r.temps['boilerReturn.ti'],
    ).toBeGreaterThan(15);
    expect(r.temps['boilerFlow.ti'] - r.temps['boilerReturn.ti']).toBeLessThan(
      22,
    );
    expect(r.temps['hxOut.ti'] - r.temps['hxIn.ti']).toBeLessThan(1);
    expect(r.temps['hxOut.ti'] - r.temps['hxIn.ti']).toBeGreaterThan(0.4);
    // About a fifth to a quarter of a degree an hour.
    expect(s.poolC - 27).toBeGreaterThan(0.18);
    expect(s.poolC - 27).toBeLessThan(0.3);
  });

  it('stops heating when the pool pump stops: the flow switch opens, the valve shuts, the boiler runs on and stops', () => {
    let s = runHall1(newHall1(), 120);
    s = act(s, { type: 'pump', run: false });
    s = runHall1(s, 1);
    expect(hall1Readings(s).flowSwitch).toBe(false);
    expect(s.boiler.code).toBe(7);
    s = runHall1(s, RUN_ON_SECONDS);
    expect(s.boiler.code).toBe(0);
    s = runHall1(s, 35);
    expect(s.mv).toBe(0);
  });

  it('closes its heat balance: what went in is what was lost and what the pool stored', () => {
    const start = newHall1();
    const s = runHall1(start, 7200);
    const stored = ((s.poolC - start.poolC) * POOL_KJ_PER_K) / 3600;
    expect(Math.abs(s.heatKWh - s.lostKWh - stored)).toBeLessThan(
      0.001 * s.heatKWh,
    );
  });
});

describe('Hall 1, the thermostat’s two modes', () => {
  it('ON-OFF: stops at its setting, calls again a differential below it', () => {
    let s = act(newHall1(), { type: 'mode', mode: 'on-off' });
    s = { ...s, poolC: 28.01 };
    s = runHall1(s, 0.5);
    expect(s.calling).toBe(false);
    s = runHall1({ ...s, poolC: 28 - TC_DIFFERENTIAL / 2 }, 0.5);
    expect(s.calling).toBe(false);
    s = runHall1({ ...s, poolC: 28 - TC_DIFFERENTIAL }, 0.5);
    expect(s.calling).toBe(true);
  });

  it('MODULATING: holds the burner back near its setting', () => {
    let s = { ...newHall1(), poolC: 27.97 };
    s = runHall1(s, 300);
    expect(s.boiler.rate).toBeLessThanOrEqual(0.3 + 1e-9);
  });

  it('works its dial from 20 to 35 °C only', () => {
    expect(act(newHall1(), { type: 'tc-set', celsius: 50 }).tcSet).toBe(35);
    expect(act(newHall1(), { type: 'tc-set', celsius: 4 }).tcSet).toBe(20);
  });
});

describe('Hall 1, where the heat goes (Try it 4)', () => {
  it('loses heat at 28 °C, calm and uncovered, as the models say', () => {
    const l = poolLosses({ ...newHall1(), poolC: 28 });
    expect(l.evaporation).toBeCloseTo(21.27, 2);
    expect(l.kgPerHour).toBeCloseTo(31.25, 2);
    expect(l.convection).toBeCloseTo(-1.25, 9);
    expect(l.ground).toBeCloseTo(3.375, 9);
  });

  it('doubles its evaporation with busy swimmers', () => {
    const calm = poolLosses(newHall1()).evaporation;
    const busy = poolLosses(
      act(newHall1(), { type: 'swimmers', swimmers: 'busy' }),
    );
    expect(busy.evaporation).toBeCloseTo(2 * calm, 9);
  });
});

describe('Hall 1, the boiler’s protections (Try it 5)', () => {
  it('locks out on flame loss when its gas cock is shut, and fires again after a RESET at the boiler', () => {
    let s = runHall1(newHall1(), 120);
    s = act(s, { type: 'valve', id: 'boiler.gas.iso', open: false });
    s = runHall1(s, 120);
    expect(s.boiler.lockout).not.toBeNull();
    expect(hall1Readings(s).output).toBe(0);
    s = act(
      s,
      { type: 'valve', id: 'boiler.gas.iso', open: true },
      { type: 'boiler', key: 'reset' },
    );
    s = runHall1(s, 11);
    expect(s.boiler.code).toBe(3);
  });

  it('locks out on overheat when its water cannot get away', () => {
    let s = runHall1(newHall1(), 120);
    s = act(s, { type: 'valve', id: 'boiler.flow.iso', open: false });
    s = runHall1(s, 1200);
    expect(s.boiler.lockout).toBe('overheat');
  });

  it('switches off and on at its rocker', () => {
    let s = act(runHall1(newHall1(), 120), { type: 'boiler', key: 'power' });
    s = runHall1(s, 1);
    expect(hall1Readings(s).output).toBe(0);
  });
});

describe('Hall 1, the gas being burnt (Try it 6)', () => {
  it('shows the gas burnt now: its flow and its heat input, live', () => {
    const s = runHall1(newHall1(), 600);
    const r = hall1Readings(s);
    expect(r.gasKW).toBeCloseTo(r.gasFlow * GAS_ENERGY, 9);
    expect(r.gasKW).toBeCloseTo(r.output / BOILER_EFFICIENCY, 9);
    const off = runHall1(act(s, { type: 'boiler', key: 'power' }), 1);
    expect(hall1Readings(off).gasKW).toBe(0);
  });
});

describe('Hall 1, reset (Try it 7, and rule 1)', () => {
  it('is the same after RESET as after walking in, the clock at now', () => {
    const now = 14 * 3600 + 5;
    let session = hallSession(HALL1_MODEL, now);
    session = { ...session, clock: setSpeed(session.clock, 3600) };
    session = {
      ...session,
      state: act(
        session.state,
        { type: 'pump', run: false },
        { type: 'tc-set', celsius: 33 },
      ),
    };
    session = runSession(HALL1_MODEL, session, 2);
    const reset = act(session.state, { type: 'reset' });
    const walkedIn = hallSession(HALL1_MODEL, now);
    expect(reset).toEqual(walkedIn.state);
    expect(walkedIn.clock).toEqual({ start: now, seconds: 0, speed: 1 });
    const s = walkedIn.state;
    expect(s.poolC).toBe(27);
    expect(s.tcSet).toBe(28);
    expect(s.mode).toBe('modulating');
    expect(s.boiler.on).toBe(true);
    expect(s.poolPump).toBe(true);
    expect(s.swimmers).toBe('few');
    expect(s.heatKWh + s.gasM3).toBe(0);
  });
});
