import type { World } from '../world';
import type { PoolId } from './pools';
import type { Chemical } from './chemicals';
import { DAY_TANKS, dayTankStock, doseDraw } from './chemical-distribution';
import { dosedByPool } from './pools';
import { BOTTLE } from './dose-bottle';
import { serviceAvailable } from './services';
import type { ServiceRoom } from './services';

/**
 * Each pool's dosing as the world has it (the owner, 2026-10-28: the
 * footbath's DoseCell heads said STANDING while its cabinet's pumps
 * turned). Pure.
 *
 * - A pool can dose a chemical while its day tank has some (plan 085) and
 *   its way is open: the tank's outlet isolating valve, a cabinet's dosing
 *   end's isolating valve, the lounge's injection quill's (prompt 089,
 *   item 4).
 * - It doses it now as the world's step does: its water circulating and
 *   its room's chemical service on (`dosedByPool`).
 * - Its day tank is low for its cabinet's display (LOW HYPOCHLORITE) once
 *   down to the DoseCell's dry-run cut-out.
 */

/** Whether each chemical can be dosed: its day tank has some, and its way in is open. */
export function dosingStock(
  world: Pick<World, 'distribution' | 'installedValves'>,
  id: PoolId,
): Record<Chemical, boolean> {
  const s = dayTankStock(world.distribution, id);
  const open = (fitting: string) => world.installedValves[fitting] ?? true;
  // Its day tank's outlet isolating valve, and the dosing end's where its
  // cabinet doses (the owner, 2026-10-28: shutting the day tank off should
  // starve its cabinet).
  const room = `PL${id.slice(-1)}`;
  const fed = (c: Chemical) =>
    open(`${room}.${c}-day.out.iso`) &&
    (id === 'pool_03' || id === 'pool_04'
      ? open(`${room}.cabinet.${c}.iso`)
      : true);
  if (id !== 'pool_01')
    return {
      hypochlorite: s.hypochlorite && fed('hypochlorite'),
      acid: s.acid && fed('acid'),
    };
  const quill = (k: string) => open(`${k}-quill.in.iso`);
  return {
    hypochlorite: s.hypochlorite && fed('hypochlorite') && quill('hypo'),
    acid: s.acid && fed('acid') && quill('acid'),
  };
}

/**
 * What pool `id` draws from each of its day tanks now, litres a second:
 * the world's own dosing (`dosedByPool`, `doseDraw`), its water
 * circulating, its room's chemical service on, each chemical while its
 * tank has some; nothing for a chemical it is not dosing.
 */
export function doseRates(
  world: Pick<
    World,
    'distribution' | 'installedValves' | 'pools' | 'plant' | 'motors'
  >,
  id: PoolId,
): Record<Chemical, number> {
  const dosed = dosedByPool(
    world.pools,
    world.plant,
    (pool) => dosingStock(world, pool),
    true,
    world.motors,
  );
  return doseDraw(dosed)[id] ?? { hypochlorite: 0, acid: 0 };
}

/**
 * What pool `id`'s dosing asks of each of its day tanks now, litres a
 * second, whatever its valves: as `doseRates`, its tanks' stock alone
 * counting. Asked but not given (`doseRates` nothing), its way is shut.
 */
export function doseDemand(
  world: Pick<
    World,
    'distribution' | 'installedValves' | 'pools' | 'plant' | 'motors'
  >,
  id: PoolId,
): Record<Chemical, number> {
  const dosed = dosedByPool(
    world.pools,
    world.plant,
    (pool) => dayTankStock(world.distribution, pool),
    true,
    world.motors,
  );
  return doseDraw(dosed)[id] ?? { hypochlorite: 0, acid: 0 };
}

/** Whether each chemical is being dosed into pool `id` now. */
export function dosingNow(
  world: Pick<
    World,
    'distribution' | 'installedValves' | 'pools' | 'plant' | 'motors'
  >,
  id: PoolId,
): Record<Chemical, boolean> {
  const r = doseRates(world, id);
  return { hypochlorite: r.hypochlorite > 0, acid: r.acid > 0 };
}

/** Each chemical whose day tank for pool `id` is down to its pump's dry-run cut-out. */
export function lowChemicals(
  world: Pick<World, 'distribution'>,
  id: PoolId,
): Chemical[] {
  return (['hypochlorite', 'acid'] as const).filter((c) => {
    const i = DAY_TANKS[c].findIndex((t) => t.site === id);
    if (i < 0) return false;
    const litres = world.distribution[c].tanks[i]?.litres ?? 0;
    return litres <= DAY_TANKS[c][i].litres * BOTTLE.empty;
  });
}

/**
 * A spa cabinet's chemical feeds as its display tells them (the owner,
 * 2026-10-28: a feed failure should show in the cabinet): while its water
 * moves, a chemical that cannot reach it (its day tank empty, its outlet
 * or dosing isolating valve shut, its room's chemical service off) is a
 * feed fault; one still reaching it but down to its tank's dry-run
 * cut-out is low.
 */
export function cabinetFeeds(
  world: Pick<World, 'distribution' | 'installedValves' | 'plant'>,
  id: PoolId,
  flowing: boolean,
): { fault: Chemical[]; low: Chemical[] } {
  if (!flowing) return { fault: [], low: [] };
  const stock = dosingStock(world, id);
  const service = serviceAvailable(
    world.plant,
    `plant_${id}` as ServiceRoom,
    'chemical',
  );
  const all = ['hypochlorite', 'acid'] as const;
  const fault = all.filter((c) => !service || !stock[c]);
  const low = lowChemicals(world, id).filter((c) => !fault.includes(c));
  return { fault, low };
}

/** A feed's words on a 16-character display: HYPO FEED FAULT, LOW HYPOCHLORITE. */
export function feedMessages(feeds: {
  fault: readonly Chemical[];
  low: readonly Chemical[];
}): string[] {
  return [
    ...feeds.fault.map((c) => `${c === 'acid' ? 'ACID' : 'HYPO'} FEED FAULT`),
    ...feeds.low.map((c) => `LOW ${c === 'acid' ? 'ACID' : 'HYPOCHLORITE'}`),
  ];
}
