import type { Footprint } from '../../controls/logic/walk-collision';
import {
  EQUIPMENT_OPENING,
  PLANT_DOORWAY,
  PLANT_ROOM,
  plantRoomPlan,
} from './plant-rooms';
import type { PlantRoomSize } from './plant-rooms';

/**
 * A plant room's shell, in plan, whatever its shape (`prompt 033`): its
 * size, its decks at deck level (a landing, a gantry) and whether they are
 * cantilevered from the walls, its stair and which way it runs down, its
 * doorways (each a wall and a place along it), its deck's guard rails, and
 * where its title hangs. The shell's view, its walking and its doorways'
 * joins are drawn from it, so a square template room and the Olympic's
 * 22 × 14 m room share one way of being built. Pure; metres, the room's
 * middle at x = z = 0, the deck at y = 0, x east, z south.
 */

export type Wall = 'north' | 'south' | 'east' | 'west';

export interface ShellDoorway {
  wall: Wall;
  /** Its middle along its wall: x on the north and south, z on the east and west. */
  at: number;
  /** Its structural opening, metres. */
  width: number;
}

export interface ShellStair {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  steps: number;
  riser: number;
  /** The way it runs down from its top. */
  heading: Wall;
  /** Its top edge, and its foot, along its heading's axis (z heading south, x heading west). */
  top: number;
  bottom: number;
  /** The last part of its open side, free to step off sideways, metres. */
  offAt: number;
  /** Its open side, guarded by a rail: a line in plan, from its top to its foot. */
  openSide: readonly [readonly [number, number], readonly [number, number]];
}

export interface ShellPlan {
  /** Inside the walls: half its width (x) and half its depth (z). */
  hx: number;
  hz: number;
  stepFree: boolean;
  /** The plant floor and the roof, from the deck. */
  floor: number;
  roof: number;
  /** The floors at deck level: a landing, a gantry. */
  decks: readonly Footprint[];
  /** Hung from the walls on brackets, no legs: the plant floor under them is clear. */
  cantilevered: boolean;
  /** The decks' guard rails, each a line in plan at deck level. */
  rails: readonly (readonly [
    readonly [number, number],
    readonly [number, number],
  ])[];
  stair: ShellStair | null;
  /** The plant room door, at deck level (on the floor in a step-free room). */
  door: ShellDoorway;
  /** The equipment doors to the main corridor, on the plant floor. */
  equipment: ShellDoorway;
  /** The equipment doors to a balance tank hall, on the plant floor, if any. */
  tankDoor: ShellDoorway | null;
  /** Its title card: on which wall's inner face, where along it, how high from the deck. */
  title: { wall: Wall; at: number; y: number };
  /** Its size, for its title card. */
  label: string;
  /** The services ceiling's seed, and how many lamps a storey. */
  seed: number;
  lamps: number;
}

/** A doorway's wall as frames: a point on its inner face, its outward normal, along it. */
export function wallFrame(
  plan: Pick<ShellPlan, 'hx' | 'hz'>,
  wall: Wall,
  at: number,
) {
  const { hx, hz } = plan;
  switch (wall) {
    case 'north':
      return { x: at, z: -hz, out: [0, -1] as const, along: [1, 0] as const };
    case 'south':
      return { x: at, z: hz, out: [0, 1] as const, along: [1, 0] as const };
    case 'east':
      return { x: hx, z: at, out: [1, 0] as const, along: [0, 1] as const };
    case 'west':
      return { x: -hx, z: at, out: [-1, 0] as const, along: [0, 1] as const };
  }
}

/** Turned as Three turns an object, so that its +z points `into` (a unit in plan). */
export const yawToward = (into: readonly [number, number]) =>
  Math.atan2(into[0], into[1]);

/** A square template room's shell, as `plantRoomPlan` has it. */
export function shellPlan(
  size: PlantRoomSize,
  options: { tankHall?: boolean } = {},
): ShellPlan {
  const p = plantRoomPlan(size, options);
  const { h, landing, stair } = p;
  return {
    hx: h,
    hz: h,
    stepFree: p.stepFree,
    floor: p.floor,
    roof: p.roof,
    decks: p.stepFree ? [] : [landing],
    cantilevered: false,
    rails: p.stepFree
      ? []
      : [
          [
            [landing.minX, landing.minZ + 0.05],
            [landing.minX, landing.maxZ],
          ],
          [
            [landing.minX, landing.maxZ],
            [stair.minX, landing.maxZ],
          ],
        ],
    stair: p.stepFree
      ? null
      : {
          minX: stair.minX,
          maxX: stair.maxX,
          minZ: stair.top,
          maxZ: stair.bottom,
          steps: stair.steps,
          riser: stair.riser,
          heading: 'south',
          top: stair.top,
          bottom: stair.bottom,
          offAt: PLANT_ROOM.stair.offAt,
          openSide: [
            [stair.minX, stair.top],
            [stair.minX, stair.bottom],
          ],
        },
    door: { wall: 'north', at: p.door.x, width: PLANT_DOORWAY },
    equipment: { wall: 'south', at: p.equipment.x, width: EQUIPMENT_OPENING },
    tankDoor: p.tankDoor
      ? { wall: 'west', at: p.tankDoor.z, width: EQUIPMENT_OPENING }
      : null,
    title: {
      wall: 'north',
      at: p.stepFree ? -h + 1.1 : Math.min(0, p.equipment.x - 2),
      y: 1.8,
    },
    label: `${p.side} × ${p.side} m · ${p.stepFree ? 'one storey' : 'two storeys'}`,
    seed: { tiny: 5, small: 11, medium: 23, large: 37 }[size],
    lamps: size === 'large' ? 2 : 1,
  };
}

const inside = (f: Footprint, x: number, z: number) =>
  x >= f.minX && x <= f.maxX && z >= f.minZ && z <= f.maxZ;

/** Whether a walker standing this high is up at deck level (or on the stair), not on the plant floor. */
export const aloft = (plan: ShellPlan, y: number) => y > plan.floor + 0.5;

/**
 * The floor under the walker: a deck, a tread of the stair, or the plant
 * floor. Under a cantilevered deck the plant floor is open, so which one
 * depends on where the walker stands already (`previous`).
 */
export function shellFloorAt(
  plan: ShellPlan,
  x: number,
  z: number,
  previous = 0,
): number {
  if (plan.stepFree) return 0;
  const up = aloft(plan, previous);
  // In the plant room door, through its wall: level with the deck it opens onto.
  const d = wallFrame(plan, plan.door.wall, plan.door.at);
  const across = d.along[0] ? x - d.x : z - d.z;
  const out = d.out[0] ? (x - d.x) * d.out[0] : (z - d.z) * d.out[1];
  if (out >= 0 && Math.abs(across) <= plan.door.width / 2 + 0.3 && up) return 0;
  const s = plan.stair;
  if (
    s &&
    inside(s, x, z) &&
    // A walker on the plant floor reaches the stair only at its foot.
    (up ||
      stairDown(s, x, z) >=
        s.steps - Math.ceil(s.offAt / PLANT_ROOM.stair.going))
  )
    return -Math.min(s.steps, stairDown(s, x, z)) * s.riser;
  for (const deck of plan.decks)
    if (inside(deck, x, z) && (up || !plan.cantilevered)) return 0;
  return plan.floor;
}

/** How many treads down from the stair's top a point stands. */
function stairDown(s: ShellStair, x: number, z: number) {
  const d =
    s.heading === 'south'
      ? z - s.top
      : s.heading === 'north'
        ? s.top - z
        : s.heading === 'west'
          ? s.top - x
          : x - s.top;
  return Math.ceil(d / PLANT_ROOM.stair.going);
}

/** A line in plan as a thin footprint. */
const fence = (
  [[x0, z0], [x1, z1]]: readonly (readonly [number, number])[],
  t = 0.05,
): Footprint => ({
  minX: Math.min(x0, x1) - (x0 === x1 ? t : 0),
  maxX: Math.max(x0, x1),
  minZ: Math.min(z0, z1) - (z0 === z1 ? t : 0),
  maxZ: Math.max(z0, z1),
});

/**
 * What stops the walker, for the level it stands on: the walls, each
 * broken only by the doorways at that level (the plant room door at deck
 * level; the equipment doors on the plant floor); up on a deck or the
 * stair, the guard rails and the stair's open side; on the plant floor, a
 * deck that is not cantilevered (no one walks in under it) and the stair
 * but for its foot.
 */
export function shellSolids(plan: ShellPlan, up: boolean): Footprint[] {
  const { hx, hz } = plan;
  const t = PLANT_ROOM.wall;
  const doorways = [
    ...(plan.stepFree || up ? [plan.door] : []),
    ...(plan.stepFree || !up ? [plan.equipment] : []),
    ...(plan.tankDoor && (plan.stepFree || !up) ? [plan.tankDoor] : []),
  ];
  const wall = (w: Wall): Footprint[] => {
    const cuts = doorways
      .filter((d) => d.wall === w)
      .map((d) => [d.at - d.width / 2, d.at + d.width / 2] as const)
      .sort((a, b) => a[0] - b[0]);
    const half = w === 'north' || w === 'south' ? hx : hz;
    const out: Footprint[] = [];
    let from = -half - t;
    for (const [a, b] of [...cuts, [half + t, half + t] as const]) {
      if (a > from)
        out.push(
          w === 'north'
            ? { minX: from, maxX: a, minZ: -hz - t, maxZ: -hz }
            : w === 'south'
              ? { minX: from, maxX: a, minZ: hz, maxZ: hz + t }
              : w === 'west'
                ? { minX: -hx - t, maxX: -hx, minZ: from, maxZ: a }
                : { minX: hx, maxX: hx + t, minZ: from, maxZ: a },
        );
      from = b;
    }
    return out;
  };
  const walls = (['north', 'south', 'east', 'west'] as const).flatMap(wall);
  if (plan.stepFree) return walls;
  const s = plan.stair;
  if (up)
    return [
      ...walls,
      ...plan.rails.map((r) => fence(r)),
      ...(s ? [fence(stepOffTrimmed(s))] : []),
    ];
  return [
    ...walls,
    ...(plan.cantilevered ? [] : plan.decks.map((d) => ({ ...d }))),
    ...(s ? [stairBelowFoot(s)] : []),
  ];
}

/** The stair's open side (top to foot), but for its last part, where it is low enough to step off. */
function stepOffTrimmed(s: ShellStair) {
  const [[x0, z0], [x1, z1]] = s.openSide;
  const l = Math.hypot(x1 - x0, z1 - z0) || 1;
  const k = Math.min(s.offAt, l);
  return [
    [x0, z0],
    [x1 - ((x1 - x0) / l) * k, z1 - ((z1 - z0) / l) * k],
  ] as const;
}

/** The stair's footprint but for its foot, for a walker on the plant floor. */
function stairBelowFoot(s: ShellStair): Footprint {
  const k = s.offAt;
  return s.heading === 'south'
    ? { ...s, maxZ: s.maxZ - k }
    : s.heading === 'north'
      ? { ...s, minZ: s.minZ + k }
      : s.heading === 'west'
        ? { ...s, minX: s.minX + k }
        : { ...s, maxX: s.maxX - k };
}
