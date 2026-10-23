/**
 * A tank emptied by gravity through a pipe to a drain (the owner,
 * 2026-10-23: draining a jacuzzi). What drives the flow is the head: the
 * height of the water's surface above the pipe's open end over the drain.
 * What holds it back is the pipe's losses, as one loss coefficient `K`
 * (its entry, valve, bends, friction along it and its exit), so
 *
 *   h = K · v² / 2g,   Q = A · v = A · √(2 g h / K),
 *
 * and as the tank empties its head falls, and the flow with it: fast at
 * first, slowing to a trickle as the last of it runs out. Pure; metres,
 * cubic metres, seconds.
 */

export const G = 9.81;

export interface DrainTank {
  /** Its plan area inside, m² (its level falls by volume over this). */
  area: number;
  /** Its depth of water when full, m. */
  depth: number;
  /** The height of its floor (where the outlet draws from) above the pipe's open end, m. */
  floorAbove: number;
}

export interface DrainPipe {
  /** Its bore, m. */
  bore: number;
  /** Its whole loss coefficient, entry to exit. */
  K: number;
}

/** The head on the pipe, m, with the tank at `level` (0 to 1). */
export const headAt = (tank: DrainTank, level: number) =>
  Math.max(0, tank.floorAbove + Math.max(0, level) * tank.depth);

/** The flow out, m³/s, with the tank at `level`, through an open valve. */
export function drainFlow(tank: DrainTank, pipe: DrainPipe, level: number) {
  if (level <= 0) return 0;
  const area = (Math.PI * pipe.bore * pipe.bore) / 4;
  return area * Math.sqrt((2 * G * headAt(tank, level)) / pipe.K);
}

/**
 * The tank's level after `dt` seconds draining (`open`), and what went to
 * the drain, m³. Small steps inside a long one, so the flow follows the
 * falling head; the last of the water does not overshoot below empty.
 */
export function stepDrain(
  tank: DrainTank,
  pipe: DrainPipe,
  level: number,
  open: boolean,
  dt: number,
) {
  if (!open || level <= 0 || !(dt > 0))
    return { level: Math.max(0, level), out: 0, flow: 0 };
  let left = level;
  let out = 0;
  const steps = Math.max(1, Math.ceil(dt / 0.25));
  const h = dt / steps;
  for (let k = 0; k < steps && left > 0; k++) {
    const volume = left * tank.area * tank.depth;
    const q = drainFlow(tank, pipe, left);
    const taken = Math.min(volume, q * h);
    out += taken;
    left = (volume - taken) / (tank.area * tank.depth);
    // Below a film, it is empty.
    if (left * tank.depth < 0.0005) {
      out += left * tank.area * tank.depth;
      left = 0;
    }
  }
  return { level: left, out, flow: out / dt };
}

/**
 * The time to empty from `level`, s, from the formula: with the head h =
 * a + L·d (a the floor above the pipe's end, d the depth), dV = −A_t d(h),
 * so T = (A_t / (A_p √(2g/K))) · 2 (√h₀ − √a).
 */
export function timeToEmpty(tank: DrainTank, pipe: DrainPipe, level: number) {
  const a = (Math.PI * pipe.bore * pipe.bore) / 4;
  const k = a * Math.sqrt((2 * G) / pipe.K);
  return (
    (tank.area / k) *
    2 *
    (Math.sqrt(headAt(tank, level)) - Math.sqrt(tank.floorAbove))
  );
}
