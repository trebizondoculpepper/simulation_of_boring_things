/**
 * A diaphragm metering pump's dosing head, stroke by stroke (prompt 102):
 * the behaviour every diaphragm pump in the plant shares, whatever drives
 * it (a solenoid, a stepper, a motor and its stroke dial). Pure.
 *
 * Each stroke must first compress the gas in the head from suction
 * (about 1 bar absolute) to the discharge pressure before the outlet
 * valve lifts: `gas × (1 − 1/P)` of the stroke, P absolute. What is left
 * is delivered, carrying gas out in proportion to the head's. When the gas
 * takes the whole stroke the pump is gas-locked: it strokes and delivers
 * nothing. Hypochlorite gives off oxygen as it decomposes, in the head as
 * it stands and from what is drawn. With the bleed (priming) valve open
 * the stroke goes to the return at no pressure, gas first; a degassing
 * head lets a little gas out at every stroke through an orifice to the
 * return, at a little of the stroke's liquid. Against a closed discharge
 * the relief valve lifts and the stroke returns.
 *
 * Sizes scale with the head: a head holds `deadMl` of liquid; its gas
 * rates are per ml of that, and a degassing head's vent per ml of stroke,
 * so a small solenoid head and a motor pump's large one behave alike. The
 * rates are the game's own, chosen so a standard head left standing a
 * night locks up and a degassing head clears that in a few strokes.
 */

export type HeadKind = 'standard' | 'degassing';

export interface HeadSpec {
  /** A full stroke's volume, ml, and the liquid the head keeps, ml. */
  strokeMl: number;
  deadMl: number;
  /** Where its relief valve lifts, bar. */
  reliefBar: number;
}

/** Gas the head's hypochlorite gives off standing, ml an hour per ml of head. */
export const IDLE_GAS_PER_ML_HOUR = 0.4 / 6;
/** Gas that comes out of the liquid drawn, ml per ml. */
export const DRAWN_GAS_PER_ML = 0.002;
/** A degassing head's orifice: gas vented per ml of stroke, and the liquid share it costs. */
export const DEGAS_PER_STROKE_ML = 0.09;
export const DEGAS_LIQUID_SHARE = 0.07;
/** Strokes delivering under half before a flow monitor trips. */
export const FLOW_STROKES = 20;
/** A stroke delivering this share of its volume counts as delivering. */
export const FLOW_SHARE = 0.5;

/** One stroke's outcome, ml. */
export interface Stroke {
  delivered: number;
  returned: number;
  gasOut: number;
  /** Whether its outlet valve lifted at all. */
  lifted: boolean;
}

/**
 * One stroke of `volume` ml against `bar`, with `gas` ml in a head of
 * `spec`'s kind `head`.
 */
export function headStroke(
  spec: HeadSpec,
  volume: number,
  gas: number,
  bar: number,
  head: HeadKind,
  bleedOpen: boolean,
): Stroke {
  const vented =
    head === 'degassing'
      ? Math.min(gas, spec.strokeMl * DEGAS_PER_STROKE_ML)
      : 0;
  const bled = head === 'degassing' ? volume * DEGAS_LIQUID_SHARE : 0;
  gas -= vented;
  const stroke = volume - bled;
  if (bleedOpen) {
    const gasOut = Math.min(gas, stroke);
    return {
      delivered: 0,
      returned: stroke - gasOut + bled,
      gasOut: gasOut + vented,
      lifted: true,
    };
  }
  const relief = bar >= spec.reliefBar;
  const absolute = Math.max(1, (relief ? spec.reliefBar : bar) + 1);
  const lift = stroke - gas * (1 - 1 / absolute);
  if (lift <= 0)
    return { delivered: 0, returned: bled, gasOut: vented, lifted: false };
  const gasOut = Math.min(gas, (lift * gas) / (gas + spec.deadMl));
  const liquid = lift - gasOut;
  return relief
    ? {
        delivered: 0,
        returned: liquid + bled,
        gasOut: gasOut + vented,
        lifted: true,
      }
    : {
        delivered: liquid,
        returned: bled,
        gasOut: gasOut + vented,
        lifted: true,
      };
}

/** The head's own state: its gas, its bleed, its flow monitor's count. */
export interface HeadState {
  head: HeadKind;
  gasMl: number;
  bleedOpen: boolean;
  /** Strokes in a row its flow monitor found short. */
  short: number;
}

export interface StrokesRun {
  state: HeadState;
  deliveredMl: number;
  returnedMl: number;
  /** Strokes worked, those delivering, and whether the flow monitor tripped. */
  strokes: number;
  delivering: number;
  tripped: boolean;
}

/** Most strokes worked one by one; any more are worked as their mean. */
const MAX_STROKES = 2000;

/**
 * `count` strokes of `volume` ml against `bar`. A flow monitor (`flow`)
 * trips after `FLOW_STROKES` short strokes in a row, stopping the run; it
 * does not count while the bleed is open (priming).
 */
export function runStrokes(
  spec: HeadSpec,
  s0: HeadState,
  count: number,
  volume: number,
  bar: number,
  flow = true,
): StrokesRun {
  const s = { ...s0 };
  let delivered = 0;
  let returned = 0;
  let delivering = 0;
  let worked = 0;
  let tripped = false;
  for (; worked < Math.min(count, MAX_STROKES); worked++) {
    s.gasMl += volume * DRAWN_GAS_PER_ML;
    const r = headStroke(spec, volume, s.gasMl, bar, s.head, s.bleedOpen);
    s.gasMl = Math.max(0, s.gasMl - r.gasOut);
    delivered += r.delivered;
    returned += r.returned;
    // Priming with its bleed open, its flow monitor is not counting.
    if (s.bleedOpen) continue;
    if (r.delivered >= volume * FLOW_SHARE) {
      delivering++;
      s.short = 0;
    } else if (++s.short >= FLOW_STROKES && flow) {
      tripped = true;
      worked++;
      break;
    }
  }
  if (count > MAX_STROKES && !tripped) {
    const scale = count / MAX_STROKES;
    delivered *= scale;
    returned *= scale;
    delivering = Math.round(delivering * scale);
    worked = count;
  }
  return {
    state: s,
    deliveredMl: delivered,
    returnedMl: returned,
    strokes: worked,
    delivering,
    tripped,
  };
}

/** The head standing `seconds`: its hypochlorite giving off gas. */
export const standHead = (spec: HeadSpec, s: HeadState, seconds: number) => ({
  ...s,
  gasMl: s.gasMl + (IDLE_GAS_PER_ML_HOUR * spec.deadMl * seconds) / 3600,
});

/** Whether a stroke of `volume` now would not lift the outlet valve. */
export const headLocked = (
  spec: HeadSpec,
  s: HeadState,
  volume: number,
  bar: number,
) => !headStroke(spec, volume, s.gasMl, bar, 'standard', s.bleedOpen).lifted;
