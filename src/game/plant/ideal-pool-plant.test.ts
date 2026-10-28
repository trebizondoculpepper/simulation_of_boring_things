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
  capacity,
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
    expect({ ...reset, sinceReset: 0 }).toEqual({ ...start, sinceReset: 0 });
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
