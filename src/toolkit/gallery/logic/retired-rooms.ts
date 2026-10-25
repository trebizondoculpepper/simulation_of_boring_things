import retired1 from './retired/retired1.json';
import retired0 from './retired/retired0.json';
import type { PipeRun } from './room-pipes';
import type { CabinetRun } from './cabinet-pipes';
import type { layoutRoomLive } from './room-equipment';

/**
 * Retired rooms (the owner, 2026-10-23): a plant room's machine layout and
 * its pipes and ducts frozen as a reference, so that alternative versions
 * of its plant can be planned against it. Each is a snapshot of what the
 * room's generators (`layoutRoom`, `roomPipes`) gave on the day it was
 * retired, kept in `retired/<id>.json`, and drawn as its own room
 * (`?room=<id>`): no later change to the generators moves it.
 *
 * - `retired0`: the Olympic pool's plant room (`plant_pool_02`), 2026-10-23.
 * - `retired1`: the jacuzzi's plant room (`plant_pool_03`), 2026-10-25,
 *   before its re-plumbing by the plumber (prompt 064): its cabinet's runs
 *   (`cabinetPipes`) frozen with its layout. Written by
 *   `RETIRE_JACUZZI=1 npx vp test run scripts/retire-jacuzzi.test.ts`.
 *
 * Pure.
 */

type Layout = NonNullable<ReturnType<typeof layoutRoomLive>>;

interface RetiredRoom {
  note: string;
  /** The room it was taken from. */
  from: string;
  layout: Layout;
  pipes: PipeRun[];
  /** A packaged cabinet's runs (`cabinetPipes`), where the room has one. */
  cabinetRuns?: CabinetRun[];
}

export const RETIRED_ROOMS: Readonly<Record<string, RetiredRoom>> = {
  retired0: retired0 as unknown as RetiredRoom,
  retired1: retired1 as unknown as RetiredRoom,
};

/** A retired room's frozen cabinet runs, if `room` is one with a cabinet. */
export const retiredCabinetRuns = (room: string): CabinetRun[] | null =>
  RETIRED_ROOMS[room]?.cabinetRuns ?? null;

/** A retired room's frozen machine layout, if `room` is one. */
export const retiredLayout = (room: string): Layout | null =>
  RETIRED_ROOMS[room]?.layout ?? null;

/** A retired room's frozen pipes and ducts, if `room` is one. */
export const retiredPipes = (room: string): PipeRun[] | null =>
  RETIRED_ROOMS[room]?.pipes ?? null;

/** The room a retired room was taken from. */
export const retiredFrom = (room: string) => RETIRED_ROOMS[room]?.from ?? null;
