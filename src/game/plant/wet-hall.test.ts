import { describe, expect, it } from 'vite-plus/test';
import { newPlantServices } from './services';
import {
  BACKWASH_PIT,
  PIT_FLOATS,
  WET_HALL_PLANT as P,
  backwashPitDepth,
  pitFloatHeight,
  pitFloats,
  makeUpShare,
  newWetHall,
  resetBooster,
  stepWetHall,
  wetHallAlarms,
} from './wet-hall';
import { POOLS } from '../plant-sizing/pools.config';
import { sizePlant } from '../plant-sizing/sizing';

const plant = newPlantServices();
const noMains = { ...plant, sources: { ...plant.sources, water: false } };
const none = { drawn: 0, backwashed: 0 };

describe('the wet hall', () => {
  it('has the sizing’s break tank and backwash tank', () => {
    const wet = sizePlant(POOLS).rooms.find((r) => /wet/i.test(r.name))!;
    const rating = (kind: RegExp) =>
      parseFloat(wet.machines.find((m) => kind.test(m.kind))!.rating!);
    expect(rating(/break tank/i)).toBeCloseTo(P.breakTank, 1);
    expect(rating(/backwash/i)).toBeCloseTo(P.backwashTank, 1);
  });

  it('keeps its break tank topped up from the main while the booster set draws on it', () => {
    let s = newWetHall();
    for (let i = 0; i < 3600; i++)
      s = stepWetHall(
        s,
        plant,
        { drawn: P.boosterRate / 3600, backwashed: 0 },
        1,
      );
    expect(s.breakTank).toBeGreaterThan(P.breakTank * 0.8);
    expect(s.boosterTripped).toBe(false);
    expect(s.meter).toBeCloseTo(P.boosterRate, 6);
  });

  it('with the main off, runs its break tank down, then trips the booster set and keeps it tripped', () => {
    let s = newWetHall();
    for (let i = 0; i < 3600; i++)
      s = stepWetHall(
        s,
        noMains,
        { drawn: P.boosterRate / 3600, backwashed: 0 },
        1,
      );
    expect(s.boosterTripped).toBe(true);
    expect(makeUpShare(s, noMains, 5)).toBe(0);
    expect(wetHallAlarms(s).boosterLowWater).toBe(true);
    // A reset does nothing while the tank is still low…
    expect(resetBooster(s).boosterTripped).toBe(true);
    // …but clears the trip once the main has refilled it.
    for (let i = 0; i < 3600; i++) s = stepWetHall(s, plant, none, 1);
    expect(s.boosterTripped).toBe(true);
    expect(resetBooster(s).boosterTripped).toBe(false);
  });

  it('shares the booster set’s rate among the pools when they call for more', () => {
    const s = newWetHall();
    expect(makeUpShare(s, plant, P.boosterRate / 2)).toBe(1);
    expect(makeUpShare(s, plant, P.boosterRate * 4)).toBeCloseTo(0.25, 9);
    const dark = { ...plant, feeders: { ...plant.feeders, wet_hall: false } };
    expect(makeUpShare(s, dark, 1)).toBe(0);
  });

  it('holds a two-and-one wash and pumps it away to sewer, spilling only past full', () => {
    // About 50 m³: two Olympic filters and a lounge filter, washed together.
    let s = stepWetHall(newWetHall(), plant, { drawn: 0, backwashed: 50 }, 1);
    expect(wetHallAlarms(s).backwashHigh).toBe(false);
    expect(s.inhibit).toBe(false);
    expect(s.discharging).toBe(true);
    for (let i = 0; i < 4 * 3600; i++) s = stepWetHall(s, plant, none, 1);
    expect(s.backwashTank).toBeLessThan(P.backwashTank * P.dischargeOn);
    s = stepWetHall(s, plant, { drawn: 0, backwashed: P.backwashTank }, 1);
    expect(s.spilt).toBeGreaterThan(0);
    expect(wetHallAlarms(s).backwashHigh).toBe(true);
  });

  it('works its pump and its inhibit on its four floats', () => {
    const at = (share: number) => pitFloats(share * P.backwashTank);
    expect(at(0.02)).toEqual({
      stop: false,
      start: false,
      high: false,
      highHigh: false,
    });
    expect(at(0.5)).toEqual({
      stop: true,
      start: true,
      high: false,
      highHigh: false,
    });
    expect(at(0.95)).toEqual({
      stop: true,
      start: true,
      high: true,
      highHigh: true,
    });
    // Each float hangs at its level's depth, deepest first.
    const heights = PIT_FLOATS.map((f) => pitFloatHeight(f.share));
    expect(heights).toEqual([...heights].sort((a, b) => a - b));
    expect(heights.at(-1)!).toBeLessThan(BACKWASH_PIT.topWater);
  });

  it('shuts its inlet at high-high, and opens it again once pumped back down past HIGH', () => {
    let s = stepWetHall(
      newWetHall(),
      plant,
      { drawn: 0, backwashed: P.backwashTank * (P.backwashHighHigh + 0.01) },
      1,
    );
    expect(s.inhibit).toBe(true);
    expect(wetHallAlarms(s).backwashInhibit).toBe(true);
    // Its pump at the consented rate brings it below its clear level.
    const hours =
      (P.backwashTank * (P.backwashHighHigh + 0.01 - P.backwashHigh)) /
      P.dischargeRate;
    for (let i = 0; i < hours * 3600 - 120; i++)
      s = stepWetHall(s, plant, none, 1);
    expect(s.inhibit).toBe(true);
    for (let i = 0; i < 240; i++) s = stepWetHall(s, plant, none, 1);
    expect(s.inhibit).toBe(false);
  });

  it('is a pit whose working volume is its plan area times its top water level', () => {
    expect(
      BACKWASH_PIT.length * BACKWASH_PIT.width * BACKWASH_PIT.topWater,
    ).toBeCloseTo(P.backwashTank, 6);
    expect(BACKWASH_PIT.topWater).toBeLessThan(BACKWASH_PIT.depth);
    expect(backwashPitDepth(P.backwashTank)).toBeCloseTo(
      BACKWASH_PIT.topWater,
      6,
    );
  });
});
