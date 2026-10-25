import type { TitleOrbit } from './title-orbit';
import type { AttractScenarioId } from '../../../game/attract-scenarios';
import { orbitPose } from './title-orbit';
import { createCameraPath, parseViewLink } from './camera-path';
import type { CameraKey, CameraMove, CameraSample } from './camera-path';

/**
 * The title's attract sequence (`doc/prompts/054-title-attract-sequence.md`):
 * the shots it plays behind the title menu, round and round, while the
 * theme plays on, and the timeline that fades each to black, holds there
 * until the next is built, and fades it in. Pure.
 */

/** A shot: a room of the game, a camera move in it, and how long it holds. */
export interface AttractShot {
  /** Stable, for links and for tests. */
  id: string;
  /** The room, by its id (`dev-room-links.ts`). */
  room: string;
  /**
   * Its camera move: an orbit (`title-orbit.ts`), or a path flown through
   * the owner's noclip shots (`camera-path.ts`), which it takes if it has
   * one.
   */
  orbit?: TitleOrbit;
  path?: CameraMove;
  /**
   * The world it shows (`attract-scenarios.ts`): one prepared for the
   * attract sequence, never the player's, afresh each time it plays.
   */
  scenario: AttractScenarioId;
  /** The camera's torch lit (a lights-out scenario's). */
  torch?: boolean;
  /** Seconds it is seen, between its fades. */
  seconds: number;
}

/**
 * The lounge pool's fly-by (the owner, 2026-10-25): eleven noclip shots,
 * low over the water and round the hall, flown start to end as one smooth
 * path at walking pace, banking with the owner's rolls (not a loop, the
 * owner: "they aren't loops, just paths").
 */
export const LOUNGE_FLYBY: { keys: readonly CameraKey[]; speed: number } = {
  keys: [
    '?x=-10.55&y=0.83&z=2.92&yaw=35.3&pitch=-7.2&zoom=0.942&roll=-8.7',
    '?x=-8.39&y=0.50&z=0.03&yaw=38.9&pitch=0.8&zoom=0.942&roll=-2.0',
    '?x=-3.37&y=0.55&z=-3.49&yaw=67.1&pitch=-2.0&zoom=0.942&roll=4.0',
    '?x=3.85&y=0.70&z=-4.76&yaw=116.8&pitch=-0.4&zoom=0.942&roll=10.7',
    // Not the owner's: a waypoint round the east of the column at (5.4,
    // −2), which the shots either side of it would otherwise graze.
    '?x=6.45&y=0.85&z=-3.05&yaw=170&pitch=-3.0&zoom=0.942&roll=10.7',
    '?x=6.15&y=0.98&z=-0.89&yaw=223.3&pitch=-6.0&zoom=0.942&roll=10.7',
    '?x=4.30&y=0.70&z=0.15&yaw=226.8&pitch=-1.0&zoom=0.942&roll=-11.3',
    '?x=3.58&y=0.66&z=2.27&yaw=178.5&pitch=-1.8&zoom=0.942&roll=-2.7',
    '?x=3.78&y=0.64&z=4.35&yaw=238.3&pitch=2.7&zoom=0.942&roll=7.3',
    '?x=0.81&y=0.64&z=5.38&yaw=264.4&pitch=-2.8&zoom=0.942&roll=-0.7',
    '?x=-5.48&y=0.37&z=5.99&yaw=264.1&pitch=2.9&zoom=0.942&roll=7.3',
    '?x=-8.71&y=0.50&z=4.45&yaw=327.7&pitch=3.9&zoom=0.942&roll=12.6',
  ].map(parseViewLink),
  speed: 0.7,
};
/** Fading out to black, and in from it, seconds. */
export const FADE_SECONDS = 1.2;

/** The title theme's beat, seconds: it is at 60 beats a minute (measured from its onsets). */
export const THEME_BEAT = 1;

/**
 * How long each shot is seen between its fades, seconds: so that, fades
 * and all, it lasts about eight beats of the theme (the owner, 2026-10-25).
 */
export const SHOT_SECONDS = 8 * THEME_BEAT - 2 * FADE_SECONDS;

const loungeFlyby = createCameraPath(LOUNGE_FLYBY.keys, LOUNGE_FLYBY.speed);

/**
 * The Olympic hall's dolly (the owner, 2026-10-25): high on its north side,
 * square along its east-west axis from end to end, once, the camera
 * held on one heading (south, across the pool), pitch and zoom all the
 * way: the owner's two shots, squared to one line (their height, line,
 * pitch, averaged; their heading, 179.6° and 180°, made 180°).
 */
export const OLYMPIC_DOLLY: { keys: readonly CameraKey[]; speed: number } = {
  keys: [
    '?x=-24.14&y=9.27&z=-19.08&yaw=180&pitch=-32.25&zoom=1.245&roll=0',
    '?x=22.83&y=9.27&z=-19.08&yaw=180&pitch=-32.25&zoom=1.245&roll=0',
  ].map(parseViewLink),
  speed: 0.7,
};
const olympicDolly = createCameraPath(OLYMPIC_DOLLY.keys, OLYMPIC_DOLLY.speed);

/**
 * The Olympic hall's level dolly (the owner, 2026-10-25), as Wes Anderson
 * would shoot it: low at the hall's west end, the camera level and square
 * to the hall, looking straight at the pace clock's wall (east, +x; the
 * owner's "north"), sliding dead straight across the hall, once, long
 * lens. The owner's two shots squared: their line (x) and height averaged,
 * pitch and roll level, heading exactly 90°.
 */
export const OLYMPIC_LEVEL_DOLLY: {
  keys: readonly CameraKey[];
  speed: number;
} = {
  keys: [
    '?x=-25.40&y=2.2&z=-17.95&yaw=90&pitch=0&zoom=2.070&roll=0',
    '?x=-25.40&y=2.2&z=14.49&yaw=90&pitch=0&zoom=2.070&roll=0',
  ].map(parseViewLink),
  speed: 0.7,
};
const olympicLevelDolly = createCameraPath(
  OLYMPIC_LEVEL_DOLLY.keys,
  OLYMPIC_LEVEL_DOLLY.speed,
);

/**
 * The Olympic plant room's fly-by (the owner, 2026-10-25): seventeen
 * noclip shots round the room at pipe height, rolled hard, flying close to
 * the plant on purpose; as authored, with nothing added to keep it clear.
 */
export const PLANT_FLYBY: { keys: readonly CameraKey[]; speed: number } = {
  keys: [
    '?x=9.38&y=-1.20&z=-2.36&yaw=268.6&pitch=-0.8&zoom=1.000&roll=-36.0',
    '?x=-4.98&y=-1.11&z=-2.21&yaw=270.4&pitch=1.0&zoom=1.000&roll=-36.0',
    '?x=-5.91&y=-1.14&z=-1.90&yaw=216.3&pitch=-11.6&zoom=1.000&roll=-46.0',
    '?x=-7.80&y=-1.75&z=1.09&yaw=208.0&pitch=-2.8&zoom=1.000&roll=-49.3',
    '?x=-7.87&y=-1.95&z=3.94&yaw=170.8&pitch=0.9&zoom=1.000&roll=-67.3',
    '?x=-7.22&y=-1.78&z=5.83&yaw=89.3&pitch=1.0&zoom=1.000&roll=-39.3',
    '?x=4.34&y=-1.58&z=5.68&yaw=89.3&pitch=1.0&zoom=1.000&roll=29.4',
    '?x=9.50&y=-1.35&z=5.50&yaw=83.7&pitch=5.3&zoom=1.000&roll=-25.3',
    '?x=10.22&y=-1.05&z=4.23&yaw=9.6&pitch=23.4&zoom=1.000&roll=-25.3',
    '?x=10.19&y=-1.03&z=3.06&yaw=358.5&pitch=1.1&zoom=1.000&roll=-25.3',
    '?x=10.11&y=-0.95&z=-3.53&yaw=357.1&pitch=1.5&zoom=1.000&roll=-18.6',
    '?x=9.68&y=-1.00&z=-5.99&yaw=300.1&pitch=-6.5&zoom=1.000&roll=-8.6',
    '?x=8.80&y=-1.12&z=-6.75&yaw=270.4&pitch=-4.4&zoom=1.000&roll=-89.9',
    '?x=-9.23&y=-1.46&z=-6.76&yaw=270.4&pitch=-0.2&zoom=1.000&roll=-89.9',
    '?x=-10.17&y=-1.48&z=-6.14&yaw=220.1&pitch=0.4&zoom=1.000&roll=-89.9',
    '?x=-10.60&y=-1.41&z=-4.14&yaw=182.5&pitch=1.7&zoom=1.000&roll=-67.3',
    '?x=-10.53&y=-1.33&z=-0.81&yaw=176.4&pitch=1.0&zoom=1.000&roll=-33.3',
  ].map(parseViewLink),
  speed: 0.7,
};
// The room is 22 by 14 m (`room-equipment.ts`); the camera keeps 0.1 m in
// from its walls, where the curve along the south wall would bulge through.
const plantFlyby = createCameraPath(PLANT_FLYBY.keys, PLANT_FLYBY.speed, {
  minX: -10.9,
  maxX: 10.9,
  minZ: -6.9,
  maxZ: 6.9,
});

/**
 * The main corridor's fly-by (the owner, 2026-10-25): ten noclip shots
 * round the ring at 3 m, turning each corner, and rolling all the way
 * round as it goes, a whole barrel roll to the circuit.
 */
export const CORRIDOR_FLYBY: { keys: readonly CameraKey[]; speed: number } = {
  keys: [
    '?x=1.79&y=3.38&z=10.92&yaw=179.4&pitch=-1.8&zoom=1.000&roll=-24.7',
    '?x=2.32&y=3.08&z=22.68&yaw=170.9&pitch=-0.9&zoom=1.000&roll=-42.0',
    '?x=7.67&y=3.12&z=25.33&yaw=92.4&pitch=0.3&zoom=1.000&roll=-50.7',
    '?x=22.57&y=3.17&z=25.49&yaw=87.0&pitch=-0.4&zoom=1.000&roll=-72.0',
    '?x=24.96&y=3.50&z=24.58&yaw=2.9&pitch=-2.3&zoom=1.000&roll=-85.4',
    '?x=25.66&y=3.05&z=6.63&yaw=2.0&pitch=-1.1&zoom=1.000&roll=-110.0',
    '?x=23.54&y=3.02&z=3.42&yaw=295.8&pitch=0.9&zoom=1.000&roll=-119.4',
    '?x=4.36&y=2.99&z=2.27&yaw=271.3&pitch=-1.9&zoom=1.000&roll=120.0',
    '?x=2.48&y=3.20&z=3.31&yaw=225.4&pitch=-8.2&zoom=1.000&roll=51.3',
    '?x=2.13&y=3.00&z=14.67&yaw=181.8&pitch=-1.0&zoom=1.000&roll=7.3',
  ].map(parseViewLink),
  speed: 0.7,
};
const corridorFlyby = createCameraPath(
  CORRIDOR_FLYBY.keys,
  CORRIDOR_FLYBY.speed,
);

/**
 * The jacuzzi plant room's path (the owner, 2026-10-25): eleven close
 * noclip shots among its plant on long lenses, start to end, not a loop;
 * pausing where two shots share a place to turn and roll.
 */
export const JACUZZI_PLANT_PATH: {
  keys: readonly CameraKey[];
  speed: number;
} = {
  keys: [
    '?x=-3.55&y=-1.72&z=3.75&yaw=359.0&pitch=0.9&zoom=2.732&roll=0.0',
    '?x=-0.70&y=-1.73&z=3.80&yaw=359.0&pitch=0.9&zoom=2.732&roll=0.0',
    '?x=0.17&y=-1.93&z=1.48&yaw=271.0&pitch=2.4&zoom=4.000&roll=0.0',
    '?x=0.17&y=-1.93&z=1.48&yaw=269.5&pitch=3.1&zoom=4.000&roll=-6.7',
    '?x=-0.77&y=-1.30&z=2.08&yaw=237.5&pitch=3.0&zoom=4.000&roll=-6.7',
    '?x=-1.83&y=-1.20&z=-0.28&yaw=327.0&pitch=2.4&zoom=4.000&roll=10.0',
    '?x=-1.86&y=-1.30&z=-2.01&yaw=355.8&pitch=-9.9&zoom=2.272&roll=32.0',
    '?x=-1.21&y=-1.94&z=-2.19&yaw=0.3&pitch=7.8&zoom=3.750&roll=24.0',
    '?x=-0.01&y=-1.79&z=-2.31&yaw=359.4&pitch=3.0&zoom=1.559&roll=-1.3',
    '?x=1.85&y=-1.77&z=-2.94&yaw=314.1&pitch=1.4&zoom=1.419&roll=-1.3',
    '?x=-0.24&y=-2.10&z=-2.65&yaw=265.3&pitch=-10.9&zoom=1.419&roll=-11.3',
  ]
    .map(parseViewLink)
    // The third and fourth shots share a place: linger there (the owner).
    .map((k, i) => (i === 3 ? { ...k, seconds: 3 } : k)),
  speed: 0.4,
};
const jacuzziPlantPath = createCameraPath(
  JACUZZI_PLANT_PATH.keys,
  JACUZZI_PLANT_PATH.speed,
);

/** A shot's camera `seconds` into its move: its path's pose, or its orbit's, level and unzoomed. */
export function shotPose(shot: AttractShot, seconds: number): CameraSample {
  if (shot.path) return shot.path.sample(seconds);
  const o = orbitPose(shot.orbit!, seconds);
  return { ...o, roll: 0, zoom: 1 };
}

/**
 * The shots: the Olympic hall's high dolly; the lounge pool's fly-by;
 * the Olympic hall's level dolly; the Olympic plant room's fly-by; the
 * jacuzzi plant room's path, start to end; the main corridor's
 * barrel-rolling fly-by. Played in a random order, a pool hall's and a
 * back room's by turns (`chooseNext`). The Olympic hall's high orbit and
 * the jacuzzi's were dropped (the owner, 2026-10-25: "It's boring").
 */
export const ATTRACT_SHOTS: readonly AttractShot[] = [
  {
    id: 'olympic-dolly',
    room: 'pool_02',
    path: olympicDolly,
    scenario: 'normal',
    seconds: SHOT_SECONDS,
  },
  {
    id: 'lounge-flyby',
    room: 'pool_01',
    path: loungeFlyby,
    scenario: 'normal',
    seconds: SHOT_SECONDS,
  },
  {
    id: 'olympic-level-dolly',
    room: 'pool_02',
    path: olympicLevelDolly,
    scenario: 'normal',
    seconds: SHOT_SECONDS,
  },
  {
    id: 'olympic-plant-flyby',
    room: 'plant_pool_02',
    path: plantFlyby,
    scenario: 'normal',
    seconds: SHOT_SECONDS,
  },
  {
    id: 'jacuzzi-plant-path',
    room: 'plant_pool_03',
    path: jacuzziPlantPath,
    scenario: 'normal',
    seconds: SHOT_SECONDS,
  },
  {
    id: 'corridor-flyby',
    room: 'main_corridor',
    path: corridorFlyby,
    scenario: 'normal',
    seconds: SHOT_SECONDS,
  },
];

export type AttractPhase = 'fade-in' | 'showing' | 'fade-out' | 'black';

export interface AttractState {
  /** The shot now (or, while black, the one to come). */
  shot: number;
  /** The shot after it, chosen as it comes, so its room is fetched while it shows. */
  next: number;
  /** The shot before it, not to come round again straight after. */
  previous: number;
  phase: AttractPhase;
  /** Seconds into the phase. */
  t: number;
  /**
   * Seconds into the shot's camera move: from a point chosen at random
   * round it as the sequence comes to the shot, on from there.
   */
  shotTime: number;
}

/** A shot's whole camera move, seconds: its path's, start to end, or its orbit's cycle. */
export const shotPeriod = (shot: AttractShot) =>
  shot.path?.period ?? shot.orbit!.period;

/**
 * Where in its move a shot starts, at random: anywhere round a loop or a
 * dolly; on an open path, early enough that it is seen, fades and all,
 * before it ends.
 */
const startOf = (shot: AttractShot, random: () => number) =>
  shot.path?.open
    ? random() *
      Math.max(0, shot.path.period - (shot.seconds + 2 * FADE_SECONDS))
    : random() * shotPeriod(shot);

/** Whether a shot is of a pool hall (the pool rooms); the rest are the back rooms. */
export const inPoolRoom = (shot: AttractShot) => shot.room.startsWith('pool_');

/**
 * The shot to follow `current`, at random (the owner, 2026-10-25): of the
 * other kind, a pool hall's after a back room's and a back room's after a
 * pool hall's; never in the same room as `current`, nor `previous` again;
 * loosening those, in that order, where nothing else is left.
 */
export function chooseNext(
  shots: readonly AttractShot[],
  current: number,
  previous: number,
  random: () => number,
): number {
  const all = shots.map((_, i) => i).filter((i) => i !== current);
  if (!all.length) return current;
  const otherKind = (i: number) =>
    inPoolRoom(shots[i]) !== inPoolRoom(shots[current]);
  const otherRoom = (i: number) => shots[i].room !== shots[current].room;
  const fresh = (i: number) => i !== previous;
  for (const rule of [
    (i: number) => otherKind(i) && otherRoom(i) && fresh(i),
    (i: number) => otherKind(i) && otherRoom(i),
    (i: number) => otherRoom(i),
    () => true,
  ]) {
    const pool = all.filter(rule);
    if (pool.length)
      return pool[
        Math.min(pool.length - 1, Math.floor(random() * pool.length))
      ];
  }
  return current;
}

/** The sequence's start: black, waiting for its first shot (chosen at random) to be built, its starting point chosen. */
export function newAttract(
  shots: readonly AttractShot[] = ATTRACT_SHOTS,
  random: () => number = Math.random,
): AttractState {
  const shot = Math.min(shots.length - 1, Math.floor(random() * shots.length));
  return {
    shot,
    next: chooseNext(shots, shot, -1, random),
    previous: -1,
    phase: 'black',
    t: 0,
    shotTime: startOf(shots[shot], random),
  };
}

/**
 * The sequence `dt` seconds on. `ready`: whether the shot it waits for
 * (in `black`) is built and drawn; until it is, it holds black. Its
 * camera's clock runs from the shot's fade-in to its fade-out's end.
 */
export function stepAttract(
  s: AttractState,
  dt: number,
  shots: readonly AttractShot[],
  ready: boolean,
  /** Where the next shot starts, 0 to 1 round its move. */
  random: () => number = Math.random,
): AttractState {
  const t = s.t + dt;
  switch (s.phase) {
    case 'black':
      return ready ? { ...s, phase: 'fade-in', t: 0 } : { ...s, t };
    case 'fade-in':
      return t >= FADE_SECONDS
        ? {
            ...s,
            phase: 'showing',
            t: t - FADE_SECONDS,
            shotTime: s.shotTime + dt,
          }
        : { ...s, t, shotTime: s.shotTime + dt };
    case 'showing':
      return t >= shots[s.shot].seconds
        ? { ...s, phase: 'fade-out', t: 0, shotTime: s.shotTime + dt }
        : { ...s, t, shotTime: s.shotTime + dt };
    case 'fade-out': {
      if (t < FADE_SECONDS) return { ...s, t, shotTime: s.shotTime + dt };
      const shot = s.next;
      return {
        shot,
        next: chooseNext(shots, shot, s.shot, random),
        previous: s.shot,
        phase: 'black',
        t: 0,
        shotTime: startOf(shots[shot], random),
      };
    }
  }
}

/** How black the screen is, 0 (clear) to 1. */
export function attractBlack(s: AttractState): number {
  switch (s.phase) {
    case 'black':
      return 1;
    case 'fade-in':
      return 1 - Math.min(1, s.t / FADE_SECONDS);
    case 'showing':
      return 0;
    case 'fade-out':
      return Math.min(1, s.t / FADE_SECONDS);
  }
}

/** The shot whose room should be built next, while this one shows. */
export const nextShot = (s: AttractState, _shots?: readonly AttractShot[]) =>
  s.next;
