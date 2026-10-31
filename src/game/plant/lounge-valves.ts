import { NO_PORT_FLOW, portFlows } from './ideal-filter';
import type { FilterPorts } from './ideal-filter';
import { INSTALLED_VALVES } from './installed-valves';
import { MODEL_VALVES } from './model-valves';
import type { PlantServices } from './services';
import { circulating } from './pools';
import type { PoolsState } from './pools';
import type { MotorsState } from './motor-starters';
import { serviceAvailable } from './services';
import { strokeTime } from '../../toolkit/components/plant/logic/actuated-valve';

/** The nine installed valves on the lounge pool's filter and balance-tank pipework. */
export const LOUNGE_VALVES = Object.values(INSTALLED_VALVES).filter(
  (valve) =>
    valve.tag.startsWith('PL1-') &&
    // Not the dosing quills' ball valves (prompt 089), worked by hand.
    MODEL_VALVES.find((v) => v.id === valve.assetId)?.operator !== 'lever',
);
const STROKE = strokeTime(0.09);
const VALVE_BY_TAG = new Map(LOUNGE_VALVES.map((valve) => [valve.tag, valve]));

/**
 * The lounge's valves that run to waste, and so to the backwash pit: each
 * filter's backwash valve and drain, and the balance tank's drain.
 */
export const LOUNGE_WASTE_TAGS = [
  'PL1-F1-BV1',
  'PL1-F1-DV1',
  'PL1-F2-BV1',
  'PL1-F2-DV1',
  'PL1-T1-DV1',
] as const;
const WASTE_IDS: readonly string[] = LOUNGE_WASTE_TAGS.map(
  (tag) => VALVE_BY_TAG.get(tag)!.assetId,
);

/** Whether `assetId` is one of the lounge's valves to waste. */
export const isLoungeWasteValve = (assetId: string) =>
  WASTE_IDS.includes(assetId);

/**
 * PL1-CP1's pit interlock (the owner, 2026-10-31): while the backwash
 * pit's high-high inhibit holds its inlet shut, the panel drives every
 * valve to waste shut, and they stay shut once it clears until the
 * operator opens them again; it also refuses to open one meanwhile
 * (`world.ts`, `plant/valve`). The commands as they were if none was open
 * (the same object, so a quiet step costs nothing).
 */
export function closeLoungeWaste(
  commands: Readonly<Record<string, boolean>>,
  inhibit: boolean,
): Readonly<Record<string, boolean>> {
  if (!inhibit || !WASTE_IDS.some((id) => commands[id])) return commands;
  const next = { ...commands };
  for (const id of WASTE_IDS) if (next[id]) next[id] = false;
  return next;
}

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
   * negative while it is backwashed down its outlet (prompt 066); none in
   * a rinse, its outlet shut.
   */
  filters: readonly [number, number];
  /** Each filter's flow through its bed, + down, − up (the shared model's, from its ports). */
  beds: readonly [number, number];
  /** Each filter's ports, as its four valves give them (`FilterPorts`). */
  ports: readonly [FilterPorts, FilterPorts];
  /** Each filter's backwash to waste through its BV1. */
  backwash: readonly [number, number];
  /** Each filter's unfiltered water dumped to waste, its inlet and BV1 both open. */
  dumps: readonly [number, number];
  /** Each filter's drain-down through its DV1. */
  drains: readonly [number, number];
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
  /** Which pumps run, where known: each delivers through its own discharge valve. */
  pumps: { p1: boolean; p2: boolean } = { p1: true, p2: true },
  /** The waste main open to the backwash pit: shut at its high-high level (`wet-hall.ts`). */
  wasteOpen = true,
): LoungeFlows {
  const still: LoungeFlows = {
    toPool: 0,
    toWaste: 0,
    tankDrain: 0,
    filters: [0, 0],
    beds: [0, 0],
    ports: [NO_PORT_FLOW, NO_PORT_FLOW],
    backwash: [0, 0],
    dumps: [0, 0],
    drains: [0, 0],
  };
  if (!running) return still;
  const at = (tag: string) => {
    const valve = VALVE_BY_TAG.get(tag)!;
    return positions[valve.assetId] ?? (valve.normal === 'open' ? 1 : 0);
  };
  // What the running pumps deliver, each through its own discharge valve.
  const discharge = Math.max(
    pumps.p1 ? at('PL1-P1-IV1') : 0,
    pumps.p2 ? at('PL1-P2-IV1') : 0,
  );
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
  const waste = wasteOpen ? 1 : 0;
  const backwash = f.map((x, i) =>
    Math.min(
      LOUNGE_BACKWASH_FLOW *
        (1 - x.inlet) *
        Math.min(x.outlet, x.backwash) *
        waste,
      service[1 - i],
    ),
  );
  const dump = f.map((x) => 5 * x.inlet * x.backwash * discharge * waste);
  // Rinsed (the owner, 2026-10-30): its inlet and drain open and its
  // outlet shut, the pumps' water runs in at the top, down through the
  // bed and out of its drain to waste, at up to its service flow. With no
  // inlet open its drain only drains it down (3 m³/h).
  const rinse = f.map(
    (x) =>
      LOUNGE_FILTER_FLOW *
      Math.min(x.inlet, x.drain) *
      (1 - x.outlet) *
      discharge *
      waste,
  );
  const drains = f.map((x, i) => Math.max(rinse[i], 3 * x.drain * waste));
  const tankDrain = at('PL1-T1-DV1') * 5;
  const toWaste =
    tankDrain +
    f.reduce((sum, _x, i) => sum + backwash[i] + dump[i] + drains[i], 0);
  // Each filter's ports: the shared model takes it from there.
  const ports = f.map((_x, i): FilterPorts => ({
    inlet: service[i] + rinse[i] + dump[i],
    outlet: service[i],
    backwashIn: backwash[i],
    backwashOut: backwash[i] + dump[i],
    rinse: drains[i],
  }));
  const bed = ports.map((p) => portFlows(p).bed);
  return {
    toPool: Math.max(0, service[0] + service[1] - backwash[0] - backwash[1]),
    toWaste,
    tankDrain,
    filters: [service[0] - backwash[0], service[1] - backwash[1]],
    beds: [bed[0], bed[1]],
    ports: [ports[0], ports[1]],
    backwash: [backwash[0], backwash[1]],
    dumps: [dump[0], dump[1]],
    drains: [drains[0], drains[1]],
  };
}

/** The lounge battery's flows as a world has them: its valves, and whether the lounge's pumps run. */
export function loungeFlowsOf(world: {
  loungeValvePositions: Readonly<Record<string, number>>;
  pools: PoolsState;
  plant: PlantServices;
  motors?: MotorsState;
  wetHall?: { inhibit?: boolean };
}): LoungeFlows {
  return loungeValveFlows(
    world.loungeValvePositions,
    circulating(world.pools.pool_01, world.plant, 'pool_01', world.motors),
    loungePumpsRunning(world.motors),
    !world.wetHall?.inhibit,
  );
}

/** What the lounge's flowmeters read, by what each reads (`Meter.reads`): each filter's signed flow. */
export const loungeMeterReadings = (
  flows: LoungeFlows,
): Record<string, number> => ({
  'filter-1': flows.filters[0],
  'filter-2': flows.filters[1],
});

/** Which lounge pumps run, P-201A as P1 and P-201B as P2; both, where the starters are not known. */
export const loungePumpsRunning = (motors?: MotorsState) => ({
  p1: motors?.starters['P-201A'].running ?? true,
  p2: motors?.starters['P-201B'].running ?? true,
});

/** Whether a lounge pump's own discharge valve is open enough to pass water. */
export function loungeDischargeOpen(
  positions: Readonly<Record<string, number>>,
  tag: 'P-201A' | 'P-201B',
): boolean {
  const valve = VALVE_BY_TAG.get(
    tag === 'P-201A' ? 'PL1-P1-IV1' : 'PL1-P2-IV1',
  )!;
  return (positions[valve.assetId] ?? (valve.normal === 'open' ? 1 : 0)) > 0.05;
}
