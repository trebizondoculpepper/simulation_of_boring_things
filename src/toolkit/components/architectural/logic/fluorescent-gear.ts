/**
 * A fluorescent tube on switch-start control gear (a glow starter and a
 * wire-wound ballast), as in the twin 5 ft battens of a 1990s warehouse,
 * and how it comes to life. Switched on, the starter glows (the tube's ends
 * glow faintly) until it closes and opens again with a click, kicking the
 * tube to strike; the strike may fail, a flash and a tink, and the starter
 * tries again; a healthy tube catches within a few seconds, jumping to most
 * of its light and creeping up to full as it warms. Lit, it holds through
 * shallow dips, but below about 80 % of nominal the arc goes out, and when
 * the supply comes back
 * the whole sequence starts again. An old tube takes longer and flickers;
 * a dud never catches, blinking with its starter clicking until it
 * is switched off. Each tube is a little unlike the others (its seed), so
 * a row of them ripples on unevenly. Pure and deterministic: its chances
 * are drawn per attempt, not per frame, so it runs the same at any frame
 * rate. The figures are in `doc/research/fluorescent-battens.md`.
 */

/**
 * Below this, a lit tube goes out; a fraction of nominal. Each tube's own
 * drop-out lies between this and `TUBE_DROP_OUT_HIGHEST`, higher the older
 * it is (new 0.78 to 0.84, aged up to 0.88).
 */
export const TUBE_DROP_OUT = 0.78;
export const TUBE_DROP_OUT_HIGHEST = 0.89;
/** The starter can strike the tube only with the supply above this. */
export const TUBE_STRIKE = 0.85;
/** Below this the starter cannot even glow: the tube stays dark. */
export const STARTER_DARK = 0.7;
/**
 * How long the starter glows and the cathodes preheat before it opens,
 * seconds (a bench measurement: 0.55 s of glow and 0.4 s of preheat), on
 * a first try...
 */
export const STARTER_GLOW = [0.75, 1.2] as const;
/** ...and before each retry. */
export const STARTER_RETRY = [0.55, 1.0] as const;
/** How long a failed strike's flash lasts, seconds. */
export const FLASH_SECONDS = 0.07;
/**
 * A struck tube jumps at once to most of its light, then creeps up to
 * full as it warms (Philips: two or three minutes to 90 %; shortened here
 * to a minute or so), seconds.
 */
export const RUN_UP = [45, 90] as const;
/** How bright the ends glow while the starter heats them, 0 to 1. */
export const END_GLOW = 0.06;
/** A struck tube's light at the start of its run-up, 0 to 1. */
export const RUN_UP_FROM = 0.75;
/** From this age a tube is a dud: it never catches. */
export const DUD_AGE = 0.92;

export type GearEvent = 'glow' | 'click' | 'flash' | 'strike' | 'lit' | 'out';
type Phase = 'off' | 'glow' | 'flash' | 'runup' | 'lit';

/** A seeded random number generator (mulberry32). */
function random(seed: number) {
  let a = (Math.imul(seed | 0, 0x9e3779b1) ^ 0x6d2b79f5) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const between = (r: () => number, [low, high]: readonly [number, number]) =>
  low + r() * (high - low);

/**
 * One tube and its starter. `age` is 0 (new) to 1 (dead): older tubes
 * glow longer before striking, fail more strikes and run up more slowly;
 * from `DUD_AGE` they hardly ever catch. `step` advances it `dt` seconds on
 * a supply of `volts` (a fraction of nominal, 0 when switched off) and
 * gives its light (0 to 1) and what happened.
 */
export function createFluorescentTube(seed = 0, age = 0.2) {
  const r = random(seed);
  const dud = age >= DUD_AGE;
  /** The chance a strike catches. */
  // A new tube catches about two strikes in three, an old one one in three.
  const catches = dud ? 0 : Math.max(0.2, 0.68 - 0.42 * age);
  const dropOut = TUBE_DROP_OUT + r() * 0.06 + Math.min(1, age) * 0.05;
  const slower = 1 + 1.5 * age;
  let phase: Phase = 'off';
  /** Seconds left in this phase, and the run-up's length. */
  let left = 0;
  let runUp = 1;
  let first = true;
  const begin = (events: GearEvent[]) => {
    phase = 'glow';
    left = between(r, first ? STARTER_GLOW : STARTER_RETRY) * slower;
    first = false;
    events.push('glow');
  };
  return {
    step(dt: number, volts: number): { light: number; events: GearEvent[] } {
      const events: GearEvent[] = [];
      dt = Math.max(0, dt);
      if (volts < dropOut) {
        // Too little to hold the arc: out, and starting again when it can.
        if (phase === 'runup' || phase === 'lit') events.push('out');
        if (volts < STARTER_DARK) {
          // Too little even for the starter to glow: dark until it returns.
          if (volts <= 0.05) first = true;
          phase = 'off';
          return { light: 0, events };
        }
        if (phase !== 'off' && phase !== 'glow') begin(events);
      }
      if (phase === 'off') {
        if (volts < STARTER_DARK) return { light: 0, events };
        begin(events);
      }
      // Advance through as many phases as `dt` covers.
      let time = dt;
      while (time > 0) {
        if (phase === 'lit') break;
        const spend = Math.min(time, left);
        left -= spend;
        time -= spend;
        if (left > 0) break;
        if (phase === 'glow') {
          events.push('click');
          if (volts >= TUBE_STRIKE && r() < catches) {
            phase = 'runup';
            runUp = between(r, RUN_UP) * slower;
            left = runUp;
            events.push('strike');
          } else {
            phase = 'flash';
            left = FLASH_SECONDS;
            events.push('flash');
          }
        } else if (phase === 'flash') begin(events);
        else if (phase === 'runup') {
          phase = 'lit';
          events.push('lit');
        }
      }
      const light =
        phase === 'glow'
          ? END_GLOW
          : phase === 'flash'
            ? 0.7
            : phase === 'runup'
              ? RUN_UP_FROM + (1 - RUN_UP_FROM) * (1 - left / runUp)
              : phase === 'lit'
                ? // A wire-wound ballast passes a sag on: dimmer with the supply.
                  Math.min(1, 1 - (1 - volts) * 1.5)
                : 0;
      return { light: Math.max(0, light), events };
    },
    get phase() {
      return phase;
    },
    get dud() {
      return dud;
    },
  };
}
