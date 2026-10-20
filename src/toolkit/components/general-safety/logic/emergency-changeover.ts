/**
 * When a self-contained emergency luminaire changes over to its battery.
 * It must be on its mains supply at 85 % of rated voltage and above, and
 * on its battery by the time the supply has fallen to 60 % (EN 60598-2-22;
 * the 60 % is not confirmed from the standard's own text, see
 * `doc/research/emergency-lighting-parts.md`). Each fitting changes over
 * somewhere between, at a threshold of its own, so a sag lights some of a
 * room's emergency lights and not others; it changes back once the supply
 * has stood a little above its threshold for half a second. Pure logic.
 */

/** The window the changeover threshold lies in, fractions of rated. */
export const CHANGEOVER_LOWEST = 0.62;
export const CHANGEOVER_HIGHEST = 0.78;
/** How far above its threshold the supply must come back... */
export const CHANGEOVER_HYSTERESIS = 0.07;
/** ...and for how long, seconds, before it goes back to charging. */
export const CHANGEOVER_RETURN_SECONDS = 0.5;

/**
 * One fitting's changeover. `step` advances it `dt` seconds on a supply of
 * `volts` (a fraction of rated, 0 when its supply is cut) and says whether
 * it is on its battery, lit.
 */
export function createChangeover(seed = 0) {
  const spread = (((Math.sin(seed * 91.7 + 12.3) * 24634.6345) % 1) + 1) % 1;
  const threshold =
    CHANGEOVER_LOWEST + spread * (CHANGEOVER_HIGHEST - CHANGEOVER_LOWEST);
  let battery = false;
  let restored = 0;
  return {
    threshold,
    step(dt: number, volts: number) {
      if (volts < threshold) {
        battery = true;
        restored = 0;
      } else if (battery) {
        restored =
          volts >= threshold + CHANGEOVER_HYSTERESIS ? restored + dt : 0;
        if (restored >= CHANGEOVER_RETURN_SECONDS) battery = false;
      }
      return battery;
    },
    get battery() {
      return battery;
    },
  };
}
