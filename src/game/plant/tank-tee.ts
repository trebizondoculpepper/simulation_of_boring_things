/**
 * A tank on one port (scenario 2, `doc/prompts/025-scenario-tank-fill-float.md`):
 * its single bottom connection goes to a tee, with a fill leg from the
 * mains and a drain leg to a gully. Which way the water goes through the
 * tank's port follows the pressures, found by balancing the tee: what
 * comes in from the mains equals what goes into (or comes out of) the
 * tank plus what goes down the drain. Pure; heads in metres of water,
 * above the drain's open end; flows in m³/s.
 *
 * Each leg passes `c · √(Δh)` for the head across it (c = A √(2g/K)),
 * in the direction of the fall. The mains has a check valve (as the water
 * regulations want), so it only ever gives; its flow is limited by its
 * supply's own rate too.
 */

export const G = 9.81;

export interface Leg {
  /** Its bore, m, and whole loss coefficient. */
  bore: number;
  K: number;
}

/** A leg's conductance, m³/s per √m; nothing if it is shut. */
export const conductance = (leg: Leg, open: boolean) =>
  open ? ((Math.PI * leg.bore * leg.bore) / 4) * Math.sqrt((2 * G) / leg.K) : 0;

/** Flow across a conductance for a head difference, in its direction. */
const across = (c: number, dh: number) =>
  Math.sign(dh) * c * Math.sqrt(Math.abs(dh));

export interface TeeInputs {
  /** The mains' head, m, and the most it will give, m³/s. */
  mainsHead: number;
  mainsCap: number;
  /** The tank's head at the tee, m (its water's surface above the drain's end). */
  tankHead: number;
  /** Each leg's conductance (0 shut). */
  fill: number;
  tank: number;
  drain: number;
}

export interface TeeFlows {
  /** The tee's head, m. */
  head: number;
  /** From the mains, into the tank (+ in, − out), down the drain; m³/s. */
  fromMains: number;
  intoTank: number;
  toDrain: number;
}

/**
 * Balance the tee: its head is where the mains' inflow equals the tank's
 * and the drain's outflows. The imbalance falls as the head rises, so a
 * bisection finds it.
 */
export function solveTee(i: TeeInputs): TeeFlows {
  const flows = (h: number) => {
    const fromMains = Math.min(
      i.mainsCap,
      Math.max(0, across(i.fill, i.mainsHead - h)),
    );
    const intoTank = across(i.tank, h - i.tankHead);
    const toDrain = Math.max(0, across(i.drain, h));
    return { head: h, fromMains, intoTank, toDrain };
  };
  const imbalance = (h: number) => {
    const f = flows(h);
    return f.fromMains - f.intoTank - f.toDrain;
  };
  let lo = Math.min(0, i.tankHead);
  let hi = Math.max(i.mainsHead, i.tankHead) + 1;
  // A shut-off tee (nothing joined but one leg) carries nothing.
  if (i.fill + i.tank + i.drain === 0)
    return { head: 0, fromMains: 0, intoTank: 0, toDrain: 0 };
  for (let k = 0; k < 80; k++) {
    const mid = (lo + hi) / 2;
    if (imbalance(mid) > 0) lo = mid;
    else hi = mid;
  }
  return flows((lo + hi) / 2);
}

export interface OnePortTank {
  /** Its plan area inside, m², and its depth full, m. */
  area: number;
  depth: number;
  /** Its inside floor above the drain's open end, m. */
  floorAbove: number;
}

export interface TankTeeState {
  /** Its level, 0 to 1. */
  level: number;
  /** Totals, m³: from the mains, down the drain, spilled from its top. */
  fromMains: number;
  drained: number;
  spilled: number;
}

/**
 * Step the tank and its tee `dt` seconds, in small steps so the flows
 * follow the level. Filled past full, the rest spills from its top
 * opening; emptied, it can give no more.
 */
export function stepTankTee(
  tank: OnePortTank,
  legs: { fill: Leg; tank: Leg; drain: Leg },
  open: { fill: boolean; drain: boolean; tank?: boolean },
  mains: { head: number; cap: number },
  s: TankTeeState,
  dt: number,
): TankTeeState & { flows: TeeFlows } {
  const volume = tank.area * tank.depth;
  let { level, fromMains, drained, spilled } = s;
  let last: TeeFlows = { head: 0, fromMains: 0, intoTank: 0, toDrain: 0 };
  const steps = Math.max(1, Math.ceil(dt / 0.25));
  const h = dt / steps;
  for (let k = 0; k < steps; k++) {
    const tankHead = tank.floorAbove + level * tank.depth;
    // An empty tank gives nothing back through its port.
    const empty = level <= 0;
    last = solveTee({
      mainsHead: mains.head,
      mainsCap: mains.cap,
      tankHead,
      fill: conductance(legs.fill, open.fill),
      tank: conductance(legs.tank, open.tank ?? true),
      drain: conductance(legs.drain, open.drain),
    });
    if (empty && last.intoTank < 0)
      last = solveTee({
        mainsHead: mains.head,
        mainsCap: mains.cap,
        tankHead,
        fill: conductance(legs.fill, open.fill),
        tank: 0,
        drain: conductance(legs.drain, open.drain),
      });
    fromMains += last.fromMains * h;
    drained += last.toDrain * h;
    let stored = level * volume + last.intoTank * h;
    if (stored > volume) {
      spilled += stored - volume;
      stored = volume;
    }
    if (stored < 0) {
      // What it had left went out; the drain took no more than that.
      drained += stored;
      stored = 0;
    }
    level = stored / volume;
  }
  return { level, fromMains, drained, spilled, flows: last };
}
