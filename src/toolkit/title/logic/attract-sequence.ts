import type { TitleOrbit } from './title-orbit';
import { OLYMPIC_ORBIT } from './title-orbit';

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
  /** Its camera move: an orbit (`title-orbit.ts`); authored paths later. */
  orbit: TitleOrbit;
  /** Seconds it is seen, between its fades. */
  seconds: number;
}

/**
 * The shots, until the owner authors them from noclip views (2026-10-24:
 * three orbits from different rooms, for now): the Olympic hall from high
 * up at its south end; the lounge pool from the south-west, past its arch; the jacuzzi on
 * its plinth, circled from the east.
 */
export const ATTRACT_SHOTS: readonly AttractShot[] = [
  {
    id: 'olympic-orbit',
    room: 'pool_02',
    orbit: { ...OLYMPIC_ORBIT, arc: 20, period: 80 },
    seconds: 20,
  },
  {
    id: 'lounge-orbit',
    room: 'pool_01',
    orbit: {
      centre: { x: 0, y: 0.5, z: 0 },
      radius: 8,
      height: 4.5,
      // South-west of the middle, clear of the arch's south leg.
      bearing: -30,
      arc: 30,
      period: 60,
    },
    seconds: 20,
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
    seconds: 20,
  },
];

/** Fading out to black, and in from it, seconds. */
export const FADE_SECONDS = 1.2;

export type AttractPhase = 'fade-in' | 'showing' | 'fade-out' | 'black';

export interface AttractState {
  /** The shot now (or, while black, the one to come). */
  shot: number;
  phase: AttractPhase;
  /** Seconds into the phase. */
  t: number;
  /** Seconds into the shot's camera move, from its start. */
  shotTime: number;
}

/** The sequence's start: black, waiting for its first shot to be built. */
export const newAttract = (): AttractState => ({
  shot: 0,
  phase: 'black',
  t: 0,
  shotTime: 0,
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
): AttractState {
  const t = s.t + dt;
  switch (s.phase) {
    case 'black':
      return ready
        ? { ...s, phase: 'fade-in', t: 0, shotTime: 0 }
        : { ...s, t };
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
    case 'fade-out':
      return t >= FADE_SECONDS
        ? {
            shot: (s.shot + 1) % shots.length,
            phase: 'black',
            t: 0,
            shotTime: 0,
          }
        : { ...s, t, shotTime: s.shotTime + dt };
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
