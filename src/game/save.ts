import { WORLD_VERSION, newWorld } from './world';
import type { World } from './world';
import {
  FOOTBATH,
  newIdentifiedPlant,
  setPartOpen,
} from './plant/identification';

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
  // 3 → 4: the machines' isolators, all on (`fillDefaults` adds them).
  3: (world) => world,
  // 4 → 5: the dosing chemicals' stores, full (`fillDefaults` adds them).
  4: (world) => world,
  // 5 → 6: the wet hall's tanks and booster set (`fillDefaults` adds them).
  5: (world) => world,
  // 6 → 7: the pools' bathers, none yet (`fillDefaults` adds them).
  6: (world) => world,
  // 7 → 8: no SLOW START under way (`fillDefaults` adds it).
  7: (world) => world,
  // 8 → 9: the lighting, every zone on (`fillDefaults` adds it).
  8: (world) => world,
  // 9 → 10: each pool hall's air temperature (`fillDefaults` adds it).
  9: (world) => world,
  // 10 → 11: the outside's temperature, and each pool's heating (`fillDefaults` adds them).
  10: (world) => world,
  // 11 → 12: the toxic gas detection's rooms, clear (`fillDefaults` adds them).
  11: (world) => world,
  // 12 → 13: each pool's drain-down (shut) and make-up (open) valves (`fillDefaults` adds them).
  12: (world) => world,
  // 13 → 14: move the footbath's two legacy operating flags to its named valves.
  13: (world) => {
    if (!isRecord(world)) return world;
    const pools = isRecord(world.pools) ? world.pools : {};
    const footbath = isRecord(pools.pool_04) ? pools.pool_04 : {};
    const drain = footbath.drainDown === true;
    let identifiedPlant = newIdentifiedPlant();
    identifiedPlant = setPartOpen(identifiedPlant, FOOTBATH.drain, drain);
    identifiedPlant = setPartOpen(identifiedPlant, FOOTBATH.return, !drain);
    identifiedPlant = setPartOpen(
      identifiedPlant,
      FOOTBATH.makeUp,
      footbath.makeUp !== false,
    );
    return { ...world, identifiedPlant };
  },
  // 14 → 15: installed room-pipework valves, keyed by permanent asset ID.
  14: (world) => world,
  // 15 → 16: the Olympic's filter beds, mid-season (`fillDefaults` adds them).
  15: (world) => world,
  // 16 → 17: the Olympic's balance tank's make-up, in AUTO (`fillDefaults` adds it).
  16: (world) => world,
  // 17 → 18: each pool's thermostat, at its design temperature (`fillDefaults` adds it).
  17: (world) => world,
  // 18 → 19: actual positions of the lounge filter solenoid valves.
  18: (world) => world,
  // 19 → 20: the air handling units, running, and each hall's humidity (`fillDefaults` adds them).
  19: (world) => world,
  // 20 → 21: the motors' starters, in AUTO, the duty pumps running (`fillDefaults` adds them).
  20: (world) => world,
  // 21 → 22: the jacuzzi's jets and air, off (`fillDefaults` adds them).
  21: (world) => world,
  // 22 → 23: the boiler house's gas safety, all well and the SSOV open (`fillDefaults` adds it).
  22: (world) => world,
  // 23 → 24: the Jacuzzi's fibre illuminator (`fillDefaults` adds it).
  23: (world) => world,
  // 24 → 25: music transports and amplifiers; initially silent.
  24: (world) => world,
  // 25 → 26: the jacuzzi's cabinet, on and not tripped (`fillDefaults` adds it).
  25: (world) => world,
  // 26 → 27: the jacuzzi plant room built from its model (prompt 064), its
  // valves keyed by their model ids. The owner (2026-10-25): if the network
  // has changed, the game state is thrown away; a new world it is.
  26: () => ({}),
  // 27 → 28: the lounge's filter beds, mid-season (`fillDefaults` adds them).
  27: (world) => world,
  // 28 → 29: the spa cabinets' sand filters, outside them (`fillDefaults`
  // adds them, in service).
  28: (world) => world,
  // 29 → 30: each pool's suspended solids (`fillDefaults` gives them clean).
  29: (world) => world,
  // 30 → 31: the lounge's and Olympic's beds, the ideal filter's: their
  // fissuring and unsettling (`fillDefaults` gives them sound and settled).
  30: (world) => world,
  // 31 → 32: the spa cabinets' controllers (`fillDefaults`: running).
  31: (world) => world,
  // 32 → 33: DB-L1's RCBOs and main switch, its circuits' leakage, and the
  // central battery in the world (`fillDefaults`: all on, dry, charged).
  32: (world) => world,
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
