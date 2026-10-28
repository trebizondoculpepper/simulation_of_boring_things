import type { World } from '../world';
import { serviceAvailable } from './services';
import { withIntake } from './site-intake';
import { WET_HALL_PLANT, wetHallAlarms } from './wet-hall';
import { overConsent } from './sewer-monitor';
import { DISTRIBUTION } from './chemical-distribution';
import { STORE_CAPACITY } from './chemicals';
import type { Chemical } from './chemicals';
import { zoneInAlarm } from './fire-alarm';
import { installedValveOpen } from './installed-valves';
import { chemControlFaults } from './chem-control';

/**
 * The wet hall's annunciator (mission 099; the owner, 2026-10-28: "a wet
 * room annunciator ... that would show things that could go wrong with
 * that location. For example, the drainage tank overfilling, the clean
 * water tank underfilling, the chemical transfer failing"): twenty-four
 * windows, six by four, one on the wet hall's wall and its twin in the
 * old control room, one state in the world for both
 * (`location-annunciator.ts` for its sequence). Every window is a fault
 * the world models: the make-up's break tank, its booster set tripped
 * or stopped or isolated, and the town main; the backwash pit's levels, its overflow, its pumps and the
 * sewer's consent; each chemical line's high-high trip, its store at
 * its low-level cut-out, and its selector or pump out of AUTO; the
 * transfer's supplies, the hall's own power and its fire zone; and, its
 * fourth row, the chemical transfer control box's faults (mission 091,
 * `chemControlFaults`): its supply lost, its MCB tripped, its controller
 * hung, each terminal's link broken, and AUTO filling stopped. Pure.
 */

export const WET_HALL_ALARMS = [
  'break-tank-low',
  'booster-trip',
  'town-main',
  'pit-high',
  'pit-inhibit',
  'pit-overflow',
  'pit-pump-not-auto',
  'sewer-consent',
  'hypo-trip',
  'hypo-store-low',
  'hypo-not-auto',
  'acid-trip',
  'acid-store-low',
  'acid-not-auto',
  'transfer-no-supply',
  'power-fail',
  'fire',
  'booster-off',
  'chem-box-supply',
  'chem-box-mcb',
  'chem-controller',
  'hypo-terminal-comms',
  'acid-terminal-comms',
  'chem-auto-stopped',
] as const;
export type WetHallAlarmId = (typeof WET_HALL_ALARMS)[number];

/** Each window's engraving, two short lines. */
export const WET_HALL_ALARM_TEXT: Record<WetHallAlarmId, string> = {
  'break-tank-low': 'BREAK TANK\nLOW',
  'booster-trip': 'BOOSTER SET\nTRIP LOW WATER',
  'town-main': 'TOWN MAIN\nNO SUPPLY',
  'pit-high': 'BACKWASH PIT\nHIGH',
  'pit-inhibit': 'BACKWASH\nINHIBITED',
  'pit-overflow': 'BACKWASH PIT\nOVERFLOWING',
  'pit-pump-not-auto': 'PIT PUMP\nNOT IN AUTO',
  'sewer-consent': 'SEWER\nOVER CONSENT',
  'hypo-trip': 'HYPO TRANSFER\nHIGH-HIGH TRIP',
  'hypo-store-low': 'HYPO STORE\nLOW CUT-OUT',
  'hypo-not-auto': 'HYPO TRANSFER\nNOT IN AUTO',
  'acid-trip': 'ACID TRANSFER\nHIGH-HIGH TRIP',
  'acid-store-low': 'ACID STORE\nLOW CUT-OUT',
  'acid-not-auto': 'ACID TRANSFER\nNOT IN AUTO',
  'transfer-no-supply': 'CHEM TRANSFER\nNO SUPPLY',
  'power-fail': 'WET HALL\nPOWER FAIL',
  fire: 'FIRE ALARM\nWET HALL',
  'booster-off': 'BOOSTER SET\nSTOPPED / ISOL',
  'chem-box-supply': 'CHEM BOX\nSUPPLY FAIL',
  'chem-box-mcb': 'CHEM BOX\nMCB TRIPPED',
  'chem-controller': 'CHEM CONTROL\nCONTROLLER FAULT',
  'hypo-terminal-comms': 'HYPO TERMINAL\nNO COMMS',
  'acid-terminal-comms': 'ACID TERMINAL\nNO COMMS',
  'chem-auto-stopped': 'CHEM TRANSFER\nAUTO STOPPED',
};

/** A chemical line's windows: tripped, its store at its cut-out, out of AUTO. */
function lineAlarms(world: World, c: Chemical) {
  const line = world.distribution[c];
  return {
    trip: line.tripped,
    storeLow: world.chemicals[c] <= STORE_CAPACITY[c] * DISTRIBUTION.storeLow,
    notAuto: line.hoa !== 'auto' || line.mode !== 'auto',
  };
}

/** The wet hall's alarms present in `world` now, in its windows' order. */
export function wetHallAlarmsIn(world: World): WetHallAlarmId[] {
  // As its consumers see the services: the utilities' devices too.
  const plant = withIntake(world.plant, world.intake);
  const hall = world.wetHall;
  const lamps = wetHallAlarms(hall);
  const powered = serviceAvailable(plant, 'wet_hall', 'power');
  const hypo = lineAlarms(world, 'hypochlorite');
  const acid = lineAlarms(world, 'acid');
  // A line's pump on its store's supply, its selector on the hall's
  // (`distributionPower`): either store's supply gone.
  const storesPowered =
    serviceAvailable(plant, 'hypo_store', 'power') &&
    serviceAvailable(plant, 'acid_store', 'power');
  // The chemical control box on the hall's own supply.
  const box = chemControlFaults(world.chemControl, powered);
  const on: Record<WetHallAlarmId, boolean> = {
    'break-tank-low': lamps.breakTankLow,
    'booster-trip': lamps.boosterLowWater,
    'town-main': !plant.sources.water,
    'pit-high': lamps.backwashHigh,
    'pit-inhibit': lamps.backwashInhibit,
    'pit-overflow': hall.backwashTank >= WET_HALL_PLANT.backwashTank * 0.999,
    'pit-pump-not-auto': hall.pitPumps.modes.some((m) => m !== 'auto'),
    'sewer-consent': overConsent(world.sewer, WET_HALL_PLANT.sewerConsent),
    'hypo-trip': hypo.trip,
    'hypo-store-low': hypo.storeLow,
    'hypo-not-auto': hypo.notAuto,
    'acid-trip': acid.trip,
    'acid-store-low': acid.storeLow,
    'acid-not-auto': acid.notAuto,
    'transfer-no-supply': powered && !storesPowered,
    'power-fail': !powered,
    fire: zoneInAlarm(world.fireAlarm, 'wet_hall'),
    // The booster set STOPped at its panel, or either of its motorised
    // valves shut: no make-up to the pools however they call.
    'booster-off':
      !hall.booster.run ||
      !installedValveOpen(world.installedValves, 'WH-T1-IV1') ||
      !installedValveOpen(world.installedValves, 'WH-MU1-IV2'),
    'chem-box-supply': box.supplyLost,
    'chem-box-mcb': box.mcbTripped,
    'chem-controller': box.controllerFault,
    'hypo-terminal-comms': box.commsLost.hypochlorite,
    'acid-terminal-comms': box.commsLost.acid,
    'chem-auto-stopped': box.stopped,
  };
  return WET_HALL_ALARMS.filter((id) => on[id]);
}
