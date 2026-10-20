/**
 * A soft starter's motor speed and lamps (after Allen-Bradley's SMC PLUS):
 * started, it ramps the motor up from rest over `rampUp` seconds, its bar
 * of ten yellow LEDs filling block by block, and lights UP TO SPEED only
 * once it is there; stopped, the motor coasts down; in a fault it runs
 * down to a stop while the FAULT lamp flashes red. Pure logic.
 */

export interface SoftStarterLamps {
  /** How far up to speed, 0 (at rest) to 1. */
  speed: number;
  /** How many of the bar's ten yellow LEDs are lit. */
  blocks: number;
  run: boolean;
  upToSpeed: boolean;
  fault: boolean;
  /** Motor current, amps: a starting current while ramping, settling. */
  amps: number;
}

export function createSoftStarter({
  rampUp = 4,
  rampDown = 2.5,
  /** Seconds a flash of the FAULT lamp takes, on and off. */
  flash = 0.8,
  /** Running current once up to speed, amps. */
  fullLoad = 11.6,
  /** The current as a start begins, and how much it climbs over the ramp. */
  startAmps = 6,
  rampAmps = 30,
} = {}) {
  let speed = 0;
  let clock = 0;
  return {
    /**
     * Step `delta` seconds: `on` if it is powered and told to run, `fault`
     * if it has faulted.
     */
    step(delta: number, on: boolean, fault: boolean): SoftStarterLamps {
      clock += delta;
      if (on && !fault) speed = Math.min(1, speed + delta / rampUp);
      else speed = Math.max(0, speed - delta / rampDown);
      const up = on && !fault && speed >= 1;
      return {
        speed,
        blocks: Math.floor(speed * 10 + 1e-9),
        run: on && !fault,
        upToSpeed: up,
        fault: fault && clock % flash < flash / 2,
        amps: up
          ? fullLoad + Math.sin(clock * 1.7) * 0.4
          : on && !fault
            ? startAmps + rampAmps * speed
            : fullLoad * speed,
      };
    },
  };
}
