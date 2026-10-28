import { newMotorPumpState, stepMotorPump } from './motor-dosing-pump';
import type {
  HeadKind,
  LevelInput,
  MotorPumpInputs,
  MotorPumpState,
} from './motor-dosing-pump';

/**
 * Dev44's trial of the Olympic's hypochlorite pumps side by side (prompt
 * 102): the DMX 1602 the Olympic has and the DMH 21-10 designed to replace
 * it, both asked for the same dose by one controller output, on a small
 * state of its own, not the world's. The trial station sets the
 * controller's output (its Yout, 0 to 100 %), the day tank's level, the
 * discharge valve, the DMH's head, and the faults (a slug of air, a
 * ruptured diaphragm). The controller asks for Yout × 12.5 l/h, the
 * Olympic's sizing (`doc/research/water-chemistry-models.md` §8.5), of
 * the DMX in l/h and of the DMH as 4–20 mA; what each delivers is
 * totalled, so the shortfall shows. Pure.
 */

/** The dose the Olympic's pump is sized for, l/h. */
export const OLYMPIC_SIZED_LH = 12.5;
/** The back pressure at the Olympic's injection quill, bar (the game's). */
export const INJECTION_BAR = 2;

export interface DosingTrial {
  /** The controller's output, 0 to 1. */
  yout: number;
  level: LevelInput;
  dischargeOpen: boolean;
  dmh: MotorPumpState;
  /** Litres asked for, and delivered by each pump, since the trial began. */
  askedL: number;
  dmxL: number;
  dmhL: number;
}

/** The Olympic at about its average draw (a quarter of 12.5 l/h). */
export const newDosingTrial = (): DosingTrial => ({
  yout: 0.25,
  level: 'ok',
  dischargeOpen: true,
  dmh: newMotorPumpState('degassing'),
  askedL: 0,
  dmxL: 0,
  dmhL: 0,
});

/** What the controller asks for, l/h. */
export const askedLh = (t: DosingTrial) => t.yout * OLYMPIC_SIZED_LH;

/** The DMX's demand, as its controller gives it (`diaphragm-pump.ts`). */
export const dmxDemand = (t: DosingTrial) => ({
  running: t.yout > 0,
  rate: askedLh(t),
});

/** The DMH's inputs from the controller, the tank and the line. */
export const dmhInputs = (t: DosingTrial, powered = true): MotorPumpInputs => ({
  powered,
  release: t.yout > 0,
  signalMa: 4 + 16 * t.yout,
  level: t.level,
  dischargeBar: t.dischargeOpen ? INJECTION_BAR : Infinity,
});

/** The controller's output turned a detent (5 %) up or down. */
export const turnYout = (t: DosingTrial, direction: number): DosingTrial => ({
  ...t,
  yout: Math.max(
    0,
    Math.min(1, Math.round((t.yout + direction * 0.05) * 20) / 20),
  ),
});

export const setLevel = (t: DosingTrial, level: LevelInput): DosingTrial => ({
  ...t,
  level,
});

export const setDischarge = (t: DosingTrial, open: boolean): DosingTrial => ({
  ...t,
  dischargeOpen: open,
});

/** The DMH's head changed (its state otherwise kept). */
export const setHead = (t: DosingTrial, head: HeadKind): DosingTrial => ({
  ...t,
  dmh: { ...t.dmh, head },
});

/** The trial's counters back to nothing. */
export const resetTotals = (t: DosingTrial): DosingTrial => ({
  ...t,
  askedL: 0,
  dmxL: 0,
  dmhL: 0,
});

/**
 * The trial `delta` seconds on: `dmxLh` is what the DMX is dosing now (its
 * view runs its own keys and strokes). Returns the DMH's strokes too.
 */
export function stepDosingTrial(t: DosingTrial, dmxLh: number, delta: number) {
  const r = stepMotorPump(t.dmh, dmhInputs(t), delta);
  const hours = delta / 3600;
  return {
    trial: {
      ...t,
      dmh: r.state,
      askedL: t.askedL + askedLh(t) * hours,
      dmxL: t.dmxL + dmxLh * hours,
      dmhL: t.dmhL + r.deliveredL,
    },
    strokes: r.strokes,
    delivering: r.delivering,
  };
}
