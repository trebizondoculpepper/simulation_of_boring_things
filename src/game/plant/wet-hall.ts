/**
 * The wet hall: the water services every pool shares (`sizing.ts`).
 *
 * Make-up: the town main fills the Category 5 break tank through its
 * float valve and air gap (no power needed); the booster set, duty and
 * standby, draws from the break tank and pressurises the make-up main to
 * every pool's balance tank, through the make-up water meter. With the
 * main off, the break tank carries the pools for a while; once it falls
 * to its low level, the booster set trips, and stays tripped (its LOW
 * WATER lamp lit) until someone resets it with water back in the tank.
 *
 * Backwash: the pools' filters backwash to waste into the backwash
 * holding tank, whose pump discharges it slowly to the foul sewer, as
 * the water company's consent allows; a full tank spills by its overflow.
 *
 * Volumes in m³, flows in m³/h, time steps in seconds. Pure.
 */
import { serviceAvailable } from './services';
import type { PlantServices } from './services';

export const WET_HALL_PLANT = {
  /** The break tank, m³ (the sizing's 13.2 m³). */
  breakTank: 13.2,
  /** The float valve opens below this share of the tank, and fills at this rate. */
  floatOpen: 0.9,
  mainsFill: 20,
  /** The booster set delivers at most this. */
  boosterRate: 15,
  /** It trips below this share of the break tank, and resets only above this. */
  lowLevel: 0.15,
  resetAbove: 0.3,
  /** The backwash holding tank, m³ (the sizing's 29.5 m³). */
  backwashTank: 29.5,
  /**
   * The site's consent to discharge to the foul sewer, m³/h, from the
   * sewerage undertaker: the backwash's discharge and any pool draining
   * down share it.
   */
  sewerConsent: 10,
  /** Its discharge to sewer: the consented rate; on above one share, off below another. */
  dischargeRate: 10,
  dischargeOn: 0.4,
  dischargeOff: 0.05,
  /** Its high-level alarm: above a night's backwash, which fills it to about 95 %. */
  backwashHigh: 0.97,
} as const;

export interface WetHallState {
  /** Water in the break tank, m³. */
  breakTank: number;
  /** Whether the booster set has tripped on the break tank's low level; latched. */
  boosterTripped: boolean;
  /** Whether the booster set delivered in the last step, and at what rate, m³/h. */
  boosterRunning: boolean;
  flow: number;
  /** The make-up water meter's reading, m³. */
  meter: number;
  /** Water in the backwash holding tank, m³. */
  backwashTank: number;
  /** Whether its discharge pump is running. */
  discharging: boolean;
  /** Backwash spilt by the holding tank's overflow, m³ in all. */
  spilt: number;
}

export function newWetHall(): WetHallState {
  return {
    breakTank: WET_HALL_PLANT.breakTank * WET_HALL_PLANT.floatOpen,
    boosterTripped: false,
    boosterRunning: false,
    flow: 0,
    meter: 0,
    backwashTank: 0,
    discharging: false,
    spilt: 0,
  };
}

const powered = (plant: PlantServices) =>
  serviceAvailable(plant, 'wet_hall', 'power');

/**
 * The make-up the booster set can deliver now, m³/h: none if it is
 * tripped or has no power; otherwise its rate.
 */
export const boosterCapacity = (s: WetHallState, plant: PlantServices) =>
  powered(plant) && !s.boosterTripped ? WET_HALL_PLANT.boosterRate : 0;

/**
 * The share of what the pools call for that the booster set can give:
 * all of it, while they call for no more than it delivers.
 */
export function makeUpShare(
  s: WetHallState,
  plant: PlantServices,
  demand: number,
): number {
  const capacity = boosterCapacity(s, plant);
  if (capacity === 0) return 0;
  return demand <= capacity ? 1 : capacity / demand;
}

/**
 * The wet hall `dt` seconds on: `drawn` m³ of make-up delivered to the
 * pools, and `backwashed` m³ of their backwash come in, during the step.
 */
export function stepWetHall(
  s: WetHallState,
  plant: PlantServices,
  flows: { drawn: number; backwashed: number },
  dt: number,
): WetHallState {
  const P = WET_HALL_PLANT;
  const hours = dt / 3600;
  // The break tank: the main in through the float valve, the make-up out.
  const filling =
    plant.sources.water && s.breakTank < P.breakTank * P.floatOpen;
  const breakTank = Math.min(
    P.breakTank,
    Math.max(
      0,
      s.breakTank + (filling ? P.mainsFill * hours : 0) - flows.drawn,
    ),
  );
  const boosterTripped =
    s.boosterTripped || breakTank < P.breakTank * P.lowLevel;
  // The backwash tank: the backwash in, its pump out to sewer.
  const filled = s.backwashTank + flows.backwashed;
  const discharging =
    powered(plant) &&
    (s.discharging
      ? filled > P.backwashTank * P.dischargeOff
      : filled > P.backwashTank * P.dischargeOn);
  const backwashTank = Math.max(
    0,
    filled - (discharging ? P.dischargeRate * hours : 0),
  );
  const spilt = Math.max(0, backwashTank - P.backwashTank);
  return {
    breakTank,
    boosterTripped,
    boosterRunning: flows.drawn > 0,
    flow: hours > 0 ? flows.drawn / hours : 0,
    meter: s.meter + flows.drawn,
    backwashTank: Math.min(P.backwashTank, backwashTank),
    discharging,
    spilt: s.spilt + spilt,
  };
}

/** The booster set's RESET: clears its trip, if the break tank has water again. */
export function resetBooster(s: WetHallState): WetHallState {
  if (!s.boosterTripped) return s;
  return s.breakTank >= WET_HALL_PLANT.breakTank * WET_HALL_PLANT.resetAbove
    ? { ...s, boosterTripped: false }
    : s;
}

/** What the wet hall's lamps and alarms show. */
export function wetHallAlarms(s: WetHallState) {
  const P = WET_HALL_PLANT;
  return {
    breakTankLow: s.breakTank < P.breakTank * 0.3,
    boosterLowWater: s.boosterTripped,
    backwashHigh: s.backwashTank > P.backwashTank * P.backwashHigh,
  };
}
