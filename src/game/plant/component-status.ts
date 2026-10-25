import { equipmentKind } from './equipment-kinds';
import { GAS_ZONES } from './gas';
import { gasDisplay } from '../../toolkit/components/general-safety/logic/gas-detection';
import { uvLampOn } from './uv';
import { INSTALLED_VALVES } from './installed-valves';
import { MODEL_VALVES } from './model-valves';
import type { World } from '../world';
import { jacuzziCabinetPanel } from '../world';
import {
  componentDescription,
  describedComponents,
  plantInventory,
} from './equipment-catalogue';
import type { InventoryEntry } from './equipment-catalogue';
import { formatStatus, statusBindingFor } from './component-descriptions';
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
  if ('uv' in b) return { policy: 'uv', lit: uvLampOn(world, b.uv) };
  if ('gasZone' in b)
    // As its detector's display shows it (`gasDisplay`).
    return {
      policy: 'gas',
      shown: gasDisplay(
        GAS_ZONES[b.gasZone],
        world.gas[b.gasZone].state,
      ).trim(),
    };
  if ('valve' in b) {
    // An installed valve's command, or an identified part's state.
    // Its key: the register's asset id, or its model fitting's id.
    const id =
      Object.values(INSTALLED_VALVES).find((v) => v.tag === b.valve)?.assetId ??
      MODEL_VALVES.find((v) => v.tag === b.valve)?.id ??
      b.valve;
    // An actuated lounge valve: where it actually is, which its position
    // indicator shows, not where it is commanded (Codex's review of 069).
    const travel = world.loungeValvePositions[id];
    if (typeof travel === 'number')
      return travel >= 0.98
        ? { policy: 'valve', open: true }
        : travel <= 0.02
          ? { policy: 'valve', open: false }
          : { policy: 'valve', open: true, partly: true };
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

/** One component's actual state for its inspection heading, independent of prose. */
export function inspectionStatus(
  world: World,
  tag: string,
): string | undefined {
  const subject = describedComponents().subjects.get(tag);
  if (!subject) return undefined;
  if (
    subject.kind === 'switch-fuse' &&
    subject.room &&
    subject.room in world.plant.feeders
  )
    return world.plant.feeders[subject.room as keyof typeof world.plant.feeders]
      ? 'On'
      : 'Off';
  const state = resolveStatus(world, subject);
  if (state?.policy === 'valve')
    return state.partly ? 'part open' : state.open ? 'open' : 'shut';
  return formatStatus(equipmentKind(subject.kind).status, state);
}
