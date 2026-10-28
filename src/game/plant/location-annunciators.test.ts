import { describe, expect, it } from 'vite-plus/test';
import { applyAction, newWorld, stepWorld } from '../world';
import type { World } from '../world';
import {
  LOCATIONS,
  LOCATION_ANNUNCIATORS,
  litLocationWindows,
  unacceptedLocationAlarms,
} from './location-annunciators';
import { olympicAlarms } from './olympic-annunciator';
import { wetHallAlarmsIn } from './wet-hall-annunciator';
import { WET_HALL_PLANT } from './wet-hall';
import { STORE_CAPACITY } from './chemicals';
import { deserialiseWorld } from '../save';

/** A new world run on long enough for its plant to settle. */
function settled(): World {
  let w = newWorld();
  for (let t = 0; t < 60; t++) w = stepWorld(w, 1);
  return w;
}

describe('every location annunciator', () => {
  it('has an engraving for every window, and its windows fill its rows', () => {
    for (const id of LOCATIONS) {
      const spec = LOCATION_ANNUNCIATORS[id];
      for (const alarm of spec.alarms) expect(spec.text[alarm]).toBeDefined();
      expect(spec.alarms.length % spec.columns, id).toBe(0);
    }
  });

  it('is dark in a healthy new game, except the day tanks the game begins calling', () => {
    const w = settled();
    expect(wetHallAlarmsIn(w)).toEqual([]);
    expect(olympicAlarms(w).filter((a) => a !== 'day-tank-low')).toEqual([]);
  });
});

describe('the Olympic annunciator’s windows', () => {
  it('see a pump tripped and both pumps out of AUTO, by its own tags', () => {
    const w = settled();
    const s = w.motors.starters;
    const off = {
      ...w,
      motors: {
        ...w.motors,
        starters: {
          ...s,
          'P-101A': { ...s['P-101A'], mode: 'off' as const, tripped: true },
          'P-101B': { ...s['P-101B'], mode: 'off' as const },
        },
      },
    };
    expect(olympicAlarms(off)).toEqual(
      expect.arrayContaining(['p101a-trip', 'no-auto']),
    );
  });

  it('see the room’s power lost', () => {
    const w = settled();
    const dark = {
      ...w,
      plant: {
        ...w.plant,
        feeders: { ...w.plant.feeders, plant_pool_02: false },
      },
    };
    expect(olympicAlarms(dark)).toContain('power-fail');
  });
});

describe('the wet hall annunciator’s windows', () => {
  it('see the backwash pit high, inhibited and overflowing', () => {
    const w = settled();
    const full = {
      ...w,
      wetHall: {
        ...w.wetHall,
        backwashTank: WET_HALL_PLANT.backwashTank,
        inhibit: true,
      },
    };
    expect(wetHallAlarmsIn(full)).toEqual(
      expect.arrayContaining(['pit-high', 'pit-inhibit', 'pit-overflow']),
    );
  });

  it('see the break tank low and the booster set tripped', () => {
    const w = settled();
    const low = {
      ...w,
      wetHall: { ...w.wetHall, breakTank: 0.5, boosterTripped: true },
    };
    expect(wetHallAlarmsIn(low)).toEqual(
      expect.arrayContaining(['break-tank-low', 'booster-trip']),
    );
  });

  it('see a transfer tripped on high-high, a store at its cut-out and a pump out of AUTO', () => {
    const w = settled();
    const d = w.distribution;
    const faulty = {
      ...w,
      chemicals: { ...w.chemicals, acid: STORE_CAPACITY.acid * 0.01 },
      distribution: {
        hypochlorite: { ...d.hypochlorite, tripped: true },
        acid: { ...d.acid, hoa: 'off' as const },
      },
    };
    expect(wetHallAlarmsIn(faulty)).toEqual(
      expect.arrayContaining(['hypo-trip', 'acid-store-low', 'acid-not-auto']),
    );
    expect(wetHallAlarmsIn(faulty)).not.toContain('acid-trip');
  });

  it('see the hall’s power lost, and the stores’ supply to the transfer', () => {
    const w = settled();
    const hall = {
      ...w,
      plant: { ...w.plant, feeders: { ...w.plant.feeders, wet_hall: false } },
    };
    expect(wetHallAlarmsIn(hall)).toContain('power-fail');
    const store = {
      ...w,
      plant: { ...w.plant, feeders: { ...w.plant.feeders, hypo_store: false } },
    };
    expect(wetHallAlarmsIn(store)).toContain('transfer-no-supply');
  });

  it('see the booster set STOPped at its panel', () => {
    const w = settled();
    const stopped = {
      ...w,
      wetHall: { ...w.wetHall, booster: { ...w.wetHall.booster, run: false } },
    };
    expect(wetHallAlarmsIn(stopped)).toContain('booster-off');
  });
});

describe('one state for each board, its twin and the bridge', () => {
  /** The wet hall's pit run full: its windows come in. */
  const fault = (w: World): World => ({
    ...w,
    wetHall: { ...w.wetHall, backwashTank: WET_HALL_PLANT.backwashTank },
  });

  it('is sensed by the world each step, and listed for the bridge', () => {
    const w = stepWorld(fault(settled()), 1);
    expect(w.locationAnnunciators.wet_hall.windows['pit-high']).toBe(
      'flashing',
    );
    expect(unacceptedLocationAlarms(w)).toBeGreaterThan(0);
    expect(litLocationWindows(w).map((l) => l.words)).toContain(
      'WH BACKWASH PIT HIGH',
    );
  });

  it('accepts at one board for that board alone; at the bridge for all', () => {
    let w = settled();
    w = {
      ...fault(w),
      motors: {
        ...w.motors,
        starters: {
          ...w.motors.starters,
          'P-101A': { ...w.motors.starters['P-101A'], tripped: true },
        },
      },
    };
    w = stepWorld(w, 1);
    expect(w.locationAnnunciators.pool_02.windows['p101a-trip']).toBe(
      'flashing',
    );
    const atHall = applyAction(w, {
      type: 'location-alarms/accept',
      location: 'wet_hall',
    });
    expect(atHall.locationAnnunciators.wet_hall.windows['pit-high']).toBe(
      'steady',
    );
    expect(atHall.locationAnnunciators.pool_02.windows['p101a-trip']).toBe(
      'flashing',
    );
    const atBridge = applyAction(w, { type: 'location-alarms/accept' });
    expect(unacceptedLocationAlarms(atBridge)).toBe(0);
  });

  it('holds a cleared window until RESET', () => {
    let w = stepWorld(fault(settled()), 1);
    w = applyAction(w, {
      type: 'location-alarms/accept',
      location: 'wet_hall',
    });
    w = { ...w, wetHall: { ...w.wetHall, backwashTank: 0 } };
    w = stepWorld(w, 1);
    expect(w.locationAnnunciators.wet_hall.windows['pit-high']).toBe('steady');
    w = applyAction(w, { type: 'location-alarms/reset', location: 'wet_hall' });
    expect(w.locationAnnunciators.wet_hall.windows['pit-high']).toBe('off');
  });

  it('keeps the lounge’s windows from a save of version 55', () => {
    const world = newWorld() as unknown as Record<string, unknown>;
    const { locationAnnunciators, ...rest } = world;
    const lounge = {
      ...((locationAnnunciators as Record<string, unknown>).pool_01 as object),
      firstOut: 'ph',
    };
    const loaded = deserialiseWorld(
      JSON.stringify({
        format: 'pool-plant-save',
        version: 55,
        savedAt: 1,
        world: { ...rest, loungeAnnunciator: lounge },
      }),
    );
    expect(
      loaded.ok && loaded.world.locationAnnunciators.pool_01.firstOut,
    ).toBe('ph');
    expect(
      loaded.ok &&
        loaded.world.locationAnnunciators.wet_hall.windows['pit-high'],
    ).toBe('off');
  });
});
