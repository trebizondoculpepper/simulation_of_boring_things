import { installedValveOpen } from './installed-valves';
import { BALANCE_TANK, newBalanceTank } from './balance-tank';
import type { BalanceTankState, MakeupMode } from './balance-tank';
import { olympicFlowsOf } from './olympic-battery';
import type { OlympicBatteryState } from './olympic-battery';
import type { MotorsState } from './motor-starters';
import { circulating, olympicTankLevel } from './pools';
import type { PoolsState } from './pools';
import { serviceAvailable } from './services';
import type { PlantServices } from './services';

/**
 * The Olympic's balance tank's controls in the world (prompt 035, item 2):
 * its make-up's selector, OFF, AUTO or HAND, on its Penfold panel in the
 * plant room (Dev28's), and whether the make-up's solenoid valve stands
 * open. In AUTO it opens below its level switch's band (2.9 m) and shuts
 * above it (3.05 m), holding between, so it neither chatters nor floods;
 * by HAND it stays open, filling the tank to its weir; OFF it stays shut.
 * The water itself is the world's (`pools.ts`, the Olympic's tank as
 * built, `balance-tank.ts`). Pure; depths in metres.
 */

export interface OlympicTankState {
  makeup: MakeupMode;
  /** The make-up's solenoid valve open: the filler pouring, while the wet hall gives water. */
  open: boolean;
}

export const newOlympicTank = (): OlympicTankState => ({
  makeup: 'auto',
  open: false,
});

export const MAKEUP_MODES: readonly MakeupMode[] = ['off', 'auto', 'hand'];

/** Whether the make-up calls for water at `level`, as its selector and its band have it. */
export function makeUpCalls(s: OlympicTankState, level: number): boolean {
  if (s.makeup === 'hand') return true;
  if (s.makeup === 'off') return false;
  return (
    level < BALANCE_TANK.makeupOn || (s.open && level < BALANCE_TANK.makeupOff)
  );
}

/** What the tank's float switches say at `level`. */
export const tankFloats = (level: number) => ({
  high: level >= BALANCE_TANK.high,
  low: level <= BALANCE_TANK.low,
  lowLow: level <= BALANCE_TANK.lowLow,
});

/**
 * The Olympic's tank as the world has it, in the shape the balance tank
 * hall draws (`BalanceTankState`, Dev28's): its depth, its pumps, its
 * make-up and whether the filler is pouring (its valve open, the plant
 * room's make-up isolating valve open, the wet hall giving water), what
 * falls into it from the pool's channels (the circulation coming back),
 * what the pumps take, and what spills over the weir.
 */
export function olympicTankView(world: {
  pools: PoolsState;
  plant: PlantServices;
  olympicTank: OlympicTankState;
  installedValves: Readonly<Record<string, boolean>>;
  olympic: OlympicBatteryState;
  motors?: MotorsState;
}): BalanceTankState {
  const water = world.pools.pool_02;
  const level = olympicTankLevel(water.balance);
  const running = circulating(water, world.plant, 'pool_02', world.motors);
  const pouring =
    world.olympicTank.open &&
    water.makeUp &&
    serviceAvailable(world.plant, 'wet_hall', 'water');
  const flows = olympicFlowsOf(world);
  return {
    ...newBalanceTank(level),
    drainOpen: installedValveOpen(world.installedValves, 'PL2-T1-DV1'),
    level,
    pumps: water.tripped ? 'tripped' : running ? 'run' : 'stop',
    makeupMode: world.olympicTank.makeup,
    makeupOpen: pouring,
    inflow: water.flow,
    outflow: running ? flows.toPool + flows.toWaste : 0,
    makeup: pouring ? BALANCE_TANK.makeup : 0,
    spill: level >= BALANCE_TANK.weir - 1e-6 ? water.flow * 0.05 : 0,
  };
}
