import { alongCorridor } from '../../components/architectural/logic/corridor-path';
import { joints, roomCorridors } from './pool-loop';
import type { LoopRoom } from './pool-loop';
import { POOL_HALLS } from './pool-halls';
import { shellPlan } from './shell-plan';
import { cabinetGully } from './cabinet-pipes';

const copies = new Map(
  (['pool_02', 'pool_03', 'pool_04'] as const).map((room) => [
    room,
    roomCorridors(room),
  ]),
);
const smooth = (x: number) => {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
};

/** Route distance survives the corridor-copy handover, including turns and stairs. */
export function jacuzziApproachDistance(
  room: string,
  x: number,
  z: number,
): number {
  const hall = POOL_HALLS.pool_03;
  if (
    room === 'pool_03' &&
    Math.abs(x) <= hall.w / 2 &&
    Math.abs(z) <= hall.d / 2
  )
    return 0;
  const routes = copies.get(room as 'pool_02' | 'pool_03' | 'pool_04');
  if (!routes) return Infinity;
  if (room !== 'pool_04') {
    const into = alongCorridor(routes.leaving.placed, x, z);
    if (into !== null)
      return room === 'pool_03' ? into : routes.leaving.length - into;
  }
  if (room !== 'pool_02') {
    const into = alongCorridor(routes.arriving.placed, x, z);
    if (into !== null)
      return room === 'pool_03' ? routes.arriving.length - into : into;
  }
  if (room === 'pool_03') return Infinity;
  const door =
    room === 'pool_02'
      ? joints(room as LoopRoom).exit
      : joints(room as LoopRoom).entry;
  const length =
    room === 'pool_02' ? routes.leaving.length : routes.arriving.length;
  return Math.hypot(x - door.x, z - door.z) + length;
}

/** Full nominal volume in the last metre; fade smoothly to silence 12 m away. */
export const jacuzziApproachGain = (room: string, x: number, z: number) =>
  smooth((12 - jacuzziApproachDistance(room, x, z)) / 11);

/** The closed plant-room door removes 30 dB; a clearly open door removes none. */
export const jacuzziDrainDoorGain = (angle: number) =>
  10 ** ((-30 * (1 - smooth(angle / 0.35))) / 20);

/**
 * How far the jacuzzi's drain tundish, behind its cabinet, is from the
 * plant room door to its hall, metres: the gurgle's way out to the hall.
 */
export const JACUZZI_DRAIN_TO_DOOR = (() => {
  const plan = shellPlan(POOL_HALLS.pool_03.plantDoor!.size);
  const [x, , z] = cabinetGully('plant_pool_03')!;
  return Math.hypot(x - plan.door.at, z + plan.hz);
})();

/**
 * The gurgle's share left at the door, falling off inversely with
 * distance as every placed sound does (`part-audio.ts`, 1.2 m reference):
 * well below what is heard standing at the tundish.
 */
export const JACUZZI_DRAIN_AT_DOOR = Math.min(1, 1.2 / JACUZZI_DRAIN_TO_DOOR);
