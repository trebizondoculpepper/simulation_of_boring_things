import { plantRoomPlan } from './plant-rooms';
import { shellPlan } from './shell-plan';
import type { ShellPlan } from './shell-plan';
import type { RoomBox } from './room-equipment';

/** Plant Room 1's first sized trial: the lounge pool north, shared halls south. */
export const LOUNGE_ROOM = { w: 12, d: 11, h: 8 } as const;
const hx = LOUNGE_ROOM.w / 2;
const hz = LOUNGE_ROOM.d / 2;
const template = plantRoomPlan('medium');
const northShift = template.h - hz;
const landing = {
  ...template.landing,
  minZ: -hz,
  maxZ: template.landing.maxZ + northShift,
};
const stair = {
  ...template.stair,
  top: template.stair.top + northShift,
  bottom: template.stair.bottom + northShift,
};

export function loungeShellPlan(): ShellPlan {
  const base = shellPlan('medium');
  return {
    ...base,
    hx,
    hz,
    decks: [landing],
    rails: [
      [
        [landing.minX, landing.minZ + 0.05],
        [landing.minX, landing.maxZ],
      ],
      [
        [landing.minX, landing.maxZ],
        [stair.minX, landing.maxZ],
      ],
    ],
    stair: {
      ...base.stair!,
      minZ: stair.top,
      maxZ: stair.bottom,
      top: stair.top,
      bottom: stair.bottom,
      openSide: [
        [stair.minX, stair.top],
        [stair.minX, stair.bottom],
      ],
    },
    door: { ...base.door, at: template.door.x },
    equipment: { ...base.equipment, at: 0 },
    label: '12 × 11 m · two storeys',
  };
}

/** Machine-placement exclusions drawn from the same doors, landing and stair. */
export function loungeRoomBox(): RoomBox {
  return {
    w: LOUNGE_ROOM.w,
    d: LOUNGE_ROOM.d,
    pipes: { north: 0.5, south: 0.5 },
    entry: { x: 0, z: hz - 0.6 },
    keepClear: [
      { minX: -1.3, maxX: 1.3, minZ: hz - 1.6, maxZ: hz },
      {
        minX: stair.minX - 0.3,
        maxX: hx,
        minZ: stair.bottom,
        maxZ: stair.bottom + 1.2,
      },
    ],
    solid: [
      {
        minX: landing.minX - 0.05,
        maxX: hx,
        minZ: -hz,
        maxZ: landing.maxZ + 0.05,
      },
      {
        minX: stair.minX - 0.05,
        maxX: hx,
        minZ: stair.top,
        maxZ: stair.bottom,
      },
    ],
  };
}
