import { describe, expect, it } from 'vite-plus/test';
import {
  FILTER_PHYSICS,
  bedPasses,
  bedSizing,
  cleanFilter,
  commandProcess,
  filterSizing,
  newFilterRig,
  newIdealFilter,
  stepFilterBed,
  rigFlows,
  stepFilterRig,
} from './ideal-filter';
import type { FilterProcess, FilterRig } from './ideal-filter';

/** The ideal filter (dev40): one model for every filter, its size its only parameter. */
const run = (rig: FilterRig, p: FilterProcess, seconds: number, step = 1) => {
  let r = commandProcess(rig, p);
  for (let t = 0; t < seconds; t += step) r = stepFilterRig(r, step);
  return r;
};
const loaded = (diameter = 1.2) =>
  run(newFilterRig({ diameter }), 'service', 3 * 86400, 30);

describe('the ideal filter', () => {
  it('takes everything from its size', () => {
    const z = filterSizing({ diameter: 1.2 });
    expect(z.area).toBeCloseTo(1.131, 3);
    expect(z.bedDepth).toBe(FILTER_PHYSICS.bedDepth);
    expect(z.designFlow).toBeCloseTo(z.area * FILTER_PHYSICS.filtrationRate);
    expect(z.washFlow).toBeCloseTo(z.area * FILTER_PHYSICS.backwashRate);
    expect(
      filterSizing({ diameter: 1.2, bedDepth: 1.2 }).cleanHead,
    ).toBeCloseTo(3.6);
  });

  it('filters at its design flow when clean, catching most of the dirt', () => {
    const r = run(newFilterRig(), 'service', 30);
    const f = rigFlows(r);
    expect(f.bed).toBeCloseTo(filterSizing(r.spec).designFlow, 0);
    expect(f.outletDirt).toBeLessThan(r.dirtySource * 0.05);
  });

  it('loads with dirt: its pressure difference rises, its flow falls, it fissures and lets dirt through', () => {
    const clean = rigFlows(run(newFilterRig(), 'service', 30));
    const r = loaded();
    const f = rigFlows(r);
    expect(f.bedBar).toBeGreaterThan(clean.bedBar);
    expect(f.bed).toBeLessThan(clean.bed);
    expect(r.filter.fissuring).toBeGreaterThan(0.3);
    expect(f.outletDirt).toBeGreaterThan(clean.outletDirt);
  });

  it('is washed clean by a backwash, which heals its fissures, the waste murky then clearing', () => {
    // Once its servos have travelled, the bed lifted: the first water murky.
    let r = run(loaded(), 'backwash', 12);
    const murky = rigFlows(r).wasteDirt;
    r = run(r, 'backwash', 300);
    expect(rigFlows(r).lifted).toBe(true);
    expect(r.filter.dirt).toBeLessThan(0.05);
    expect(r.filter.fissuring).toBeLessThan(0.1);
    expect(rigFlows(r).wasteDirt).toBeLessThan(murky / 10);
  });

  it('heals no fissures in too gentle a backwash', () => {
    const r = loaded();
    // A backwash out through a half-open valve: lifted, but not enough to heal.
    let gentle = commandProcess(r, 'backwash');
    gentle = {
      ...gentle,
      opening: { ...gentle.opening, v3: 1, v4: 0.25, clean: 1 },
    };
    const f = rigFlows(gentle);
    const z = filterSizing(gentle.spec);
    if (-f.bed < FILTER_PHYSICS.healShare * z.washFlow) {
      const after = stepFilterRig(
        { ...gentle, command: { ...gentle.command, v4: false } },
        1,
      );
      expect(after.filter.fissuring).toBeGreaterThanOrEqual(
        r.filter.fissuring * 0.99,
      );
    }
  });

  it('needs a rinse after a backwash, or its first filtrate carries fines', () => {
    const washed = run(loaded(), 'backwash', 300);
    const unrinsed = rigFlows(run(washed, 'service', 20));
    const rinsed = rigFlows(run(run(washed, 'rinse', 300), 'service', 20));
    expect(unrinsed.outletDirt).toBeGreaterThan(rinsed.outletDirt * 3);
  });

  it('is the same model at every size, its flows and dirt scaling with its bed', () => {
    const small = loaded(1.2);
    const big = loaded(3.0);
    const scale =
      filterSizing({ diameter: 3 }).area / filterSizing({ diameter: 1.2 }).area;
    expect(rigFlows(big).bed / rigFlows(small).bed).toBeCloseTo(scale, 1);
    expect(big.filter.dirt / small.filter.dirt).toBeCloseTo(scale, 1);
    expect(big.filter.fissuring).toBeCloseTo(small.filter.fissuring, 3);
    expect(rigFlows(big).bedBar).toBeCloseTo(rigFlows(small).bedBar, 2);
  });

  it('is as new after cleaning', () => {
    expect(cleanFilter(loaded()).filter).toEqual({
      dirt: 0,
      fissuring: 0,
      unsettled: 0,
    });
  });

  it('carries the water’s condition: cleaner out, a trace cooler, its chlorine untouched (prompt 070)', () => {
    const f = rigFlows(run(newFilterRig(), 'service', 30));
    expect(f.outlet.solids).toBeLessThan(f.supply.solids * 0.05);
    expect(f.outlet.temperature).toBeLessThan(f.supply.temperature);
    expect(f.supply.temperature - f.outlet.temperature).toBeLessThan(0.05);
    expect(f.outlet.freeChlorine).toBe(f.supply.freeChlorine);
    expect(f.outlet.organics).toBe(f.supply.organics);
  });
});

describe('sand loss, an option of the model', () => {
  const spec = { diameter: 1.2 };
  const lossy = { ...spec, sandLoss: true };
  const z = filterSizing(spec);
  /** A backwash rising at `rate` m/h for `seconds`. */
  const wash = (s: typeof spec, rate: number, seconds: number) => {
    let f = newIdealFilter();
    for (let t = 0; t < seconds; t++)
      f = stepFilterBed(s, f, -rate * z.area, 0, 1);
    return f;
  };

  it('is off unless asked for: nothing lost, the state as it always was', () => {
    const f = wash(spec, 60, 600);
    expect(f.sand).toBeUndefined();
    expect(Object.keys(f).sort()).toEqual(['dirt', 'fissuring', 'unsettled']);
    expect(bedSizing(spec, f)).toEqual(z);
  });

  it('on, loses nothing at or below the safe rise rate', () => {
    expect(wash(lossy, 30, 600).sand).toBe(1);
    expect(wash(lossy, FILTER_PHYSICS.safeRiseRate, 600).sand).toBe(1);
  });

  it('on, loses sand above it, the more the fiercer, never all of it', () => {
    const a = wash(lossy, 50, 600).sand!;
    const b = wash(lossy, 70, 600).sand!;
    expect(a).toBeLessThan(1);
    expect(b).toBeLessThan(a);
    expect(wash(lossy, 200, 36000).sand).toBeCloseTo(
      FILTER_PHYSICS.leastSand,
      6,
    );
  });

  it('leaves a shallower bed: less clean head, less room for dirt, more let past', () => {
    const half = { ...newIdealFilter(), sand: 0.5 };
    const s = bedSizing(lossy, half);
    expect(s.cleanHead).toBeCloseTo(z.cleanHead / 2, 9);
    expect(s.capacity).toBeCloseTo(z.capacity / 2, 9);
    expect(s.washFlow).toBe(z.washFlow);
    expect(bedPasses(lossy, half, 10)).toBeGreaterThan(
      bedPasses(lossy, newIdealFilter(), 10),
    );
  });

  it('is put back by maintenance: new media', () => {
    const rig = { ...newFilterRig({ diameter: 1.2, sandLoss: true }) };
    const worn = { ...rig, filter: { ...rig.filter, sand: 0.6 } };
    expect(cleanFilter(worn).filter.sand ?? 1).toBe(1);
  });
});
