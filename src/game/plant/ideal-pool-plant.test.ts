import { describe, expect, it } from 'vite-plus/test';
import {
  FITTINGS,
  INSTRUMENTS,
  LINKS,
  NODES,
  NOTCHES,
  PLANT,
  TAGS,
  VALVES,
  actOnPlant,
  FILTER_SPEC,
  capacity,
  gaugeReading,
  clockText,
  plantClock,
  idealPlantExpansion,
  newIdealPlant,
  normalOpening,
  plantReadings,
  solvePlant,
  solveWithDeadEnds,
  stepIdealPlant,
  turnoverHours,
} from './ideal-pool-plant';
import type { IdealPlantState, ValveId } from './ideal-pool-plant';
import { filterSizing } from './ideal-filter';

const set = (s: IdealPlantState, id: ValveId, opening: number) =>
  actOnPlant(s, { type: 'valve', id, opening });

/** Run the plant `seconds` at its own speed, its network solved as it stands. */
const run = (s: IdealPlantState, seconds: number) => {
  const flows = solvePlant(s);
  let state = s;
  for (let t = 0; t < seconds; t++) state = stepIdealPlant(state, flows, 1);
  return state;
};

describe('the schematic', () => {
  it('gives every valve and meter itself: the plumber adds nothing', () => {
    const e = idealPlantExpansion();
    expect(e.added).toEqual([]);
    expect(new Set(e.fittings.map((f) => f.id))).toEqual(
      new Set(FITTINGS.map((f) => f.id)),
    );
  });

  it('sets each line’s fittings in order from its source', () => {
    const e = idealPlantExpansion();
    expect(e.along.get('discharge')!.map((f) => f.id)).toEqual([
      'pump.discharge.nrv',
      'pump.discharge.iso',
    ]);
    expect(e.along.get('toInlet')!.map((f) => f.id)).toEqual([
      'filter.inlet.iso',
    ]);
    expect(e.along.get('filtered')!.map((f) => f.id)).toEqual([
      'filter.outlet.iso',
      'filter.outlet.meter',
    ]);
  });

  it('derives every tag, unique, from the room, the machine and the kind', () => {
    const ids = [
      ...NODES.map((n) => n.id),
      ...FITTINGS.map((f) => f.id),
      ...INSTRUMENTS.map((i) => i.id),
    ];
    const tags = ids.map((id) => TAGS[id]);
    expect(tags.every(Boolean)).toBe(true);
    expect(new Set(tags).size).toBe(tags.length);
    expect(TAGS.pump).toBe('IPP-P1');
    expect(TAGS['pump.suction.iso']).toBe('IPP-P1-V1');
    expect(TAGS['pump.discharge.nrv']).toBe('IPP-P1-NRV1');
    expect(TAGS['filter.outlet.meter']).toBe('IPP-FT1');
    expect(TAGS['pump.suction.pi']).toBe('IPP-PI1');
  });

  it('joins every link to machines in the schematic', () => {
    const ids = new Set(NODES.map((n) => n.id));
    for (const l of LINKS) {
      expect(ids.has(l.sourceId as never), l.id).toBe(true);
      expect(ids.has(l.targetId as never), l.id).toBe(true);
    }
  });

  it('starts with every valve at its normal position: the heating off', () => {
    const s = newIdealPlant();
    for (const v of VALVES) expect(s.opening[v]).toBe(normalOpening(v));
    expect(s.opening['heat.out-1.valve']).toBe(0);
    expect(s.pumpRunning).toBe(true);
  });
});

describe('the water, at the normal duty', () => {
  const f = solvePlant(newIdealPlant());
  it('circulates about 180 m³/h, turning the pool over about every three hours', () => {
    expect(f.converged).toBe(true);
    expect(f.circulation).toBeGreaterThan(160);
    expect(f.circulation).toBeLessThan(200);
    expect(turnoverHours(f.circulation)).toBeGreaterThan(2.3);
    expect(turnoverHours(f.circulation)).toBeLessThan(3);
  });

  it('balances at the split: the bypass and the exchanger make the circulation', () => {
    expect(f.bypass + f.hxSecondary).toBeCloseTo(f.circulation, 3);
    expect(f.hxSecondary).toBeGreaterThan(20);
    expect(f.bypass).toBeGreaterThan(f.hxSecondary);
  });

  it('runs the pump on its curve, its gauges reading as a real one would', () => {
    const head = PLANT.pumpShutoff - PLANT.pumpK * f.circulation ** 2;
    expect(f.pumpHead).toBeCloseTo(head, 2);
    expect(f.gauge['pump.discharge.pi']).toBeGreaterThan(1.8);
    expect(f.gauge['pump.discharge.pi']).toBeLessThan(2.3);
    // A flooded suction: about atmospheric, a little over.
    expect(Math.abs(f.gauge['pump.suction.pi'])).toBeLessThan(0.1);
    expect(f.gauge['filter.pdi']).toBeCloseTo(
      f.gauge['filter.inlet.pi'] - f.gauge['filter.outlet.pi'],
      6,
    );
    expect(f.gauge['filter.pdi']).toBeGreaterThan(0.25);
  });
});

describe('the "Try this" steps', () => {
  const normal = newIdealPlant();
  const before = solvePlant(normal);

  it('shutting the filter outlet stops the flow and raises the discharge pressure to the pump’s shut-off', () => {
    const half = solvePlant(set(normal, 'filter.outlet.iso', 0.4));
    expect(half.circulation).toBeLessThan(before.circulation);
    expect(half.gauge['pump.discharge.pi']).toBeGreaterThan(
      before.gauge['pump.discharge.pi'],
    );
    const shut = solvePlant(set(normal, 'filter.outlet.iso', 0));
    expect(shut.converged).toBe(true);
    expect(shut.circulation).toBe(0);
    expect(shut.meter['filter.outlet.meter']).toBe(0);
    // Dead-headed: the tank's head and the pump's whole shut-off head.
    expect(shut.gauge['pump.discharge.pi']).toBeCloseTo(
      (PLANT.tankHead + PLANT.pumpShutoff - PLANT.pumpAxis) * 0.0981,
      2,
    );
    expect(shut.gauge['filter.pdi']).toBeCloseTo(0, 6);
  });

  it('stopping the pump takes every flow to nothing, the non-return valve holding the pool back', () => {
    const f = solvePlant(actOnPlant(normal, { type: 'pump', run: false }));
    expect(f.converged).toBe(true);
    expect(f.circulation).toBe(0);
    expect(f.bypass).toBe(0);
    expect(f.hxSecondary).toBe(0);
    // Behind the non-return valve the pool's head stands; before it, the tank's.
    expect(f.gauge['filter.inlet.pi']).toBeCloseTo(
      (PLANT.poolHead - PLANT.filterGauges) * 0.0981,
      3,
    );
    expect(f.gauge['pump.discharge.pi']).toBeCloseTo(
      (PLANT.tankHead - PLANT.pumpAxis) * 0.0981,
      3,
    );
  });

  it('throttling the bypass sends more through the exchanger and less round the loop', () => {
    const f = solvePlant(set(normal, 'bypass.valve', 0.2));
    expect(f.hxSecondary).toBeGreaterThan(2 * before.hxSecondary);
    expect(f.bypass).toBeLessThan(before.bypass);
    expect(f.circulation).toBeLessThan(before.circulation);
  });

  it('turning the heating on warms the return; throttling its primary cools it again', () => {
    const on = run(set(normal, 'heat.out-1.valve', 1), 120);
    const r = plantReadings(on, solvePlant(on));
    expect(r.flows.primary).toBeGreaterThan(2.5);
    expect(r.duty).toBeGreaterThan(150);
    const from = on.thermometer['suction.ti'];
    expect(on.thermometer['returnMain.ti']).toBeGreaterThan(from + 0.5);
    expect(on.thermometer['hxOut.ti']).toBeGreaterThan(from + 3);
    // The energy balances: what the primary gives, the pool water takes.
    expect(capacity(r.flows.primary) * (80 - on.hxPrimaryOut)).toBeCloseTo(
      capacity(r.flows.hxSecondary) * (on.hxSecondaryOut - on.tankC),
      0,
    );
    const throttled = run(set(on, 'heat.out-1.valve', 0.2), 120);
    expect(solvePlant(throttled).primary).toBeLessThan(1);
    expect(throttled.thermometer['returnMain.ti']).toBeLessThan(
      on.thermometer['returnMain.ti'] - 0.3,
    );
  });

  it('warms the pool with the heating on, faster at a higher speed, and cools it with the heating off', () => {
    const on = set(normal, 'heat.out-1.valve', 1);
    const fast = run(actOnPlant(on, { type: 'speed', speed: 600 }), 60);
    expect(fast.poolC).toBeGreaterThan(normal.poolC + 0.5);
    const off = run(actOnPlant(normal, { type: 'speed', speed: 600 }), 60);
    expect(off.poolC).toBeLessThan(normal.poolC);
  });

  it('steps a valve notch by notch, shut to open', () => {
    let s = set(normal, 'bypass.valve', 0);
    for (const n of NOTCHES.slice(1)) {
      s = actOnPlant(s, { type: 'notch', id: 'bypass.valve', by: 1 });
      expect(s.opening['bypass.valve']).toBe(n);
    }
    s = actOnPlant(s, { type: 'notch', id: 'bypass.valve', by: 1 });
    expect(s.opening['bypass.valve']).toBe(1);
  });
});

describe('RESET SIMULATION', () => {
  it('puts everything back to the start after several steps, and lights the button', () => {
    let s = newIdealPlant();
    s = set(s, 'filter.outlet.iso', 0.4);
    s = set(s, 'heat.out-1.valve', 1);
    s = set(s, 'bypass.valve', 0);
    s = actOnPlant(s, { type: 'speed', speed: 600 });
    s = run(s, 30);
    s = actOnPlant(s, { type: 'pump', run: false });
    const reset = actOnPlant(s, { type: 'reset' });
    const start = newIdealPlant();
    // All but the heat meter's total, which counts on since the demo started.
    expect(reset.heatKWh).toBe(s.heatKWh);
    expect({ ...reset, sinceReset: 0, heatKWh: 0, clockStart: 0 }).toEqual({
      ...start,
      sinceReset: 0,
      heatKWh: 0,
      clockStart: 0,
    });
    expect(reset.sinceReset).toBe(0);
    expect(solvePlant(reset)).toEqual(solvePlant(start));
  });
});

describe('the solver round dead ends', () => {
  it('agrees with the network solver where everything flows', () => {
    const f = solvePlant(newIdealPlant());
    expect(f.converged).toBe(true);
  });

  it('gives a pocket shut on every side its fallback head', () => {
    const out = solveWithDeadEnds(
      [{ id: 'a', head: 5 }, { id: 'b' }, { id: 'c', head: 0 }],
      [
        { id: 'x', kind: 'closed', from: 'a', to: 'b' },
        { id: 'y', kind: 'closed', from: 'b', to: 'c' },
      ],
      3,
    );
    expect(out.heads.b).toBe(3);
    expect(out.flows.x).toBe(0);
  });
});

describe('the dead-head trip', () => {
  it('trips the pump a few minutes after its outlet is shut, latched, its START refused', () => {
    let s = set(newIdealPlant(), 'filter.outlet.iso', 0);
    let t = 0;
    let flows = solvePlant(s);
    while (!s.tripped && t < 900) {
      s = stepIdealPlant(s, flows, 1);
      flows = solvePlant(s);
      t++;
    }
    expect(s.tripped).toBe(true);
    expect(t).toBeGreaterThan(120);
    expect(t).toBeLessThan(400);
    expect(s.pumpRunning).toBe(false);
    expect(solvePlant(s).circulation).toBe(0);
    expect(actOnPlant(s, { type: 'pump', run: true }).pumpRunning).toBe(false);
    // Hot, its reset is refused; cooled, it is taken, and START works again.
    expect(actOnPlant(s, { type: 'trip-reset' }).tripped).toBe(true);
    s = set(s, 'filter.outlet.iso', 1);
    s = run(s, 600);
    s = actOnPlant(s, { type: 'trip-reset' });
    expect(s.tripped).toBe(false);
    s = actOnPlant(s, { type: 'pump', run: true });
    expect(solvePlant(s).circulation).toBeGreaterThan(150);
  });

  it('never trips at its normal duty, nor throttled', () => {
    const s = run(set(newIdealPlant(), 'filter.outlet.iso', 0.4), 3600);
    expect(s.tripped).toBe(false);
  });

  it('is cleared by RESET SIMULATION', () => {
    const s = {
      ...newIdealPlant(),
      tripped: true,
      pumpRunning: false,
      casingC: 46,
    };
    const r = actOnPlant(s, { type: 'reset' });
    expect(r.tripped).toBe(false);
    expect(r.pumpRunning).toBe(true);
  });
});

describe('the heating interlock', () => {
  const heating = set(newIdealPlant(), 'heat.out-1.valve', 1);

  it('holds its valve open while the pump runs and pool water passes the exchanger', () => {
    const s = run(heating, 120);
    expect(s.interlock).toBe(1);
    expect(solvePlant(s).primary).toBeGreaterThan(2.5);
  });

  it('shuts the hot water off when the pump stops, and opens it again when it restarts', () => {
    let s = actOnPlant(run(heating, 10), { type: 'pump', run: false });
    s = run(s, 60);
    expect(s.interlock).toBe(0);
    expect(solvePlant(s).primary).toBe(0);
    s = run(actOnPlant(s, { type: 'pump', run: true }), 60);
    expect(s.interlock).toBe(1);
    expect(solvePlant(s).primary).toBeGreaterThan(2.5);
  });

  it('shuts it when too little pool water passes the exchanger', () => {
    const s = run(set(heating, 'hx.secondary-in.iso', 0), 60);
    expect(solvePlant(s).hxSecondary).toBe(0);
    expect(s.interlock).toBe(0);
    expect(solvePlant(s).primary).toBe(0);
  });

  it('is in the schematic, motorised, with its tag, and no visitor’s valve', () => {
    expect(TAGS['hx.primary.mv']).toBe('IPP-HX1-V6');
    expect(VALVES).not.toContain('hx.primary.mv');
    expect(idealPlantExpansion().added).toEqual([]);
  });
});

describe('time at ×3600', () => {
  it('stays stable: the pool warms smoothly and the network still balances', () => {
    let s = actOnPlant(set(newIdealPlant(), 'heat.out-1.valve', 1), {
      type: 'speed',
      speed: 3600,
    });
    let flows = solvePlant(s);
    const temps: number[] = [];
    for (let k = 0; k < 120; k++) {
      // Frames of a 60 Hz display: a minute of plant time each.
      s = stepIdealPlant(s, flows, 1 / 60);
      flows = solvePlant(s);
      temps.push(s.poolC);
    }
    expect(flows.converged).toBe(true);
    for (let k = 1; k < temps.length; k++)
      expect(temps[k]).toBeGreaterThanOrEqual(temps[k - 1] - 1e-9);
    expect(s.poolC).toBeGreaterThan(27.1);
    expect(s.poolC).toBeLessThan(31);
    expect(s.tripped).toBe(false);
  });
});

describe('the plant’s clock', () => {
  it('runs on from the time it was started, at the plant’s speed, and RESET sets it to the time given', () => {
    let s = newIdealPlant(10 * 3600);
    expect(clockText(s)).toBe('10:00:00');
    s = stepIdealPlant(
      actOnPlant(s, { type: 'speed', speed: 3600 }),
      solvePlant(s),
      1,
    );
    expect(clockText(s)).toBe('11:00:00');
    expect(plantClock(s)).toBeCloseTo(11 * 3600, 6);
    const r = actOnPlant(s, { type: 'reset', clock: 15 * 3600 + 30 });
    expect(clockText(r)).toBe('15:00:30');
    expect(r.speed).toBe(1);
  });
});

describe('backwashing the filter', () => {
  const ref = filterSizing(FILTER_SPEC).dirtRef;
  const setAll = (s: IdealPlantState, valves: [ValveId, number][]) =>
    valves.reduce((x, [id, o]) => set(x, id, o), s);
  const BACKWASH: [ValveId, number][] = [
    ['filter.inlet.iso', 0],
    ['filter.outlet.iso', 0],
    ['filter.backwash-in.iso', 1],
    ['filter.backwash-out.iso', 1],
  ];
  const RINSE: [ValveId, number][] = [
    ['filter.backwash-in.iso', 0],
    ['filter.backwash-out.iso', 0],
    ['filter.inlet.iso', 1],
    ['filter.rinse.iso', 1],
  ];
  const SERVICE: [ValveId, number][] = [
    ['filter.rinse.iso', 0],
    ['filter.outlet.iso', 1],
  ];
  const fouled = (s: IdealPlantState): IdealPlantState => ({
    ...s,
    bed: { ...s.bed, dirt: 1.2 * ref },
  });
  const stopped = (s: IdealPlantState) =>
    actOnPlant(s, { type: 'pump', run: false });
  const started = (s: IdealPlantState) =>
    actOnPlant(s, { type: 'pump', run: true });

  it('starts clean, its differential at its clean figure, the backwash valves shut', () => {
    const s = newIdealPlant();
    expect(s.bed.dirt).toBe(0);
    expect(s.opening['filter.backwash-in.iso']).toBe(0);
    expect(s.opening['filter.backwash-out.iso']).toBe(0);
    expect(s.opening['filter.rinse.iso']).toBe(0);
    expect(solvePlant(s).backwash).toBe(0);
  });

  it('fouls in service: a day of bathers’ dirt raises its differential by about 0.4 bar and cuts the flow', () => {
    const clean = solvePlant(newIdealPlant());
    let s = actOnPlant(newIdealPlant(), { type: 'speed', speed: 3600 });
    let flows = solvePlant(s);
    for (let k = 0; k < 24 * 60; k++) {
      s = stepIdealPlant(s, flows, 1 / 60);
      flows = solvePlant(s);
    }
    const rise = flows.gauge['filter.pdi'] - clean.gauge['filter.pdi'];
    expect(rise).toBeGreaterThan(0.3);
    expect(rise).toBeLessThan(0.6);
    expect(flows.toPool).toBeLessThan(clean.toPool);
  });

  it('backwashes: up through the bed fast enough to lift it, the waste murky, then clear, the dirt washed out', () => {
    let s = started(setAll(stopped(fouled(newIdealPlant())), BACKWASH));
    const f = solvePlant(s);
    expect(f.toPool).toBe(0);
    expect(f.bed).toBeLessThan(0);
    expect(f.lifted).toBe(true);
    expect(f.backwash).toBeGreaterThan(
      filterSizing(FILTER_SPEC).washFlow * 0.8,
    );
    s = run(s, 30);
    const murky = s.wasteDirt;
    expect(murky).toBeGreaterThan(200);
    s = run(s, 240);
    expect(s.wasteDirt).toBeLessThan(murky / 10);
    expect(s.bed.dirt).toBeLessThan(0.05 * ref);
  });

  it('too gentle a backwash does not lift the bed, and leaves it dirty', () => {
    let s = started(
      setAll(stopped(fouled(newIdealPlant())), [
        ...BACKWASH.slice(0, 3),
        ['filter.backwash-out.iso', 0.2],
      ]),
    );
    expect(solvePlant(s).lifted).toBe(false);
    s = run(s, 240);
    expect(s.bed.dirt).toBeGreaterThan(ref);
  });

  it('rinses to waste and goes back into service, its differential back to clean', () => {
    const clean = solvePlant(newIdealPlant());
    let s = run(
      started(setAll(stopped(fouled(newIdealPlant())), BACKWASH)),
      300,
    );
    s = started(setAll(stopped(s), RINSE));
    expect(solvePlant(s).rinse).toBeGreaterThan(100);
    expect(solvePlant(s).toPool).toBe(0);
    s = run(s, 120);
    expect(s.bed.unsettled).toBeLessThan(0.3);
    s = started(setAll(stopped(s), SERVICE));
    const f = solvePlant(s);
    expect(f.toPool).toBeCloseTo(clean.toPool, -1);
    expect(f.gauge['filter.pdi']).toBeCloseTo(clean.gauge['filter.pdi'], 1);
  });

  it('kicks the discharge gauge when a valve is worked under flow, not with the pump stopped', () => {
    const s = newIdealPlant();
    const kicked = actOnPlant(s, {
      type: 'notch',
      id: 'filter.outlet.iso',
      by: -1,
    });
    const shut = set(s, 'filter.outlet.iso', 0);
    expect(shut.surge).toBeGreaterThan(1);
    expect(kicked.surge).toBeLessThan(shut.surge);
    expect(
      gaugeReading(shut, solvePlant(shut), 'pump.discharge.pi'),
    ).toBeGreaterThan(solvePlant(shut).gauge['pump.discharge.pi'] + 1);
    expect(set(stopped(s), 'filter.outlet.iso', 0).surge).toBe(0);
    expect(run(shut, 5).surge).toBeLessThan(0.01);
  });

  it('is undone by RESET: a clean bed and every valve to normal', () => {
    const s = run(
      started(setAll(stopped(fouled(newIdealPlant())), BACKWASH)),
      10,
    );
    const r = actOnPlant(s, { type: 'reset' });
    expect(r.bed).toEqual(newIdealPlant().bed);
    expect(r.opening).toEqual(newIdealPlant().opening);
    expect(r.wasteDirt).toBe(0);
  });
});

describe('the heat meter', () => {
  it('totals the exchanger’s heat over plant time, and counts on through RESET', () => {
    let s = set(newIdealPlant(), 'heat.out-1.valve', 1);
    s = run(s, 3600);
    const duty = plantReadings(s, solvePlant(s)).duty;
    expect(s.heatKWh).toBeGreaterThan(duty * 0.95);
    expect(s.heatKWh).toBeLessThan(duty * 1.05);
    expect(actOnPlant(s, { type: 'reset' }).heatKWh).toBe(s.heatKWh);
    expect(TAGS['hx.primary-out.heat']).toBe('IPP-HM1');
    expect(solvePlant(s).meter['hx.primary-out.heat']).toBe(
      solvePlant(s).primary,
    );
  });
});

describe('a loop cut off from all but one reservoir', () => {
  it('carries nothing: the bypass and exchanger still while the filter backwashes', () => {
    let s = actOnPlant(newIdealPlant(), { type: 'pump', run: false });
    for (const [id, o] of [
      ['filter.inlet.iso', 0],
      ['filter.outlet.iso', 0],
      ['filter.backwash-in.iso', 1],
      ['filter.backwash-out.iso', 1],
    ] as [ValveId, number][])
      s = set(s, id, o);
    const f = solvePlant(actOnPlant(s, { type: 'pump', run: true }));
    expect(f.bypass).toBe(0);
    expect(f.hxSecondary).toBe(0);
    expect(f.converged).toBe(true);
  });
});
