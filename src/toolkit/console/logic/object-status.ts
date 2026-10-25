import type { World } from '../../../game/world';
import { jacuzziTankDraining } from '../../../game/world';
import { plantInventory } from '../../../game/plant/equipment-catalogue';
import { INSTALLED_VALVES } from '../../../game/plant/installed-valves';
import { MOTOR_TAGS } from '../../../game/plant/motor-starters';
import { JACUZZI_BALANCE_TANK } from '../../../game/plant/spa-balance-tank';
import { poolMakeUpCalling } from '../../../game/plant/pools';
import { POOL_IDS } from '../../../game/plant/pools';

/**
 * `status <name>` (the owner, 2026-10-25: "prints out the object's
 * condition, all known vars"): everything known of one object by its tag
 * (PL3-BT1, P-101A, PL1-F1-IV1), a pool by its id (pool_03), or a part of
 * the world by its name (jacuzziCabinet). It gathers, in turn: the plant
 * inventory's record (what it is, its maker, its purpose, its normal and
 * its state); an installed valve's command and travel; a motor starter's
 * state; the live readings of objects the world keeps under another name
 * (`LIVE`: the balance tanks, the jacuzzi's cabinet); and the world's own
 * part of that name, every value flattened to a dotted name. Pure.
 */

/** The live readings of tagged objects whose state the world keeps elsewhere. */
const LIVE: Record<string, (w: World) => Record<string, unknown>> = {
  'PL1-T1': (w) => tankReadings(w, 'pool_01'),
  'PL3-BT1': (w) => ({
    ...tankReadings(w, 'pool_03'),
    capacity_m3: JACUZZI_BALANCE_TANK.volume,
    contents_m3: w.pools.pool_03.balance * JACUZZI_BALANCE_TANK.volume,
    draining_to_waste: jacuzziTankDraining(w),
  }),
  'PL3-CAB1': (w) => ({
    cabinet: w.jacuzziCabinet,
    jacuzzi: w.jacuzzi,
    fibreIlluminator: w.jacuzziFibreIlluminator,
  }),
};

/** A pool's balance tank: how full it is, and whether its float calls for water. */
const tankReadings = (w: World, pool: (typeof POOL_IDS)[number]) => ({
  full_share: w.pools[pool].balance,
  make_up_calling: poolMakeUpCalling(pool, w.pools[pool]),
  make_up_open: w.pools[pool].makeUp,
  pool_level_m: w.pools[pool].level,
});

/** Every value under `value`, as `name = value` lines, numbers to four places. */
export function flatten(value: unknown, prefix = '', out: string[] = []) {
  if (value === null || typeof value !== 'object') {
    const shown =
      typeof value === 'number'
        ? Number.isInteger(value)
          ? String(value)
          : String(Number(value.toFixed(4)))
        : typeof value === 'string'
          ? value
          : JSON.stringify(value);
    out.push(`${prefix || '(value)'} = ${shown}`);
    return out;
  }
  const entries = Array.isArray(value)
    ? value.map((v, i) => [String(i), v] as const)
    : Object.entries(value as Record<string, unknown>);
  if (!entries.length)
    out.push(`${prefix} = ${Array.isArray(value) ? '[]' : '{}'}`);
  for (const [k, v] of entries) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  return out;
}

/** Every name `status` knows, for completion and for a near miss. */
export function statusNames(w: World): string[] {
  const inventory = plantInventory(
    w.identifiedPlant,
    w.installedValves,
    w.plant.feeders,
  ).map((e) => e.id);
  return [
    ...new Set([
      ...inventory,
      ...Object.values(INSTALLED_VALVES).map((v) => v.tag),
      ...MOTOR_TAGS,
      ...Object.keys(LIVE),
      ...POOL_IDS,
      ...Object.keys(w),
    ]),
  ].sort();
}

/** Lines describing `query`'s condition, or what it might have meant. */
export function objectStatus(w: World, query: string): string[] {
  const want = query.trim().toLowerCase();
  if (!want) return ['status: name an object, e.g. status PL3-BT1'];
  const lines: string[] = [];
  const section = (title: string, body: string[]) => {
    if (body.length) lines.push(`-- ${title}`, ...body.map((l) => `  ${l}`));
  };
  // The inventory's record: what it is, and its state.
  const entry = plantInventory(
    w.identifiedPlant,
    w.installedValves,
    w.plant.feeders,
  ).find((e) => e.id.toLowerCase() === want);
  if (entry)
    section('inventory', [
      `tag = ${entry.id}`,
      `name = ${entry.name}`,
      `kind = ${entry.kind}`,
      `maker = ${entry.brand}`,
      `class = ${entry.class}`,
      `purpose = ${entry.purpose}`,
      ...(entry.assetId ? [`asset = ${entry.assetId}`] : []),
      ...(entry.normal ? [`normal = ${entry.normal}`] : []),
      ...(entry.state !== undefined ? flatten(entry.state, 'state') : []),
    ]);
  // An installed valve: its command, and where it actually stands.
  const valve = Object.values(INSTALLED_VALVES).find(
    (v) => v.tag.toLowerCase() === want,
  );
  if (valve)
    section('valve', [
      `asset = ${valve.assetId}`,
      `normal = ${valve.normal}`,
      `commanded = ${(w.installedValves[valve.assetId] ?? valve.normal === 'open') ? 'open' : 'shut'}`,
      ...(valve.assetId in w.loungeValvePositions
        ? [
            `travel = ${Number(w.loungeValvePositions[valve.assetId].toFixed(3))} (0 shut, 1 open)`,
          ]
        : []),
    ]);
  // A motor starter.
  const motor = MOTOR_TAGS.find((t) => t.toLowerCase() === want);
  if (motor) section('motor starter', flatten(w.motors.starters[motor]));
  // Live readings kept under another name.
  const live = Object.keys(LIVE).find((t) => t.toLowerCase() === want);
  if (live) section('live', flatten(LIVE[live](w)));
  // A pool, or a part of the world, by its own name.
  const pool = POOL_IDS.find((p) => p.toLowerCase() === want);
  if (pool) section(`pool ${pool}`, flatten(w.pools[pool]));
  const part = Object.keys(w).find((k) => k.toLowerCase() === want);
  if (part) section(`world.${part}`, flatten(w[part as keyof World]));
  if (lines.length) return [`${query.trim().toUpperCase()}`, ...lines];
  // Nothing by that name: what it might have meant.
  const near = statusNames(w).filter((n) => n.toLowerCase().includes(want));
  return near.length
    ? [
        `status: nothing called ${query.trim()}; did you mean:`,
        ...near.slice(0, 20).map((n) => `  ${n}`),
        ...(near.length > 20 ? [`  … ${near.length - 20} more`] : []),
      ]
    : [`status: nothing called ${query.trim()}`];
}
