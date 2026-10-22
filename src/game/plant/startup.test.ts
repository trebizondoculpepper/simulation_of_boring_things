import { describe, expect, it } from 'vite-plus/test';
import { advance, applyAction, newWorld } from '../world';
import { ROOM_SERVICES, serviceAvailable } from './services';
import type { ServiceRoom } from './services';
import { START_ORDER, STAGE } from './startup';

const ROOMS = Object.keys(ROOM_SERVICES) as ServiceRoom[];
const powered = (w: ReturnType<typeof newWorld>, room: ServiceRoom) =>
  serviceAvailable(w.plant, room, 'power');

describe('the whole plant switched as one', () => {
  it('closes every room’s feeder in SLOW START’s order', () => {
    expect([...START_ORDER].sort()).toEqual([...ROOMS].sort());
    // The supplies before what they supply.
    for (const supply of [
      'switch_room',
      'wet_hall',
      'boiler_house',
      'air_plant',
    ] as const)
      for (const pool of ['plant_pool_01', 'plant_pool_02'] as const)
        expect(START_ORDER.indexOf(supply)).toBeLessThan(
          START_ORDER.indexOf(pool),
        );
  });

  it('FULL OFF takes every room’s power and opens every feeder', () => {
    const w = applyAction(newWorld(), { type: 'plant/full-off' });
    expect(w.plant.sources.power).toBe(false);
    for (const room of ROOMS) {
      expect(w.plant.feeders[room], room).toBe(false);
      expect(powered(w, room), room).toBe(false);
    }
  });

  it('FULL ON brings everything back at once, isolators and the booster set too', () => {
    let w = applyAction(newWorld(), { type: 'plant/full-off' });
    w = {
      ...w,
      plant: {
        ...w.plant,
        isolators: { ...w.plant.isolators, 'P-101A isolator': false },
      },
      wetHall: { ...w.wetHall, boosterTripped: true },
    };
    w = applyAction(w, { type: 'plant/full-on' });
    for (const room of ROOMS) expect(powered(w, room), room).toBe(true);
    expect(w.plant.isolators['P-101A isolator']).toBe(true);
    expect(w.wetHall.boosterTripped).toBe(false);
  });

  it('SLOW START brings the rooms up one by one, and is done when the last is', () => {
    let w = applyAction(newWorld(), { type: 'plant/full-off' });
    w = applyAction(w, { type: 'plant/slow-start' });
    expect(w.startup).toBe(w.time);
    w = advance(w, 1, 0.5);
    expect(powered(w, 'switch_room')).toBe(true);
    expect(powered(w, 'plant_pool_02')).toBe(false);
    const seen: ServiceRoom[] = [];
    for (let t = 1; t < STAGE * (START_ORDER.length + 1); t += 0.5) {
      w = advance(w, 0.5, 0.5);
      for (const room of ROOMS)
        if (w.plant.feeders[room] && !seen.includes(room)) seen.push(room);
    }
    expect(seen).toEqual(START_ORDER);
    for (const room of ROOMS) expect(powered(w, room), room).toBe(true);
    expect(w.startup).toBe(-1);
  });
});
