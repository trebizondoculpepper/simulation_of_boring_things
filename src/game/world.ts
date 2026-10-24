/**
 * The game's one world state: everything that carries on whichever room
 * the player is in, and is saved (`save.ts`). Plain data (numbers,
 * strings, booleans, arrays and records), so it saves as it stands;
 * changed only by stepping it on with time or by applying an action.
 * Pure: rooms show it and act on it, but none owns any of it.
 *
 * For now it holds the clock and the remote-control demonstration of
 * dev14 and dev15: a button in one room, its lamp and reset in another.
 * The plant moves in here system by system.
 */

/** Bumped whenever the world's shape changes; `save.ts` migrates older saves. */
import { newPlantServices, serviceAvailable } from './plant/services';
import {
  loungeValveFlows,
  newLoungeValvePositions,
  stepLoungeValves,
} from './plant/lounge-valves';
import type {
  IsolatorName,
  PlantServices,
  ServiceRoom,
  Utility,
} from './plant/services';
import {
  HALL_AIR,
  POOL_IDS,
  POOL_TARGET,
  circulating,
  dosedVolumes,
  makeUpDemand,
  newPools,
  olympicTankLevel,
  poolMakeUpCalling,
  stepPoolsWater,
} from './plant/pools';
import {
  WET_HALL_PLANT,
  makeUpShare,
  newWetHall,
  resetBooster,
  stepWetHall,
} from './plant/wet-hall';
import type { WetHallState } from './plant/wet-hall';
import { newBathers, poolAppeal, stepBathers } from './bathers';
import { newLighting, zoneLit, zoneOfRoom } from './plant/lighting';
import { AMBIENT } from './plant/thermal';
import type { LightingState, LightingZoneId } from './plant/lighting';
import { fullOff, fullOn, slowStartAt, slowStartBegin } from './plant/startup';
import type { BathersState } from './bathers';
import {
  deliver,
  inStock,
  newChemicalStores,
  stepChemicalStores,
} from './plant/chemicals';
import type { Chemical, ChemicalStores } from './plant/chemicals';
import type { PoolId, PoolsState } from './plant/pools';
import {
  actOnGasZone,
  newGasZones,
  setGasLeak,
  stepGasZones,
} from './plant/gas';
import type { GasZoneAction, GasZoneId, GasZones } from './plant/gas';
import type { Block } from './sim/blocks';
import {
  FOOTBATH,
  footbathLineup,
  newIdentifiedPlant,
  setPartOn,
  setPartOpen,
} from './plant/identification';
import {
  installedValveByCommandId,
  newInstalledValveStates,
} from './plant/installed-valves';
import {
  newOlympicBattery,
  olympicBatteryFlows,
  stepOlympicBattery,
} from './plant/olympic-battery';
import type {
  BatteryFlows,
  OlympicBatteryState,
} from './plant/olympic-battery';
import { makeUpCalls, newOlympicTank } from './plant/olympic-tank';
import type { OlympicTankState } from './plant/olympic-tank';
import type { MakeupMode } from './plant/balance-tank';
import {
  actOnUnit,
  hallHandling,
  hallRhOf,
  newAirHandling,
  stepAirHandling,
} from './plant/air-handling';
import type {
  AirHall,
  AirHandlingState,
  AirUnitAction,
} from './plant/air-handling';
import {
  actOnStarter,
  MOTORS,
  newMotors,
  stepMotors,
} from './plant/motor-starters';
import {
  actOnJacuzzi,
  jacuzziRunning,
  newJacuzzi,
  stepJacuzzi,
} from './plant/jacuzzi';
import type { JacuzziAction, JacuzziState } from './plant/jacuzzi';
import {
  actOnBoilerGas,
  heatingPlant,
  newBoilerGas,
  stepBoilerGas,
} from './plant/boiler-gas';
import type { BoilerGasAction, BoilerGasState } from './plant/boiler-gas';
import type {
  MotorsState,
  MotorTag,
  StartedPool,
  StarterAction,
} from './plant/motor-starters';

export const WORLD_VERSION = 23;

/** A pool thermostat's range, °C, set in half degrees. */
export const SETPOINT_RANGE = { min: 26, max: 40 } as const;
export const clampSetpoint = (celsius: number) =>
  Math.min(
    SETPOINT_RANGE.max,
    Math.max(SETPOINT_RANGE.min, Math.round(celsius * 2) / 2),
  );

export interface World {
  /** Seconds the world has run. */
  time: number;
  /** dev14's button, as dev15 shows it. */
  demo: {
    /** Whether the button is on. */
    on: boolean;
    /** How many times it has been switched on. */
    presses: number;
  };
  plant: PlantServices;
  pools: PoolsState;
  /** The dosing chemicals left in their stores, litres. */
  chemicals: ChemicalStores;
  /** The wet hall's break tank, booster set, meter and backwash tank. */
  wetHall: WetHallState;
  /** The pools' unseen bathers (`bathers.ts`). */
  bathers: BathersState;
  /** When SLOW START began, world seconds; -1 when none is under way. */
  startup: number;
  /** The lighting's switches: DB-LIGHTING and each zone's breaker (`lighting.ts`). */
  lighting: LightingState;
  /** The outside's temperature, °C: everything unheated settles to it (`thermal.ts`). */
  ambient: number;
  /** The toxic gas detection's rooms: their air, detectors and leaks (`gas.ts`). */
  gas: GasZones;
  /** Named engineering blocks. Controls and the inventory resolve IDs here. */
  identifiedPlant: Block;
  /** Installed pipework valve positions, keyed by permanent asset ID. */
  installedValves: Record<string, boolean>;
  /** Actual travel of the lounge plant's solenoid valves, 0 shut to 1 open. */
  loungeValvePositions: Record<string, number>;
  /** The Olympic's filter battery: each bed's dirt (`olympic-battery.ts`). */
  olympic: OlympicBatteryState;
  /** The Olympic's balance tank's controls: its make-up (`olympic-tank.ts`). */
  olympicTank: OlympicTankState;
  /** The pool halls' air handling units and the halls' time programmes (`air-handling.ts`). */
  airHandling: AirHandlingState;
  /** The motors' starters, worked from their plant rooms' panels (`motor-starters.ts`). */
  motors: MotorsState;
  /** The jacuzzi's jets and air (`jacuzzi.ts`). */
  jacuzzi: JacuzziState;
  /** The boiler house's gas safety: ECV, emergency stop, detector and SSOV (`boiler-gas.ts`). */
  boilerGas: BoilerGasState;
}

export function newWorld(): World {
  return {
    time: 0,
    demo: { on: false, presses: 0 },
    plant: newPlantServices(),
    pools: newPools(),
    chemicals: newChemicalStores(),
    wetHall: newWetHall(),
    bathers: newBathers(),
    startup: -1,
    lighting: newLighting(),
    ambient: AMBIENT,
    gas: newGasZones(),
    identifiedPlant: newIdentifiedPlant(),
    installedValves: newInstalledValveStates(),
    loungeValvePositions: newLoungeValvePositions(),
    olympic: newOlympicBattery(),
    olympicTank: newOlympicTank(),
    airHandling: newAirHandling(),
    motors: newMotors(),
    jacuzzi: newJacuzzi(),
    boilerGas: newBoilerGas(),
  };
}

/** What a room may do to the world. */
export type WorldAction =
  | { type: 'demo/set'; on: boolean }
  | { type: 'demo/reset' }
  | { type: 'plant/source'; utility: Utility; on: boolean }
  | { type: 'plant/feeder'; room: ServiceRoom; on: boolean }
  | { type: 'plant/isolator'; name: IsolatorName; on: boolean }
  | { type: 'plant/delivery'; chemical: Chemical; litres: number }
  | { type: 'plant/booster-reset' }
  | { type: 'plant/full-off' }
  | { type: 'plant/full-on' }
  | { type: 'plant/slow-start' }
  | { type: 'weather/ambient'; celsius: number }
  | { type: 'lighting/supply'; on: boolean }
  | { type: 'lighting/zone'; zone: LightingZoneId; on: boolean }
  | { type: 'gas/leak'; zone: GasZoneId; gramsPerHour: number }
  | { type: 'gas/act'; zone: GasZoneId; act: GasZoneAction }
  | { type: 'plant/valve'; id: string; open: boolean }
  | { type: 'plant/switch'; id: string; on: boolean }
  /** The Olympic's balance tank's make-up selector turned. */
  | { type: 'olympic/makeup'; mode: MakeupMode }
  /** A pool's drain-down valves opened (to the sewer) or shut. */
  | { type: 'pool/drain-down'; pool: PoolId; open: boolean }
  /** A pool's make-up valve opened or shut. */
  | { type: 'pool/make-up'; pool: PoolId; open: boolean }
  /** A pool's water's thermostat set, °C (kept within its range). */
  | { type: 'pool/setpoint'; pool: PoolId; celsius: number }
  /** The world run on at once, a second at a time: for trying things out. */
  | { type: 'time/skip'; seconds: number }
  /** An air handling unit's controls worked, on its controller. */
  | { type: 'air/unit'; tag: string; action: AirUnitAction }
  /** A hall's time programme set, on the air plant's mimic: occupied, so its units run in AUTO. */
  | { type: 'air/occupied'; hall: AirHall; on: boolean }
  /** A motor's starter worked on its plant room's panel: its selector, START, STOP or RESET. */
  | { type: 'motor/starter'; tag: MotorTag; action: StarterAction }
  /** A motor panel's emergency stop struck in, or released. */
  | { type: 'motor/stop'; pool: StartedPool; stopped: boolean }
  /** The jacuzzi's jets and air worked, from its cabinet or its wall plate. */
  | { type: 'jacuzzi'; action: JacuzziAction }
  /** The boiler house's gas safety worked: its emergency stop, GAS RESET, ECV or detector TEST. */
  | { type: 'boiler-gas'; action: BoilerGasAction };

export function applyAction(world: World, action: WorldAction): World {
  switch (action.type) {
    case 'demo/set':
      if (world.demo.on === action.on) return world;
      return {
        ...world,
        demo: {
          on: action.on,
          presses: world.demo.presses + (action.on ? 1 : 0),
        },
      };
    case 'demo/reset':
      return world.demo.on
        ? { ...world, demo: { ...world.demo, on: false } }
        : world;
    case 'plant/source':
      return world.plant.sources[action.utility] === action.on
        ? world
        : {
            ...world,
            plant: {
              ...world.plant,
              sources: { ...world.plant.sources, [action.utility]: action.on },
            },
          };
    case 'plant/isolator':
      return world.plant.isolators[action.name] === action.on
        ? world
        : {
            ...world,
            plant: {
              ...world.plant,
              isolators: { ...world.plant.isolators, [action.name]: action.on },
            },
          };
    case 'plant/delivery':
      return {
        ...world,
        chemicals: deliver(world.chemicals, action.chemical, action.litres),
      };
    case 'plant/valve': {
      const installed = installedValveByCommandId(action.id);
      if (installed)
        return {
          ...world,
          installedValves: {
            ...world.installedValves,
            [installed.assetId]: action.open,
          },
        };
      const identifiedPlant = setPartOpen(
        world.identifiedPlant,
        action.id,
        action.open,
      );
      return { ...world, identifiedPlant };
    }
    case 'olympic/makeup':
      return world.olympicTank.makeup === action.mode
        ? world
        : {
            ...world,
            olympicTank: { ...world.olympicTank, makeup: action.mode },
          };
    case 'plant/switch':
      return {
        ...world,
        identifiedPlant: setPartOn(world.identifiedPlant, action.id, action.on),
      };
    case 'pool/setpoint': {
      const celsius = clampSetpoint(action.celsius);
      return world.pools[action.pool].setpoint === celsius
        ? world
        : {
            ...world,
            pools: {
              ...world.pools,
              [action.pool]: { ...world.pools[action.pool], setpoint: celsius },
            },
          };
    }
    case 'pool/drain-down':
    case 'pool/make-up': {
      if (action.pool === 'pool_04') {
        // Older scenarios and saves still use these actions. Their footbath
        // route now lives in the named valves, never in the pool flags.
        const id =
          action.type === 'pool/make-up' ? FOOTBATH.makeUp : FOOTBATH.drain;
        let identifiedPlant = setPartOpen(
          world.identifiedPlant,
          id,
          action.open,
        );
        if (action.type === 'pool/drain-down')
          identifiedPlant = setPartOpen(
            identifiedPlant,
            FOOTBATH.return,
            !action.open,
          );
        return { ...world, identifiedPlant };
      }
      const key = action.type === 'pool/drain-down' ? 'drainDown' : 'makeUp';
      return world.pools[action.pool][key] === action.open
        ? world
        : {
            ...world,
            pools: {
              ...world.pools,
              [action.pool]: {
                ...world.pools[action.pool],
                [key]: action.open,
              },
            },
          };
    }
    case 'air/unit':
      return {
        ...world,
        airHandling: actOnUnit(world.airHandling, action.tag, action.action),
      };
    case 'motor/starter': {
      const motors = actOnStarter(world.motors, action.tag, action.action);
      return motors === world.motors ? world : { ...world, motors };
    }
    case 'jacuzzi':
      return {
        ...world,
        jacuzzi: actOnJacuzzi(world.jacuzzi, action.action, world.time),
      };
    case 'boiler-gas': {
      const boilerGas = actOnBoilerGas(world.boilerGas, action.action);
      return boilerGas === world.boilerGas ? world : { ...world, boilerGas };
    }
    case 'motor/stop':
      return world.motors.stopped[action.pool] === action.stopped
        ? world
        : {
            ...world,
            motors: {
              ...world.motors,
              stopped: {
                ...world.motors.stopped,
                [action.pool]: action.stopped,
              },
            },
          };
    case 'air/occupied':
      return world.airHandling.occupied[action.hall] === action.on
        ? world
        : {
            ...world,
            airHandling: {
              ...world.airHandling,
              occupied: {
                ...world.airHandling.occupied,
                [action.hall]: action.on,
              },
            },
          };
    case 'time/skip':
      return action.seconds > 0 ? advance(world, action.seconds, 1) : world;
    case 'gas/leak': {
      const gas = setGasLeak(world.gas, action.zone, action.gramsPerHour);
      return gas === world.gas ? world : { ...world, gas };
    }
    case 'gas/act': {
      const gas = actOnGasZone(world.gas, action.zone, action.act);
      return gas === world.gas ? world : { ...world, gas };
    }
    case 'weather/ambient':
      return world.ambient === action.celsius
        ? world
        : { ...world, ambient: action.celsius };
    case 'lighting/supply':
      return world.lighting.supply === action.on
        ? world
        : { ...world, lighting: { ...world.lighting, supply: action.on } };
    case 'lighting/zone':
      return world.lighting.zones[action.zone] === action.on
        ? world
        : {
            ...world,
            lighting: {
              ...world.lighting,
              zones: { ...world.lighting.zones, [action.zone]: action.on },
            },
          };
    case 'plant/full-off':
      return { ...world, plant: fullOff(world.plant), startup: -1 };
    case 'plant/full-on':
      return {
        ...world,
        plant: fullOn(world.plant),
        wetHall: resetBooster(world.wetHall),
        lighting: newLighting(),
        startup: -1,
      };
    case 'plant/slow-start':
      return {
        ...world,
        plant: slowStartBegin(world.plant),
        startup: world.time,
      };
    case 'plant/booster-reset': {
      const wetHall = resetBooster(world.wetHall);
      return wetHall === world.wetHall ? world : { ...world, wetHall };
    }
    case 'plant/feeder':
      return world.plant.feeders[action.room] === action.on
        ? world
        : {
            ...world,
            plant: {
              ...world.plant,
              feeders: { ...world.plant.feeders, [action.room]: action.on },
            },
          };
  }
}

/** Water actually entering the foot spa through its open make-up valve. */
export function footbathFilling(world: World): boolean {
  if (!footbathLineup(world.identifiedPlant).makeUpOpen) return false;
  if (!poolMakeUpCalling('pool_04', world.pools.pool_04)) return false;
  const calling = makeUpCalls(
    world.olympicTank,
    olympicTankLevel(world.pools.pool_02.balance),
  );
  return (
    makeUpShare(
      world.wetHall,
      world.plant,
      makeUpDemand(world.pools, { pool_02: calling }),
    ) > 0
  );
}

/** The world `delta` seconds on. */
export function stepWorld(world: World, delta: number): World {
  // SLOW START, closing the feeders in turn as it goes.
  if (world.startup >= 0) {
    const s = slowStartAt(world.plant, world.time - world.startup);
    world = { ...world, plant: s.plant, startup: s.done ? -1 : world.startup };
  }
  const loungeValvePositions = stepLoungeValves(
    world.loungeValvePositions,
    world.installedValves,
    world.plant,
    delta,
  );
  // What the stores have, as the step begins; the pools dose from it, and
  // the stores give what was dosed.
  const stock = {
    hypochlorite: inStock(world.chemicals, 'hypochlorite'),
    acid: inStock(world.chemicals, 'acid'),
  };
  // The Olympic's make-up, on its band at the tank's depth as the step begins.
  const calling = makeUpCalls(
    world.olympicTank,
    olympicTankLevel(world.pools.pool_02.balance),
  ); // The make-up the booster set can give the pools' float valves calling.
  const share = makeUpShare(
    world.wetHall,
    world.plant,
    makeUpDemand(world.pools, { pool_02: calling }),
  );
  let battery: BatteryFlows | null = null;
  // The motors' starters: each on its room's power and local isolator,
  // and held off while its pool's tank is at its low-low level.
  const motors = stepMotors(
    world.motors,
    {
      permitted: (tag) =>
        serviceAvailable(world.plant, `plant_${MOTORS[tag].pool}`, 'power') &&
        world.plant.isolators[MOTORS[tag].isolator] &&
        !world.pools[MOTORS[tag].pool].tripped,
      demand: () => true,
      // Whether its valves give it somewhere to pump: to the pool, to
      // waste (a backwash), or to the sewer (a drain-down).
      flowing: (pool) => {
        if (world.pools[pool].drainDown) return true;
        const open =
          pool === 'pool_02'
            ? olympicBatteryFlows(world.installedValves, world.olympic, true)
            : pool === 'pool_01'
              ? loungeValveFlows(world.loungeValvePositions, true)
              : null;
        return (
          !open || open.toPool + open.toWaste > 0.05 * POOL_TARGET[pool].flow
        );
      },
    },
    delta,
  );
  // The air handling units, on the air plant's supply, each at its hall's
  // humidity as the step begins.
  const airHandling = stepAirHandling(
    world.airHandling,
    hallRhOf(world.pools),
    serviceAvailable(world.plant, 'air_plant', 'power'),
    delta,
  );

  // The heating, as the boilers' gas allows: none with the SSOV or ECV shut.
  const water = stepPoolsWater(
    world.pools,
    heatingPlant(world.plant, world.boilerGas),
    delta,
    world.time,
    stock,
    share,
    world.ambient,
    // The sewer's consent, less the backwash's discharge while it runs.
    Math.max(
      0,
      WET_HALL_PLANT.sewerConsent -
        (world.wetHall.discharging ? WET_HALL_PLANT.dischargeRate : 0),
    ),
    footbathLineup(world.identifiedPlant),
    // The Olympic's circulation, as its battery's valves and beds give it.
    (running) => {
      battery = olympicBatteryFlows(
        world.installedValves,
        world.olympic,
        running,
      );
      return {
        toPool: battery.toPool,
        toWaste: battery.toWaste,
        makeUpCalling: calling,
      };
    },
    (running) => loungeValveFlows(loungeValvePositions, running),
    hallHandling(airHandling),
    motors,
  );
  return {
    ...world,
    time: world.time + delta,
    pools: water.pools,
    airHandling,
    motors,
    jacuzzi: stepJacuzzi(world.jacuzzi, world.time + delta),
    boilerGas: stepBoilerGas(world.boilerGas, delta),
    loungeValvePositions,
    olympic: battery
      ? stepOlympicBattery(world.olympic, battery, delta)
      : world.olympic,
    olympicTank:
      world.olympicTank.open === calling
        ? world.olympicTank
        : { ...world.olympicTank, open: calling },
    wetHall: stepWetHall(world.wetHall, world.plant, water, delta),
    bathers: stepBathers(world.bathers, world.time, delta, appealOf(world)),
    gas: stepGasZones(world.gas, world.plant, delta),
    chemicals: stepChemicalStores(
      world.chemicals,
      dosedVolumes(
        world.pools,
        world.plant,
        stock,
        loungeValveFlows(loungeValvePositions, true).toPool > 0,
        motors,
      ),
      delta,
    ),
  };
}

/** What of the jacuzzi's jets and air runs: called for, while it circulates. */
export const jacuzziRuns = (world: World) =>
  jacuzziRunning(
    world.jacuzzi,
    circulating(world.pools.pool_03, world.plant, 'pool_03', world.motors),
  );

/** The world's fixed time step, seconds. */
export const STEP = 0.1;

/**
 * The world `seconds` on, in fixed steps, as when catching up on the time
 * the game was closed or its tab hidden.
 */
export function advance(world: World, seconds: number, step = STEP): World {
  let w = world;
  let left = seconds;
  while (left > 1e-9) {
    const d = Math.min(step, left);
    w = stepWorld(w, d);
    left -= d;
  }
  return w;
}

/** How much each pool is wanted now, as its bathers find it (`poolAppeal`). */
export function appealOf(world: World): Record<PoolId, number> {
  return Object.fromEntries(
    POOL_IDS.map((id) => {
      const p = world.pools[id];
      const zone = zoneOfRoom(id);
      return [
        id,
        poolAppeal({
          temperature: p.temperature,
          target: POOL_TARGET[id].temp,
          ph: p.ph,
          freeChlorine: p.freeChlorine,
          combinedChlorine: p.combinedChlorine,
          // Circulating, and full: a pool more than 15 cm down (being
          // drained, or emptied) is closed.
          circulating:
            !p.tripped && p.flow > POOL_TARGET[id].flow / 2 && p.level > -0.15,
          hallAir: p.hallAir,
          hallTarget: HALL_AIR[id],
          // Its lights on: daylight is not enough.
          lit: !zone || zoneLit(world.plant, world.lighting, zone),
          spa: id === 'pool_03',
        }),
      ];
    }),
  ) as Record<PoolId, number>;
}
