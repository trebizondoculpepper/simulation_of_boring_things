import { placedPort } from './machine-ports';
import { layoutRoom } from './room-equipment';
import { SHELL_ROOMS } from './shell-rooms';
import type { PipeRun } from './room-pipes';

type Vec3 = [number, number, number];

/**
 * The loading bay's chemical lines (plan 085; the owner, 2026-10-27).
 * From the one delivery fill cabinet, by the tanker's bay on the acid
 * store's wall: the acid's delivery line straight back through that wall
 * into its store, and the hypochlorite's up out of the cabinet's top,
 * across the bay over the lorries' openings and into the hypochlorite
 * store's wall opposite. And each store's main to the wet hall, out of
 * its store's wall by its door, across the bay at high level and out
 * through the corridor wall beside the equipment doors. Hypochlorite on
 * the east, acid on the west, the whole bay between them. PVC-U, double-
 * contained and marked by the room's pipework. Pure: metres, the bay's
 * frame (its middle at the origin, x east, z south toward the corridor,
 * the floor at y = 0).
 */

const BAY = SHELL_ROOMS.loading_bay;
const X = BAY.w / 2;
const Z = BAY.d / 2;
/** How far a line goes into a wall: through it. */
const WALL = 0.2;
/** The hypochlorite's delivery line across the bay, over the shutters' boxes. */
const OVER_SHUTTERS = 5.6;
/** The mains' level across the bay, clear of the lorries' tail lifts and the pallets. */
const MAIN_Y = 4.0;
/** Where the hypochlorite's delivery line goes into its store's wall. */
const DELIVERY_IN = -0.3;
/** Where each main comes out of its store's wall, by the store's door. */
const MAIN_OUT = 0.1;
/** The mains out through the corridor wall, either side of its doors. */
const MAIN_X = 1.6;
const LABEL = {
  hypochlorite: 'SODIUM HYPOCHLORITE 14%',
  acid: 'HYDROCHLORIC ACID 10%',
} as const;

export function loadingBayPlumbing(): PipeRun[] {
  const runs: PipeRun[] = [];
  const cabinet = layoutRoom('loading_bay')?.placed.find(
    (p) => p.item.key === 'fill-cabinet',
  );
  if (cabinet) {
    // The acid: straight back into the wall behind the cabinet.
    const acid = placedPort(cabinet, 'acid');
    const [ax, ay, az] = acid.at;
    const [ox, , oz] = acid.outward;
    runs.push({
      name: 'Acid delivery line',
      kind: 'pvc-pressure',
      od: 0.04,
      points: [
        [ax - ox * 0.12, ay, az - oz * 0.12],
        [ax + ox * WALL, ay, az + oz * WALL],
      ],
      joins: [],
      service: 'acid',
      label: LABEL.acid,
      through: [
        {
          at: [ax + (ox * WALL) / 2, ay, az + (oz * WALL) / 2],
          normal: [-ox, 0, -oz],
          thickness: WALL,
          kind: 'fire-collar',
        },
      ],
      valves: [],
    });
    // The hypochlorite: up out of the cabinet's top, along the outside
    // wall over the openings, and down the far wall into its store.
    const hypo = placedPort(cabinet, 'hypochlorite');
    const [hx, hy, hz] = hypo.at;
    const along = X - 0.15;
    runs.push({
      name: 'Hypochlorite delivery line',
      kind: 'pvc-pressure',
      od: 0.05,
      points: [
        [hx, hy, hz],
        [hx, OVER_SHUTTERS, hz],
        [along, OVER_SHUTTERS, hz],
        [along, OVER_SHUTTERS, DELIVERY_IN],
        [X + WALL, OVER_SHUTTERS, DELIVERY_IN],
      ],
      joins: [],
      service: 'hypochlorite',
      label: LABEL.hypochlorite,
      through: [
        {
          at: [X + WALL / 2, OVER_SHUTTERS, DELIVERY_IN],
          normal: [-1, 0, 0],
          thickness: WALL,
          kind: 'fire-collar',
        },
      ],
      valves: [],
    });
  }
  for (const [chemical, side, Name] of [
    ['hypochlorite', 1, 'Hypochlorite'],
    ['acid', -1, 'Acid'],
  ] as const) {
    const main: Vec3[] = [
      [side * (X + WALL), MAIN_Y, MAIN_OUT],
      [side * MAIN_X, MAIN_Y, MAIN_OUT],
      [side * MAIN_X, MAIN_Y, Z + WALL],
    ];
    runs.push({
      name: `${Name} main through the bay`,
      kind: 'pvc-pressure',
      od: 0.032,
      points: main,
      joins: [],
      service: chemical,
      label: LABEL[chemical],
      through: [
        {
          at: [side * (X + WALL / 2), MAIN_Y, MAIN_OUT],
          normal: [-side, 0, 0],
          thickness: WALL,
          kind: 'fire-collar',
        },
        {
          at: [side * MAIN_X, MAIN_Y, Z + WALL / 2],
          normal: [0, 0, -1],
          thickness: WALL,
          kind: 'fire-collar',
        },
      ],
      valves: [],
    });
  }
  return runs;
}
