import { WORLD_VERSION, newWorld } from './world';
import type { World } from './world';

/**
 * The save format: the world in an envelope saying what it is, which
 * version of the world it holds and when it was saved. Pure: reading and
 * writing the browser's storage is `src/toolkit/save/world-store.ts`.
 *
 * Loading migrates an older save version by version (`MIGRATIONS`), then
 * fills anything still missing from a new world's defaults, so a field
 * added to the world turns up in an old save at its starting value. A
 * save that is not one of ours, is garbled, or is newer than this build
 * is refused whole, never half loaded.
 */

export const SAVE_FORMAT = 'pool-plant-save';

/** At most this many seconds are caught up on when the game comes back. */
export const CATCH_UP_LIMIT = 3600;

export interface SaveEnvelope {
  format: typeof SAVE_FORMAT;
  version: number;
  /** When it was saved, milliseconds since 1970 (the wall clock). */
  savedAt: number;
  world: World;
}

/**
 * Each step from one save version to the next: `MIGRATIONS[n]` turns a
 * version n world into a version n + 1 one. Empty until the world first
 * changes shape.
 */
export const MIGRATIONS: Record<number, (world: unknown) => unknown> = {
  1: (world) => world,
  2: (world) => world,
};

export function serialiseWorld(world: World, savedAt: number): string {
  const envelope: SaveEnvelope = {
    format: SAVE_FORMAT,
    version: WORLD_VERSION,
    savedAt,
    world,
  };
  return JSON.stringify(envelope);
}

export type LoadResult =
  | { ok: true; world: World; savedAt: number }
  | { ok: false; reason: string };

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * `value` shaped like `defaults`: each of its fields kept where it has
 * the default's type, the default taken where it is missing or of another
 * type, and fields the defaults no longer have dropped.
 */
export function fillDefaults<T>(value: unknown, defaults: T): T {
  if (isRecord(defaults)) {
    if (!isRecord(value)) return defaults;
    const out: Record<string, unknown> = {};
    for (const [key, d] of Object.entries(defaults))
      out[key] = fillDefaults(value[key], d);
    return out as T;
  }
  if (Array.isArray(defaults))
    return (Array.isArray(value) ? value : defaults) as T;
  if (
    typeof value === typeof defaults &&
    !(typeof value === 'number' && !Number.isFinite(value))
  )
    return value as T;
  return defaults;
}

export function deserialiseWorld(text: string): LoadResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'the save is not readable' };
  }
  if (!isRecord(parsed) || parsed.format !== SAVE_FORMAT)
    return { ok: false, reason: 'this is not a Pool Plant save' };
  const { version, savedAt } = parsed;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1)
    return { ok: false, reason: 'the save has no version' };
  if (version > WORLD_VERSION)
    return {
      ok: false,
      reason: `the save is from a newer version (${version})`,
    };
  let world = parsed.world;
  for (let v = version; v < WORLD_VERSION; v++) {
    const migrate = MIGRATIONS[v];
    if (!migrate)
      return { ok: false, reason: `no way to bring version ${v} up to date` };
    world = migrate(world);
  }
  if (!isRecord(world)) return { ok: false, reason: 'the save holds no world' };
  return {
    ok: true,
    world: fillDefaults(world, newWorld()),
    savedAt:
      typeof savedAt === 'number' && Number.isFinite(savedAt)
        ? savedAt
        : Date.now(),
  };
}

/** How many seconds to catch up on, from when it was saved to `now` (ms). */
export function catchUpSeconds(savedAt: number, now: number) {
  return Math.max(0, Math.min(CATCH_UP_LIMIT, (now - savedAt) / 1000));
}
