import { INSTALLED_VALVES } from './installed-valves';
import { MODEL_VALVES } from './model-valves';
import type { World } from '../world';
import { jacuzziCabinetPanel } from '../world';
import { componentDescription, plantInventory } from './equipment-catalogue';
import type { InventoryEntry } from './equipment-catalogue';
import { statusBindingFor } from './component-descriptions';
import type {
  DescribedSubject,
  DescriptionContext,
  ResolvedStatus,
} from './component-descriptions';
import { identifiedPart } from './identification';
import { WET_HALL_PLANT } from './wet-hall';

/**
 * Components' live status, read from the world (prompt 060): the context
 * that gives a description its "currently …". Where the world keeps an
 * item's state is found from its kind and room (`statusBindingFor`); this
 * reads it, and its kind words it. Missing state is not Off: an item whose
 * binding finds nothing has no status. Pure.
 */

/** What the world says now of the item a subject's binding names. */
export function resolveStatus(
  world: World,
  subject: DescribedSubject,
): ResolvedStatus | undefined {
  const b = statusBindingFor(subject);
  if (!b) return undefined;
  if ('motor' in b) {
    const s = world.motors.starters[b.motor];
    return { policy: 'motor', running: s.running, tripped: s.tripped };
  }
  if ('motors' in b)
    return {
      policy: 'pump-set',
      pumps: b.motors.map((tag) => ({
        tag,
        running: world.motors.starters[tag].running,
        tripped: world.motors.starters[tag].tripped,
      })),
    };
  if ('pool' in b)
    return { policy: 'level', fraction: world.pools[b.pool].balance };
  if ('wetHallTank' in b)
    return {
      policy: 'level',
      fraction: world.wetHall[b.wetHallTank] / WET_HALL_PLANT[b.wetHallTank],
    };
  if ('booster' in b)
    return {
      policy: 'booster',
      running: world.wetHall.boosterRunning,
      tripped: world.wetHall.boosterTripped,
    };
  if ('cabinet' in b) {
    const panel = jacuzziCabinetPanel(world);
    const tripped =
      world.jacuzziCabinet.trip !== '' || world.pools.pool_03.tripped;
    return {
      policy: 'cabinet',
      state: !panel.supplied
        ? 'no-power'
        : tripped
          ? 'tripped'
          : panel.flowing
            ? 'circulating'
            : panel.pumpRun
              ? 'no-flow'
              : 'off',
    };
  }
  if ('gasZone' in b)
    return { policy: 'gas', ppm: world.gas[b.gasZone].state.reading };
  if ('valve' in b) {
    // An installed valve's command, or an identified part's state.
    // Its key: the register's asset id, or its model fitting's id.
    const id =
      Object.values(INSTALLED_VALVES).find((v) => v.tag === b.valve)?.assetId ??
      MODEL_VALVES.find((v) => v.tag === b.valve)?.id ??
      b.valve;
    const installed = world.installedValves[id];
    if (typeof installed === 'boolean')
      return { policy: 'valve', open: installed };
    const valve = identifiedPart(world.identifiedPlant, id);
    const open = (valve?.state as { open?: unknown } | undefined)?.open;
    return typeof open === 'boolean' ? { policy: 'valve', open } : undefined;
  }
  const part = identifiedPart(world.identifiedPlant, b.part);
  const state = part?.state as { on?: unknown } | undefined;
  return typeof state?.on === 'boolean'
    ? { policy: 'switch', on: state.on }
    : undefined;
}

/** The description context for the world as it is now. */
export const worldContext = (world: World): DescriptionContext => ({
  status: (subject) => resolveStatus(world, subject),
});

/** The inventory as the world has it: states and live descriptions from one snapshot. */
export const inventoryForWorld = (world: World): InventoryEntry[] =>
  plantInventory(
    world.identifiedPlant,
    world.installedValves,
    world.plant.feeders,
    worldContext(world),
  );

/** One component's description as the world has it now, or ''. */
export const describeForWorld = (world: World, tag: string): string =>
  componentDescription(tag, worldContext(world));
