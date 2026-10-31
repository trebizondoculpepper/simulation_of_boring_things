import type {
  KeyedDiaphragmState,
  MeteringInputs,
  MeteringKind,
  MeteringPump,
  PeristalticState,
} from '../../toolkit/components/plant/logic/metering-pump';
import type {
  LevelInput,
  MotorPumpState,
} from '../../toolkit/components/plant/logic/motor-dosing-pump';
import type { ChannelFeedback } from './aqualis-types';
import type { DosingPump, PumpState } from './dosing-pumps';

/**
 * The Dr Aqualis Trio's control ports as the world's metering pumps see
 * them (mission 114; the brief's "Its control ports"): each port is a
 * 4–20 mA signal and a release contact out to its pump, and the pump's
 * mode, run and fault wired back. Pure: the adapter between the Trio's
 * shapes (`ChannelFeedback`, a 0-to-1 demand) and the pump family's
 * (`MeteringInputs`, `DosingPump`), honest to each kind
 * (`metering-pump.ts`):
 *
 * | Kind | Remote | Manual | Off | Fault latches | Most |
 * | --- | --- | --- | --- | --- | --- |
 * | `solenoid` (DMX 1602) | its P key at AUTO | P at MANUAL: its ▲ ▼ rate | STOP | flow (gas-lock, its flow monitor): until acknowledged at its keys; level: clears itself as the tank is filled | 2.1 l/h |
 * | `stepper` (DDS 7.5-16) | as the DMX | as the DMX | STOP | as the DMX (it deaerates itself standing by) | 7.5 l/h |
 * | `motor` (DMH 21-10) | EXT (4–20 mA) | MAN | STOP (a flow trip stops it too, but is reported as the fault, not OFF) | flow: until its STOP/START; level clears itself; diaphragm until changed | its stroke dial × 21 l/h (60 %: 12.6 l/h) |
 * | `peristaltic` (PERI 30) | AUTO | MANUAL | off | stall: until reset at its keys; leak: until its tube is changed; level clears itself | 30 l/h (nominal: a worn tube gives less a turn, unseen by its controller) |
 * | `ideal` | always (it has no keys) | never | never | none | its rating |
 *
 * Every kind takes its demand as 4–20 mA (4 + 16 × demand); the family
 * already turns a 0-to-1 demand into its own rate as a share of its most
 * (the DMH's through its stroke dial), so the adapter passes the Trio's
 * demand through unchanged, and reports the most that share is of. A pump
 * in its own manual mode ignores the demand and doses its own rate, but
 * every kind still obeys its release (pause) contact, as the real ones'
 * pause inputs do: the Trio at OFF, inhibited or watchdog-tripped stops
 * a manual pump too. Delivering is the pump's averaged delivery
 * (`meanLh`, about 20 s), read as nothing once it has decayed below
 * `DELIVERING_FLOOR` of its most (an average decays forever: without the
 * floor the Trio could never see "not delivering").
 */

/** What each port sends its pump: the release contact and the 4–20 mA signal, as a share. */
export interface PortSignal {
  release: boolean;
  /** 0 to 1: 4 to 20 mA. */
  demand: number;
}

/** A demand as the signal's current, mA. */
export const signalMa = (demand: number) =>
  4 + 16 * Math.max(0, Math.min(1, demand));

/** An averaged delivery below this share of its most reads as none. */
export const DELIVERING_FLOOR = 0.005;

/** The words of each kind's faults, for the pump status screen ("fault: flow monitor tripped"). */
export const FAULT_WORDS: Record<string, string> = {
  flow: 'flow monitor tripped',
  level: 'tank empty',
  diaphragm: 'diaphragm ruptured',
  leak: 'tube leak',
  stall: 'overpressure stall',
};

/** A pump's own selector, as the Trio's mode lines read it. */
export function pumpMode(
  kind: MeteringKind,
  state: PumpState,
): ChannelFeedback['mode'] {
  switch (kind) {
    case 'ideal':
      return 'remote';
    case 'solenoid':
    case 'stepper': {
      const s = (state as KeyedDiaphragmState).keys;
      if (!s.on) return 'off';
      return s.mode === 'auto' ? 'remote' : 'manual';
    }
    case 'motor': {
      const s = state as MotorPumpState;
      // A flow trip stops it (`on` false) as well as latching: reported as the fault.
      if (!s.on && s.error !== 'flow') return 'off';
      return s.mode === 'analog' ? 'remote' : 'manual';
    }
    case 'peristaltic': {
      const s = state as PeristalticState;
      if (!s.on) return 'off';
      return s.mode === 'auto' ? 'remote' : 'manual';
    }
  }
}

/** The fault a pump's error relay reports, in words, or null. */
export const pumpFault = (fault: string | null) =>
  fault ? (FAULT_WORDS[fault] ?? fault) : null;

/** The most a pump can give at full signal, l/h: its rating, the DMH's at its stroke dial. */
export function pumpMostLh(
  kind: MeteringKind,
  state: PumpState,
  model: Pick<MeteringPump<unknown>, 'maxLh'>,
): number {
  if (kind === 'motor')
    return model.maxLh * (state as MotorPumpState).strokeLength;
  return model.maxLh;
}

/** What a pump wires back to its port. */
export function pumpFeedback(
  pump: DosingPump,
  model: Pick<MeteringPump<unknown>, 'maxLh'>,
  powered: boolean,
): ChannelFeedback {
  const most = pumpMostLh(pump.kind, pump.state, model);
  return {
    mode: pumpMode(pump.kind, pump.state),
    powered,
    running: powered && pump.running,
    fault: pumpFault(pump.fault),
    delivering: pump.meanLh > most * DELIVERING_FLOOR ? pump.meanLh : 0,
    most,
  };
}

/**
 * What a pump is given from its port: its release in series with the
 * plant's own interlocks (its pool circulating, its chemical service, its
 * open path: `interlock`), the signal as its demand, its supply, and its
 * day tank's level switch.
 */
export function pumpInputs(
  signal: PortSignal,
  plant: { interlock: boolean; powered: boolean; level: LevelInput },
  dischargeBar: number,
): MeteringInputs {
  return {
    powered: plant.powered,
    release: signal.release && plant.interlock,
    demand: Math.max(0, Math.min(1, signal.demand)),
    level: plant.level,
    dischargeBar,
  };
}
