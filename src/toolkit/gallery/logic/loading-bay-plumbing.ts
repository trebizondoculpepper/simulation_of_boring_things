import { placedPort } from './machine-ports';
import { layoutRoom } from './room-equipment';
import { SHELL_ROOMS } from './shell-rooms';
import type { PipeRun } from './room-pipes';
import { chemicalLineFittings } from './chemical-line-fittings';
import { routeVoxelLines } from '../../components/core/logic/voxel-router';
import type { RouterLine } from '../../components/core/logic/voxel-router';
import type { PortEnd } from '../../components/core/logic/pipe-route';
import { pricePerMetre } from '../../components/core/logic/pipe-costs';
import { SCHEMATICS } from '../../../game/plant/schematics';

type Vec3 = [number, number, number];

/**
 * The loading bay's chemical lines (plan 085; the owner, 2026-10-27),
 * each a chemical link of its schematic (`LOADING_BAY_SCHEMATIC`). From
 * the one delivery fill cabinet, by the tanker's bay on the acid store's
 * wall: the acid's delivery line up out of the cabinet's top and straight
 * back through that wall into its store, laid by rule (a riser and an
 * elbow is its whole route); the hypochlorite's up out of the cabinet's
 * top, across the bay over the lorries' openings and into the hypochlorite
 * store's wall opposite. And each store's main to the wet hall, out of
 * its store's wall by its door and out through the corridor wall beside
 * the equipment doors, where the corridor's services take it on. These
 * three are laid by the voxel router (prompt 085, gap 2) between their
 * sleeves, round the cabinets, clear of the lorries' bays below the
 * shutters' boxes and of the doors' clear ways; each run then carried on
 * through its wall. Each fill port's valves set in its riser by the
 * plumber. PVC-U, double-contained and marked by the room's pipework.
 * Pure: metres, the bay's frame (its middle at the origin, x east, z
 * south toward the corridor, the floor at y = 0).
 */

const BAY = SHELL_ROOMS.loading_bay;
const X = BAY.w / 2;
const Z = BAY.d / 2;
/** How far a line goes into a wall: through it. */
const WALL = 0.2;
/** Where the hypochlorite's delivery line goes into its store's wall, high, over the shutters' boxes. */
const OVER_SHUTTERS = 5.0;
/** The mains' sleeves' height, in the stores' walls and the corridor's. */
const MAIN_Y = 3.6;
/** A routed line's end, this far in from its wall's face, at its sleeve. */
const SLEEVE = 0.3;
/** The lorries' bays kept clear below this, in front of their openings (each 3.2 m wide, 4.5 m high). */
const BAYS_CLEAR = 4.9;
/** The lorries' bodies stand in the dock's north half, to here. */
const BODIES_TO = -0.5;
/** Clear of their tail lifts and the pallets the whole depth of the dock, below this. */
const TAIL_LIFTS = 3.2;
/** A door's clear way's height. */
const DOOR_HEAD = 2.7;
/** The acid's delivery line's height back into its store's wall, over its port's valves. */
const ACID_UP = 2.6;
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
  return loadingBayLines().runs;
}

/** The bay's chemical lines, and anything the router could not lay. */
export function loadingBayLines(): { runs: PipeRun[]; problems: string[] } {
  const runs: PipeRun[] = [];
  const problems: string[] = [];
  const layout = layoutRoom('loading_bay');
  const cabinet = layout?.placed.find((p) => p.item.key === 'fill-cabinet');
  if (!layout || !cabinet) return { runs, problems: ['no room'] };
  const links = SCHEMATICS.loading_bay!.links.filter(
    (l) => l.medium === 'chemical',
  );
  const has = (id: string) => links.some((l) => l.id === id);
  // The acid: up out of the cabinet's top through its port's valves,
  // then straight back into the wall behind the cabinet (its store's).
  const acid = placedPort(cabinet, 'acid');
  const [ax, ay, az] = acid.at;
  if (has('Acid delivery line')) {
    const acidPoints: Vec3[] = [
      [ax, ay, az],
      [ax, ACID_UP, az],
      [-X - WALL, ACID_UP, az],
    ];
    const acidSet = chemicalLineFittings(
      'loading_bay',
      'Acid delivery line',
      acidPoints,
      0.04,
      { reach: [0.3, 2.2] },
    );
    problems.push(...acidSet.problems);
    runs.push({
      name: 'Acid delivery line',
      kind: 'pvc-pressure',
      od: 0.04,
      points: acidPoints,
      joins: [],
      service: 'acid',
      label: LABEL.acid,
      through: [
        {
          at: [-X - WALL / 2, ACID_UP, az],
          normal: [1, 0, 0],
          thickness: WALL,
          kind: 'fire-collar',
        },
      ],
      valves: acidSet.valves,
      checks: acidSet.checks,
    });
  }
  // The routed lines: each from its port or sleeve to its sleeve.
  const hypo = placedPort(cabinet, 'hypochlorite');
  const wallEnd = (at: Vec3, inward: Vec3): PortEnd => ({
    at,
    outward: inward,
  });
  const routed: {
    link: string;
    chemical: 'hypochlorite' | 'acid';
    od: number;
    start: PortEnd;
    end: PortEnd;
    /** Its run's ends carried on through their walls. */
    before?: Vec3;
    after: Vec3;
    through: PipeRun['through'];
    startStraight: number;
  }[] = [];
  if (has('Hypochlorite delivery line'))
    routed.push({
      link: 'Hypochlorite delivery line',
      chemical: 'hypochlorite',
      od: 0.05,
      start: { at: [...hypo.at] as Vec3, outward: [...hypo.outward] as Vec3 },
      end: wallEnd([X - SLEEVE, OVER_SHUTTERS, DELIVERY_IN], [-1, 0, 0]),
      after: [X + WALL, OVER_SHUTTERS, DELIVERY_IN],
      through: [
        {
          at: [X + WALL / 2, OVER_SHUTTERS, DELIVERY_IN],
          normal: [-1, 0, 0],
          thickness: WALL,
          kind: 'fire-collar',
        },
      ],
      // Up out of the cabinet's top far enough for its port's valves.
      startStraight: 0.9,
    });
  for (const [chemical, side, Name] of [
    ['hypochlorite', 1, 'Hypochlorite'],
    ['acid', -1, 'Acid'],
  ] as const) {
    const link = `${Name} main through the bay`;
    if (!has(link)) continue;
    routed.push({
      link,
      chemical,
      od: 0.032,
      start: wallEnd([side * (X - SLEEVE), MAIN_Y, MAIN_OUT], [-side, 0, 0]),
      end: wallEnd([side * MAIN_X, MAIN_Y, Z - SLEEVE], [0, 0, -1]),
      before: [side * (X + WALL), MAIN_Y, MAIN_OUT],
      after: [side * MAIN_X, MAIN_Y, Z + WALL],
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
      startStraight: 0.3,
    });
  }
  const obstacles = layout.placed.map((p) => ({
    min: [
      p.footprint.minX,
      p.item.mount === 'wall' ? Math.max(0, p.y - p.item.h / 2) : 0,
      p.footprint.minZ,
    ] as Vec3,
    max: [
      p.footprint.maxX,
      p.item.mount === 'wall' ? p.y + p.item.h / 2 : p.item.h,
      p.footprint.maxZ,
    ] as Vec3,
  }));
  // The lorries' bays in front of their openings: up to over the
  // shutters' boxes where the bodies stand, in the dock's north half; the
  // whole depth up to clear of their tail lifts and the pallets (the
  // mains cross over them a little above their sleeves, at 3.8 m). The doors' clear ways.
  const lorries = (BAY.apertures ?? []).filter((a) => !('door' in a && a.door));
  const regions = [
    ...lorries.flatMap((a) => [
      {
        min: [a.at - a.w / 2 - 0.3, 0, -Z] as Vec3,
        max: [a.at + a.w / 2 + 0.3, BAYS_CLEAR, BODIES_TO] as Vec3,
        forbids: { runs: true },
      },
      {
        min: [a.at - a.w / 2 - 0.3, 0, -Z] as Vec3,
        max: [a.at + a.w / 2 + 0.3, TAIL_LIFTS, Z] as Vec3,
        forbids: { runs: true },
      },
    ]),
    ...layout.box.keepClear.map((k) => ({
      min: [k.minX, 0, k.minZ] as Vec3,
      max: [k.maxX, DOOR_HEAD, k.maxZ] as Vec3,
      forbids: { runs: true },
    })),
  ];
  const lines: RouterLine[] = routed.map((l) => ({
    id: l.link,
    start: l.start,
    end: l.end,
    od: l.od,
    joint: 'socket',
    price: pricePerMetre('pvc-pressure', l.od),
    startStraight: l.startStraight,
    endStraight: 0.2,
  }));
  const result = routeVoxelLines(
    {
      halfX: X,
      halfZ: Z,
      height: BAY.height,
      obstacles,
      regions,
    },
    lines,
    [],
  );
  problems.push(...result.problems);
  for (const l of routed) {
    const points = result.routes.get(l.link);
    if (!points) {
      problems.push(`${l.link}: not routed`);
      continue;
    }
    const all: Vec3[] = [
      ...(l.before ? [l.before] : []),
      ...points.map((p) => [...p] as Vec3),
      l.after,
    ];
    const set = chemicalLineFittings('loading_bay', l.link, all, l.od, {
      reach: [0.3, 2.2],
    });
    problems.push(...set.problems);
    runs.push({
      name: l.link,
      kind: 'pvc-pressure',
      od: l.od,
      points: all,
      joins: [],
      service: l.chemical,
      label: LABEL[l.chemical],
      through: l.through,
      valves: set.valves,
      ...(set.checks.length ? { checks: set.checks } : {}),
    });
  }
  return { runs, problems };
}
