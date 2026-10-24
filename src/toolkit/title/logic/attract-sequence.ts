import type { TitleOrbit } from './title-orbit';
import type { AttractScenarioId } from '../../../game/attract-scenarios';
import { orbitPose } from './title-orbit';
import { createCameraLoop, parseViewLink } from './camera-path';
import type { CameraKey, CameraLoop, CameraSample } from './camera-path';

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
   * Its camera move: an orbit (`title-orbit.ts`), or a loop flown through
   * the owner's noclip shots (`camera-path.ts`), which it takes if it has
   * one.
   */
  orbit?: TitleOrbit;
  path?: CameraLoop;
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
 * low over the water and round the hall, flown as one smooth loop at a
 * steady walking pace, banking with the owner's rolls.
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

/** How long each shot is seen between its fades, seconds (the owner, 2026-10-25). */
export const SHOT_SECONDS = 25;

const loungeFlyby = createCameraLoop(LOUNGE_FLYBY.keys, LOUNGE_FLYBY.speed);

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
const plantFlyby = createCameraLoop(PLANT_FLYBY.keys, PLANT_FLYBY.speed, {
  minX: -10.9,
  maxX: 10.9,
  minZ: -6.9,
  maxZ: 6.9,
});

/** A shot's camera `seconds` into its move: its loop's pose, or its orbit's, level and unzoomed. */
export function shotPose(shot: AttractShot, seconds: number): CameraSample {
  if (shot.path) return shot.path.sample(seconds);
  const o = orbitPose(shot.orbit!, seconds);
  return { ...o, roll: 0, zoom: 1 };
}

/**
 * The shots: the lounge pool's fly-by, once round; the Olympic plant
 * room's, once round; the jacuzzi on its plinth, circled from the east (a
 * placeholder orbit, 2026-10-24, until the owner authors it from noclip
 * views). The Olympic hall's high orbit was dropped (the owner, 2026-10-25).
 */
export const ATTRACT_SHOTS: readonly AttractShot[] = [
  {
    id: 'lounge-flyby',
    room: 'pool_01',
    path: loungeFlyby,
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
    id: 'jacuzzi-orbit',
    room: 'pool_03',
    orbit: {
      centre: { x: -2.7, y: 0.9, z: 0 },
      radius: 4,
      height: 3,
      bearing: 90,
      arc: 40,
      period: 60,
    },
    scenario: 'normal',
    seconds: SHOT_SECONDS,
  },
];

export type AttractPhase = 'fade-in' | 'showing' | 'fade-out' | 'black';

export interface AttractState {
  /** The shot now (or, while black, the one to come). */
  shot: number;
  phase: AttractPhase;
  /** Seconds into the phase. */
  t: number;
  /**
   * Seconds into the shot's camera move: from a point chosen at random
   * round it as the sequence comes to the shot, on from there.
   */
  shotTime: number;
}

/** A shot's whole camera move, seconds: its loop's, or its orbit's cycle. */
export const shotPeriod = (shot: AttractShot) =>
  shot.path?.period ?? shot.orbit!.period;

/** Where in its move a shot starts: anywhere round it, at random. */
const startOf = (shot: AttractShot, random: () => number) =>
  random() * shotPeriod(shot);

/** The sequence's start: black, waiting for its first shot to be built, its starting point chosen. */
export const newAttract = (
  shots: readonly AttractShot[] = ATTRACT_SHOTS,
  random: () => number = Math.random,
): AttractState => ({
  shot: 0,
  phase: 'black',
  t: 0,
  shotTime: startOf(shots[0], random),
});

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
      const next = (s.shot + 1) % shots.length;
      return {
        shot: next,
        phase: 'black',
        t: 0,
        shotTime: startOf(shots[next], random),
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
export const nextShot = (s: AttractState, shots: readonly AttractShot[]) =>
  (s.shot + 1) % shots.length;
