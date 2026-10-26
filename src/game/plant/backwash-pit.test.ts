import { describe, expect, it } from 'vite-plus/test';
import { advance, applyAction, newWorld } from '../world';
import type { World } from '../world';
import { installedValveByCommandId } from './installed-valves';
import {
  OLYMPIC_DIRT_REF,
  olympicBed,
  olympicFlowsOf,
} from './olympic-battery';
import { LOUNGE_DIRT_REF, loungeBed } from './lounge-filters';
import { LOUNGE_VALVES, loungeFlowsOf } from './lounge-valves';
import { WET_HALL_PLANT as P, wetHallAlarms } from './wet-hall';
import { loungeFilterMimicCommand } from '../../toolkit/gallery/logic/lounge-filter-mimic';

/**
 * The wet hall's backwash pit (prompt 036; the owner, 2026-10-26): it
 * takes two of the Olympic's filters and one of the lounge's washed
 * together, backwash and rinse, without its high-high inhibit or a spill;
 * more than that, and it shuts its inlet.
 */
const olympic = (w: World, filter: number, set: Record<string, boolean>) =>
  Object.entries(set).reduce(
    (x, [v, open]) =>
      applyAction(x, {
        type: 'plant/valve',
        id: installedValveByCommandId(`PL2-F${filter}-${v}`)!.assetId,
        open,
      }),
    w,
  );
const BACKWASH = { V1: false, V2: false, V3: true, V4: true };
const RINSE = { V3: false, V4: false, V1: true, V5: true };
const SERVICE = { V5: false, V2: true };
const lounge = (w: World, tag: string, verb: 'open' | 'shut') =>
  applyAction(
    w,
    loungeFilterMimicCommand(
      `${LOUNGE_VALVES.find((v) => v.tag === tag)!.assetId}/${verb}`,
    )!,
  );

/** Two Olympic filters and one lounge filter, washed together as an operator would: until clean, then rinsed. */
function washTwoAndOne() {
  let w = advance(newWorld(), 10, 1);
  w = olympic(olympic(w, 1, BACKWASH), 2, BACKWASH);
  w = lounge(lounge(w, 'PL1-F1-IV1', 'shut'), 'PL1-F1-BV1', 'open');
  let peak = 0;
  let inhibited = false;
  const clean = (x: World) =>
    olympicBed(x.olympic, 0).dirt < 0.05 * 1.6 * OLYMPIC_DIRT_REF &&
    olympicBed(x.olympic, 1).dirt < 0.05 * 1.6 * OLYMPIC_DIRT_REF;
  let loungeDone = false;
  for (let t = 0; t < 20 * 60 && !clean(w); t++) {
    w = advance(w, 1, 1);
    peak = Math.max(peak, w.wetHall.backwashTank);
    inhibited ||= w.wetHall.inhibit;
    if (
      !loungeDone &&
      loungeBed(w.loungeFilters, 0).dirt < 0.05 * 0.6 * LOUNGE_DIRT_REF
    ) {
      w = lounge(lounge(w, 'PL1-F1-BV1', 'shut'), 'PL1-F1-IV1', 'open');
      loungeDone = true;
    }
  }
  w = olympic(olympic(w, 1, RINSE), 2, RINSE);
  for (
    let t = 0;
    t < 20 * 60 &&
    (olympicBed(w.olympic, 0).unsettled > 0.05 ||
      olympicBed(w.olympic, 1).unsettled > 0.05);
    t++
  ) {
    w = advance(w, 1, 1);
    peak = Math.max(peak, w.wetHall.backwashTank);
    inhibited ||= w.wetHall.inhibit;
  }
  w = olympic(olympic(w, 1, SERVICE), 2, SERVICE);
  return { w, peak, inhibited };
}

describe('the backwash pit', () => {
  it('takes two Olympic filters and a lounge filter washed together, without its inhibit or a spill', () => {
    const { w, peak, inhibited } = washTwoAndOne();
    // About 49 m³ came in, in some eight minutes.
    expect(peak).toBeGreaterThan(40);
    expect(peak).toBeLessThan(P.backwashTank * P.backwashHighHigh);
    expect(inhibited).toBe(false);
    expect(w.wetHall.spilt).toBe(0);
    // Every filter back in service.
    expect(olympicFlowsOf(w).filters[0].valve.v2).toBeGreaterThan(0);
    expect(loungeFlowsOf(w).filters[0]).toBeGreaterThan(0);
  });

  it('pumps it away to sewer at the consented rate, in a few hours', () => {
    let { w } = washTwoAndOne();
    expect(w.wetHall.discharging).toBe(true);
    w = advance(w, 6 * 3600, 30);
    expect(w.wetHall.backwashTank).toBeLessThan(P.backwashTank * P.dischargeOn);
  });

  it('shuts its inlet at high-high when more is washed at once, and every backwash and rinse stops', () => {
    // All five Olympic filters at once: far more than it takes.
    let w = advance(newWorld(), 10, 1);
    for (const f of [1, 2, 3, 4, 5]) w = olympic(w, f, BACKWASH);
    let at = -1;
    for (let t = 0; t < 15 * 60 && at < 0; t++) {
      w = advance(w, 1, 1);
      if (w.wetHall.inhibit) at = t;
    }
    expect(at).toBeGreaterThan(0);
    expect(wetHallAlarms(w.wetHall).backwashInhibit).toBe(true);
    w = advance(w, 2, 1);
    expect(olympicFlowsOf(w).toWaste).toBe(0);
    expect(w.wetHall.spilt).toBe(0);
  });
});
