import { installedValveByCommandId } from './installed-valves';
import { olympicFlowsOf } from './olympic-battery';
import type { OlympicBatteryState } from './olympic-battery';
import { WET_HALL_PLANT } from './wet-hall';
import type { WetHallState } from './wet-hall';
import type { PoolsState } from './pools';
import type { PlantServices } from './services';
import type { MotorsState } from './motor-starters';
import {
  FILTER_VALVES,
  commandedValves,
  stepWashOTron,
  valvesMatch,
} from './wash-o-tron';
import type { FilterValve, WashOTron } from './wash-o-tron';

/**
 * The Wash-O-Tron in the world (prompt 072): what it senses of the
 * Olympic's filters and the backwash pit, and the filters' valves it
 * drives. It drives a filter's valves only while changing its state;
 * steady, it leaves them to the operators, and a valve worked by hand
 * during a wash holds its programme with a valve fault. Pure.
 */

type Valves = Readonly<Record<string, boolean>>;

const asset = (n: number, v: FilterValve) =>
  installedValveByCommandId(`PL2-F${n + 1}-${v}`)?.assetId;

/** Filter `n`'s valves, open or shut, as they stand. */
export function filterValves(
  valves: Valves,
  n: number,
): Record<FilterValve, boolean> {
  return Object.fromEntries(
    FILTER_VALVES.map((v) => {
      const id = asset(n, v);
      return [v, id ? valves[id] === true : false];
    }),
  ) as Record<FilterValve, boolean>;
}

export function stepWashWorld(
  world: {
    time: number;
    washOTron: WashOTron;
    installedValves: Valves;
    olympic: OlympicBatteryState;
    pools: PoolsState;
    plant: PlantServices;
    motors?: MotorsState;
    wetHall: WetHallState;
  },
  delta: number,
): { washOTron: WashOTron; installedValves: Valves } {
  const flows = olympicFlowsOf(world);
  let s = stepWashOTron(
    world.washOTron,
    {
      time: world.time,
      pumping: flows.pumping,
      bedFlow: flows.filters.map((f) => f.bed),
      pit: world.wetHall.backwashTank,
      pitHigh: WET_HALL_PLANT.backwashTank * WET_HALL_PLANT.backwashHigh,
      pitInhibit: world.wetHall.inhibit,
      loungeWashing: false,
    },
    delta,
  );
  // A valve worked by hand mid-wash: the programme held, its fault raised.
  if (s.washing !== null && s.running && !s.hold) {
    const f = s.filters[s.washing];
    if (
      f.phase === 'steady' &&
      !valvesMatch(f, filterValves(world.installedValves, s.washing))
    )
      s = {
        ...s,
        hold: true,
        alarms: { ...s.alarms, valveFault: { on: true, accepted: false } },
      };
  }
  // Its commands, to the filters changing state.
  let installedValves = world.installedValves;
  s.filters.forEach((f, n) => {
    if (f.phase === 'steady') return;
    const want = commandedValves(f);
    for (const v of FILTER_VALVES) {
      const id = asset(n, v);
      if (id && installedValves[id] !== want[v])
        installedValves = { ...installedValves, [id]: want[v] };
    }
  });
  return { washOTron: s, installedValves };
}
