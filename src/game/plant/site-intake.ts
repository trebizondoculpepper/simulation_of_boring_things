import type { PlantServices } from './services';
import { switchboardSource } from './changeover';
import { MOTORS, MOTOR_TAGS } from './motor-starters';
import type { MotorsState } from './motor-starters';
import { LIGHTING_ZONE_IDS } from './lighting';
import type { LightingState } from './lighting';
import type { AirHandlingState } from './air-handling';
import type { PoolsState } from './pools';
import type { WetHallState } from './wet-hall';

/**
 * The site's intake (prompt 083; the owner, 2026-10-26): the three
 * incoming services where they reach the building in the goods yard, each
 * through the utility's side before the building's own, and the meters
 * that count what comes in.
 *
 * - **Water**: the water company's boundary stop tap and revenue meter,
 *   outside; the wet hall's own stop valve and flowmeter stay inside.
 * - **Gas**: the emergency control valve (ECV) at the gas meter, outside;
 *   the boiler house's isolation and its SSOV stay inside.
 * - **Electricity**: the network's sealed cut-out and the meter operator's
 *   meter, then the customer-side outside isolator, the lever; the switch
 *   room's main switch stays inside.
 *
 * Each pair's handles are independent: the service flows only while both
 * allow it (`withIntake`), and closing one never moves the other. Pure.
 */

export type IntakeService = 'water' | 'gas' | 'power';

export interface SiteIntake {
  /** The utility's outside device for each service: open, or on. */
  open: Record<IntakeService, boolean>;
  /** The meters' registers: water m³, gas m³, electricity kWh. */
  meters: { water: number; gas: number; power: number };
}

/** As found: all open, the registers at plausible readings for a centre some years in use. */
export function newSiteIntake(): SiteIntake {
  return {
    open: { water: true, gas: true, power: true },
    meters: { water: 48213.4, gas: 912406.2, power: 3184522.8 },
  };
}

export type IntakeAction = {
  act: 'set';
  service: IntakeService;
  open: boolean;
};

export function actOnIntake(s: SiteIntake, a: IntakeAction): SiteIntake {
  if (s.open[a.service] === a.open) return s;
  return { ...s, open: { ...s.open, [a.service]: a.open } };
}

/** Which of the building's sources each intake feeds: gas is the boilers' heat. */
const FEEDS = { water: 'water', gas: 'heat', power: 'power' } as const;

/**
 * The plant as its consumers see it: each source on only while both the
 * building's own switch and the utility's outside device allow it.
 */
export function withIntake(plant: PlantServices, s: SiteIntake): PlantServices {
  const blocked = (Object.keys(FEEDS) as IntakeService[]).filter(
    (k) => !s.open[k] && plant.sources[FEEDS[k]],
  );
  if (!blocked.length) return plant;
  const sources = { ...plant.sources };
  for (const k of blocked) sources[FEEDS[k]] = false;
  return { ...plant, sources };
}

/**
 * After a step run on `withIntake`'s plant: the building's own switches
 * back, as the step left them where the intake let it see them, and as
 * they were where it did not (so a shut outside device never moves an
 * inside handle).
 */
export function restoreInside(
  before: PlantServices,
  after: PlantServices,
  s: SiteIntake,
): PlantServices {
  const sources = { ...after.sources };
  let changed = false;
  for (const k of Object.keys(FEEDS) as IntakeService[])
    if (!s.open[k] && sources[FEEDS[k]] !== before.sources[FEEDS[k]]) {
      sources[FEEDS[k]] = before.sources[FEEDS[k]];
      changed = true;
    }
  return changed ? { ...after, sources } : after;
}

// ---- What the site draws -------------------------------------------------

/** A three-phase motor's electrical input at its usual load, kW per amp of full-load current (√3 × 400 V × 0.85 pf × 0.8 load). */
const KW_PER_FLA = (Math.sqrt(3) * 400 * 0.85 * 0.8) / 1000;
/** An air handling unit's fans at full speed, and its heat pump, kW. */
const AHU_FANS = 11;
const AHU_HEAT_PUMP = 15;
/** A lighting zone's luminaires, kW. */
const LIGHTING_ZONE = 2.2;
/** The booster set's and the backwash pit's pumps, kW each. */
const BOOSTER_PUMP = 5.5;
const PIT_PUMP = 1.5;
/** What always runs while there is power: controls, dosing, ozone, UV, the battery's charger, kW. */
const BASE_LOAD = 9;

export interface SiteLoadInputs {
  plant: PlantServices;
  motors: MotorsState;
  airHandling: AirHandlingState;
  lighting: LightingState;
  wetHall: WetHallState;
}

/** The site's electrical load now, kW: nothing unless the mains feeds the switchboard. */
export function siteLoadKw(w: SiteLoadInputs): number {
  if (switchboardSource(w.plant) !== 'mains') return 0;
  let kw = BASE_LOAD;
  for (const tag of MOTOR_TAGS)
    if (w.motors.starters[tag]?.running) kw += MOTORS[tag].fla * KW_PER_FLA;
  for (const unit of Object.values(w.airHandling.units))
    if (unit.isolator && !unit.tripped && unit.speed > 0) {
      kw += AHU_FANS * unit.speed ** 3;
      if (unit.heatPump) kw += AHU_HEAT_PUMP;
    }
  const l = w.lighting;
  if (l.supply && l.main)
    for (const z of LIGHTING_ZONE_IDS)
      if (l.zones[z] && !l.tripped[z]) kw += LIGHTING_ZONE;
  // The booster's pumps by their speed (a fan law's cube).
  for (const v of w.wetHall.booster.speed) kw += BOOSTER_PUMP * v ** 3;
  kw += w.wetHall.pitPumps.running.filter(Boolean).length * PIT_PUMP;
  return kw;
}

/** Natural gas's energy, kWh per m³, and the boilers' efficiency. */
const GAS_KWH_PER_M3 = 10.55;
const BOILER_EFFICIENCY = 0.9;

/** The boilers' gas now, m³/h, from the heat they give the pools. */
export function siteGasM3h(pools: PoolsState, gasOn: boolean): number {
  if (!gasOn) return 0;
  const heat = Object.values(pools).reduce(
    (t, p) => t + Math.max(0, p.heating),
    0,
  );
  return heat / (GAS_KWH_PER_M3 * BOILER_EFFICIENCY);
}

/** The meters `delta` seconds on: water taken, m³/h; gas, m³/h; electricity, kW. */
export function stepIntakeMeters(
  s: SiteIntake,
  rates: { water: number; gas: number; power: number },
  delta: number,
): SiteIntake {
  const h = delta / 3600;
  return {
    ...s,
    meters: {
      water: s.meters.water + Math.max(0, rates.water) * h,
      gas: s.meters.gas + Math.max(0, rates.gas) * h,
      power: s.meters.power + Math.max(0, rates.power) * h,
    },
  };
}
