import {
  actOnIntake,
  newSiteIntake,
  restoreInside,
  siteGasM3h,
  siteLoadKw,
  stepIntakeMeters,
  withIntake,
} from './plant/site-intake';
import type { IntakeAction, SiteIntake } from './plant/site-intake';
import {
  actOnDistribution,
  dayTankStock,
  doseDraw,
  newChemicalDistribution,
  stepDistribution,
} from './plant/chemical-distribution';
import type {
  ChemicalDistribution,
  DistributionAction,
  DistributionPower,
} from './plant/chemical-distribution';
import { actOnWashOTron, newWashOTron } from './plant/wash-o-tron';
import type { WashAction, WashOTron } from './plant/wash-o-tron';
import { stepWashWorld } from './plant/wash-o-tron-world';
import {
  actOnChangeover,
  changeoverFlow,
} from '../toolkit/components/plant/logic/booster-changeover';
import type { ChangeoverAction } from '../toolkit/components/plant/logic/booster-changeover';
import { OLYMPIC_TANK_DRAIN } from './plant/balance-tank';
import {
  loungePasses,
  newLoungeFilters,
  stepLoungeFilters,
} from './plant/lounge-filters';
import type { LoungeFiltersState } from './plant/lounge-filters';
import { installedValveOpen } from './plant/installed-valves';
import { actOnZoneMusic, newZoneMusic, stepZoneMusic } from './plant/music';
import { actOnFireAlarm, newFireAlarm } from './plant/fire-alarm';
import type { FireAlarmAction, FireAlarmState } from './plant/fire-alarm';
import type { PitPumpAction } from './plant/wet-hall';
import type { ZoneMusicState, ZoneMusicAction } from './plant/music';
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
  loungeDischargeOpen,
  loungeFlowsOf,
  loungePumpsRunning,
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
  poolArea,
  poolVolume,
  circulating,
  dosedByPool,
  poolDepth,
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
  actOnPitPumps,
  pitDischargeRate,
} from './plant/wet-hall';
import type { WetHallState } from './plant/wet-hall';
import { newBathers, poolAppeal, stepBathers } from './bathers';
import {
  LIGHTING_ZONE_IDS,
  actOnLightingBoard,
  lightingWaysLive,
  newLighting,
  stepLighting,
  zoneLit,
  zoneOfRoom,
} from './plant/lighting';
import type { LightingBoardAction } from './plant/lighting';
import {
  batteryCanSupply,
  newCentralBattery,
  pressTest,
  stepCentralBattery,
} from '../toolkit/components/plant/logic/electrical-room';
import type {
  BatteryTest,
  CentralBattery,
} from '../toolkit/components/plant/logic/electrical-room';
import { AMBIENT } from './plant/thermal';
import type { LightingState, LightingZoneId } from './plant/lighting';
import { fullOff, fullOn, slowStartAt, slowStartBegin } from './plant/startup';
import type { BathersState } from './bathers';
import { STORE_CAPACITY, deliver, newChemicalStores } from './plant/chemicals';
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
  olympicPasses,
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
  jacuzziFull,
  jacuzziRunning,
  newJacuzzi,
  stepJacuzzi,
} from './plant/jacuzzi';
import type { JacuzziAction, JacuzziState } from './plant/jacuzzi';
import { JACUZZI_VALVES, jacuzziPaths } from './plant/jacuzzi';
import {
  DISCONNECTED_VESSEL,
  actOnJacuzziCabinet,
  cabinetTanks,
  jacuzziCabinetDisplay,
  jacuzziPumpCalled,
  jacuzziWaterFlowing,
  newJacuzziCabinet,
  stepJacuzziCabinet,
} from './plant/jacuzzi-cabinet';
import type {
  CabinetPlumbing,
  JacuzziCabinetAction,
  JacuzziCabinetInputs,
  JacuzziCabinetState,
} from './plant/jacuzzi-cabinet';
import type { JacuzziCirculation } from './plant/pools';
import {
  actOnSpaFilter,
  filtering,
  newSpaFilters,
  spaWashFlow,
  stepSpaFilters,
} from './plant/spa-filter';
import { bedPasses } from './plant/ideal-filter';
import { stepSolids } from './water/solids';
import {
  newFlowRecord,
  newSewerMonitor,
  stepFlowRecord,
  stepSewerMonitor,
} from './plant/sewer-monitor';
import type { FlowRecord, SewerMonitorState } from './plant/sewer-monitor';
import {
  cabinetReady,
  runningCabinet,
  stepCabinetBoot,
} from './plant/cabinet-boot';
import type { CabinetBoot, CabinetBootInputs } from './plant/cabinet-boot';
import type {
  SpaFilter,
  SpaFilterAction,
  SpaFiltersState,
  SpaPool,
} from './plant/spa-filter';
import {
  newFibreIlluminator,
  setFibreIlluminator,
} from './plant/fibre-illuminator';
import type {
  FibreIlluminatorAction,
  FibreIlluminatorState,
} from './plant/fibre-illuminator';
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

import { turnChangeover } from './plant/changeover';
import {
  acceptAlarms,
  newAnnunciator,
  resetAlarms,
  senseAlarms,
} from './annunciator';
import type { AnnunciatorState } from './annunciator';
import type { AlarmId } from '../toolkit/gallery/logic/control-room-demo';
import { plantReadingOf } from '../toolkit/gallery/logic/world-reading';

export const WORLD_VERSION = 50;

/**
 * Where the main corridor's control room doors lead (the owner,
 * 2026-10-27): OLD, the old control room; NEW, the bridge. Set by the
 * CONTROL ROOM MODE knob on the corridor wall beside the doors, an Easter
 * egg: left alone, the doors lead to the old control room.
 */
export type ControlRoomMode = 'old' | 'new';

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
  /**
   * Their distribution (plan 085): each chemical's transfer pump and
   * selector, and each plant room's day tanks (`plant/chemical-distribution.ts`).
   */
  distribution: ChemicalDistribution;
  /** The wet hall's break tank, booster set, meter and backwash tank. */
  wetHall: WetHallState;
  /** The pools' unseen bathers (`bathers.ts`). */
  bathers: BathersState;
  /** When SLOW START began, world seconds; -1 when none is under way. */
  startup: number;
  /** The lighting's switches: DB-LIGHTING and each zone's breaker (`lighting.ts`). */
  lighting: LightingState;
  /** The sewer outfall's flowmeter and chart recorder (`sewer-monitor.ts`). */
  sewer: SewerMonitorState;
  /** The make-up water's record, from its meter's pulses, for its chart recorder. */
  makeUpRecord: FlowRecord;
  /** The emergency lighting's central battery (`electrical-room.ts`). */
  centralBattery: CentralBattery;
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
  /** The lounge's filter beds: each one's dirt (`lounge-filters.ts`). */
  loungeFilters: LoungeFiltersState;
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
  /** The jacuzzi's treatment cabinet: its POWER and its trip (`jacuzzi-cabinet.ts`). */
  jacuzziCabinet: JacuzziCabinetState;
  /** The spa cabinets' sand filters and their wash programmes (`spa-filter.ts`). */
  spaFilters: SpaFiltersState;
  /** The spa cabinets' controllers starting and stopping, and their servo valves (`cabinet-boot.ts`). */
  cabinets: Record<SpaPool, CabinetBoot>;
  /** The Jacuzzi concrete wall's remote fibre illuminator. */
  jacuzziFibreIlluminator: FibreIlluminatorState;
  /** The boiler house's gas safety: ECV, emergency stop, detector and SSOV (`boiler-gas.ts`). */
  boilerGas: BoilerGasState;
  music: ZoneMusicState;
  /** The fire alarm's call points (`plant/fire-alarm.ts`). */
  fireAlarm: FireAlarmState;
  /** The Olympic's filter wash controller (`plant/wash-o-tron.ts`, prompt 072). */
  washOTron: WashOTron;
  /** The site's intake in the goods yard: the utilities' outside devices and meters (`plant/site-intake.ts`, prompt 083). */
  intake: SiteIntake;
  /** Where the corridor's control room doors lead: the CONTROL ROOM MODE knob. */
  controlRoomMode: ControlRoomMode;
  /** Whether the bridge's theme has played, on the walker's first visit (the owner, 2026-10-27). */
  bridgeThemeHeard: boolean;
  /**
   * The control room's alarm annunciator, shared by every annunciator and
   * console showing the plant's alarms: which are in, flashing until
   * accepted, steady until reset (`annunciator.ts`).
   */
  annunciator: AnnunciatorState;
}

export function newWorld(): World {
  return {
    time: 0,
    demo: { on: false, presses: 0 },
    plant: newPlantServices(),
    pools: newPools(),
    chemicals: newChemicalStores(),
    distribution: newChemicalDistribution(),
    wetHall: newWetHall(),
    bathers: newBathers(),
    startup: -1,
    lighting: newLighting(),
    centralBattery: newCentralBattery(),
    sewer: newSewerMonitor(),
    makeUpRecord: newFlowRecord(),
    ambient: AMBIENT,
    gas: newGasZones(),
    identifiedPlant: newIdentifiedPlant(),
    installedValves: newInstalledValveStates(),
    loungeValvePositions: newLoungeValvePositions(),
    loungeFilters: newLoungeFilters(),
    olympic: newOlympicBattery(),
    olympicTank: newOlympicTank(),
    airHandling: newAirHandling(),
    motors: newMotors(),
    jacuzzi: newJacuzzi(),
    jacuzziCabinet: newJacuzziCabinet(),
    spaFilters: newSpaFilters(),
    cabinets: { pool_03: runningCabinet(), pool_04: runningCabinet() },
    jacuzziFibreIlluminator: newFibreIlluminator(),
    boilerGas: newBoilerGas(),
    music: newZoneMusic(),
    fireAlarm: newFireAlarm(),
    washOTron: newWashOTron(),
    intake: newSiteIntake(),
    controlRoomMode: 'old',
    bridgeThemeHeard: false,
    annunciator: newAnnunciator(),
  };
}

/** What a room may do to the world. */
export type WorldAction =
  | { type: 'demo/set'; on: boolean }
  | { type: 'demo/reset' }
  | { type: 'plant/source'; utility: Utility; on: boolean }
  | { type: 'plant/feeder'; room: ServiceRoom; on: boolean }
  /** The changeover switch's handle turned one position (−1 toward I, +1 toward II). */
  | { type: 'plant/changeover'; direction: -1 | 1 }
  | { type: 'plant/isolator'; name: IsolatorName; on: boolean }
  | { type: 'plant/delivery'; chemical: Chemical; litres: number }
  | { type: 'plant/booster-reset' }
  | { type: 'plant/full-off' }
  | { type: 'plant/full-on' }
  | { type: 'plant/slow-start' }
  | { type: 'weather/ambient'; celsius: number }
  | { type: 'lighting/supply'; on: boolean }
  | { type: 'lighting/zone'; zone: LightingZoneId; on: boolean }
  /** DB-L1 worked: its main switch, a way's RCBO, a way's TEST. */
  | { type: 'lighting/board'; action: LightingBoardAction }
  /** Moisture in a zone's fittings: its circuit's earth leakage set, mA (a scenario's). */
  | { type: 'lighting/leak'; zone: LightingZoneId; ma: number }
  /** The central battery's FUNCTION or DURATION TEST key. */
  | { type: 'battery/test'; kind: BatteryTest }
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
  /** The jacuzzi's cabinet's POWER switch turned, or its RESET pressed. */
  | { type: 'jacuzzi/cabinet'; action: JacuzziCabinetAction }
  /** A spa cabinet's MODE or WASH NOW, on its filter's programme. */
  | { type: 'spa-filter'; pool: SpaPool; action: SpaFilterAction }
  | { type: 'jacuzzi/fibre-illuminator'; action: FibreIlluminatorAction }
  /** The boiler house's gas safety worked: its emergency stop, GAS RESET, ECV or detector TEST. */
  | { type: 'boiler-gas'; action: BoilerGasAction }
  | { type: 'music'; action: ZoneMusicAction }
  | { type: 'fire-alarm'; action: FireAlarmAction }
  | { type: 'pit-pumps'; action: PitPumpAction }
  | { type: 'wash-o-tron'; action: WashAction }
  | { type: 'intake'; action: IntakeAction }
  | { type: 'distribution'; action: DistributionAction }
  | { type: 'booster/changeover'; action: ChangeoverAction }
  /** The CONTROL ROOM MODE knob turned: where the control room doors lead. */
  | { type: 'control-room/mode'; mode: ControlRoomMode }
  | { type: 'bridge/theme-heard' }
  /** Forget the bridge's first visit: its theme plays again (the knob plate's RESET). */
  | { type: 'bridge/first-visit-reset' }
  /** ACCEPT at an annunciator or console: its flashing alarms (only `alarms`, if given) accepted. */
  | { type: 'alarms/accept'; alarms?: AlarmId[] }
  /** RESET at an annunciator or console: accepted alarms that have cleared put out. */
  | { type: 'alarms/reset' };

/** The jacuzzi's drain valve, open or shut, and with it its pool's drain-down. */
const jacuzziDrainDown = (world: World, open: boolean): World => ({
  ...world,
  installedValves: { ...world.installedValves, [JACUZZI_VALVES.drain]: open },
  pools: {
    ...world.pools,
    pool_03: { ...world.pools.pool_03, drainDown: open },
  },
});

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
      // The jacuzzi's drain valve is its drain-down (prompt 064): one
      // fitting of its model, its state the pool's drain-down too.
      if (installed?.assetId === JACUZZI_VALVES.drain)
        return jacuzziDrainDown(world, action.open);
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
      if (action.pool === 'pool_03' && action.type === 'pool/drain-down')
        return jacuzziDrainDown(world, action.open);
      if (action.pool === 'pool_03' && action.type === 'pool/make-up') {
        // The old command and the room's lever work the same valve.
        return {
          ...world,
          installedValves: {
            ...world.installedValves,
            [JACUZZI_VALVES.makeUp]: action.open,
          },
          pools: {
            ...world.pools,
            pool_03: { ...world.pools.pool_03, makeUp: action.open },
          },
        };
      }
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
    case 'booster/changeover':
      return {
        ...world,
        wetHall: {
          ...world.wetHall,
          booster: actOnChangeover(world.wetHall.booster, action.action),
        },
      };
    case 'distribution': {
      const distribution = actOnDistribution(world.distribution, action.action);
      return distribution === world.distribution
        ? world
        : { ...world, distribution };
    }
    case 'intake': {
      const intake = actOnIntake(world.intake, action.action);
      return intake === world.intake ? world : { ...world, intake };
    }
    case 'wash-o-tron':
      return {
        ...world,
        washOTron: actOnWashOTron(world.washOTron, action.action, world.time),
      };
    case 'pit-pumps':
      return {
        ...world,
        wetHall: {
          ...world.wetHall,
          pitPumps: actOnPitPumps(world.wetHall.pitPumps, action.action),
        },
      };
    case 'fire-alarm':
      return {
        ...world,
        fireAlarm: actOnFireAlarm(world.fireAlarm, action.action),
      };
    case 'music':
      return { ...world, music: actOnZoneMusic(world.music, action.action) };
    case 'jacuzzi':
      return {
        ...world,
        jacuzzi: actOnJacuzzi(
          world.jacuzzi,
          action.action,
          world.time,
          jacuzziFull(world.pools.pool_03.level),
        ),
      };
    case 'jacuzzi/cabinet': {
      const jacuzziCabinet = actOnJacuzziCabinet(
        world.jacuzziCabinet,
        action.action,
        jacuzziCabinetInputs(world).path,
      );
      return jacuzziCabinet === world.jacuzziCabinet
        ? world
        : { ...world, jacuzziCabinet };
    }
    case 'spa-filter':
      return {
        ...world,
        spaFilters: {
          ...world.spaFilters,
          [action.pool]: actOnSpaFilter(
            world.spaFilters[action.pool],
            action.action,
          ),
        },
      };
    case 'jacuzzi/fibre-illuminator':
      return {
        ...world,
        jacuzziFibreIlluminator: setFibreIlluminator(
          world.jacuzziFibreIlluminator,
          action.action,
        ),
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
            lighting: actOnLightingBoard(
              world.lighting,
              { act: 'way', zone: action.zone, on: action.on },
              lightingWaysLive(
                withIntake(world.plant, world.intake),
                world.lighting,
              ),
            ),
          };
    case 'lighting/board':
      return {
        ...world,
        lighting: actOnLightingBoard(
          world.lighting,
          action.action,
          lightingWaysLive(
            withIntake(world.plant, world.intake),
            world.lighting,
          ),
        ),
      };
    case 'lighting/leak':
      return {
        ...world,
        lighting: {
          ...world.lighting,
          leakage: { ...world.lighting.leakage, [action.zone]: action.ma },
        },
      };
    case 'battery/test':
      return {
        ...world,
        centralBattery: pressTest(world.centralBattery, action.kind),
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
    case 'plant/changeover': {
      const changeover = turnChangeover(
        world.plant.changeover,
        action.direction,
      );
      return changeover === world.plant.changeover
        ? world
        : { ...world, plant: { ...world.plant, changeover } };
    }
    case 'control-room/mode':
      return world.controlRoomMode === action.mode
        ? world
        : { ...world, controlRoomMode: action.mode };
    case 'bridge/theme-heard':
      return world.bridgeThemeHeard
        ? world
        : { ...world, bridgeThemeHeard: true };
    case 'bridge/first-visit-reset':
      // The bridge as first found (the owner, 2026-10-27): its theme not
      // yet heard and its lights off, so the next visit plays it all.
      return {
        ...world,
        bridgeThemeHeard: false,
        lighting: {
          ...world.lighting,
          switches: {
            ...world.lighting.switches,
            bridge: { main: false, emergency: false },
          },
        },
      };
    case 'alarms/accept': {
      const annunciator = acceptAlarms(world.annunciator, action.alarms);
      return annunciator === world.annunciator
        ? world
        : { ...world, annunciator };
    }
    case 'alarms/reset': {
      const annunciator = resetAlarms(world.annunciator);
      return annunciator === world.annunciator
        ? world
        : { ...world, annunciator };
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
/**
 * The world `delta` seconds on (prompt 083): its consumers see each
 * service only while both the building's own switch and the utility's
 * outside device allow it (`withIntake`); after the step the building's
 * switches stand as they were wherever the intake hid them, and the
 * intake's meters count the water, gas and electricity taken.
 */
export function stepWorld(world: World, delta: number): World {
  const inside = world.plant;
  const next = stepPlant(
    { ...world, plant: withIntake(inside, world.intake) },
    delta,
  );
  const plant = restoreInside(inside, next.plant, world.intake);
  const effective = withIntake(plant, world.intake);
  const hours = delta / 3600;
  const intake = stepIntakeMeters(
    world.intake,
    {
      water: hours > 0 ? (next.wetHall.meter - world.wetHall.meter) / hours : 0,
      gas: siteGasM3h(next.pools, effective.sources.heat),
      power: siteLoadKw({ ...next, plant: effective }),
    },
    delta,
  );
  const stepped = { ...next, plant, intake };
  // The annunciator senses the plant's alarms, whichever room the walker
  // is in (the reading is kept for the displays that read it after).
  const annunciator = senseAlarms(
    stepped.annunciator,
    plantReadingOf(stepped).alarms,
  );
  return annunciator === stepped.annunciator
    ? stepped
    : { ...stepped, annunciator };
}

/**
 * Each chemical line's power (the owner, 2026-10-27): its transfer pump
 * on its store's supply, its selector's valves on the wet hall's.
 */
export function distributionPower(plant: PlantServices): DistributionPower {
  const hall = serviceAvailable(plant, 'wet_hall', 'power');
  return {
    hypochlorite: hall && serviceAvailable(plant, 'hypo_store', 'power'),
    acid: hall && serviceAvailable(plant, 'acid_store', 'power'),
  };
}

/** The stores and the day tanks `delta` seconds on (plan 085). */
function stepChemicals(
  world: World,
  dosed: Partial<Record<PoolId, Record<Chemical, number>>>,
  delta: number,
): Pick<World, 'chemicals' | 'distribution'> {
  const r = stepDistribution(
    world.distribution,
    world.chemicals,
    STORE_CAPACITY,
    doseDraw(dosed),
    delta,
    distributionPower(world.plant),
  );
  return {
    chemicals: {
      hypochlorite: Math.max(
        0,
        world.chemicals.hypochlorite - r.taken.hypochlorite,
      ),
      acid: Math.max(0, world.chemicals.acid - r.taken.acid),
    },
    distribution: r.distribution,
  };
}

function stepPlant(world: World, delta: number): World {
  // The Wash-O-Tron first: the filters' valves it drives this step.
  world = { ...world, ...stepWashWorld(world, delta) };
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
  // What each pool's day tanks have, as the step begins: each pool doses
  // from its own (plan 085), and its tanks give what was dosed.
  // The lounge doses each through its injection quill (prompt 089, item
  // 4): with the quill's isolating valve shut, none of it goes in.
  const stock = (id: PoolId) => {
    const s = dayTankStock(world.distribution, id);
    if (id !== 'pool_01') return s;
    const open = (k: string) =>
      world.installedValves[`${k}-quill.in.iso`] ?? true;
    return {
      hypochlorite: s.hypochlorite && open('hypo'),
      acid: s.acid && open('acid'),
    };
  };
  // The Olympic's make-up, on its band at the tank's depth as the step begins.
  const calling = makeUpCalls(
    world.olympicTank,
    olympicTankLevel(world.pools.pool_02.balance),
  ); // The make-up the booster set can give the pools' float valves calling.
  // None while either of the booster set's motorised valves is shut
  // (the owner, 2026-10-26: driven from its control panel).
  const boosterValves =
    installedValveOpen(world.installedValves, 'WH-T1-IV1') &&
    installedValveOpen(world.installedValves, 'WH-MU1-IV2');
  const demand = makeUpDemand(world.pools, { pool_02: calling });
  // And none unless its pumps deliver (their changeover, RUN or STOP).
  const share =
    boosterValves && changeoverFlow(world.wetHall.booster) > 0
      ? makeUpShare(world.wetHall, world.plant, demand)
      : 0;
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
      flowing: (pool, tag) => {
        if (world.pools[pool].drainDown) return true;
        // A lounge pump with its own discharge shut has nowhere to pump.
        if (
          pool === 'pool_01' &&
          (tag === 'P-201A' || tag === 'P-201B') &&
          !loungeDischargeOpen(world.loungeValvePositions, tag)
        )
          return false;
        const open =
          pool === 'pool_02'
            ? olympicBatteryFlows(
                world.installedValves,
                world.olympic,
                true,
                !world.wetHall.inhibit,
              )
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

  // The jacuzzi's cabinet: its pump's no-flow timer, and its trip.
  const jacuzziCabinet = stepJacuzziCabinet(
    world.jacuzziCabinet,
    jacuzziCabinetInputs(world),
    delta,
  );
  const jacuzzi = jacuzziFlow({ ...world, jacuzziCabinet });
  // The spa cabinets' filters washing: their pumps' water to drain.
  // Their controllers running: a wash's pump runs only then.
  const spaPowered: Record<SpaPool, boolean> = {
    pool_03: cabinetReady(world.cabinets.pool_03),
    pool_04: cabinetReady(world.cabinets.pool_04),
  };
  const spaWash = {
    pool_03: spaWashFlow(
      world.spaFilters.pool_03,
      spaPowered.pool_03,
      POOL_TARGET.pool_03.flow,
    ),
    pool_04: spaWashFlow(
      world.spaFilters.pool_04,
      spaPowered.pool_04,
      POOL_TARGET.pool_04.flow,
    ),
  };
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
        pitDischargeRate(
          world.wetHall,
          installedValveOpen(world.installedValves, 'WH-DR1-DV1'),
        ),
    ),
    footbathThroughFilter(world),
    // The Olympic's circulation, as its battery's valves and beds give it.
    (running) => {
      battery = olympicBatteryFlows(
        world.installedValves,
        world.olympic,
        running,
        // The backwash pit's inlet shut at its high-high level.
        !world.wetHall.inhibit,
      );
      return {
        toPool: battery.toPool,
        toWaste: battery.toWaste,
        makeUpCalling: calling,
        tankDrain: installedValveOpen(world.installedValves, 'PL2-T1-DV1')
          ? OLYMPIC_TANK_DRAIN.coefficient
          : 0,
        // Its main drains into the tank, through their isolating valve.
        mainDrainShut: !installedValveOpen(world.installedValves, 'PL2-T1-IV1'),
      };
    },
    (running) =>
      loungeValveFlows(
        loungeValvePositions,
        running,
        loungePumpsRunning(motors),
        !world.wetHall.inhibit,
      ),
    hallHandling(airHandling),
    motors,
    jacuzzi,
    spaWash,
  );
  const wetHall = stepWetHall(
    world.wetHall,
    world.plant,
    { ...water, demand: demand > 0 },
    delta,
    {
      discharge: installedValveOpen(world.installedValves, 'WH-DR1-DV1'),
    },
  );
  return {
    ...world,
    time: world.time + delta,
    music: stepZoneMusic(
      world.music,
      delta,
      serviceAvailable(world.plant, 'plant_pool_03', 'power'),
    ),
    pools: withSolids(world, water.pools, delta),
    airHandling,
    motors,
    jacuzzi: stepJacuzzi(
      world.jacuzzi,
      world.time + delta,
      jacuzziFull(water.pools.pool_03.level),
    ),
    jacuzziCabinet,
    // Its filters: filtering, the spa's circulation through them; washing,
    // the cabinet's pump's own flow, while the cabinet has power.
    cabinets: ((inputs) => ({
      pool_03: stepCabinetBoot(world.cabinets.pool_03, inputs.pool_03, delta),
      pool_04: stepCabinetBoot(world.cabinets.pool_04, inputs.pool_04, delta),
    }))(cabinetBootInputs(world)),
    spaFilters: stepSpaFilters(
      world.spaFilters,
      {
        pool_03: spaFilterPump(
          world.spaFilters.pool_03,
          water.pools.pool_03.flow,
          spaPowered.pool_03,
          'pool_03',
        ),
        pool_04: spaFilterPump(
          world.spaFilters.pool_04,
          water.pools.pool_04.flow,
          spaPowered.pool_04,
          'pool_04',
        ),
      },
      {
        pool_03: world.pools.pool_03.solids,
        pool_04: world.pools.pool_04.solids,
      },
      delta,
    ),
    boilerGas: stepBoilerGas(world.boilerGas, delta),
    loungeValvePositions,
    loungeFilters: stepLoungeFilters(
      world.loungeFilters,
      loungeFlowsOf(world),
      delta,
      world.pools.pool_01.solids,
    ),
    olympic: battery
      ? stepOlympicBattery(
          world.olympic,
          battery,
          delta,
          world.pools.pool_02.solids,
        )
      : world.olympic,
    olympicTank:
      world.olympicTank.open === calling
        ? world.olympicTank
        : { ...world.olympicTank, open: calling },
    wetHall,
    // The make-up water's recorder: what its meter counted this step.
    makeUpRecord: stepFlowRecord(
      world.makeUpRecord,
      wetHall.meter - world.wetHall.meter,
      delta,
    ),
    // The sewer outfall's flowmeter and its recorder: the pit's outflow
    // (its pump, its drains, any overflow) and the big pools' drain-downs.
    sewer: stepSewerMonitor(
      world.sewer,
      world.wetHall.backwashTank +
        water.backwashed -
        wetHall.backwashTank +
        water.drained,
      delta,
    ),
    bathers: stepBathers(world.bathers, world.time, delta, appealOf(world)),
    gas: stepGasZones(world.gas, world.plant, delta),
    // DB-L1's ways: their circuits' leakage from their halls' air, and
    // their RCBOs tripping on it.
    lighting: stepLighting(
      world.lighting,
      {
        lounge: world.pools.pool_01.hallRh,
        olympic: world.pools.pool_02.hallRh,
        jacuzzi: world.pools.pool_03.hallRh,
        footbath: world.pools.pool_04.hallRh,
      },
      lightingWaysLive(world.plant, world.lighting),
      delta,
    ),
    // The central battery: charging on its mains, or carrying the
    // emergency lighting lit in every zone whose lights are out.
    centralBattery: stepCentralBattery(world.centralBattery, delta, {
      mains: batteryMains(world),
      load: emergencyLoad(world),
    }),
    // The day tanks drawn on by their pools' dosing; the transfer pumps
    // filling them from the stores.
    ...stepChemicals(
      world,
      dosedByPool(
        world.pools,
        world.plant,
        stock,
        loungeValveFlows(loungeValvePositions, true).toPool > 0,
        motors,
        jacuzzi,
      ),
      delta,
    ),
  };
}

/**
 * What the jacuzzi's cabinet is given: power (its room's and its
 * isolator), a way through its suction and return valves, and the
 * tank its pump draws from: its external balance tank (`jacuzziPlumbing`).
 */
/** The jacuzzi cabinet's supply: its room's power and its isolator. */
export const jacuzziCabinetSupplied = (world: World) =>
  serviceAvailable(world.plant, 'plant_pool_03', 'power') &&
  world.plant.isolators['Jacuzzi cabinet isolator'];

/** The foot spa cabinet's supply and POWER switch. */
export const footbathCabinetPowered = (world: World) =>
  serviceAvailable(world.plant, 'plant_pool_04', 'power') &&
  footbathLineup(world.identifiedPlant).powered;

/** What each cabinet's controller is given: its power, and any fault it sees. */
export function cabinetBootInputs(
  world: World,
): Record<SpaPool, CabinetBootInputs> {
  return {
    pool_03: {
      powered: jacuzziCabinetSupplied(world) && world.jacuzziCabinet.power,
      fault:
        world.jacuzziCabinet.trip !== ''
          ? 'NO FLOW'
          : world.pools.pool_03.tripped
            ? 'TANK LOW'
            : '',
    },
    pool_04: {
      powered: footbathCabinetPowered(world),
      fault: world.pools.pool_04.tripped ? 'TANK LOW' : '',
    },
  };
}

export const jacuzziCabinetInputs = (world: World): JacuzziCabinetInputs => {
  return {
    supplied: jacuzziCabinetSupplied(world),
    // Its pump allowed only once its controller runs, every servo open
    // (`cabinet-boot.ts`).
    ready: cabinetReady(world.cabinets.pool_03),
    path: jacuzziPaths(world.installedValves).circulation,
    // Plumbed to its external balance tank; its own vessel disconnected.
    tank: cabinetTanks(jacuzziPlumbing(world), DISCONNECTED_VESSEL).draws,
  };
};

/**
 * The jacuzzi cabinet's plumbing: to its external balance tank
 * (`spa-balance-tank.ts`), as the water balance has it: how full, at
 * low-low, and its make-up filling it.
 */
export const jacuzziPlumbing = (world: World): CabinetPlumbing => {
  const pool = world.pools.pool_03;
  return {
    tank: 'external',
    external: {
      fill: pool.balance,
      low: pool.tripped,
      // Its make-up valve's state, the one source (prompt 064).
      filling:
        jacuzziPaths(world.installedValves).makeUp &&
        poolMakeUpCalling('pool_03', pool) &&
        serviceAvailable(world.plant, 'wet_hall', 'water'),
    },
  };
};

/** The jacuzzi's water moving, and heat reaching it, as its cabinet allows. */
export const jacuzziFlow = (world: World): JacuzziCirculation => ({
  // Its water to the spa only while its filter filters, not while it washes.
  flowing:
    jacuzziWaterFlowing(world.jacuzziCabinet, jacuzziCabinetInputs(world)) &&
    filtering(world.spaFilters.pool_03),
  heat:
    serviceAvailable(world.plant, 'plant_pool_03', 'heat') &&
    jacuzziPaths(world.installedValves).heating,
  // Its balance tank's drain to waste, by hand, by gravity.
  tankDrain: jacuzziPaths(world.installedValves).tankDrain,
  // Its tank's make-up isolating valve shut: its float gets no water.
  makeUpShut: !jacuzziPaths(world.installedValves).makeUp,
  // Its drain valve open: its drain-down (prompt 064: the valve is the one source).
  drainOpen: jacuzziPaths(world.installedValves).drain,
});

/**
 * What the jacuzzi's cabinet's panel shows, as the world has it: PUMP RUN
 * (its motor running, dead-headed or not), its water moving, its UV and
 * dosing (only with water moving, the UV with its doors shut), its NO
 * FLOW lamp (tripped, or running with no way through), and its display's
 * two lines (`jacuzziCabinetDisplay`). Dark, all of it, without power.
 */
export function jacuzziCabinetPanel(world: World, doorOpen = false) {
  const inputs = jacuzziCabinetInputs(world);
  const cabinet = world.jacuzziCabinet;
  const pool = world.pools.pool_03;
  // Its balance tank at low-low (its water supply cut off and the tank
  // run down): the pump stopped, TRIP: TANK LOW, until the tank recovers,
  // when it restarts itself (`water-balance.ts`).
  const pumpRun = jacuzziPumpCalled(cabinet, inputs);
  const flowing = jacuzziWaterFlowing(cabinet, inputs);
  return {
    supplied: inputs.supplied,
    pumpRun,
    flowing,
    uv: flowing && !doorOpen,
    dosing: flowing,
    noFlow:
      inputs.supplied &&
      (cabinet.trip !== '' || pool.tripped || (pumpRun && !inputs.path)),
    ...jacuzziCabinetDisplay({
      cabinet,
      supplied: inputs.supplied,
      flowing,
      waterC: pool.temperature,
      setC: pool.setpoint,
      heatSupply: jacuzziFlow(world).heat,
      tank: inputs.tank,
      draining: jacuzziDischarging(world),
      doorOpen,
      time: world.time,
    }),
  };
}

/**
 * The jacuzzi's waterproof wall plate by the tub (`JACUZZI_PLATE_EXHIBIT`):
 * live while its cabinet is supplied (its room's power and its isolator),
 * dead otherwise, a press doing nothing and no ring lit. Its START ring is
 * lit while the jets or the air run.
 */
export const jacuzziPlate = (world: World) => {
  const powered = jacuzziCabinetInputs(world).supplied;
  const runs = jacuzziRuns(world);
  return { powered, startLit: powered && (runs.jets || runs.air) };
};

/** A press on the wall plate: START or STOP, if it is live. */
export const pressJacuzziPlate = (world: World, button: 'start' | 'stop') =>
  jacuzziPlate(world).powered
    ? applyAction(world, { type: 'jacuzzi', action: { act: button } })
    : world;

/**
 * Whether the jacuzzi's water circulates: its cabinet supplied, on, not
 * tripped, with a way through its suction and return valves.
 */
export const jacuzziCirculating = (world: World) =>
  circulating(
    world.pools.pool_03,
    world.plant,
    'pool_03',
    world.motors,
    jacuzziFlow(world),
  );

/** What of the jacuzzi's jets and air runs: called for, while it circulates, each with its valves open. */
export const jacuzziRuns = (world: World) =>
  jacuzziRunning(
    world.jacuzzi,
    jacuzziCirculating(world),
    world.installedValves,
  );

/**
 * Whether the jacuzzi's water is running away down its drain, heard
 * gurgling into its tundish (the owner, 2026-10-24): its drain valve open
 * (its pool's drain-down) and water still in the tub. By gravity: the
 * pumps and the room's power have nothing to do with it (the owner,
 * 2026-10-24).
 */
export const jacuzziDischarging = (world: World) =>
  jacuzziPaths(world.installedValves).drain &&
  world.pools.pool_03.level > -poolDepth('pool_03') + 0.001;

/**
 * Whether the jacuzzi's balance tank is running away to waste down its own
 * drain (PL3-BT1-DV1, opened by hand): its valve open and water still in
 * the tank. By gravity, pumps and power or none.
 */
export const jacuzziTankDraining = (world: World) =>
  jacuzziPaths(world.installedValves).tankDrain &&
  world.pools.pool_03.balance > 0.002;

/** The world's fixed time step, seconds. */
export const STEP = 0.1;

/**
 * The world `seconds` on, in fixed steps, as when catching up on the time
 * the game was closed or its tab hidden. `onStep`, if given, sees the
 * world before and after each step (the event log's watchers, which would
 * miss a trip and its reset within one call otherwise).
 */
export function advance(
  world: World,
  seconds: number,
  step = STEP,
  onStep?: (before: World, after: World) => void,
): World {
  let w = world;
  let left = seconds;
  while (left > 1e-9) {
    const d = Math.min(step, left);
    const next = stepWorld(w, d);
    onStep?.(w, next);
    w = next;
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
          lit:
            !zone ||
            zoneLit(
              withIntake(world.plant, world.intake),
              world.lighting,
              zone,
            ),
          spa: id === 'pool_03',
        }),
      ];
    }),
  ) as Record<PoolId, number>;
}

/**
 * The footbath's lineup, its water returning only through its filter,
 * outside its cabinet, both its isolating valves open (the owner,
 * 2026-10-25).
 */
function footbathThroughFilter(world: World) {
  const lineup = footbathLineup(world.identifiedPlant);
  const open = (id: string) => world.installedValves[id] ?? true;
  return {
    ...lineup,
    returning:
      lineup.returning &&
      open('valve-0104') &&
      open('valve-0105') &&
      // Not while its filter washes: its water goes to drain.
      filtering(world.spaFilters.pool_04) &&
      // Nor until its controller runs, every servo open.
      cabinetReady(world.cabinets.pool_04),
  };
}

/** A spa filter's pump's flow: the spa's circulation, or, washing, its own. */
function spaFilterPump(
  f: SpaFilter,
  circulation: number,
  powered: boolean,
  pool: SpaPool,
) {
  if (filtering(f)) return circulation;
  return powered ? POOL_TARGET[pool].flow : 0;
}

/**
 * Each pool's suspended solids a step on (`solids.ts`): its bathers' dirt
 * in, its filters' catch out, each pool's through its own beds.
 */
function withSolids(world: World, pools: PoolsState, dt: number): PoolsState {
  const passes = (id: PoolId) =>
    id === 'pool_03' || id === 'pool_04'
      ? (solids: number) =>
          bedPasses(world.spaFilters[id].spec, world.spaFilters[id].bed, solids)
      : id === 'pool_01'
        ? (solids: number) => loungePasses(world.loungeFilters, solids)
        : (solids: number) => olympicPasses(world.olympic, solids);
  return Object.fromEntries(
    (Object.keys(pools) as PoolId[]).map((id) => [
      id,
      {
        ...pools[id],
        solids: stepSolids(
          world.pools[id].solids,
          {
            bathers: world.bathers.pools[id].now,
            volume: poolVolume(id),
            area: poolArea(id),
            flow: pools[id].flow,
            passes: passes(id),
          },
          dt,
        ),
      },
    ]),
  ) as PoolsState;
}

/** The central battery's mains: the switch room's supply. */
export const batteryMains = (world: World) =>
  serviceAvailable(world.plant, 'switch_room', 'power');

/**
 * Whether a zone's emergency lighting is lit: its normal lighting out (a
 * central system's relay on each zone's supply, EN 50171), or the battery
 * in a test; and the system able to supply it.
 */
export const emergencyLit = (world: World, zone: LightingZoneId) =>
  batteryCanSupply(world.centralBattery, batteryMains(world)) &&
  (!!world.centralBattery.test ||
    !zoneLit(withIntake(world.plant, world.intake), world.lighting, zone));

/** The share of the emergency lighting lit, its load on the battery. */
export const emergencyLoad = (world: World) =>
  world.centralBattery.test
    ? 1
    : LIGHTING_ZONE_IDS.filter(
        (z) =>
          !zoneLit(withIntake(world.plant, world.intake), world.lighting, z),
      ).length / LIGHTING_ZONE_IDS.length;
