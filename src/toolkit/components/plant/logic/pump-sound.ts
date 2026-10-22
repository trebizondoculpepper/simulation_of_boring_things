/**
 * What a centrifugal pump set sounds like, worked out from what it is:
 * its motor's speed from the mains and its poles, the blade-pass tone of
 * its impeller, the hum of its motor's iron, and how long it takes to run
 * up and to coast down. Pure; hertz and seconds. Its sound is drawn from
 * these (`views/pump-sound.ts`).
 *
 * UK mains is 50 Hz. A motor's iron hums at twice the supply (100 Hz), for
 * as long as it is energised, whatever its speed. An induction motor
 * turns at its synchronous speed less a few per cent of slip: a four-pole
 * motor, as a big pool pump has, 1500 rpm less slip, about 1450 rpm,
 * 24 Hz, a deep rumble (a two-pole one twice that). Each vane of the
 * impeller passing the volute's cutwater gives the blade-pass tone, vanes
 * × shaft speed: about 145 Hz for six vanes, the pump's own note. Over these, the
 * motor's cooling fan and the water's flow make broadband noise. A big
 * pump on a soft starter runs up in a few seconds and, with its water's
 * inertia behind it, coasts down for longer.
 */

export interface PumpSet {
  /** The supply's frequency, Hz (50 in the UK). */
  mains: number;
  /** The motor's poles: 2 for about 3000 rpm at 50 Hz, 4 for about 1500. */
  poles: number;
  /** The motor's slip at full load, a share of synchronous speed. */
  slip: number;
  /** The impeller's vanes. */
  vanes: number;
  /** The motor's rating, kW: the bigger, the louder. */
  kW: number;
  /** Seconds to run up to speed, and to coast down to rest. */
  runUp: number;
  coastDown: number;
}

/**
 * A pool's circulation pump, after a Grundfos NK 150-315 end-suction set:
 * 30 kW, four-pole, on a soft starter.
 */
export const CIRCULATION_PUMP: PumpSet = {
  mains: 50,
  poles: 4,
  slip: 0.035,
  vanes: 6,
  kW: 30,
  runUp: 3,
  coastDown: 9,
};

/** Its shaft's speed at full speed, Hz. */
export const shaftHz = (p: PumpSet) => ((2 * p.mains) / p.poles) * (1 - p.slip);

/** Its impeller's blade-pass tone at full speed, Hz. */
export const bladePassHz = (p: PumpSet) => p.vanes * shaftHz(p);

/** Its motor's magnetic hum, Hz: twice the supply, while energised. */
export const humHz = (p: PumpSet) => 2 * p.mains;

/**
 * How loud it is, 0 to 1, from its rating: a 30 kW set about 0.14, the
 * level a held sound is mixed at; a small one quieter, never silent.
 */
export const pumpLevel = (p: PumpSet) =>
  Math.min(0.2, 0.05 + 0.03 * Math.log2(1 + p.kW / 4));

/**
 * Its speed as a share of full, `t` seconds after it was started (or,
 * stopping, after it was stopped): run up over `runUp` along a soft
 * starter's ramp; coast down over `coastDown`, quickly at first, as a
 * machine slowed by its load does.
 */
export function pumpSpeed(p: PumpSet, t: number, running: boolean) {
  if (running) {
    const k = Math.min(1, Math.max(0, t / p.runUp));
    return k * k * (3 - 2 * k);
  }
  const k = Math.min(1, Math.max(0, t / p.coastDown));
  return (1 - k) * (1 - k);
}
