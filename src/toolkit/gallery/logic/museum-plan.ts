import type { Footprint } from '../../controls/logic/walk-collision';
import { MUSEUM_EXHIBITION } from './museum-brand';

/**
 * The pool science museum (mission 107; the owner, 2026-10-28): five
 * exhibit halls in a converted warehouse, one after another, each its own
 * room and scene, joined by open archways knocked through the old brick
 * walls between bays, with no doors. Walking through an archway hands the
 * visitor into the next hall's scene (`door-joins.ts`, `handOver` in
 * `src/main.ts`), as the pool loop's corridors do.
 *
 * The halls stand in a row running north, every one centred on the same
 * line (x = 0), so each archway is in the middle of its shared wall and
 * both halls build that wall alike: the same geometry, the same brick, the
 * floor's joints laid from the museum's own origin (`hallOrigin`), so
 * nothing changes at the hand-over (the perspective-jump fix, `8656cf1`).
 * Each hall's size is one constant (`MUSEUM_SIZES`), provisional: the
 * owner will resize them. Pure; metres; each hall's middle at x = z = 0,
 * its floor at y = 0, x east, z south.
 */

export type MuseumHallId =
  | 'museum1'
  | 'museum2'
  | 'museum3'
  | 'museum4'
  | 'museum5';

/** The halls, in the visitor's order. */
export const MUSEUM_HALLS: readonly MuseumHallId[] = [
  'museum1',
  'museum2',
  'museum3',
  'museum4',
  'museum5',
];

export interface HallSize {
  /** Inside the walls: width (x), depth (z), and the height to the roof deck's underside. */
  w: number;
  d: number;
  h: number;
}

/** Each hall's size: provisional, the owner will resize them (2026-10-28). */
export const MUSEUM_SIZES: Record<MuseumHallId, HallSize> = {
  museum1: { w: 18, d: 24, h: 9.5 },
  museum2: { w: 16, d: 22, h: 9.5 },
  museum3: { w: 16, d: 20, h: 9.5 },
  museum4: { w: 16, d: 22, h: 9.5 },
  museum5: { w: 20, d: 26, h: 9.5 },
};

/** The old brick walls between bays: their thickness. */
export const MUSEUM_WALL = 0.6;

/** An archway knocked through: its clear width, its springing (where the round head starts), its crown. */
export const MUSEUM_ARCH = { w: 3.6, spring: 3.4, rise: 1.8 } as const;
export const ARCH_CROWN = MUSEUM_ARCH.spring + MUSEUM_ARCH.rise;

/** What each hall will be, and what its signs say while it is empty. */
export interface HallBrief {
  id: MuseumHallId;
  number: number;
  /** Its title, as signed: "Moving water". */
  title: string;
  /** What it is about, in a few words. */
  subject: string;
  /** The one big idea. */
  bigIdea: string;
  /** What the exhibit will show. */
  willShow: string;
  /** What visitors will be able to try. */
  tryIt: readonly string[];
}

export const HALL_BRIEFS: Record<MuseumHallId, HallBrief> = {
  museum1: {
    id: 'museum1',
    number: 1,
    title: 'Moving water',
    subject: 'Circulation',
    bigIdea:
      'A pool is never still: a pump pulls every drop of it round the plant and back, again and again, all day and all night.',
    willShow:
      'A working pool that spills over its edge into a balance tank, one pump, its pipes and valves, and gauges that show the flow and the pressure.',
    tryIt: [
      'Close a valve a notch at a time and watch the flow fall as the pressure rises.',
      'Stop the pump and see the water settle back in the pool and the tank.',
      'Time how long the pump takes to turn the whole pool over.',
    ],
  },
  museum2: {
    id: 'museum2',
    number: 2,
    title: 'Clean water',
    subject: 'Filtration and backwash',
    bigIdea:
      'A bed of sand catches the dirt the swimmers bring in, and once it is full we wash it out by running the water backwards.',
    willShow:
      'The ideal pool plant from the development rooms (dev51) will be installed here: a sand filter, its pressure gauges, the five valves that turn it round, and a sight glass to watch the dirt come out.',
    tryIt: [
      'Watch the gauges across the filter creep apart as the sand fills with dirt.',
      'Set the five valves for a backwash and watch the sight glass run brown, then clear.',
      'Rinse the bed and put the filter back to work.',
    ],
  },
  museum3: {
    id: 'museum3',
    number: 3,
    title: 'Warm water',
    subject: 'Heating and energy',
    bigIdea:
      'A pool loses most of its heat from its surface, as water evaporates into the air: a cover at night saves more than any boiler can.',
    willShow:
      'A heat source, a heat exchanger that warms the pool water without mixing with it, a pool losing heat to the air, a pool cover, and a meter counting the energy and what it costs.',
    tryIt: [
      'Turn the heating on and watch the pool warm, a fraction of a degree at a time.',
      'Pull the cover over the pool and see how much heat it saves.',
      'Read the meter and work out what a day of heating costs.',
    ],
  },
  museum4: {
    id: 'museum4',
    number: 4,
    title: 'Safe water',
    subject: 'Disinfection and chemistry',
    bigIdea:
      'Chlorine keeps the water safe, but swimmers use it up: the trick is keeping just enough, at the right pH, all day long.',
    willShow:
      'A pool with its chemistry: free and combined chlorine, pH, the pollution swimmers bring, a dosing controller with its sample cell and metering pumps, and a test kit you can use yourself.',
    tryIt: [
      'Test the water with the kit and compare it with the controller.',
      'Send in a crowd of swimmers and watch the chlorine fall and the dosing pumps answer.',
      'Solve the pool problems on the challenge cards, from cloudy water to a smell of chlorine.',
    ],
  },
  museum5: {
    id: 'museum5',
    number: 5,
    title: 'The whole plant',
    subject: 'Control and fault finding',
    bigIdea:
      'Every part you have met works together, and when something goes wrong the plant tells you: if you know how to listen.',
    willShow:
      'The first four exhibits joined into one small working plant, with a mimic of the whole system, an alarm panel and its alarms.',
    tryIt: [
      'Press the fault button to cause a random fault somewhere in the plant.',
      'Read the alarms and the mimic, and track down what has gone wrong.',
      'Put it right, reset the alarms, and try another.',
    ],
  },
};

/** The hall's name on the dev panel and in the room readout. */
export function hallName(id: MuseumHallId) {
  const b = HALL_BRIEFS[id];
  return `${id.toUpperCase()} · ${MUSEUM_EXHIBITION.name.toUpperCase()} · ${b.number} ${b.title.toUpperCase()}`;
}

/** The hall before this one, and the one after, if any. */
export function previousHall(id: MuseumHallId): MuseumHallId | null {
  const i = MUSEUM_HALLS.indexOf(id);
  return i > 0 ? MUSEUM_HALLS[i - 1] : null;
}
export function nextHall(id: MuseumHallId): MuseumHallId | null {
  const i = MUSEUM_HALLS.indexOf(id);
  return i < MUSEUM_HALLS.length - 1 ? MUSEUM_HALLS[i + 1] : null;
}

export function isMuseumHall(id: string): id is MuseumHallId {
  return (MUSEUM_HALLS as readonly string[]).includes(id);
}

/**
 * Each hall's middle in the museum's own plan: the first at the origin,
 * each next one north of it beyond their shared wall. The floor's joints
 * and the walls' brick are laid from this origin, so both halls at an
 * archway draw them alike.
 */
export function hallOrigin(id: MuseumHallId): { x: number; z: number } {
  let z = 0;
  for (let i = 1; i <= MUSEUM_HALLS.indexOf(id); i++)
    z -=
      MUSEUM_SIZES[MUSEUM_HALLS[i - 1]].d / 2 +
      MUSEUM_WALL +
      MUSEUM_SIZES[MUSEUM_HALLS[i]].d / 2;
  return { x: 0, z };
}

/** A hall's point in the museum's plan. */
export function toMuseum(id: MuseumHallId, x: number, z: number) {
  const o = hallOrigin(id);
  return { x: x + o.x, z: z + o.z };
}

/** One of a hall's archways: the hall beyond, its wall, and its frame as `door-joins.ts` has it (metres). */
export interface MuseumArch {
  to: MuseumHallId;
  wall: 'north' | 'south';
  /** In the shared wall's middle; its +z facing into this hall. */
  frame: { x: number; z: number; yaw: number };
}

/** A hall's archways: on to the next hall through its north wall, back to the last through its south. */
export function hallArches(id: MuseumHallId): MuseumArch[] {
  const { d } = MUSEUM_SIZES[id];
  const out: MuseumArch[] = [];
  const next = nextHall(id);
  const last = previousHall(id);
  if (next)
    out.push({
      to: next,
      wall: 'north',
      frame: { x: 0, z: -d / 2 - MUSEUM_WALL / 2, yaw: 0 },
    });
  if (last)
    out.push({
      to: last,
      wall: 'south',
      frame: { x: 0, z: d / 2 + MUSEUM_WALL / 2, yaw: Math.PI },
    });
  return out;
}

/** The shared wall's width, built alike by both halls: the wider hall's, and its side walls. */
export function sharedWallWidth(a: MuseumHallId, b: MuseumHallId) {
  return Math.max(MUSEUM_SIZES[a].w, MUSEUM_SIZES[b].w) + 2 * MUSEUM_WALL;
}

/**
 * The hall's walls in plan, for walking: the four walls, each end wall
 * open at its archway; and, at each archway whose hall beyond is not being
 * seen through it, a stop at the wall's middle, so the visitor waits there
 * until it is (and is handed over as soon as it is crossed).
 */
export function hallSolids(
  id: MuseumHallId,
  seen: Partial<Record<MuseumHallId, boolean>> = {},
): Footprint[] {
  const { w, d } = MUSEUM_SIZES[id];
  const t = MUSEUM_WALL;
  const hx = w / 2;
  const hz = d / 2;
  const half = MUSEUM_ARCH.w / 2;
  const out: Footprint[] = [
    { minX: -hx - t, maxX: -hx, minZ: -hz - t, maxZ: hz + t },
    { minX: hx, maxX: hx + t, minZ: -hz - t, maxZ: hz + t },
  ];
  const arches = hallArches(id);
  for (const wall of ['north', 'south'] as const) {
    const minZ = wall === 'north' ? -hz - t : hz;
    const maxZ = wall === 'north' ? -hz : hz + t;
    const arch = arches.find((a) => a.wall === wall);
    if (!arch) {
      out.push({ minX: -hx - t, maxX: hx + t, minZ, maxZ });
      continue;
    }
    out.push({ minX: -hx - t, maxX: -half, minZ, maxZ });
    out.push({ minX: half, maxX: hx + t, minZ, maxZ });
    if (!seen[arch.to]) {
      const mid = arch.frame.z;
      out.push(
        wall === 'north'
          ? { minX: -half, maxX: half, minZ: mid - 0.4, maxZ: mid }
          : { minX: -half, maxX: half, minZ: mid, maxZ: mid + 0.4 },
      );
    }
  }
  for (const c of hallColumns(id))
    out.push({
      minX: c.x - COLUMN_FOOT,
      maxX: c.x + COLUMN_FOOT,
      minZ: c.z - COLUMN_FOOT,
      maxZ: c.z + COLUMN_FOOT,
    });
  for (const b of hallBenches(id))
    out.push({
      minX: b.x - BENCH.w / 2,
      maxX: b.x + BENCH.w / 2,
      minZ: b.z - BENCH.l / 2,
      maxZ: b.z + BENCH.l / 2,
    });
  const p = comingSoonPanel(id);
  out.push({
    minX: p.x - PANEL.w / 2 - 0.1,
    maxX: p.x + PANEL.w / 2 + 0.1,
    minZ: p.z - 0.35,
    maxZ: p.z + 0.35,
  });
  return out;
}

/** Half a cast-iron column's base, for walking round it. */
export const COLUMN_FOOT = 0.22;

/**
 * The warehouse's cast-iron columns, in two rows under its two steel
 * beams (`beamEvery` in the services ceiling is half the hall's width, so
 * the beams stand at x = ±w/4), every 6 m along, kept 3 m from the end
 * walls: the line through the archways stays clear.
 */
export function hallColumns(id: MuseumHallId): { x: number; z: number }[] {
  const { w, d } = MUSEUM_SIZES[id];
  const out: { x: number; z: number }[] = [];
  for (let k = -5; k <= 5; k++) {
    const z = k * 6;
    if (Math.abs(z) > d / 2 - 3) continue;
    out.push({ x: -w / 4, z }, { x: w / 4, z });
  }
  return out;
}

/** A gallery bench: its width (x) and length (z). */
export const BENCH = { w: 0.5, l: 2.0, h: 0.45 } as const;

/** Two benches on the east column line, between the columns, along the hall. */
export function hallBenches(id: MuseumHallId): { x: number; z: number }[] {
  const { w } = MUSEUM_SIZES[id];
  return [
    { x: w / 4, z: 3 },
    { x: w / 4, z: -3 },
  ];
}

/** The "coming soon" panel: free-standing, its face to the south, the way visitors come in. */
export const PANEL = { w: 2.4, h: 2.3, sign: 1.9 } as const;
export function comingSoonPanel(id: MuseumHallId) {
  const { w } = MUSEUM_SIZES[id];
  return { x: -w / 4, z: 3, yaw: 0 };
}

/** Whether (x, z) is within an archway's width. */
const inArch = (x: number) => Math.abs(x) < MUSEUM_ARCH.w / 2;

/**
 * The hall the visitor has just walked into, going from `was` to `now`
 * across one of this hall's archways' middle lines: the hand-over.
 */
export function crossedInto(
  id: MuseumHallId,
  was: { x: number; z: number },
  now: { x: number; z: number },
): MuseumHallId | null {
  for (const a of hallArches(id)) {
    if (!inArch(now.x)) continue;
    const z = a.frame.z;
    if (a.wall === 'north' && was.z >= z && now.z < z) return a.to;
    if (a.wall === 'south' && was.z <= z && now.z > z) return a.to;
  }
  return null;
}

/**
 * The archway to see through, of a hall's two (`door-joins.ts` draws one
 * room beyond at a time): the one the visitor is in or about to cross, or else
 * the one most nearly ahead; each archway not seen through shows a plain
 * stand-in of the hall beyond. `yaw` as the controls have it (forward is
 * (sin yaw, −cos yaw)). `current` is kept unless the other is clearly
 * better, so the choice does not flicker.
 */
export function archToSee(
  id: MuseumHallId,
  pose: { x: number; z: number; yaw: number },
  current: MuseumHallId | null = null,
): MuseumHallId | null {
  const arches = hallArches(id);
  if (!arches.length) return null;
  // In an archway or about to cross it: that one, whichever way the
  // visitor faces, so the hand-over is ready (`hallSolids` stops them
  // otherwise). The zone is shallow, so the archway left behind is soon
  // out of sight when the other is chosen.
  const near = arches.find(
    (a) =>
      Math.abs(pose.z - a.frame.z) < MUSEUM_WALL / 2 + 0.9 &&
      Math.abs(pose.x) < MUSEUM_ARCH.w / 2 + 0.5,
  );
  if (near) return near.to;
  const fx = Math.sin(pose.yaw);
  const fz = -Math.cos(pose.yaw);
  const off = (a: MuseumArch) => {
    const dx = a.frame.x - pose.x;
    const dz = a.frame.z - pose.z;
    const len = Math.hypot(dx, dz) || 1;
    return Math.acos(Math.max(-1, Math.min(1, (dx * fx + dz * fz) / len)));
  };
  let best = arches[0];
  for (const a of arches) if (off(a) < off(best)) best = a;
  const kept = arches.find((a) => a.to === current);
  if (kept && kept !== best && off(kept) < off(best) + 0.35) return kept.to;
  return best.to;
}

/** Where a visitor stands on arriving through an archway from `from` (not seen through): just inside it, facing into the hall. */
export function arrivalFrom(id: MuseumHallId, from: string | null) {
  const arch = hallArches(id).find((a) => a.to === from);
  const { d } = MUSEUM_SIZES[id];
  if (!arch) return startOf(id);
  return arch.wall === 'north'
    ? { x: 0, z: -d / 2 + 1.5, yaw: Math.PI }
    : { x: 0, z: d / 2 - 1.5, yaw: 0 };
}

/** Where a visitor starts in a hall reached by its link: in the first, facing the title wall; elsewhere, inside the entrance archway. */
export function startOf(id: MuseumHallId) {
  const { d } = MUSEUM_SIZES[id];
  if (id === 'museum1') return { x: 0, z: d / 2 - 8, yaw: Math.PI };
  return { x: 0, z: d / 2 - 1.5, yaw: 0 };
}
