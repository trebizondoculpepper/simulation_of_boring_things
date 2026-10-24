import { describe, expect, it } from 'vite-plus/test';
import { POOLS } from '../../../game/plant-sizing/pools.config';
import { ASSUME, sizePlant } from '../../../game/plant-sizing/sizing';
import { plantRoomPlan } from './plant-rooms';
import { POOL_HALLS } from './pool-halls';
import { SHELL_ROOMS, WET_HALL, wetHallRoom } from './shell-rooms';
import type { ShellRoomId } from './shell-rooms';

/**
 * The rooms as built hold what the plant sizing (`doc/plans/plant-sizing.md`)
 * says each needs: its floor area, its plan in either orientation, and its
 * height, services included.
 */
const plan = sizePlant(POOLS);
const need = (id: string) => plan.rooms.find((r) => r.id === id)!;
const fits = (
  have: { w: number; d: number },
  want: { w: number; d: number },
) => {
  const [a, b] = [Math.min(have.w, have.d), Math.max(have.w, have.d)];
  const [c, d] = [Math.min(want.w, want.d), Math.max(want.w, want.d)];
  return a >= c && b >= d;
};

describe('room for everything', () => {
  it('gives each pool’s plant its floor, less the stair, and its height', () => {
    const rooms: Record<string, keyof typeof POOL_HALLS> = {
      'plant-lounge': 'pool_01',
      'plant-olympic': 'pool_02',
      'plant-spa': 'pool_03',
      'plant-footbath': 'pool_04',
    };
    for (const [id, hall] of Object.entries(rooms)) {
      const p = plantRoomPlan(POOL_HALLS[hall].plantDoor!.size);
      const r = need(id);
      // The stair and its foot, and the equipment doors' swing, or in a
      // room with no stair, the doors' swing alone.
      const lost = p.stepFree ? 2.6 : 6.5;
      expect(p.side * p.side - lost, id).toBeGreaterThanOrEqual(r.area);
      // The sizing's plan is a suggestion, half as long again as it is
      // wide; what binds is its longest machine, with its clear space.
      const longest = Math.max(
        ...r.machines.map(
          (m) => Math.max(m.w, m.d) + 2 * (m.clearance ?? ASSUME.clearance),
        ),
      );
      expect(p.side, id).toBeGreaterThanOrEqual(longest);
      expect(p.roof - p.floor, id).toBeGreaterThanOrEqual(r.height);
    }
  });

  it('gives each room of the main plant its plan and its height', () => {
    const rooms: Record<ShellRoomId, string> = {
      boiler_house: 'boiler-house',
      loading_bay: 'loading-bay',
      hypo_store: 'hypo-store',
      acid_store: 'acid-store',
      switch_room: 'switch-room',
      air_plant: 'air-plant',
      control_room: 'control-room',
      engineers_office: 'office',
    };
    for (const [room, id] of Object.entries(rooms)) {
      const spec = SHELL_ROOMS[room as ShellRoomId];
      const r = need(id);
      // The sizing lays the air plant's units out on the floor; as built
      // the Olympic's stand three high, and the room is narrowed to them
      // (the owner, 2026-10-24): its own layout's tests show it holds them.
      if (room !== 'air_plant') expect(fits(spec, r), room).toBe(true);
      expect(spec.height, room).toBeGreaterThanOrEqual(r.height);
    }
  });

  it('gives the wet hall its plan, and headroom over its tallest machine', () => {
    const r = need('wet-hall');
    expect(fits(wetHallRoom(), r)).toBe(true);
    // The sizing's 12 m is three 4 m storeys of gantries, for a plant on
    // three levels; on one level the hall needs only its machines' height.
    const tallest = Math.max(...r.machines.map((m) => m.h));
    expect(WET_HALL.roof + WET_HALL.drop).toBeGreaterThanOrEqual(
      tallest + ASSUME.servicesZone,
    );
  });
});
