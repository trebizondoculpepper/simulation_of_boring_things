import { STOREY } from '../../../game/plant/network/common';
import { DOOR_APPROACH, STAIR, UPPER_FLOOR } from './room-regions';

/**
 * The room sizer (`doc/prompts/done/017-room-sizer-gantries-placement.md`), the
 * first of a room's four layers: how big a plant room must be for what it
 * holds. Each machine takes its footprint, a gap round it and its
 * maintenance access in front; the room adds circulation (the walkways
 * that join the accesses), its doorways' approaches and, if it has one,
 * the stair to its gantry. The figures are working rules to test, not a
 * standard: a compact plant room comes out at about three times its
 * machines' bare footprint. Pure; metres.
 */

export interface SizedItem {
  /** Width, depth and height, metres; its maintenance access in front, metres deep. */
  w: number;
  d: number;
  h: number;
  access?: number;
}

/** The gap kept round each machine, half each side, metres: room for pipes, valves and hands. */
export const MACHINE_GAP = 0.6;
/** Access in front of a machine, by default, metres. */
export const ACCESS = 0.8;
/** The walkways joining the accesses, as a share of what the machines and accesses take. */
export const CIRCULATION = 0.35;
/** The space kept under the soffit for pipe and conduit tiers and their supports, metres. */
export const SERVICE_ZONE = 1.2;

export interface SizeOptions {
  /** Storeys, each `STOREY` tall; two by default (the owner: a two-storey plant room is normal). */
  storeys?: number;
  /** Width over depth. */
  aspect?: number;
  /** Doorways into the room, each with its approach kept clear. */
  doors?: number;
  /** Whether the room has a gantry, and so a stair up to it. */
  gantry?: boolean;
  /** Grow the floor by this share, for a retry when the machines do not fit. */
  grow?: number;
}

export interface RoomSize {
  w: number;
  d: number;
  h: number;
  /** The floor's parts, m², and how each figure was reached. */
  machines: number;
  reasons: string[];
}

const half = (v: number) => Math.ceil(v * 2) / 2;

export function sizeRoom(
  items: readonly SizedItem[],
  {
    storeys = 2,
    aspect = 1,
    doors = 1,
    gantry = storeys >= 2,
    grow = 0,
  }: SizeOptions = {},
): RoomSize {
  const bare = items.reduce((a, i) => a + i.w * i.d, 0);
  const machines = items.reduce(
    (a, i) =>
      a + (i.w + MACHINE_GAP) * (i.d + MACHINE_GAP / 2 + (i.access ?? ACCESS)),
    0,
  );
  const circulation = machines * CIRCULATION;
  const approaches = doors * DOOR_APPROACH * 1.6;
  const stair = gantry
    ? (Math.ceil(UPPER_FLOOR / STAIR.rise) * STAIR.going + STAIR.foot) *
      (STAIR.width + 0.2)
    : 0;
  const floor = (machines + circulation + approaches + stair) * (1 + grow);
  const d = half(Math.sqrt(floor / aspect));
  const w = half(floor / d);
  const tallest = Math.max(0, ...items.map((i) => i.h));
  const h = Math.max(storeys * STOREY, half(tallest + SERVICE_ZONE));
  const reasons = [
    `machines ${bare.toFixed(1)} m² bare, ${machines.toFixed(1)} m² with their gaps and access`,
    `circulation ${circulation.toFixed(1)} m² (${CIRCULATION * 100} %)`,
    `door approaches ${approaches.toFixed(1)} m²`,
    ...(stair ? [`the gantry stair and its foot ${stair.toFixed(1)} m²`] : []),
    ...(grow ? [`grown ${(grow * 100).toFixed(0)} % to fit`] : []),
    `floor ${floor.toFixed(1)} m², so ${w} × ${d} m`,
    `height: ${storeys} storey${storeys === 1 ? '' : 's'} of ${STOREY} m, and the tallest machine ${tallest} m with ${SERVICE_ZONE} m of services over it, so ${h} m`,
  ];
  return { w, d, h, machines: bare, reasons };
}
