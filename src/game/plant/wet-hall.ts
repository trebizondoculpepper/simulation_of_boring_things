import {
  changeoverFlow,
  newBoosterChangeover,
  stepChangeover,
} from '../../toolkit/components/plant/logic/booster-changeover';
import type { BoosterChangeover } from '../../toolkit/components/plant/logic/booster-changeover';
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
  /**
   * The backwash pit's working volume, m³, to its top water level
   * (`BACKWASH_PIT`): sized (the owner, 2026-10-26) for two of the
   * Olympic's filters and one of the lounge's washed together, which
   * send about 49 m³ to drain in some eight minutes (backwash and rinse,
   * measured in the world, `backwash-pit.test.ts`), with room above; then
   * made half as deep again, for water slides and a children's pool to
   * come.
   */
  backwashTank: 105,
  /**
   * The site's consent to discharge to the foul sewer, m³/h, from the
   * sewerage undertaker: the backwash's discharge and any pool draining
   * down share it.
   */
  sewerConsent: 10,
  /** Its discharge to sewer: the consented rate; on above one share, off below another. */
  dischargeRate: 10,
  /** The backwash discharge valve open, by gravity past its pump to the sewer, m³/h (DN100). */
  dischargeValveRate: 40,
  dischargeOn: 0.4,
  dischargeOff: 0.05,
  /** Its high-level alarm: above what a two-and-one wash leaves in it from empty. */
  backwashHigh: 0.8,
  /**
   * Its high-high level: its controller shuts its inlet, inhibiting every
   * backwash and rinse until the pump has brought it back below its high
   * level.
   */
  backwashHighHigh: 0.93,
} as const;

/**
 * The backwash pit (prompt 036; the owner, 2026-10-26): a sealed cast
 * concrete pit below the wet hall's south floor, serviced from above only,
 * oversized by half again for water slides and a children's pool to come,
 * metres inside. Its working volume to its top water level is
 * `WET_HALL_PLANT.backwashTank`; above that, freeboard to its slab, and
 * below its floor a settlement sump for its discharge pump.
 */
export const BACKWASH_PIT = {
  length: 7,
  width: 5,
  /** Its floor to the underside of its covering slab. */
  depth: 3.75,
  /** Its top water level above its floor: where it overflows (2.0 m, half as deep again for the slides and children's pool to come). */
  topWater: 3.0,
  /** Its sump, under its pump: a pit in its floor, in its south-east corner. */
  sump: { length: 1.2, width: 1.2, depth: 0.6 },
  /** The hatch over its sump, in its gratings, this square. */
  hatch: 1.4,
} as const;

/**
 * The pit's float switches (the owner, 2026-10-26): four cable-suspended
 * tilt floats hanging from a bracket under its gratings by its sump, each
 * at its level, tilting up when the water reaches it and closing its
 * contact. They are its controls, independent of its ultrasonic
 * transmitter: STOP and START work its pump, HIGH its high alarm and the
 * inhibit's release, HIGH-HIGH its inhibit. Each at its share of its
 * working volume.
 */
export const PIT_FLOATS = [
  { id: 'stop', name: 'STOP', share: WET_HALL_PLANT.dischargeOff },
  { id: 'start', name: 'START', share: WET_HALL_PLANT.dischargeOn },
  { id: 'high', name: 'HIGH', share: WET_HALL_PLANT.backwashHigh },
  { id: 'highHigh', name: 'HIGH-HIGH', share: WET_HALL_PLANT.backwashHighHigh },
] as const;
export type PitFloatId = (typeof PIT_FLOATS)[number]['id'];

/** Each float's height above the pit's floor, m: its level's water depth. */
export const pitFloatHeight = (share: number) =>
  backwashPitDepth(share * WET_HALL_PLANT.backwashTank);

/** Which of its floats are tilted up, with `m3` in it. */
export function pitFloats(m3: number): Record<PitFloatId, boolean> {
  return Object.fromEntries(
    PIT_FLOATS.map((f) => [f.id, m3 > f.share * WET_HALL_PLANT.backwashTank]),
  ) as Record<PitFloatId, boolean>;
}

/** Its water's depth above its floor, m, holding `m3`. */
export const backwashPitDepth = (m3: number) =>
  Math.max(0, m3) / (BACKWASH_PIT.length * BACKWASH_PIT.width);

/** The booster set's run-on after its last draw, seconds: its hysteresis. */
export const BOOSTER_RUN_ON = 60;

/** A sump pump's selector on its control panel. */
export type PitPumpMode = 'hand' | 'off' | 'auto';

/**
 * The backwash pit's two sump pumps (the owner, 2026-10-26): each its
 * HAND · OFF · AUTO selector; the duty pump, alternated after each
 * pump-down to share the wear; and which run.
 */
export interface PitPumps {
  modes: [PitPumpMode, PitPumpMode];
  duty: 0 | 1;
  running: [boolean, boolean];
}

export type PitPumpAction =
  | { act: 'mode'; pump: 0 | 1; mode: PitPumpMode }
  | { act: 'duty'; pump: 0 | 1 };

export function actOnPitPumps(p: PitPumps, a: PitPumpAction): PitPumps {
  if (a.act === 'duty') return { ...p, duty: a.pump };
  const modes: [PitPumpMode, PitPumpMode] = [...p.modes];
  modes[a.pump] = a.mode;
  return { ...p, modes };
}

/**
 * Which pumps run: in HAND always; in AUTO, while the floats call, the
 * duty pump, or the standby if the duty pump is not in AUTO. None
 * without power.
 */
export function pitPumpsRunning(
  p: PitPumps,
  called: boolean,
  power: boolean,
): [boolean, boolean] {
  if (!power) return [false, false];
  const auto = (k: 0 | 1) => p.modes[k] === 'auto';
  const other = (1 - p.duty) as 0 | 1;
  const answering = auto(p.duty) ? p.duty : auto(other) ? other : null;
  return [0, 1].map(
    (k) => p.modes[k] === 'hand' || (called && answering === k),
  ) as [boolean, boolean];
}

/** What its sump pumps put down the sewer, m³/h: each running pump's. */
export const pitDischargeRate = (s: WetHallState) =>
  WET_HALL_PLANT.dischargeRate * s.pitPumps.running.filter(Boolean).length;

export interface WetHallState {
  /** Water in the break tank, m³. */
  breakTank: number;
  /** Whether the booster set has tripped on the break tank's low level; latched. */
  boosterTripped: boolean;
  /**
   * Whether the booster set is running: started by any draw, run on for
   * `BOOSTER_RUN_ON` seconds after the last (the owner, 2026-10-26: it
   * flapped on and off with the pools' float valves); and at what rate
   * it delivered in the last step, m³/h.
   */
  boosterRunning: boolean;
  /** Seconds of its run-on left. */
  boosterRunOn: number;
  /**
   * Its two pumps, their valves and its controller's DUTY, RUN, STOP and
   * BOOST (`booster-changeover.ts`, the owner, 2026-10-26: brought in
   * from dev42), called by the make-up's demand through its run-on.
   */
  booster: BoosterChangeover;
  flow: number;
  /** The water in from the town main, through its meters, m³ in all. */
  meter: number;
  /** Water in the backwash holding tank, m³. */
  backwashTank: number;
  /**
   * Whether its floats call its pumps (`pitFloats`): started by START
   * tilting up, run on until STOP drops; and whether any pump runs.
   */
  discharging: boolean;
  /** Its two sump pumps and their control panel (`pitPumpsRunning`). */
  pitPumps: PitPumps;
  /** Backwash spilt by the holding tank's overflow, m³ in all. */
  spilt: number;
  /** Its controller's high-high inhibit: its inlet shut, no backwash or rinse taken. */
  inhibit: boolean;
}

export function newWetHall(): WetHallState {
  return {
    breakTank: WET_HALL_PLANT.breakTank * WET_HALL_PLANT.floatOpen,
    boosterTripped: false,
    boosterRunning: false,
    boosterRunOn: 0,
    booster: {
      ...newBoosterChangeover(),
      speed: [0, 0],
      called: false,
    },
    flow: 0,
    meter: 0,
    backwashTank: 0,
    discharging: false,
    pitPumps: { modes: ['auto', 'auto'], duty: 0, running: [false, false] },
    spilt: 0,
    inhibit: false,
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
  flows: {
    drawn: number;
    backwashed: number;
    /** Whether the pools' make-up calls for water (else, any draw). */
    demand?: boolean;
  },
  dt: number,
  /**
   * Its drain to the foul sewer open (the owner, 2026-10-25: valves
   * that do something): the backwash discharge valve (WH-DR1-DV1) beside
   * its pump. The pit has no drain of its own (the owner, 2026-10-26).
   * Shut, as in service, unless given.
   */
  drains: { discharge: boolean } = { discharge: false },
): WetHallState {
  const P = WET_HALL_PLANT;
  const hours = dt / 3600;
  // The break tank: the main in through the float valve, the make-up out.
  const filling =
    plant.sources.water && s.breakTank < P.breakTank * P.floatOpen;
  const before = Math.max(0, s.breakTank - flows.drawn);
  const breakTank = Math.min(
    P.breakTank,
    before + (filling ? P.mainsFill * hours : 0),
  );
  // What came in from the main, through the meter, past the float valve.
  const mainsIn = breakTank - before;
  const boosterTripped =
    s.boosterTripped || breakTank < P.breakTank * P.lowLevel;
  // The backwash tank: the backwash in, its pump out to sewer.
  const filled = s.backwashTank + flows.backwashed;
  // Its pump on its floats (`pitFloats`): started by START tilting up,
  // run on until STOP drops.
  const now = pitFloats(filled);
  const discharging = powered(plant) && (s.discharging ? now.stop : now.start);
  // Its pumps on their selectors and its floats; the duty passed to the
  // other pump after each pump-down (the owner, 2026-10-26).
  const running = pitPumpsRunning(s.pitPumps, discharging, powered(plant));
  const pitPumps: PitPumps = {
    ...s.pitPumps,
    running,
    duty:
      s.discharging && !discharging
        ? ((1 - s.pitPumps.duty) as 0 | 1)
        : s.pitPumps.duty,
  };
  const pumped = P.dischargeRate * running.filter(Boolean).length;
  const gravity = drains.discharge ? P.dischargeValveRate : 0;
  const backwashTank = Math.max(0, filled - pumped * hours - gravity * hours);
  const spilt = Math.max(0, backwashTank - P.backwashTank);
  // The booster set: started by any draw and run on after the last, as
  // its pressure vessel and controller would, so it does not start and
  // stop with every float valve; stopped at once by a trip or no power.
  const boosterRunOn =
    boosterTripped || !powered(plant)
      ? 0
      : (flows.demand ?? flows.drawn > 0)
        ? BOOSTER_RUN_ON
        : Math.max(0, s.boosterRunOn - dt);
  // Its pumps and valves, called while its run-on lasts.
  const booster = stepChangeover(
    { ...s.booster, called: boosterRunOn > 0 },
    dt,
  );
  // Its inhibit, on its floats: set when HIGH-HIGH tilts up, held until
  // the pump has it back down past HIGH.
  const after = pitFloats(backwashTank);
  const inhibit = s.inhibit ? after.high : after.highHigh;
  return {
    breakTank,
    boosterTripped,
    boosterRunning: changeoverFlow(booster) > 0,
    boosterRunOn,
    booster,
    flow: hours > 0 ? flows.drawn / hours : 0,
    meter: s.meter + mainsIn,
    backwashTank: Math.min(P.backwashTank, backwashTank),
    discharging,
    pitPumps,
    spilt: s.spilt + spilt,
    inhibit,
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
    // Its HIGH float tilted up.
    backwashHigh: pitFloats(s.backwashTank).high,
    /** High-high: its inlet shut, backwashing inhibited. */
    backwashInhibit: !!s.inhibit,
  };
}
