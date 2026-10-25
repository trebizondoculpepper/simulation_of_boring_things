import { describe, expect, it } from 'vite-plus/test';
import { advance, applyAction, newWorld } from '../world';
import type { World } from '../world';
import { installedValveByCommandId } from './installed-valves';
import { LOUNGE_VALVES, loungeFlowsOf } from './lounge-valves';
import { LOUNGE_FILTER, loungeBed } from './lounge-filters';
import { OLYMPIC_FILTER, olympicBed, olympicFlowsOf } from './olympic-battery';
import { bedPasses, filterSizing } from './ideal-filter';
import { loungeFilterMimicCommand } from '../../toolkit/gallery/logic/lounge-filter-mimic';

/**
 * The full backwash on plant one's and plant two's filters, each bed the
 * ideal filter (the owner, 2026-10-25), worked by their valves in the
 * world: a loaded, fissured bed in service lets dirt past; a backwash lifts
 * it, washes its dirt out to drain and heals its fissures; a rinse (the
 * Olympic's, down to waste through V5; the lounge's, its first minutes
 * back in service) settles it; back in service it keeps the water's dirt
 * again.
 */

/** A world with a bed of each loaded to twice its dirt reference and fissured. */
function worn(): World {
  const w = newWorld();
  const olympicRef = filterSizing(OLYMPIC_FILTER).dirtRef;
  const loungeRef = filterSizing(LOUNGE_FILTER.spec).dirtRef;
  return {
    ...w,
    olympic: {
      dirt: w.olympic.dirt.map((d, i) => (i === 1 ? 2 * olympicRef : d)),
      fissuring: w.olympic.fissuring.map((f, i) => (i === 1 ? 0.4 : f)),
      unsettled: [...w.olympic.unsettled],
    },
    loungeFilters: {
      dirt: [2 * loungeRef, w.loungeFilters.dirt[1]],
      fissuring: [0.4, 0],
      unsettled: [0, 0],
    },
  };
}

/** What a bed lets past of water carrying 10 g/m³, as a share. */
const leaks = (
  spec: typeof OLYMPIC_FILTER,
  bed: ReturnType<typeof olympicBed>,
) => bedPasses(spec, bed, 10) / 10;

describe('plant two: an Olympic filter’s full backwash, from its five valves', () => {
  const set = (w: World, valves: Record<string, boolean>) =>
    Object.entries(valves).reduce(
      (x, [tag, open]) =>
        applyAction(x, {
          type: 'plant/valve',
          id: installedValveByCommandId(`PL2-F2-${tag}`)!.assetId,
          open,
        }),
      w,
    );
  const bed = (w: World) => olympicBed(w.olympic, 1);

  it('lifts, washes, heals, rinses and returns it to service, keeping the dirt again', () => {
    let w = advance(worn(), 10, 1);
    const before = bed(w);
    // Loaded and fissured, it lets a good share of the dirt past.
    expect(leaks(OLYMPIC_FILTER, before)).toBeGreaterThan(0.3);

    // Backwash: inlet and outlet shut, backwash in and out open.
    w = set(w, { V1: false, V2: false, V3: true, V4: true });
    w = advance(w, 10, 1);
    expect(olympicFlowsOf(w).filters[1].bed).toBeLessThan(0);
    expect(bed(w).unsettled).toBeCloseTo(1, 6);
    w = advance(w, 5 * 60, 1);
    expect(bed(w).dirt).toBeLessThan(before.dirt * 0.05);
    expect(bed(w).fissuring).toBeLessThan(before.fissuring * 0.2);

    // Rinse: backwash shut; inlet and rinse to waste open, outlet shut.
    w = set(w, { V3: false, V4: false, V1: true, V5: true });
    w = advance(w, 10, 1);
    expect(olympicFlowsOf(w).filters[1].bed).toBeGreaterThan(0);
    expect(olympicFlowsOf(w).filters[1].valve.v5).toBeGreaterThan(0);
    w = advance(w, 5 * 60, 1);
    expect(bed(w).unsettled).toBeLessThan(0.05);

    // Service: rinse shut, outlet open; the bed sound, settled and clean.
    w = set(w, { V5: false, V2: true });
    w = advance(w, 5 * 60, 1);
    expect(olympicFlowsOf(w).filters[1].valve.v2).toBeGreaterThan(0);
    expect(leaks(OLYMPIC_FILTER, bed(w))).toBeLessThan(0.1);
  });
});

describe('plant one: a lounge filter’s full backwash, from its panel', () => {
  const id = (tag: string) => LOUNGE_VALVES.find((v) => v.tag === tag)!.assetId;
  const press = (w: World, tag: string, verb: 'open' | 'shut') =>
    applyAction(w, loungeFilterMimicCommand(`${id(tag)}/${verb}`)!);
  const bed = (w: World) => loungeBed(w.loungeFilters, 0);

  it('lifts, washes and heals it, and settles it back in service, keeping the dirt again', () => {
    let w = advance(worn(), 10, 1);
    const before = bed(w);
    expect(leaks(LOUNGE_FILTER.spec, before)).toBeGreaterThan(0.3);

    // Backwash: its inlet shut, its backwash valve open; filter 2's water
    // comes back down its outlet, up through its bed, to waste.
    w = press(press(w, 'PL1-F1-IV1', 'shut'), 'PL1-F1-BV1', 'open');
    w = advance(w, 30, 1);
    expect(loungeFlowsOf(w).filters[0]).toBeLessThan(0);
    expect(bed(w).unsettled).toBeCloseTo(1, 6);
    w = advance(w, 5 * 60, 1);
    expect(bed(w).dirt).toBeLessThan(before.dirt * 0.05);
    expect(bed(w).fissuring).toBeLessThan(before.fissuring * 0.2);

    // Back in service: its backwash shut, its inlet open. Just lifted, it
    // lets fines past at first, then settles.
    w = press(press(w, 'PL1-F1-BV1', 'shut'), 'PL1-F1-IV1', 'open');
    w = advance(w, 30, 1);
    expect(loungeFlowsOf(w).filters[0]).toBeGreaterThan(0);
    const settling = leaks(LOUNGE_FILTER.spec, bed(w));
    w = advance(w, 10 * 60, 1);
    expect(bed(w).unsettled).toBeLessThan(0.05);
    expect(leaks(LOUNGE_FILTER.spec, bed(w))).toBeLessThan(settling);
    expect(leaks(LOUNGE_FILTER.spec, bed(w))).toBeLessThan(0.1);
  });
});
