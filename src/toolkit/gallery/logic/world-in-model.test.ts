import { describe, expect, it } from 'vite-plus/test';
import {
  MODELLED_WORLD_ROOMS,
  drawnThings,
  roomModel,
  unboundThings,
} from './world-in-model';

/**
 * Everything in the world is in the model (the owner, 2026-10-25): what a
 * plant room draws is bound to a node, fitting or link of its enhanced
 * network, or is decorative. Most rooms are still drawn by hand, so each
 * room's count of unbound things is pinned here, and may only fall: a room
 * migrated to the plumber (prompt 063) lowers its count, and anything new
 * drawn outside the model fails this test. Lower a count when it falls;
 * never raise one.
 */
const UNBOUND: Readonly<Record<string, number>> = {
  plant_pool_01: 75,
  // Drawn by the room's own code, not the plumber: its wall-mounted panel,
  // dosing controller and pumps, the pumps' two discharge valve pairs (the
  // schematic gives the pump block one discharge port), the regulating
  // valve, the busbar's tap-offs, its headers and chemical, sample and
  // ozone lines, and its supply.
  plant_pool_02: 36,
  plant_pool_03: 32,
  plant_pool_04: 21,
  wet_hall: 28,
  boiler_house: 79,
  hypo_store: 12,
  acid_store: 10,
  loading_bay: 7,
  switch_room: 11,
  air_plant: 18,
  control_room: 27,
  engineers_office: 5,
};

describe('everything in the world is in the model', () => {
  it('pins every plant room, and only those', () => {
    expect(Object.keys(UNBOUND).sort()).toEqual(
      [...MODELLED_WORLD_ROOMS].sort(),
    );
  });

  for (const room of MODELLED_WORLD_ROOMS)
    it(`${room}: draws nothing more outside its model than it did`, () => {
      const unbound = unboundThings(room);
      const list = unbound.map((t) => `${t.kind}: ${t.name}`);
      // More than pinned: something new was drawn outside the model.
      expect(unbound.length, list.join('\n')).toBeLessThanOrEqual(
        UNBOUND[room],
      );
      // Fewer: well done; lower the pin so it cannot creep back.
      expect(
        unbound.length,
        `${room} now has ${unbound.length} unbound: lower its pin`,
      ).toBe(UNBOUND[room]);
    });

  it('binds the Olympic plant room, built through the plumber, by model id', () => {
    const model = roomModel('plant_pool_02')!;
    const drawn = drawnThings('plant_pool_02');
    const bound = drawn.filter((t) => t.node && model.has(t.node));
    expect(bound.length).toBeGreaterThan(100);
    // Its filters, their valves and the pumps' suctions are model ids.
    expect(model.has('filter-1')).toBe(true);
    expect(model.has('filter-1.inlet.iso')).toBe(true);
    expect(bound.some((t) => t.node === 'filter-1.inlet.iso')).toBe(true);
  });

  it('counts a thing unbound unless its id is in its room’s model, or it is decorative', () => {
    // A room with no enhanced network binds nothing it draws.
    expect(roomModel('plant_pool_03')).toBeUndefined();
    expect(unboundThings('plant_pool_03')).toHaveLength(
      drawnThings('plant_pool_03').length,
    );
    // Decorative things (the stores' signs, the office's furniture) are not counted.
    const office = drawnThings('engineers_office');
    expect(office.some((t) => t.decorative)).toBe(true);
    expect(unboundThings('engineers_office').every((t) => !t.decorative)).toBe(
      true,
    );
  });
});
