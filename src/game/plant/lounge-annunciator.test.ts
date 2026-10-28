import { describe, expect, it } from 'vite-plus/test';
import { newWorld, stepWorld } from '../world';
import type { World } from '../world';
import {
  acceptLoungeAlarms,
  loungeAlarms,
  newLoungeAnnunciator,
  resetLoungeAlarms,
  senseLoungeAlarms,
} from './lounge-annunciator';

/** A new world run on long enough for its lounge to settle. */
function settled(): World {
  let w = newWorld();
  for (let t = 0; t < 60; t++) w = stepWorld(w, 1);
  return w;
}

describe('the lounge annunciator’s windows', () => {
  it('are dark in a healthy new game', () => {
    expect(loungeAlarms(settled())).toEqual([]);
  });

  it('see a balance tank tripped low-low, and the low flow after it', () => {
    const w = settled();
    const tripped = {
      ...w,
      pools: {
        ...w.pools,
        pool_01: { ...w.pools.pool_01, balance: 0.1, tripped: true, flow: 0 },
      },
    };
    expect(loungeAlarms(tripped)).toEqual(
      expect.arrayContaining(['bt-low', 'circ-tripped', 'flow-low']),
    );
  });

  it('see a filter left out of service, as a backwash left on', () => {
    const w = settled();
    const backwash = {
      ...w,
      loungeValvePositions: {
        ...w.loungeValvePositions,
        'valve-0005': 0,
        'valve-0006': 1,
      },
    };
    expect(loungeAlarms(backwash)).toContain('f2-offline');
    expect(loungeAlarms(backwash)).not.toContain('f1-offline');
  });

  it('see both pumps switched off, and a tripped pump', () => {
    const w = settled();
    const starters = w.motors.starters;
    const off = {
      ...w,
      motors: {
        ...w.motors,
        starters: {
          ...starters,
          'P-201A': { ...starters['P-201A'], mode: 'off' as const },
          'P-201B': {
            ...starters['P-201B'],
            mode: 'off' as const,
            tripped: true,
          },
        },
      },
    };
    expect(loungeAlarms(off)).toEqual(
      expect.arrayContaining(['no-auto', 'p201b-trip']),
    );
  });

  it('see the room’s power lost', () => {
    const w = settled();
    const dark = {
      ...w,
      plant: {
        ...w.plant,
        feeders: { ...w.plant.feeders, plant_pool_01: false },
      },
    };
    expect(loungeAlarms(dark)).toContain('power-fail');
  });
});

describe('the lounge annunciator’s sequence', () => {
  it('flashes, accepts to steady, and holds a cleared window until RESET', () => {
    let s = senseLoungeAlarms(newLoungeAnnunciator(), ['bt-low']);
    expect(s.windows['bt-low']).toBe('flashing');
    s = acceptLoungeAlarms(s);
    expect(s.windows['bt-low']).toBe('steady');
    s = senseLoungeAlarms(s, []);
    expect(s.windows['bt-low']).toBe('steady');
    s = resetLoungeAlarms(s);
    expect(s.windows['bt-low']).toBe('off');
  });

  it('keeps flashing an alarm that cleared before it was accepted', () => {
    let s = senseLoungeAlarms(newLoungeAnnunciator(), ['ph']);
    s = senseLoungeAlarms(s, []);
    s = resetLoungeAlarms(s);
    expect(s.windows.ph).toBe('flashing');
  });

  it('marks the first-out, and only while all was dark', () => {
    let s = senseLoungeAlarms(newLoungeAnnunciator(), [
      'p201a-trip',
      'flow-low',
    ]);
    expect(s.firstOut).toBe('p201a-trip');
    s = senseLoungeAlarms(s, ['p201a-trip', 'flow-low', 'chlorine']);
    expect(s.firstOut).toBe('p201a-trip');
    // Cleared, accepted and reset: the board dark, the first-out with it.
    s = acceptLoungeAlarms(senseLoungeAlarms(s, []));
    s = resetLoungeAlarms(s);
    expect(s.firstOut).toBeNull();
    s = senseLoungeAlarms(s, ['ozone']);
    expect(s.firstOut).toBe('ozone');
  });

  it('is sensed by the world each step, and its buttons act through it', () => {
    let w = settled();
    w = {
      ...w,
      pools: {
        ...w.pools,
        pool_01: { ...w.pools.pool_01, balance: 0.1, tripped: true },
      },
    };
    w = stepWorld(w, 1);
    expect(w.locationAnnunciators.pool_01.windows['circ-tripped']).toBe(
      'flashing',
    );
  });
});
