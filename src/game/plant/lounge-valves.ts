import { INSTALLED_VALVES } from './installed-valves';
import type { PlantServices } from './services';
import { circulating } from './pools';
import type { PoolsState } from './pools';
import type { MotorsState } from './motor-starters';
import { serviceAvailable } from './services';
import { strokeTime } from '../../toolkit/components/plant/logic/actuated-valve';

/** The nine installed valves on the lounge pool's filter and balance-tank pipework. */
export const LOUNGE_VALVES = Object.values(INSTALLED_VALVES).filter((valve) =>
  valve.tag.startsWith('PL1-'),
);
const STROKE = strokeTime(0.09);
const VALVE_BY_TAG = new Map(LOUNGE_VALVES.map((valve) => [valve.tag, valve]));

export function newLoungeValvePositions(): Record<string, number> {
  return Object.fromEntries(
    LOUNGE_VALVES.map(({ assetId, normal }) => [
      assetId,
      normal === 'open' ? 1 : 0,
    ]),
  );
}

/**
 * Actual travel and spring return live in the world, so both the local
 * mimic and the valve agree. Their actuators are electric, spring-return
 * (the owner, 2026-10-24): driven while powered and commanded, sprung shut
 * when their room loses power. They need no air.
 */
export function stepLoungeValves(
  positions: Readonly<Record<string, number>>,
  commands: Readonly<Record<string, boolean>>,
  plant: PlantServices,
  dt: number,
): Record<string, number> {
  const power = serviceAvailable(plant, 'plant_pool_01', 'power');
  const next: Record<string, number> = {};
  for (const { assetId, normal } of LOUNGE_VALVES) {
    const current = positions[assetId] ?? (normal === 'open' ? 1 : 0);
    const target = power && (commands[assetId] ?? normal === 'open') ? 1 : 0;
    const travel = Math.max(0, dt) / STROKE;
    next[assetId] =
      target > current
        ? Math.min(target, current + travel)
        : Math.max(target, current - travel);
  }
  return next;
}

/** Each lounge filter's service flow, m³/h: half the pool's 90 m³/h design circulation. */
export const LOUNGE_FILTER_FLOW = 45;
/** A lounge filter's backwash, m³/h: 30 m/h over a Ø1.2 m filter's 1.13 m² bed. */
export const LOUNGE_BACKWASH_FLOW = 34;

/** What the lounge's filter battery carries, m³/h. */
export interface LoungeFlows {
  toPool: number;
  toWaste: number;
  tankDrain: number;
  /**
   * Each filter's flow up its outlet (F1, F2): positive in service,
   * negative while it is backwashed down its outlet (prompt 066).
   */
  filters: readonly [number, number];
  /** Each filter's backwash to waste through its BV1. */
  backwash: readonly [number, number];
}

/**
 * Two parallel filters, each with an inlet (IV1), an outlet (IV2) to the
 * filtered-water header, a backwash valve (BV1) to waste and a drain
 * (DV1). In service, a filter takes the pumps' water in at its inlet and
 * gives it up its outlet. Backwashed (the owner, 2026-10-25, prompt 066),
 * a filter has its inlet shut and its outlet and backwash valve open: the
 * other filter's filtered water comes back along the header, down its
 * outlet, up through its bed and out to waste, so the pool's return drops
 * by what the backwash takes, and with both filters backwashing there is
 * no filtered water to wash either. A filter with its inlet and backwash
 * both open dumps its unfiltered water to waste.
 */
export function loungeValveFlows(
  positions: Readonly<Record<string, number>>,
  running: boolean,
): LoungeFlows {
  const still: LoungeFlows = {
    toPool: 0,
    toWaste: 0,
    tankDrain: 0,
    filters: [0, 0],
    backwash: [0, 0],
  };
  if (!running) return still;
  const at = (tag: string) => {
    const valve = VALVE_BY_TAG.get(tag)!;
    return positions[valve.assetId] ?? (valve.normal === 'open' ? 1 : 0);
  };
  const discharge = Math.max(at('PL1-P1-IV1'), at('PL1-P2-IV1'));
  const filter = (n: 1 | 2) => {
    const v = (letters: string) => at(`PL1-F${n}-${letters}`);
    return {
      inlet: v('IV1'),
      outlet: v('IV2'),
      backwash: v('BV1'),
      drain: v('DV1'),
    };
  };
  const f = [filter(1), filter(2)] as const;
  // In service: through inlet and outlet, while the pumps deliver.
  const service = f.map(
    (x) => LOUNGE_FILTER_FLOW * Math.min(x.inlet, x.outlet) * discharge,
  );
  // Backwashed: as far as its inlet is shut and its outlet and backwash
  // open, and no more than the other filter gives.
  const backwash = f.map((x, i) =>
    Math.min(
      LOUNGE_BACKWASH_FLOW * (1 - x.inlet) * Math.min(x.outlet, x.backwash),
      service[1 - i],
    ),
  );
  const dump = f.map((x) => 5 * x.inlet * x.backwash * discharge);
  const tankDrain = at('PL1-T1-DV1') * 5;
  const toWaste =
    tankDrain +
    f.reduce((sum, x, i) => sum + backwash[i] + dump[i] + 3 * x.drain, 0);
  return {
    toPool: Math.max(0, service[0] + service[1] - backwash[0] - backwash[1]),
    toWaste,
    tankDrain,
    filters: [service[0] - backwash[0], service[1] - backwash[1]],
    backwash: [backwash[0], backwash[1]],
  };
}

/** The lounge battery's flows as a world has them: its valves, and whether the lounge's pumps run. */
export function loungeFlowsOf(world: {
  loungeValvePositions: Readonly<Record<string, number>>;
  pools: PoolsState;
  plant: PlantServices;
  motors?: MotorsState;
}): LoungeFlows {
  return loungeValveFlows(
    world.loungeValvePositions,
    circulating(world.pools.pool_01, world.plant, 'pool_01', world.motors),
  );
}

/** What the lounge's flowmeters read, by what each reads (`Meter.reads`): each filter's signed flow. */
export const loungeMeterReadings = (
  flows: LoungeFlows,
): Record<string, number> => ({
  'filter-1': flows.filters[0],
  'filter-2': flows.filters[1],
});
