/**
 * How an LED luminaire's driver turns its supply into light. A driver is a
 * small switched-mode power supply: it holds the light steady while the
 * supply is near its nominal voltage, rides through shallow dips, and when
 * the supply sags too far it can no longer deliver its current, so the
 * light dims and follows every wobble of the supply (the flicker seen when
 * a big motor runs on the same supply). Below its drop-out voltage it
 * stops altogether, and starts again only once the supply has recovered
 * for a moment. No two drivers are quite alike, so in a sagging supply the
 * fittings of a room drop out and come back unevenly. Pure logic.
 */

/** Down to this fraction of nominal the driver holds its light steady. */
export const LED_REGULATES = 0.88;
/** Below this it stops. */
export const LED_DROP_OUT = 0.6;
/** Its light just above drop-out, a fraction of full. */
export const LED_FLOOR = 0.35;
/** It starts again once the supply is back above this... */
export const LED_RESTART = 0.7;
/** ...for this long, seconds. */
export const LED_RESTART_SECONDS = 0.3;
/** How far one driver's thresholds may differ from another's. */
const TOLERANCE = 0.04;

/**
 * One driver. `seed` makes it a little unlike the others (its thresholds
 * differ by up to `TOLERANCE`). `step` advances it by `dt` seconds on a
 * supply of `volts` (a fraction of nominal; 0 when switched off) and
 * gives its light, 0 to 1.
 */
export function createLedDriver(seed = 0) {
  const spread =
    (((Math.sin(seed * 12.9898 + 78.233) * 43758.5453) % 1) + 1) % 1;
  const offset = (spread * 2 - 1) * TOLERANCE;
  const regulates = LED_REGULATES + offset;
  const dropOut = LED_DROP_OUT + offset;
  const restart = LED_RESTART + offset;
  let running = true;
  let recovered = LED_RESTART_SECONDS;
  return {
    step(dt: number, volts: number) {
      if (running && volts < dropOut) {
        running = false;
        recovered = 0;
      }
      if (!running) {
        recovered = volts >= restart ? recovered + dt : 0;
        if (recovered < LED_RESTART_SECONDS) return 0;
        running = true;
      }
      if (volts >= regulates) return 1;
      return (
        LED_FLOOR +
        ((1 - LED_FLOOR) * (volts - dropOut)) / (regulates - dropOut)
      );
    },
    /** Whether it is running (not dropped out). */
    get running() {
      return running;
    },
  };
}
