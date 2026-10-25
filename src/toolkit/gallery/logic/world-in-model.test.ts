import { describe, expect, it } from 'vite-plus/test';
import {
  MODELLED_WORLD_ROOMS,
  drawnThings,
  isBound,
  roomModel,
  unboundIdentities,
} from './world-in-model';
import PINNED from './world-in-model.unbound.json';
import { cabinetPipes } from './cabinet-pipes';
import { MODEL_VALVES } from '../../../game/plant/model-valves';

/**
 * Everything in the world is in the model (the owner, 2026-10-25; prompt
 * 064): what a plant room draws is bound to a node, fitting or link of its
 * enhanced network, or is decorative. Most rooms are still drawn by hand,
 * so the things each draws outside the model are pinned by identity in
 * `world-in-model.unbound.json`, written by `scripts/pin-unbound.test.ts`
 * (never by hand). The list may only shrink: anything newly drawn outside
 * the model fails here, and anything bound since must be unpinned.
 */
const pinned = PINNED as Record<string, string[]>;

describe('everything in the world is in the model', () => {
  it('pins every plant room, and only those', () => {
    expect(Object.keys(pinned).sort()).toEqual(
      [...MODELLED_WORLD_ROOMS].sort(),
    );
  });

  for (const room of MODELLED_WORLD_ROOMS)
    it(`${room}: draws nothing outside its model that is not pinned`, () => {
      const unbound = unboundIdentities(room);
      const fresh = unbound.filter((id) => !pinned[room]?.includes(id));
      expect(fresh, 'drawn outside the model: bind it to the model').toEqual(
        [],
      );
      const bound = (pinned[room] ?? []).filter((id) => !unbound.includes(id));
      expect(
        bound,
        'bound since it was pinned: unpin it (PIN_UNBOUND=1 npx vp test run scripts/pin-unbound.test.ts)',
      ).toEqual([]);
    });

  it('binds the Olympic plant room, built through the plumber, by model id and sort', () => {
    const model = roomModel('plant_pool_02')!;
    const drawn = drawnThings('plant_pool_02');
    expect(
      drawn.filter((t) => isBound(t.binding, model)).length,
    ).toBeGreaterThan(100);
    expect(model.nodes.has('filter-1')).toBe(true);
    expect(model.fittings.has('filter-1.inlet.iso')).toBe(true);
    // A binding of the wrong sort is not bound: a fitting's id as a node.
    expect(isBound({ node: 'filter-1.inlet.iso' }, model)).toBe(false);
    expect(isBound({ fitting: 'filter-1.inlet.iso' }, model)).toBe(true);
    expect(isBound({ link: 'filter-1.inlet' }, model)).toBe(true);
  });

  it('binds nothing in a room with no model, but decorative things', () => {
    expect(roomModel('switch_room')).toBeUndefined();
    expect(isBound({ fitting: 'x' }, undefined)).toBe(false);
    expect(isBound({ decorative: true }, undefined)).toBe(true);
    const office = drawnThings('engineers_office');
    expect(office.some((t) => t.binding && 'decorative' in t.binding)).toBe(
      true,
    );
  });
});

describe('the jacuzzi plant room’s drawing is its model’s', () => {
  it('sets each drawn valve on its own run, worked as its schematic says', () => {
    let valves = 0;
    for (const run of cabinetPipes('plant_pool_03')) {
      if (!run.valve) continue;
      valves++;
      const fitting = MODEL_VALVES.find(
        (v) => v.room === 'plant_pool_03' && v.name === run.valve!.id,
      );
      expect(fitting, run.name).toBeDefined();
      // Its fitting sits on the link the run is drawn for.
      expect(fitting!.link, run.name).toBe(run.link);
      expect(run.valve.operator, run.name).toBe(fitting!.operator);
    }
    expect(valves).toBe(10);
  });
});
