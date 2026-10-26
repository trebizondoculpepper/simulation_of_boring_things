import type { Footprint } from '../../controls/logic/walk-collision';
import { layoutRoom } from './room-equipment';
import type { Side } from './room-equipment';
import { plantRoomPlan } from './plant-rooms';
import { POOL_HALLS } from './pool-halls';
import { MAIN_CORRIDOR } from './main-corridor';
import { SHELL_ROOMS, WET_HALL } from './shell-rooms';
import { DECK_SOFFIT, olympicRoomPlan } from './olympic-plan';

/**
 * A room's structure, from one place, for everything that runs pipe,
 * conduit or duct in it and must fix it to the building: its floor, the
 * underside of its roof slab (the soffit), the bottom of its services
 * ceiling's zone, its walls' inner faces, its supply wall, and what a
 * support may not pass through (`doc/prompts/008-pipe-supports.md`).
 * Pure: metres, the room's middle at x = z = 0, its floor at y = 0, x
 * east, z south.
 */

/** A box in the room: a machine, a doorway's clear space, a landing. */
export interface Solid {
  name: string;
  kind: 'machine' | 'clear' | 'landing';
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export interface RoomStructure {
  room: string;
  /** Its inside, metres: frontage (x) and depth (z). */
  w: number;
  d: number;
  /** The roof slab's underside, metres over the floor. */
  soffit: number;
  /**
   * The bottom of its services ceiling's zone, metres over the floor: a
   * run that rises into it goes on out of sight. The soffit where the
   * room has a plain ceiling or none.
   */
  ceilingZone: number;
  /** Each wall's inner face: x for the west and east walls, z for the north and south. */
  walls: Readonly<Record<Side, number>>;
  /**
   * The wall its power comes in by: electrical conduits run to the
   * nearest wall, preferring this one (the owner's rule, 2026-10-22).
   */
  supplyWall: Side;
  /** What a support's rod, bracket or stand may not pass through. */
  obstacles: readonly Solid[];
}

/** The services ceiling hangs this far below the roof. */
export const CEILING_ZONE = 1.9;
/** Clear headroom over a doorway's or stair's clear space, metres. */
export const HEADROOM = 2.1;

/** The rooms whose power comes in by a wall other than the west. */
export const SUPPLY_WALLS: Partial<Record<string, Side>> = {};

/** The pool plant rooms, by the hall each serves. */
const PLANT_ROOMS = {
  plant_pool_01: 'pool_01',
  plant_pool_02: 'pool_02',
  plant_pool_03: 'pool_03',
  plant_pool_04: 'pool_04',
} as const;

/** The wet hall's roof over its floor: half a storey down, under the corridor's roof. */
export const WET_HALL_SOFFIT = WET_HALL.drop + MAIN_CORRIDOR.height;

const planOf = (room: keyof typeof PLANT_ROOMS) =>
  plantRoomPlan(POOL_HALLS[PLANT_ROOMS[room]].plantDoor!.size);

/** The room's soffit, and whether it has a services ceiling under it. */
function heights(room: string): { soffit: number; services: boolean } | null {
  if (room in PLANT_ROOMS) {
    const plan = planOf(room as keyof typeof PLANT_ROOMS);
    return { soffit: plan.roof - plan.floor, services: true };
  }
  if (room === 'wet_hall') return { soffit: WET_HALL_SOFFIT, services: true };
  if (room in SHELL_ROOMS) {
    const spec = SHELL_ROOMS[room as keyof typeof SHELL_ROOMS];
    return { soffit: spec.height, services: spec.ceiling === 'services' };
  }
  return null;
}

/** How high over the floor its entrance landing is, if it has one. */
heights.deck = (room: string): number | undefined => {
  if (room in PLANT_ROOMS)
    return -planOf(room as keyof typeof PLANT_ROOMS).floor;
  if (room === 'wet_hall') return WET_HALL.drop;
  return undefined;
};

const box = (
  name: string,
  kind: Solid['kind'],
  f: Footprint,
  minY: number,
  maxY: number,
): Solid => ({
  kind,
  name,
  minX: f.minX,
  maxX: f.maxX,
  minY,
  maxY,
  minZ: f.minZ,
  maxZ: f.maxZ,
});

/** Each room's decks cantilevered from its walls, over clear floor. */
const DECKS: Record<
  string,
  () => readonly (Footprint & { name: string; soffit: number })[]
> = {
  plant_pool_02: () => {
    const plan = olympicRoomPlan();
    return [
      { name: 'gantry', soffit: DECK_SOFFIT, ...plan.gantry },
      { name: 'landing', soffit: DECK_SOFFIT, ...plan.landing },
    ];
  },
};

/**
 * The structure of `room`, or null if it is not a room whose services are
 * laid out. `supplyWall` overrides its supply wall for this helper.
 */
export function roomStructure(
  room: string,
  { supplyWall }: { supplyWall?: Side } = {},
): RoomStructure | null {
  const h = heights(room);
  const layout = layoutRoom(room);
  if (!h || !layout) return null;
  const { w, d, keepClear, solid } = layout.box;
  const machines = layout.placed.map((p) =>
    p.item.mount === 'floor'
      ? box(p.item.label, 'machine', p.footprint, 0, p.item.h)
      : box(
          p.item.label,
          'machine',
          p.footprint,
          p.y - p.item.h / 2,
          p.y + p.item.h / 2,
        ),
  );
  // A landing or stair stands as high as the deck it reaches, and its rail.
  const landing = (heights.deck(room) ?? 0) + 1.1;
  return {
    room,
    w,
    d,
    soffit: h.soffit,
    ceilingZone: h.services ? h.soffit - CEILING_ZONE : h.soffit,
    walls: { west: -w / 2, east: w / 2, north: -d / 2, south: d / 2 },
    supplyWall: supplyWall ?? SUPPLY_WALLS[room] ?? 'west',
    obstacles: [
      ...machines,
      ...keepClear.map((f, i) =>
        box(`clear space ${i + 1}`, 'clear', f, 0, HEADROOM),
      ),
      ...solid.map((f, i) =>
        box(`landing or stair ${i + 1}`, 'landing', f, 0, landing),
      ),
      // Decks cantilevered off the walls, clear floor under them: from
      // their underside up to their rail. Nothing hung from the roof passes
      // through them; what is under them hangs from them (the owner,
      // 2026-10-26).
      ...(DECKS[room]?.() ?? []).map((f) =>
        box(f.name, 'landing', f, f.soffit, landing),
      ),
    ],
  };
}
