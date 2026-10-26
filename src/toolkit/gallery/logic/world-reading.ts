import { withIntake } from '../../../game/plant/site-intake';
import { loungeFilterDp } from '../../../game/plant/lounge-filters';
import { loungeFlowsOf } from '../../../game/plant/lounge-valves';
import { UV_ISOLATORS } from '../../../game/plant/uv';
import type { World } from '../../../game/world';
import { POOL_TARGET } from '../../../game/plant/pools';
import { hallHandling } from '../../../game/plant/air-handling';
import type { PoolId } from '../../../game/plant/pools';
import { serviceAvailable } from '../../../game/plant/services';
import type { IsolatorName, ServiceRoom } from '../../../game/plant/services';
import { WET_HALL_PLANT } from '../../../game/plant/wet-hall';
import { olympicFlowsOf } from '../../../game/plant/olympic-battery';
import { POOL_MOTORS } from '../../../game/plant/motor-starters';
import type { MotorTag } from '../../../game/plant/motor-starters';
import {
  CHLORINE_LOW,
  FILTER_DP_LIMIT,
  RH_HIGH,
  gasAlarmIds,
} from './control-room-demo';
import type { AlarmId, PlantReading } from './control-room-demo';

/**
 * The plant as the world has it, in the shape the machines and the control
 * room show (`PlantReading`, which `plantAt`'s scripted loop also gives,
 * for development rooms with no world). Pure.
 *
 * A pool's pumps: where they have starters in the world
 * (`motor-starters.ts`), as those have them, running, tripped and their
 * currents; elsewhere its A pump is duty while its isolator is on, its B
 * pump otherwise, one running while the pool circulates. Its hall's
 * humidity is the world's (`air-handling.ts`). What the world does not
 * yet model is drawn from what it does: the filters' pressure
 * differences, as clean filters', rising with the square of the flow (the
 * Olympic's from its battery's beds).
 */

/** Each pool's pumps' isolators, A then B, and its UV's. */
const PUMPS: Partial<Record<PoolId, readonly [IsolatorName, IsolatorName]>> = {
  pool_01: ['P-201A isolator', 'P-201B isolator'],
  pool_02: ['P-101A isolator', 'P-101B isolator'],
};

/** Clean filters' pressure differences at design flow, bar. */
const CLEAN_DP = [0.34, 0.36, 0.36, 0.31] as const;

export function plantReadingOf(world: World, pool: PoolId = 'pool_02') {
  const room = `plant_${pool}` as ServiceRoom;
  const water = world.pools[pool];
  // As its consumers see it: the utilities' outside devices too (prompt 083).
  const plant = withIntake(world.plant, world.intake);
  const powered = serviceAvailable(plant, room, 'power');
  const circulating = powered && !water.tripped && water.flow > 0.5;
  const [a, b] = PUMPS[pool] ?? [null, null];
  const aOn = a ? plant.isolators[a] : false;
  const bOn = b ? plant.isolators[b] : false;
  const [t1, t2] = POOL_MOTORS(pool);
  const starter = (t: MotorTag | undefined) =>
    t ? world.motors.starters[t] : undefined;
  const s1 = starter(t1);
  const s2 = starter(t2);
  const p1 = s1 ? s1.running : circulating && aOn;
  const p2 = s2 ? s2.running : circulating && !aOn && bOn;
  const share = Math.min(1.2, water.flow / POOL_TARGET[pool].flow);
  // The Olympic's five beds as its battery has them (`olympic-battery.ts`);
  // the others' as clean filters', rising with the square of the flow.
  const filterDp =
    pool === 'pool_02'
      ? olympicFlowsOf(world).filters.map((f) => f.bedBar)
      : pool === 'pool_01'
        ? // The lounge's two beds, by their dirt (`lounge-filters.ts`).
          loungeFilterDp(world.loungeFilters, loungeFlowsOf(world))
        : CLEAN_DP.map((dp) => dp * share * share);
  const uvIsolator = UV_ISOLATORS[pool];
  const uvOn = circulating && (uvIsolator ? plant.isolators[uvIsolator] : true);
  const dosing = circulating && serviceAvailable(plant, room, 'chemical');
  const heat = Object.values(world.pools).reduce((t, p) => t + p.heating, 0);
  const boilersFiring = heat > 1;
  const airflow = hallHandling(world.airHandling)[pool].share;
  const airOn = serviceAvailable(plant, 'air_plant', 'power') && airflow > 0.05;
  const hallRh = water.hallRh;
  const alarms: AlarmId[] = [];
  // A pump tripped: by its starter, or that should run, by its isolator.
  if (s1 ? s1.tripped : water.tripped && aOn) alarms.push('p1-trip');
  if (s2 ? s2.tripped : water.tripped && !aOn && bOn) alarms.push('p2-trip');
  if (!circulating || share < 0.5) alarms.push('flow-low');
  if (Math.max(...filterDp) > FILTER_DP_LIMIT) alarms.push('filter-dp');
  if (circulating && uvIsolator && !plant.isolators[uvIsolator])
    alarms.push('uv-fail');
  if (water.freeChlorine < CHLORINE_LOW) alarms.push('cl-low');
  if (water.freeChlorine > 3) alarms.push('cl-high');
  if (water.ph < 7.0 || water.ph > 7.8) alarms.push('ph-range');
  if (circulating && !dosing) alarms.push('dosing-inhibit');
  if (water.balance < 0.2) alarms.push('bal-low');
  if (water.temperature < POOL_TARGET[pool].temp - 2)
    alarms.push('pool-temp-low');
  if (!airOn) alarms.push('ahu-fault');
  if (hallRh > RH_HIGH) alarms.push('rh-high');
  if (!plant.sources.power) alarms.push('mains-fail');
  if (world.wetHall.backwashTank > WET_HALL_PLANT.backwashTank * 0.95)
    alarms.push('backwash-high');
  if (world.wetHall.boosterRunning) alarms.push('makeup-running');
  alarms.push(...gasAlarmIds(world));
  // The boiler house's gas safety (`boiler-gas.ts`): its methane detector,
  // and its safety shut-off valve tripped shut, the boilers without gas.
  if (world.boilerGas.gasDetected) alarms.push('gas-detected');
  if (!world.boilerGas.ssovOpen) alarms.push('boiler-lockout');
  const amps = (on: boolean, full: number) => (on ? full * share : 0);
  const reading: PlantReading = {
    t: world.time,
    pumps: { p1, p2 },
    flow: water.flow,
    filterDp,
    uvOn,
    dosing,
    boilersFiring,
    balance: water.balance,
    mainPool: world.pools.pool_02.temperature,
    learnerPool: world.pools.pool_01.temperature,
    spa: world.pools.pool_03.temperature,
    hallAir: water.hallAir,
    lthw: boilersFiring ? 80 : 70,
    hallRh,
    chlorine: water.freeChlorine,
    ph: water.ph,
    amps: {
      p1: s1 ? s1.current : amps(p1, 37),
      p2: s2 ? s2.current : amps(p2, 37),
      supply: airOn ? 29 * airflow : 0,
      extract: airOn ? 27 * airflow : 0,
      boilers: boilersFiring ? 18 : 3,
    },
    alarms,
  };
  return reading;
}
