import { describe, expect, it } from 'vite-plus/test';
import { advance, applyAction } from '../world';
import { AIR_UNITS, hallHandling, newAirHandling } from './air-handling';
import { allOff, olympic, settled } from './air-handling.test-support';
import { deserialiseWorld, serialiseWorld } from '../save';

describe('the air handling units in the world', () => {
  it('are every unit of the sizing, all running, every hall fully handled', () => {
    const a = newAirHandling();
    expect(Object.keys(a.units)).toEqual(AIR_UNITS.map((u) => u.tag));
    for (const h of Object.values(hallHandling(a))) expect(h.share).toBe(1);
  });

  it('stop with the air plant’s supply, and run again on its return', () => {
    const cut = applyAction(settled, {
      type: 'plant/feeder',
      room: 'air_plant',
      on: false,
    });
    const dark = advance(cut, 120, 1);
    expect(
      Object.values(dark.airHandling.units).every((s) => s.speed === 0),
    ).toBe(true);
    const back = advance(
      applyAction(dark, { type: 'plant/feeder', room: 'air_plant', on: true }),
      120,
      1,
    );
    expect(
      Object.values(back.airHandling.units).every((s) => s.speed === 1),
    ).toBe(true);
  });

  it('follow their hall’s time programme in AUTO, and their isolators', () => {
    const tag = olympic[0].tag;
    const unoccupied = applyAction(settled, {
      type: 'air/occupied',
      hall: 'olympic',
      on: false,
    });
    expect(advance(unoccupied, 60, 1).airHandling.units[tag].speed).toBe(0);
    const isolated = applyAction(settled, {
      type: 'air/unit',
      tag,
      action: { act: 'isolator', on: false },
    });
    const w = advance(isolated, 60, 1);
    expect(w.airHandling.units[tag].speed).toBe(0);
    expect(w.airHandling.units[olympic[1].tag].speed).toBe(1);
  });

  it('are saved and loaded with the world', () => {
    const w = allOff(settled);
    const loaded = deserialiseWorld(serialiseWorld(w, 0));
    expect(loaded.ok && loaded.world.airHandling).toEqual(w.airHandling);
    expect(loaded.ok && loaded.world.pools.pool_02.hallRh).toBe(
      w.pools.pool_02.hallRh,
    );
  });
});
