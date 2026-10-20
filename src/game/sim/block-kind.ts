/**
 * How a kind of block works, after the Functional Mock-up Interface (FMI,
 * the industry's standard for packaging one simulation model to be driven
 * by another): a block declares its inputs, outputs and parameters, keeps
 * its own state, and is advanced by one step function. Nothing outside it
 * sees its state, only its outputs: a boiler's controller, burner and
 * timers are its own business; the plant sees its flow temperature, its
 * heat, whether it is firing and any fault. Pure.
 *
 * **Sleeping.** Most of the time most of the plant is steady: a boiler at
 * a steady firing rate, a pump running, a heat load settled. A block that
 * finds itself steady may say so, returning how long it will stay so and
 * what would disturb it: a tolerance on each input it may drift by, and
 * limits it must stay within. Until one of those happens, the system
 * (`system.ts`) does not step it, and its outputs stand as they were. A
 * step that is scheduled (a purge ending) sets the time it wakes. This is
 * discrete-event simulation's idea, and FMI's event indicators': spend
 * effort only where something changes. A block that does not sleep is
 * stepped every tick.
 *
 * **Direct feedthrough.** Some outputs depend on the block's present
 * inputs, not only its state: water leaving a boiler is the water arriving
 * plus the heat put in, so even a boiler that is off passes its return
 * through as its flow. A kind with such outputs gives `read`, a cheap sum
 * of its outputs from its state and its present inputs, which the system
 * evaluates every tick, asleep or not (FMI's direct feedthrough). Sleep
 * then skips only the costly part, the state's update: the controller's
 * logic and dynamics, never the flow of values through the block.
 * Without it, a sleeping block's stale output can fool the next one into
 * thinking itself settled, and a loop of them stalls.
 *
 * State, parameters, inputs and outputs are plain data, so the whole
 * system saves as it stands.
 */

/** A value crossing a port: a number (with a unit), a flag or a label. */
export type PortValue = number | boolean | string | null;
export type PortValues = Record<string, PortValue>;

/** A port's declaration: its name and unit, for listing and checking. */
export interface PortSpec {
  name: string;
  unit?: string;
  /** What it is, in a few words. */
  about?: string;
}

/** What may wake a sleeping block. */
export interface Sleep {
  /** Stay asleep until this time, seconds (Infinity: until disturbed). */
  until: number;
  /** For each input, how far it may drift from its value now (0: not at all). */
  hold: Record<string, number>;
  /** For each numeric input, the range it must stay within. */
  within?: Record<string, readonly [number, number]>;
}

export interface StepResult<S> {
  state: S;
  outputs: PortValues;
  /** If the block is now steady: what would disturb it. */
  sleep?: Sleep;
}

export interface BlockKind<P extends object = object, S = unknown> {
  kind: string;
  inputs: readonly PortSpec[];
  outputs: readonly PortSpec[];
  /** Its parameters' defaults: fixed for a block once made. */
  params: P;
  init(params: P): S;
  /**
   * Whether it may stay asleep, given its present inputs: for a kind whose
   * promise is more than its inputs' tolerances (a block made of blocks,
   * whose parts may be disturbed by each other). Without it, the system
   * checks the promise it gave (`undisturbed`).
   */
  stillAsleep?(params: P, state: S, inputs: PortValues, t: number): boolean;
  /** Its outputs from its state and its present inputs, if any pass straight through. */
  read?(params: P, state: S, inputs: PortValues, t: number): PortValues;
  /**
   * Advance by `dt` seconds, to time `t`, given what is at its inputs.
   * Woken after a sleep, a block is stepped twice: over the time it slept
   * with the inputs it was promised, then over the last tick (`tick`, the
   * system's own step) with the inputs that woke it.
   */
  step(
    params: P,
    state: S,
    inputs: PortValues,
    dt: number,
    t: number,
    tick: number,
  ): StepResult<S>;
}

/** Whether `inputs` have stayed inside what `sleep` allows, against `at` (their values when it slept). */
export function undisturbed(
  sleep: Sleep,
  at: PortValues,
  inputs: PortValues,
  t: number,
) {
  if (t >= sleep.until) return false;
  for (const [name, tolerance] of Object.entries(sleep.hold)) {
    const was = at[name],
      now = inputs[name];
    if (typeof was === 'number' && typeof now === 'number') {
      if (Math.abs(now - was) > tolerance) return false;
    } else if (was !== now) return false;
  }
  for (const [name, [min, max]] of Object.entries(sleep.within ?? {})) {
    const now = inputs[name];
    // An input not connected (null) has no range to leave.
    if (now === null || now === undefined) continue;
    if (typeof now !== 'number' || now < min || now > max) return false;
  }
  return true;
}
