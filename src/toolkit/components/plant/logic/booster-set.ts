/**
 * The make-up booster set and its controller, after the Grundfos Hydro
 * Multi-E (two CRE vertical multistage pumps, duty and standby, on a
 * common base with suction and discharge manifolds, a diaphragm vessel
 * and a control unit): its dimensions, and what its controller shows of
 * the wet hall's state (`src/game/plant/wet-hall.ts`). Pure.
 */

/** The set's footprint and its manifolds, metres, in its own frame (front +z). */
export const BOOSTER = {
  w: 1.6,
  d: 1.0,
  h: 1.5,
  /** Both manifolds run along x at this height: suction across the front, discharge across the back. */
  manifoldY: 0.25,
  suctionZ: 0.3,
  dischargeZ: -0.32,
  /** The two pumps, along x, between the manifolds. */
  pumpX: [-0.3, 0.2] as const,
  pumpZ: 0,
} as const;

/**
 * The make-up meter's run: its stubs this far either side of its middle,
 * short, so its pipework is easily routed; its run at the booster set's
 * manifolds' height, so the meter can stand on the booster's discharge
 * line, the pipe between them straight (the owner, 2026-10-26).
 */
export const METER = { half: 0.3, y: BOOSTER.manifoldY } as const;

/** The make-up water meter set's run (`createWaterMeter`): its ends either side, its height. */

/**
 * Our own make-up flowmeter (the owner, 2026-10-26: the meter is the
 * utility's, read by its dial and not wired into): an electromagnetic
 * flowmeter on its own short run straight after the meter, in line with
 * it, its converter's cable gland on top of its head, so far over its run.
 */
export const FLOWMETER = { half: 0.3, od: 0.076, gland: 0.29 } as const;

/**
 * The break tank's outlet, on its east end (the owner, 2026-10-26): at
 * the booster set's suction manifold's height, and this far in from its
 * front, so the booster's suction lines up with it.
 */
export const BREAK_TANK_OUTLET = { y: BOOSTER.manifoldY, in: 0.5 } as const;

/**
 * The gap kept between the break tank's outlet and the booster set's
 * suction for a flowmeter on the tank's outlet side, planned (the owner,
 * 2026-10-26): its run and a short length either side.
 */
export const OUTLET_METER_GAP = 2 * FLOWMETER.half + 2 * 0.3;

/** The make-up main's working pressure, bar, while the set holds it. */
export const SET_PRESSURE = 4.0;

/** What the controller needs to know. */
export interface BoosterReading {
  /** Whether it has power. */
  powered: boolean;
  /** Tripped on the break tank's low level, latched. */
  tripped: boolean;
  /** Delivering water now. */
  running: boolean;
  /** The make-up it is delivering, m³/h. */
  flow: number;
  /** The break tank's fill, 0–1. */
  breakTank: number;
}

/** The discharge pressure, bar: held while the set is in service; the static head once it is not. */
export function boosterPressure(r: BoosterReading): number {
  if (!r.powered || r.tripped) return 0.4;
  return SET_PRESSURE;
}

/** Its lamps: POWER, PUMP 1 RUN, PUMP 2 RUN (the standby, never with the duty), LOW WATER. */
export function boosterLamps(r: BoosterReading) {
  return {
    power: r.powered,
    run1: r.powered && !r.tripped && r.running,
    run2: false,
    lowWater: r.tripped,
  };
}

/** The controller's two-line display, sixteen characters each. */
export function boosterDisplay(r: BoosterReading): [string, string] {
  const pad = (s: string) => s.slice(0, 16).padEnd(16);
  if (!r.powered) return [pad(''), pad('')];
  const bar = boosterPressure(r).toFixed(1);
  if (r.tripped)
    return [
      pad('ALARM: LOW WATER'),
      pad(`TANK ${Math.round(r.breakTank * 100)}% RESET`),
    ];
  return [
    pad(`PRESS ${bar.padStart(4)} BAR`),
    pad(r.running ? `P1 RUN ${r.flow.toFixed(1).padStart(4)}M3/H` : 'STANDBY'),
  ];
}
