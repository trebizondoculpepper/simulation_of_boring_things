import type { Footprint } from '../../controls/logic/walk-collision';

/**
 * A storey of the building, metres: the plant's levels are 4 m apart, the
 * wet hall on level 0, and a plant room is normally two storeys tall.
 */
export const STOREY = 4;

/**
 * The per-attraction plant rooms (`doc/plant-model.md`): each two storeys
 * high, in three sizes (small 8 m, medium 12 m, large 22 m square; the
 * large for the Olympic pool), and a tiny one, 5 m square and one storey,
 * for a packaged set (the footbath's), entered on the level with no stair. Each is entered at deck level through the
 * plant room door in its south wall, toward the attraction it serves, onto
 * a steel landing, from which a steep steel industrial stair runs down its
 * east wall to the plant floor a storey below; its north wall, at the
 * plant floor, has the double equipment doors through to the central
 * plant. Machinery fills its west wall first. For now each is a bare shell
 * (`AGENTS.md`). Pure: metres, the room's middle at x = z = 0, the deck
 * (and the landing) at y = 0, x east, z south.
 */

export type PlantRoomSize = 'tiny' | 'small' | 'medium' | 'large';

/** The plant room door's structural opening, its frame included, metres. */
export const PLANT_DOORWAY = 0.926 + 2 * 0.05;
/** The equipment doors' structural opening (`equipment-doors.ts`), metres. */
export const EQUIPMENT_OPENING = 1.8 + 2 * 0.06;
/**
 * The doorway's sill over a pool hall's deck: as high as the deck's cove
 * (0.25 m), so the fillet runs on unbroken under it; a raised threshold,
 * as a plant room door often has, a bund against spills.
 */
export const PLANT_SILL = 0.25;
/**
 * The depth along the north wall, south of the landing, kept for a battery
 * of large filters in a line (3 m vessels, 3.8 m with their face pipework),
 * metres: the large room's balance tank doors open south of it.
 */
export const NORTH_BATTERY = 3.9;

export const PLANT_ROOM_SIZES: Record<PlantRoomSize, number> = {
  tiny: 5,
  small: 8,
  medium: 12,
  large: 22,
};

export const PLANT_ROOM = {
  /** Each storey's height: the plant floor this far below the deck, the roof this far above it. */
  storey: 3.5,
  wall: 0.2,
  /** The landing (or gantry) inside the door: its depth from the south wall, and width. */
  landing: { depth: 1.2, width: 1.6 },
  /** The stair: its width, its steps (BS 5395-3 industrial, about 42 degrees). */
  stair: { width: 1.0, riser: 0.19, going: 0.216, offAt: 1 },
  /** The plant room door's middle, in from the east wall. */
  doorIn: 0.9,
  /** The equipment doors in the south wall: a pair of leaves, their opening. */
  equipment: { w: 1.8, h: 2.4 },
} as const;

/**
 * A plant room of `size`: its plan, the landing's, the stair's and the doors'.
 * `tankHall`: a large room whose balance tank is in a hall of its own beside
 * it (the Olympic's, from 2026-10-23, `doc/prompts/done/033-olympic-plant-redo.md`)
 * has the equipment doors to it in its west wall, at the north end of the
 * plant floor.
 */
export function plantRoomPlan(
  size: PlantRoomSize,
  { tankHall = false }: { tankHall?: boolean } = {},
) {
  const side = PLANT_ROOM_SIZES[size];
  const h = side / 2;
  const P = PLANT_ROOM;
  // The tiny room is one storey, its floor level with the deck: no stair.
  const stepFree = size === 'tiny';
  const steps = Math.round(P.storey / P.stair.riser);
  const riser = P.storey / steps;
  // A tread for each riser but the last, which is the landing's edge.
  const run = (steps - 1) * P.stair.going;
  const landing = {
    // The Olympic pool's large plant room has a full-width viewing gantry.
    minX: size === 'large' ? -h : h - P.landing.width,
    maxX: h,
    minZ: -h,
    maxZ: -h + P.landing.depth,
  };
  // Down the east wall from the landing's south edge, heading south.
  const stair = {
    minX: h - P.stair.width,
    maxX: h,
    top: landing.maxZ,
    bottom: landing.maxZ + run,
    steps,
    riser,
  };
  return {
    side,
    h,
    stepFree,
    floor: stepFree ? 0 : -P.storey,
    // The tiny room's one storey is as tall as the main corridor (7 m).
    // The large and medium rooms' roofs are a metre higher (8 m in all):
    // their pipework crosses over the filters, and over their gantries'
    // headroom, under the services ceiling, which hangs 1.9 m below.
    roof: stepFree
      ? 2 * P.storey
      : size === 'large' || size === 'medium'
        ? P.storey + 1
        : P.storey,
    landing,
    stair,
    // The pool side's door north, the main plant's south.
    door: { x: h - P.doorIn, z: -h },
    equipment: { x: 0, z: h, ...P.equipment },
    // In the north half of the west wall, just south of a battery of
    // large filters along the north wall (the owner, 2026-10-23), the
    // space kept clear inside the doors (1.3 m each way) clear of it.
    tankDoor:
      tankHall && size === 'large'
        ? { x: -h, z: landing.maxZ + NORTH_BATTERY + 1.3 }
        : null,
  };
}

export type PlantRoomPlan = ReturnType<typeof plantRoomPlan>;

/** The floor under the walker: the landing, a tread of the stair, or the plant floor. */
export function plantRoomFloorAt(plan: PlantRoomPlan, x: number, z: number) {
  const { landing, stair } = plan;
  if (plan.stepFree) return 0;
  // In the doorway, through the wall: level with the landing it opens onto.
  if (z <= landing.minZ && Math.abs(x - plan.door.x) <= PLANT_DOORWAY / 2 + 0.3)
    return 0;
  if (
    x >= landing.minX &&
    x <= landing.maxX &&
    z >= landing.minZ &&
    z <= landing.maxZ
  )
    return 0;
  if (
    x >= stair.minX &&
    x <= stair.maxX &&
    z >= stair.top &&
    z <= stair.bottom
  ) {
    // Treads down from the landing, each a going further north.
    const down = Math.ceil((z - stair.top) / PLANT_ROOM.stair.going);
    return -Math.min(stair.steps, down) * stair.riser;
  }
  return plan.floor;
}

/**
 * The walls, and the landing's and stair's guard rails (so no one steps
 * off the landing, or walks in under it from the plant floor), for
 * walking collision. The walls are solid but for the doors, which are
 * shut for now.
 */
export function plantRoomSolids(plan: PlantRoomPlan): Footprint[] {
  const { h, landing, stair } = plan;
  const t = PLANT_ROOM.wall;
  const rail = 0.05;
  const dx = plan.door.x;
  const ex = plan.equipment.x;
  const walls: Footprint[] = [
    // The north wall, either side of the plant room door; the south either
    // side of the equipment doors.
    { minX: -h - t, maxX: dx - PLANT_DOORWAY / 2, minZ: -h - t, maxZ: -h },
    { minX: dx + PLANT_DOORWAY / 2, maxX: h + t, minZ: -h - t, maxZ: -h },
    { minX: -h - t, maxX: ex - EQUIPMENT_OPENING / 2, minZ: h, maxZ: h + t },
    { minX: ex + EQUIPMENT_OPENING / 2, maxX: h + t, minZ: h, maxZ: h + t },
    // The west wall, either side of the balance tank hall's doors if it has them.
    ...(plan.tankDoor
      ? [
          {
            minX: -h - t,
            maxX: -h,
            minZ: -h,
            maxZ: plan.tankDoor.z - EQUIPMENT_OPENING / 2,
          },
          {
            minX: -h - t,
            maxX: -h,
            minZ: plan.tankDoor.z + EQUIPMENT_OPENING / 2,
            maxZ: h,
          },
        ]
      : [{ minX: -h - t, maxX: -h, minZ: -h, maxZ: h }]),
    { minX: h, maxX: h + t, minZ: -h, maxZ: h },
  ];
  if (plan.stepFree) return walls;
  return [
    ...walls,
    // The landing's west edge, and its south edge but for the stair.
    {
      minX: landing.minX - rail,
      maxX: landing.minX,
      minZ: landing.minZ,
      maxZ: landing.maxZ,
    },
    {
      minX: landing.minX - rail,
      maxX: stair.minX,
      minZ: landing.maxZ,
      maxZ: landing.maxZ + rail,
    },
    // The stair's open (west) side, but for its last metre, where its
    // treads are low enough to step off sideways.
    {
      minX: stair.minX - rail,
      maxX: stair.minX,
      minZ: stair.top,
      maxZ: stair.bottom - PLANT_ROOM.stair.offAt,
    },
  ];
}

/** A shut door's leaf across a doorway, as a footprint. */
export function doorwayBlock(
  wall: 'west' | 'east' | 'north' | 'south',
  at: { x: number; z: number },
): Footprint {
  const half = PLANT_DOORWAY / 2;
  return wall === 'west'
    ? { minX: at.x - 0.2, maxX: at.x, minZ: at.z - half, maxZ: at.z + half }
    : wall === 'east'
      ? { minX: at.x, maxX: at.x + 0.2, minZ: at.z - half, maxZ: at.z + half }
      : wall === 'north'
        ? { minX: at.x - half, maxX: at.x + half, minZ: at.z - 0.2, maxZ: at.z }
        : {
            minX: at.x - half,
            maxX: at.x + half,
            minZ: at.z,
            maxZ: at.z + 0.2,
          };
}
