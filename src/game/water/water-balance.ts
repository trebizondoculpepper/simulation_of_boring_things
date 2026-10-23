/**
 * The water balance of one pool and its balance tank, hour by hour: where
 * the water is, and where it goes. Pure.
 *
 * A deck-level pool brims over its edge into the overflow channel, which
 * falls to the balance tank; so do its main drains, from the bottom of
 * the pool, by gravity. The circulation pumps draw from the tank and
 * return the water, treated, to the pool. The pool loses water to the
 * hall's air (evaporation) and the tank loses it to waste each day (the
 * filters' backwash, which is how the water is diluted). Fresh water
 * comes in through the make-up valve, on a float, to keep the tank at
 * its working level.
 *
 * If the tank falls to its low-low level the pumps trip, before they run
 * dry. With the pumps stopped nothing returns to the pool, but its main
 * drains still run to the tank by gravity, while the pool's surface is
 * above the tank's; and if the tank fills, it overflows to waste. So a
 * pool can lose water a long way faster than it evaporates.
 *
 * To empty a pool it is drained down: its pumps' suction is valved to its
 * main drains and their delivery to the foul sewer, so the pool is pumped
 * out, no longer refilled, at the rate the sewerage undertaker's consent
 * allows (`drainRate`), down to its floor (the pool taken as a prism of its
 * mean depth, its volume over its area). Its balance tank sits apart
 * meanwhile, topped up by the make-up if that is left open.
 *
 * Heights are metres from the pool's overflow edge (its lip), up; flows
 * are m³/h; time is hours.
 */

export interface PoolWater {
  name: string;
  /** The pool's surface, m², and its volume brimming, m³. */
  area: number;
  volume: number;
  /** The circulation's flow, m³/h. */
  flow: number;
  /** Evaporation from the pool's surface, m³/h. */
  evaporation: number;
  /** The balance tank: its capacity, m³, and its depth, m. */
  tank: number;
  tankDepth: number;
  /** How far below the pool's lip the tank's overflow to waste is, m. */
  tankBelow: number;
  /** The share of the circulation that comes back by the main drains. */
  mainDrainShare: number;
  /** The water over the lip at the design flow, m (the weir's head). */
  weirHead: number;
  /** The make-up's flow when its float calls, m³/h, and the float's level, a share of the tank. */
  makeUpRate: number;
  float: number;
  /** The pumps trip with the tank this low, a share. */
  lowLow: number;
  /** Backwashed to waste each day, m³. */
  backwash: number;
  /** Its mean depth, m: empty with its surface this far below the lip. */
  depth: number;
}

export interface WaterState {
  time: number;
  /** The pool's surface, m from its lip (above it, overflowing). */
  level: number;
  /** The water in the tank, m³. */
  tankVolume: number;
  /** Whether the pumps run, and whether they have tripped. */
  pumps: boolean;
  tripped: boolean;
  /** Whether the make-up valve is open. */
  makeUpOpen: boolean;
  /** Whether it is being drained down to the sewer, and at what rate it may be, m³/h. */
  drainDown: boolean;
  drainRate: number;
  /** Pumped to the sewer by draining down so far, m³. */
  drained: number;
  /** Water lost to waste so far, by overflow, backwash; and evaporated, m³. */
  spilt: number;
  backwashed: number;
  evaporated: number;
  /** Fresh water taken in, m³. */
  madeUp: number;
  /**
   * What the pumps deliver to the pool while they run, m³/h, where a
   * plant's own model says (the Olympic's battery, `olympic-battery.ts`);
   * the pool's design flow otherwise.
   */
  pumpFlow?: number;
  /**
   * What the plant sends to waste now, m³/h (a backwash, as its valves
   * have it), drawn from the tank; given, it stands in for the day's
   * backwash at midnight.
   */
  toWaste?: number;
}

/** A pool brimming, its tank at its float, its pumps running, its make-up open. */
export function startingWater(p: PoolWater): WaterState {
  return {
    time: 0,
    level: p.weirHead,
    tankVolume: p.tank * p.float,
    pumps: true,
    tripped: false,
    makeUpOpen: true,
    drainDown: false,
    drainRate: 0,
    drained: 0,
    spilt: 0,
    backwashed: 0,
    evaporated: 0,
    madeUp: 0,
  };
}

/** The tank's surface, m from the pool's lip (negative: below it). */
export const tankSurface = (p: PoolWater, s: WaterState) =>
  -p.tankBelow - p.tankDepth * (1 - s.tankVolume / p.tank);

/** The flows now, m³/h. */
export function flows(p: PoolWater, s: WaterState) {
  const empty = s.level <= -p.depth + 1e-9;
  // Draining down: the pumps take the pool's water to the sewer instead of
  // round to it again, at the consented rate, until it is empty.
  const drainingDown = s.drainDown && s.pumps;
  const toSewer = drainingDown && !empty ? Math.min(s.drainRate, p.flow) : 0;
  const pumped = s.pumpFlow ?? p.flow;
  const circulation = s.pumps && !s.drainDown ? pumped : 0;
  // Over the lip: a weir, its flow as the head over it to the power 1.5,
  // carrying the circulation's share not taken by the main drains.
  const weir = (p.flow * (1 - p.mainDrainShare)) / p.weirHead ** 1.5;
  const overflow = s.level > 0 ? weir * s.level ** 1.5 : 0;
  // The main drains: throttled to their share while the pumps run; by
  // gravity alone, as the root of the head between the pool's surface and
  // the tank's, once they stop.
  const head = s.level - tankSurface(p, s);
  // Draining down, the main drains are valved to the pumps, not the tank.
  const mainDrains = s.drainDown
    ? 0
    : s.pumps
      ? pumped * p.mainDrainShare
      : head > 0 && !empty
        ? p.flow *
          p.mainDrainShare *
          Math.sqrt(head / (p.tankBelow + p.tankDepth))
        : 0;
  const makeUp =
    s.makeUpOpen && s.tankVolume < p.tank * p.float ? p.makeUpRate : 0;
  return {
    circulation,
    overflow,
    mainDrains,
    evaporation: empty ? 0 : p.evaporation,
    makeUp,
    toSewer,
  };
}

/** `hours` on, in steps of `dt`; a day's backwash at each midnight while the pumps run. */
export function stepWater(
  p: PoolWater,
  start: WaterState,
  hours: number,
  dt = 1 / 60,
): WaterState {
  let s = { ...start };
  const steps = Math.round(hours / dt);
  for (let i = 0; i < steps; i++) {
    const f = flows(p, s);
    const poolIn =
      f.circulation - f.overflow - f.mainDrains - f.evaporation - f.toSewer;
    // Not below its floor: what would have taken it lower was not there.
    let level = s.level + (poolIn * dt) / p.area;
    let drainedNow = f.toSewer * dt;
    if (level < -p.depth) {
      drainedNow = Math.max(0, drainedNow - (-p.depth - level) * p.area);
      level = -p.depth;
    }
    let tank =
      s.tankVolume +
      (f.overflow + f.mainDrains - f.circulation + f.makeUp) * dt;
    let spilt = s.spilt;
    if (tank > p.tank) {
      spilt += tank - p.tank;
      tank = p.tank;
    }
    let backwashed = s.backwashed;
    const day = Math.floor(s.time / 24);
    const time = s.time + dt;
    if (s.toWaste !== undefined) {
      // To waste as the plant's valves send it, while the pumps run.
      const out = s.pumps ? Math.min(s.toWaste * dt, tank) : 0;
      tank -= out;
      backwashed += out;
    } else if (s.pumps && Math.floor(time / 24) > day) {
      const out = Math.min(p.backwash, tank);
      tank -= out;
      backwashed += out;
    }
    tank = Math.max(0, tank);
    // Draining down, the pumps draw from the pool, not the tank: no trip.
    const tripped = s.tripped || (!s.drainDown && tank < p.tank * p.lowLow);
    s = {
      ...s,
      time,
      level,
      drained: s.drained + drainedNow,
      tankVolume: tank,
      pumps: s.pumps && !tripped,
      tripped,
      spilt,
      backwashed,
      evaporated: s.evaporated + f.evaporation * dt,
      madeUp: s.madeUp + f.makeUp * dt,
    };
  }
  return s;
}
