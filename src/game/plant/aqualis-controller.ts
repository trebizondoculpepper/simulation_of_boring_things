import {
  CHANNEL_IDS,
  CHANNELS,
  type AqualisReadings,
  type AqualisSettings,
  type ChannelFeedback,
  type ChannelId,
  type ChannelPorts,
  type ChannelStatus,
  type ChannelView,
  type Inhibit,
  type SampleStatus,
  type Selector,
  type Target,
} from './aqualis-types';
import { CONTROLLER } from './water-treatment';

/**
 * The Aqualis cabinet's water controller (mission 114,
 * `doc/plans/114/README.md`): readings, the sample's health, the HAND · OFF
 * · AUTO knob, its control ports' feedback, its settings and HAND's demands
 * in; a demand on each port, each channel's view for the pump status
 * screen, and why it is not dosing (its inhibit) out. Pure: it could serve
 * another maker's cabinet.
 *
 * AUTO, after the world's unseen controller (`water-treatment.ts`
 * `CONTROLLER`, tuned on the chemistry bench):
 *
 * - **Free chlorine**: PI, its proportional band 0.5 mg/l and integral 6 h
 *   at a three-hour turnover, locked out with pH more than 0.4 from its set
 *   point (DEPOLOX's switch-off range). Its output u (the bench's
 *   `(error + integral) / band`) is a dose rate: u = 1 is the rate that
 *   would lift the entered volume by one band in `CHLORINE_CORRECTION_HOURS`, so a
 *   bigger pool doses proportionally more, and a wrongly entered volume
 *   mis-doses. The entered turnover (volume ÷ filtration rate) is the loop's
 *   dead time, so the integral time is stretched with it (a slow loop is
 *   integrated slowly, or it overshoots). The integral is bounded (`INTEGRAL_REACH`),
 *   held outside AUTO, while inhibited, locked out, with chlorine's
 *   channel offline or unconnected, inside the dead band, and while the
 *   demand is pinned at 1 (anti-windup).
 * - **pH**: P, downward only (acid and CO₂ both only lower it), full scale
 *   0.3 above its set point, the full-scale rate `ACID_G_PER_M3` of HCl per
 *   cubic metre of the entered volume an hour. **Sharing**: CO₂ first, up to
 *   its valve's most, and acid for the remainder. CO₂ lowers pH without
 *   eating the alkalinity (acid destroys it), so it is the better base
 *   load, and acid, the stronger and quicker, trims the peaks. CO₂'s share
 *   is in HCl's acid-equivalent: about mole for mole at pool pH (each adds
 *   one carbonic acid; HCl also removes a bicarbonate, which matters little
 *   while carbonic acid is a tenth of the bicarbonate), so 44.01 / 36.46 g
 *   of CO₂ for each gram of HCl. While CO₂'s channel is not online (or
 *   unconnected), acid takes the whole demand; CO₂ still shows what it is
 *   being asked for.
 * - **Dead band**: inside it a reading's error counts as nought, so the
 *   correction stops (pH's demand falls to nought; chlorine's to the steady
 *   dose its integral has learnt, which is what holds it there against the
 *   bathers). It reaches a quarter of the way from the set point to each
 *   edge of the target's band.
 *
 * HAND passes the touch screen's demands through; OFF doses nothing. Sample
 * flow lost for longer than `SAMPLE_LOSS_DELAY` stops every demand, in HAND
 * too (dosing into a stopped loop is how acid meets hypochlorite). With no
 * readings yet, AUTO doses nothing. A First Aid programme may pause every
 * output (`pause`, the 'first-aid-pause' inhibit) or forbid hypochlorite
 * (`noHypochlorite`: its demand nought, its integral held). Demands are
 * capped at 1.
 */

/**
 * How far the integral may climb, in bands: far enough for the steady dose
 * it learns to reach several times the full-scale rate, since a busy pool's
 * demand (the rig's busy session: about 1.25 g/m³ an hour) is well above
 * the one-band-an-hour correction. Its winding up is still stopped by the
 * pump's own limit (`pinned`).
 */
export const INTEGRAL_REACH = 6;
/**
 * Chlorine's correction time, h: u = 1 lifts the entered volume one band in
 * a quarter of an hour, so a 0.5 mg/l shortfall runs a pump sized for its
 * pool (the rig's 2 l/h for 150 m³, about 280 g/h) near flat out. At an
 * hour the proportional part was too timid to hold a busy session.
 */
export const CHLORINE_CORRECTION_HOURS = 0.25;
/** The correction time behind the full-scale rates, h. */
export const CORRECTION_HOURS = 1;
/** The turnover the bench's integral time was tuned at, h. */
export const REFERENCE_TURNOVER_HOURS = 3;
/** HCl at pH's full scale, g per m³ of the entered volume an hour: 750 g/h (about 7.2 l/h of 10 %) for 500 m³, the bench's acid pump. */
export const ACID_G_PER_M3 = 1.5;
/** Grams of CO₂ that do a gram of HCl's work on the pH. */
export const CO2_PER_HCL = 44.01 / 36.46;
/** How far the dead band reaches toward each edge of its target's band. */
export const DEAD_BAND_SHARE = 0.25;
/** Sample flow lost this long, s, stops the dosing. */
export const SAMPLE_LOSS_DELAY = 300;
/** A channel asked for more than this… */
export const NOT_DELIVERING_DEMAND = 0.1;
/** …and delivering nothing this long, s, is not delivering. */
export const NOT_DELIVERING_AFTER = 180;

export interface ControllerState {
  /** Chlorine's integral, mg/l, bounded below by its band and above by `INTEGRAL_REACH` bands. */
  integral: number;
  /** Each channel's demand sent last step, 0 to 1. */
  demands: Record<ChannelId, number>;
  /** Each channel's seconds asked for a dose and delivering none. */
  starved: Record<ChannelId, number>;
}

export interface ControllerInputs {
  readings: AqualisReadings | null;
  sample: SampleStatus;
  selector: Selector;
  ports: ChannelPorts;
  settings: AqualisSettings;
  /** HAND's demands from the touch screen, 0 to 1. */
  hand: Record<ChannelId, number>;
  /** A First Aid dosing pause: every output held off (`firstAidHolds`). */
  pause?: boolean;
  /** A First Aid programme forbidding hypochlorite (`firstAidNoHypochlorite`): its demand held at nought. */
  noHypochlorite?: boolean;
}

export interface ControllerOutput {
  /** What goes to each port, 0 to 1 of its most: 0 unconnected or inhibited. */
  demands: Record<ChannelId, number>;
  channels: Record<ChannelId, ChannelView>;
  inhibit: Inhibit | null;
  /** Chlorine dosing stopped by pH out of range (AUTO). */
  lockout: boolean;
}

const perChannel = <T>(f: (id: ChannelId) => T): Record<ChannelId, T> =>
  Object.fromEntries(CHANNEL_IDS.map((id) => [id, f(id)])) as Record<
    ChannelId,
    T
  >;

const clamp = (x: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, x));
const clamp01 = (x: number) => clamp(x, 0, 1);

export function newController(): ControllerState {
  return {
    integral: 0,
    demands: perChannel(() => 0),
    starved: perChannel(() => 0),
  };
}

/** A reading's error from its set point (set − value), less its dead band: nought inside it. */
export function deadBandError(value: number, t: Target): number {
  const e = t.set - value;
  const reach =
    DEAD_BAND_SHARE * (e > 0 ? Math.max(0, t.set - t.low) : t.high - t.set);
  const beyond = Math.max(0, Math.abs(e) - Math.max(0, reach));
  return Math.sign(e) * beyond;
}

/** A channel's status from its feedback and how long it has been starved. */
export function channelStatus(
  f: ChannelFeedback | null,
  starved: number,
): ChannelStatus {
  if (!f) return { kind: 'unconnected' };
  const off = (
    reason: Exclude<
      ChannelStatus,
      { kind: 'unconnected' | 'online' }
    >['reason'],
  ) => ({ kind: 'offline', reason, fault: null }) as ChannelStatus;
  if (f.mode === 'off') return off('switched-off');
  if (f.mode === 'manual') return off('manual');
  if (!f.powered) return off('no-power');
  if (f.fault) return { kind: 'offline', reason: 'fault', fault: f.fault };
  if (starved >= NOT_DELIVERING_AFTER) return off('not-delivering');
  return { kind: 'online' };
}

/** A channel with no reason of its own not to take its demand (the starved check aside). */
const takesDemand = (f: ChannelFeedback | null) =>
  !!f && f.mode === 'remote' && f.powered && !f.fault;

/** g/h of the channel's chemical to a 0-to-1 demand on its port. */
const toDemand = (id: ChannelId, gh: number, f: ChannelFeedback | null) => {
  if (!f || f.most <= 0) return 0;
  return clamp01(gh / (CHANNELS[id].gramsPerUnit * f.most));
};

/** The controller `dt` seconds on. */
export function stepController(
  s: ControllerState,
  inp: ControllerInputs,
  dt: number,
): { state: ControllerState; out: ControllerOutput } {
  const { ports, settings, readings } = inp;

  // Who is starved: asked for a dose last step, taking demand, delivering nothing.
  const starved = perChannel((id) => {
    const f = ports[id];
    return takesDemand(f) &&
      s.demands[id] > NOT_DELIVERING_DEMAND &&
      f!.delivering <= 0
      ? s.starved[id] + dt
      : 0;
  });
  const status = perChannel((id) => channelStatus(ports[id], starved[id]));
  const online = (id: ChannelId) => status[id].kind === 'online';

  const inhibit: Inhibit | null =
    inp.selector === 'off'
      ? 'selector-off'
      : !inp.sample.flowing && inp.sample.lostFor > SAMPLE_LOSS_DELAY
        ? 'sample-flow-lost'
        : inp.pause
          ? 'first-aid-pause'
          : inp.selector === 'auto' && !readings
            ? 'no-readings'
            : null;

  let integral = s.integral;
  let lockout = false;
  let wanted: Record<ChannelId, number>;

  if (inhibit) {
    wanted = perChannel(() => 0);
  } else if (inp.selector === 'hand') {
    wanted = perChannel((id) => (ports[id] ? clamp01(inp.hand[id] ?? 0) : 0));
  } else {
    const r = readings!;
    const { volumeM3, flowM3h } = settings.dynamics;
    const volume = Math.max(0, volumeM3);
    const turnover = flowM3h > 0 ? volume / flowM3h : REFERENCE_TURNOVER_HOURS;
    const integralHours =
      CONTROLLER.chlorineIntegral *
      Math.max(0.25, turnover / REFERENCE_TURNOVER_HOURS);

    // Chlorine: PI, g/h of available chlorine (mg/l is g/m³).
    const band = CONTROLLER.chlorineBand;
    const phT = settings.targets.ph;
    lockout = Math.abs(r.ph - phT.set) > CONTROLLER.pHLockout;
    const error = deadBandError(r.freeChlorine, settings.targets.freeChlorine);
    const u = (error + s.integral) / band;
    const fullCl = (volume * band) / CHLORINE_CORRECTION_HOURS;
    const hypoDemand = lockout
      ? 0
      : toDemand('hypochlorite', u * fullCl, ports.hypochlorite);
    const pinned =
      (hypoDemand >= 1 && error > 0) ||
      (hypoDemand <= 0 && error < 0 && u <= 0);
    if (
      !lockout &&
      !inp.noHypochlorite &&
      online('hypochlorite') &&
      error !== 0 &&
      !pinned
    ) {
      integral = clamp(
        s.integral + (error * dt) / 3600 / integralHours,
        -band,
        band * INTEGRAL_REACH,
      );
    }

    // pH: P, downward only, g/h of HCl, CO₂ first.
    const above = -deadBandError(r.ph, phT);
    const hcl =
      (clamp01(above / CONTROLLER.pHBand) * volume * ACID_G_PER_M3) /
      CORRECTION_HOURS;
    const co2Most = ports.co2 ? ports.co2.most : 0;
    const co2Gh = Math.min(hcl * CO2_PER_HCL, Math.max(0, co2Most));
    const acidGh = Math.max(0, hcl - (online('co2') ? co2Gh / CO2_PER_HCL : 0));
    wanted = {
      hypochlorite: hypoDemand,
      acid: toDemand('acid', acidGh, ports.acid),
      co2: toDemand('co2', co2Gh, ports.co2),
    };
  }

  if (inp.noHypochlorite) wanted = { ...wanted, hypochlorite: 0 };

  const channels = perChannel((id): ChannelView => {
    const f = ports[id];
    const demand = f ? wanted[id] : 0;
    return {
      id,
      status: status[id],
      demand,
      demandRate: f ? demand * f.most : 0,
      delivering: f ? f.delivering : 0,
    };
  });
  const demands = perChannel((id) => channels[id].demand);
  return {
    state: { integral, demands, starved },
    out: { demands, channels, inhibit, lockout },
  };
}
