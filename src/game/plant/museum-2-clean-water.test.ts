import { describe, expect, it } from 'vite-plus/test';
import {
  FITTINGS,
  INSTRUMENTS,
  LINKS,
  NODES,
  OZONE,
  PLANT,
  TAGS,
  VALVES,
  actOnHall2,
  backwashLineUp,
  deadheadTiming,
  filterSettings,
  gaugeReading,
  hall2Expansion,
  hall2Readings,
  newHall2,
  runHall2,
  solveHall2,
  stepHall2,
} from './museum-2-clean-water';
import type { Hall2State, ValveId } from './museum-2-clean-water';
import { DEADHEAD } from './pump-deadhead';
import { POOL_OZONE_LIMIT } from './ozone';

const set = (s: Hall2State, id: ValveId, opening: number) =>
  actOnHall2(s, { type: 'valve', id, opening });

/** Run until `until` holds, a second at a time, up to `most` seconds; how long it took. */
function runUntil(
  s: Hall2State,
  until: (s: Hall2State) => boolean,
  most: number,
) {
  let state = s;
  for (let t = 1; t <= most; t++) {
    state = runHall2(state, 1);
    if (until(state)) return { state, seconds: t };
  }
  return { state, seconds: Infinity };
}

describe('Hall 2’s schematic', () => {
  it('gives every valve and meter itself: the plumber adds nothing', () => {
    const e = hall2Expansion();
    expect(e.added).toEqual([]);
    expect(new Set(e.fittings.map((f) => f.id))).toEqual(
      new Set(FITTINGS.map((f) => f.id)),
    );
  });

  it('joins only machines it has, and every machine is joined', () => {
    const ids = new Set(NODES.map((n) => n.id));
    for (const l of LINKS) {
      expect(ids.has(l.sourceId as never)).toBe(true);
      expect(ids.has(l.targetId as never)).toBe(true);
    }
    for (const n of NODES)
      expect(
        LINKS.some((l) => l.sourceId === n.id || l.targetId === n.id),
      ).toBe(true);
  });

  it('has no heating at all: no exchanger, no heat source, no heat meter', () => {
    const kinds = NODES.map((n) => n.kind);
    expect(kinds).not.toContain('plate-heat-exchanger');
    expect(kinds).not.toContain('ideal-heat-source');
    expect(FITTINGS.some((f) => f.role?.includes('heat'))).toBe(false);
  });

  it('derives every tag with the hall’s code, M2', () => {
    expect(TAGS['pump.suction.iso']).toBe('M2-P1-V1');
    expect(TAGS['pump.discharge.nrv']).toBe('M2-P1-NRV1');
    expect(
      [
        'filter.inlet.iso',
        'filter.outlet.iso',
        'filter.backwash-in.iso',
        'filter.backwash-out.iso',
        'filter.rinse.iso',
      ].map((v) => TAGS[v]),
    ).toEqual(['M2-F1-V1', 'M2-F1-V2', 'M2-F1-V3', 'M2-F1-V4', 'M2-F1-V5']);
    expect(TAGS['returnMain.meter']).toBe('M2-FT1');
    expect(TAGS['filter.pdi']).toBe('M2-PDI1');
    expect(TAGS['toCarbon.ai']).toBe('M2-AI1');
    expect(TAGS['generator']).toBe('M2-OZ1');
    expect(TAGS['uv']).toBe('M2-UV1');
    for (const id of [
      ...FITTINGS.map((f) => f.id),
      ...INSTRUMENTS.map((i) => i.id),
    ])
      expect(TAGS[id]).toMatch(/^M2-/);
    expect(new Set(Object.values(TAGS)).size).toBe(Object.values(TAGS).length);
  });

  it('runs left to right: make-up and tank first, the pool last', () => {
    expect(NODES[0].id).toBe('mains');
    expect(NODES[NODES.length - 1].id).toBe('pool');
    const order = NODES.map((n) => n.id);
    const at = (id: string) => order.indexOf(id as never);
    expect(at('tank')).toBeLessThan(at('pump'));
    expect(at('pump')).toBeLessThan(at('filter'));
    expect(at('filter')).toBeLessThan(at('injector'));
    expect(at('injector')).toBeLessThan(at('contact'));
    expect(at('contact')).toBeLessThan(at('carbon'));
    expect(at('carbon')).toBeLessThan(at('uv'));
  });
});

describe('Hall 2 at its normal duty', () => {
  const s = newHall2();
  const r = hall2Readings(s);

  it('circulates about 184 m³/h, a 2.6 h turnover, PI2 2.02 bar, PDI1 0.42 bar', () => {
    expect(r.flows.converged).toBe(true);
    expect(r.flows.toPool).toBeCloseTo(183.5, 0);
    expect(r.turnover).toBeCloseTo(2.56, 1);
    expect(gaugeReading(s, r.flows, 'pump.discharge.pi')).toBeCloseTo(2.02, 2);
    expect(r.flows.gauge['filter.pdi']).toBeCloseTo(0.42, 2);
    expect(r.flows.backwash).toBe(0);
  });

  it('ozonises at about 1 g/m³ with two minutes’ contact, and the carbon takes it out', () => {
    expect(r.ozone.running).toBe(true);
    expect(r.ozone.ozone).toBeCloseTo(192, 0);
    expect(r.ozone.applied).toBeCloseTo(1.05, 2);
    expect(r.ozone.contact).toBeGreaterThan(120);
    expect(r.ozone.contactResidual).toBeCloseTo(0.8, 1);
    expect(r.ozone.carbonResidual).toBeLessThan(POOL_OZONE_LIMIT / 10);
    expect(r.ozone.vacuum).toBeLessThan(OZONE.generator.minVacuum);
    expect(r.ozone.roomPpm).toBe(0);
  });

  it('lights the UV lamp while the water flows, counting its hours', () => {
    expect(r.uvLit).toBe(true);
    expect(r.uvIntensity).toBe(PLANT.uvFull);
    const later = runHall2(s, 3600);
    expect(later.uvHours).toBeCloseTo(PLANT.uvHoursStart + 1, 3);
  });

  it('keeps the pool at a constant 27 °C', () => {
    expect(PLANT.poolC).toBe(27);
  });

  it('states the filter’s settings from the model', () => {
    const f = filterSettings();
    expect(f.area).toBeCloseTo(6.16, 2);
    expect(f.velocity).toBeCloseTo(29.8, 1);
    expect(f.dueBar).toBeCloseTo(0.82, 2);
    expect(f.backwashFlow).toBeCloseTo(196, 0);
    expect(f.backwashVelocity).toBeCloseTo(31.9, 1);
    expect(f.toWaste).toBeCloseTo(16.3, 1);
  });
});

describe('the visitor’s tries', () => {
  it('throttles the filter outlet notch by notch', () => {
    let s = newHall2();
    const flows: number[] = [];
    for (let k = 0; k < 5; k++) {
      s = actOnHall2(s, { type: 'notch', id: 'filter.outlet.iso', by: -1 });
      flows.push(solveHall2(s).toPool);
    }
    for (let k = 1; k < flows.length; k++)
      expect(flows[k]).toBeLessThan(flows[k - 1] + 1e-9);
    expect(flows[flows.length - 1]).toBe(0);
    const shut = solveHall2(s);
    expect(shut.gauge['pump.discharge.pi']).toBeCloseTo(2.21, 1);
  });

  it('dead-headed, the pump trips in 50 to 70 s and resets 25 to 40 s later, not before', () => {
    const timing = deadheadTiming();
    expect(timing.trip).toBeGreaterThanOrEqual(50);
    expect(timing.trip).toBeLessThanOrEqual(70);
    const shut = set(newHall2(), 'filter.outlet.iso', 0);
    const trip = runUntil(shut, (s) => s.tripped, 200);
    expect(trip.seconds).toBeGreaterThanOrEqual(50);
    expect(trip.seconds).toBeLessThanOrEqual(70);
    expect(trip.state.pumpRunning).toBe(false);
    expect(
      actOnHall2(trip.state, { type: 'pump', run: true }).pumpRunning,
    ).toBe(false);
    expect(actOnHall2(trip.state, { type: 'trip-reset' }).tripped).toBe(true);
    const cool = runUntil(trip.state, (s) => s.casingC < DEADHEAD.resetC, 200);
    expect(cool.seconds).toBeGreaterThanOrEqual(25);
    expect(cool.seconds).toBeLessThanOrEqual(40);
    const reset = actOnHall2(cool.state, { type: 'trip-reset' });
    expect(reset.tripped).toBe(false);
    expect(actOnHall2(reset, { type: 'pump', run: true }).pumpRunning).toBe(
      true,
    );
  });

  it('holds the ozone off while nothing flows, and lets it go again by itself', () => {
    const shut = set(newHall2(), 'filter.outlet.iso', 0);
    const r = hall2Readings(runHall2(shut, 5));
    expect(r.ozone.running).toBe(false);
    expect(r.ozone.status).toBe('blocked: no flow');
    expect(r.uvLit).toBe(false);
    const open = set(runHall2(shut, 5), 'filter.outlet.iso', 1);
    expect(hall2Readings(runHall2(open, 1)).ozone.running).toBe(true);
  });

  it('fouls the bed over a day: PDI1 rises toward the backwash point, the flow falls', () => {
    const day = runHall2(newHall2(), 24 * 3600);
    const f = solveHall2(day);
    expect(f.gauge['filter.pdi']).toBeGreaterThan(0.7);
    expect(f.toPool).toBeLessThan(170);
  });

  it('backwashes: the bed lifts, the waste clears, the tank is topped up by the make-up', () => {
    const dirty = runHall2(newHall2(), 24 * 3600);
    const stopped = actOnHall2(dirty, { type: 'pump', run: false });
    let s = actOnHall2(backwashLineUp(stopped), { type: 'pump', run: true });
    const f = solveHall2(s);
    expect(f.lifted).toBe(true);
    expect(f.backwash).toBeCloseTo(196, -1);
    s = runHall2(s, 12);
    expect(s.wasteDirt).toBeGreaterThan(500);
    s = runHall2(s, PLANT.backwashSeconds - 12);
    expect(s.wasteDirt).toBeLessThan(50);
    expect(s.tankWater).toBeLessThan(PLANT.tankVolume);
    expect(s.tankWater).toBeGreaterThan(PLANT.tankLow);
    expect(hall2Readings(s).makeup).toBeGreaterThan(0);
    // Back in service: a clean bed, the tank refilling.
    const service = actOnHall2(
      {
        ...s,
        opening: {
          ...s.opening,
          'filter.backwash-in.iso': 0,
          'filter.backwash-out.iso': 0,
          'filter.inlet.iso': 1,
          'filter.outlet.iso': 1,
        },
      },
      { type: 'pump', run: true },
    );
    const back = solveHall2(service);
    expect(back.gauge['filter.pdi']).toBeCloseTo(0.42, 1);
    expect(runHall2(service, 3600).tankWater).toBe(PLANT.tankVolume);
  });

  it('with the make-up shut, a long backwash drains the tank and its low level stops the pump', () => {
    let s = set(newHall2(), 'tank.makeup.iso', 0);
    s = actOnHall2(backwashLineUp(s), { type: 'pump', run: true });
    const low = runUntil(s, (x) => x.lowLevel, 3600);
    expect(low.seconds).toBeLessThan(3600);
    expect(low.state.pumpRunning).toBe(false);
    expect(actOnHall2(low.state, { type: 'pump', run: true }).pumpRunning).toBe(
      false,
    );
  });

  it('a slammed valve kicks PI2, dying away in under a second', () => {
    const s = set(newHall2(), 'filter.outlet.iso', 0);
    const kick = gaugeReading(s, solveHall2(s), 'pump.discharge.pi');
    expect(kick).toBeGreaterThan(2.3);
    const later = stepHall2(s, solveHall2(s), 1);
    expect(later.surge).toBeLessThan(s.surge * 0.1);
  });

  it('with the destructor off, off-gas reaches the hall, the monitor stops the generator; both reset once it clears', () => {
    const off = actOnHall2(newHall2(), { type: 'destructor', on: false });
    const alarm = runUntil(off, (s) => s.monitor.alarm, 3600);
    expect(alarm.seconds).toBeLessThan(1800);
    let s = runHall2(alarm.state, 1);
    let r = hall2Readings(s);
    expect(r.ozone.running).toBe(false);
    expect(r.ozone.status).toBe('tripped: ozone in room');
    s = actOnHall2(s, { type: 'destructor', on: true });
    expect(actOnHall2(s, { type: 'monitor-reset' }).monitor.alarm).toBe(true);
    s = runUntil(
      s,
      (x) => x.monitor.conc / 2 < OZONE.monitor.warning,
      7200,
    ).state;
    s = actOnHall2(s, { type: 'monitor-reset' });
    expect(s.monitor.alarm).toBe(false);
    expect(hall2Readings(runHall2(s, 1)).ozone.running).toBe(false);
    s = actOnHall2(s, { type: 'generator-reset' });
    r = hall2Readings(runHall2(s, 1));
    expect(r.ozone.running).toBe(true);
  });

  it('the booster stopped, the venturi loses its vacuum and the generator trips', () => {
    let s = actOnHall2(newHall2(), { type: 'booster', run: false });
    s = runHall2(s, 1);
    expect(hall2Readings(s).ozone.status).toBe('tripped: vacuum');
    s = actOnHall2(s, { type: 'booster', run: true });
    s = actOnHall2(s, { type: 'generator-reset' });
    expect(hall2Readings(runHall2(s, 1)).ozone.running).toBe(true);
  });

  it('the output knob sets the dose', () => {
    const half = actOnHall2(newHall2(), { type: 'setpoint', percent: 40 });
    expect(hall2Readings(half).ozone.ozone).toBeCloseTo(96, 0);
  });

  it('the UV lamp goes out with its switch, and warms up again', () => {
    let s = runHall2(actOnHall2(newHall2(), { type: 'uv', on: false }), 5);
    expect(hall2Readings(s).uvLit).toBe(false);
    expect(hall2Readings(s).uvIntensity).toBe(0);
    s = runHall2(actOnHall2(s, { type: 'uv', on: true }), 10);
    const warming = hall2Readings(s).uvIntensity;
    expect(warming).toBeGreaterThan(0);
    expect(warming).toBeLessThan(PLANT.uvFull);
    expect(hall2Readings(runHall2(s, 300)).uvIntensity).toBeCloseTo(
      PLANT.uvFull,
      0,
    );
  });

  it('RESET puts everything back, at the visitor’s time', () => {
    let s = runHall2(set(newHall2(), 'filter.outlet.iso', 0), 120);
    s = actOnHall2(s, { type: 'reset', clock: 15 * 3600 });
    expect(s.clockStart).toBe(15 * 3600);
    expect(s.pumpRunning).toBe(true);
    expect(s.tripped).toBe(false);
    for (const v of VALVES) expect(s.opening[v]).toBe(newHall2().opening[v]);
    expect(solveHall2(s).toPool).toBeCloseTo(183.5, 0);
  });
});
