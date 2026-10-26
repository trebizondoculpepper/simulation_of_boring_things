import { BOOSTER_PUMP } from './pump-sound';
import { SET_PRESSURE } from './booster-set';

/**
 * The make-up booster set's two pumps and their valves (the owner,
 * 2026-10-26): one pump on duty, the other standing by, each with a
 * motorised valve on its suction and on its discharge, driven together.
 * Only the pump running has its valves open, so water can never pass
 * back through the one standing by. Changing the duty is a sequence the
 * controller runs, each step waiting on the last:
 *
 * 1. stopping: the outgoing pump coasts down to rest;
 * 2. closing: its valves drive shut;
 * 3. opening: the incoming pump's valves drive open;
 * 4. starting: it runs up to speed;
 * 5. running.
 *
 * So the one pump's valves are shut before the other's begin to open: at
 * no moment are both open. STOP coasts the duty pump down, then shuts
 * its valves; RUN opens them, then runs it up.
 *
 * BOOST (the owner, 2026-10-26) runs the standby with the duty, in
 * parallel, for more flow: its valves drive open and it runs up beside
 * the duty pump, each pump's discharge check valve keeping either from
 * being back-fed; the two give about 1.7 times one pump's flow, not
 * twice, sharing one discharge pressure. BOOST again, STOP or a change
 * of duty takes the assist pump off: it coasts to rest, then its valves
 * shut. Pure.
 */

export type BoosterPump = 0 | 1;

export type ChangeoverPhase =
  | 'running'
  | 'stopping'
  | 'closing'
  | 'opening'
  | 'starting'
  | 'stopped';

export const CHANGEOVER = {
  /** A valve's actuator, shut to open, seconds (a Belimo-class drive on DN50). */
  stroke: 8,
  /** A pump's run-up and coast-down, seconds, as its sound (`BOOSTER_PUMP`). */
  runUp: BOOSTER_PUMP.runUp,
  coastDown: BOOSTER_PUMP.coastDown,
  /** One pump's delivery at speed, valves open, m³/h. */
  rate: 6.2,
} as const;

export interface BoosterChangeover {
  /** The pump on duty now. */
  duty: BoosterPump;
  /** The pump selected for duty: the duty, or one being changed over to. */
  selected: BoosterPump;
  phase: ChangeoverPhase;
  /** Whether the set is called to run (RUN), or stopped (STOP). */
  run: boolean;
  /** Each pump's speed, 0 (at rest) to 1. */
  speed: [number, number];
  /** Each pump's valves' position, 0 (shut) to 1 (open). */
  valve: [number, number];
  /** Whether BOOST is on: the standby running with the duty. */
  boost: boolean;
}

export type ChangeoverAction =
  | { act: 'duty'; pump: BoosterPump }
  | { act: 'run' }
  | { act: 'stop' }
  | { act: 'boost' };

export function newBoosterChangeover(): BoosterChangeover {
  return {
    duty: 0,
    selected: 0,
    phase: 'running',
    run: true,
    speed: [1, 0],
    valve: [1, 0],
    boost: false,
  };
}

export function actOnChangeover(
  s: BoosterChangeover,
  a: ChangeoverAction,
): BoosterChangeover {
  if (a.act === 'duty')
    return { ...s, selected: a.pump, boost: a.pump === s.duty && s.boost };
  if (a.act === 'run') return { ...s, run: true };
  if (a.act === 'boost') return { ...s, boost: !s.boost };
  return { ...s, run: false, boost: false };
}

/** Whether a pump's motor is called to run. */
export function motorCalled(s: BoosterChangeover, p: BoosterPump): boolean {
  if (p !== s.duty)
    // The assist pump, boosting: once its valves are fully open.
    return s.boost && s.phase === 'running' && s.valve[p] === 1;
  return s.run && (s.phase === 'running' || s.phase === 'starting');
}

/** Whether a pump's valves are commanded open. */
export function valvesCalled(s: BoosterChangeover, p: BoosterPump): boolean {
  if (p !== s.duty)
    // The assist pump's, boosting; held open while it coasts to rest.
    return (s.boost && s.phase === 'running') || s.speed[p] > 0;
  // Open to run, and held open while it coasts down: shut only once it
  // is at rest, whether changing over or stopped (the owner, 2026-10-26:
  // STOP closes the valves).
  return (
    s.phase === 'opening' ||
    s.phase === 'starting' ||
    s.phase === 'running' ||
    s.speed[p] > 0
  );
}

const toward = (now: number, target: number, step: number) =>
  now < target ? Math.min(target, now + step) : Math.max(target, now - step);

/** The set `dt` seconds on. */
export function stepChangeover(
  s: BoosterChangeover,
  dt: number,
): BoosterChangeover {
  const C = CHANGEOVER;
  const pumps = [0, 1] as const;
  const speed = pumps.map((p) =>
    toward(
      s.speed[p],
      motorCalled(s, p) ? 1 : 0,
      dt / (motorCalled(s, p) ? C.runUp : C.coastDown),
    ),
  ) as [number, number];
  const valve = pumps.map((p) =>
    toward(s.valve[p], valvesCalled(s, p) ? 1 : 0, dt / C.stroke),
  ) as [number, number];
  let { phase, duty } = s;
  const d = duty;
  switch (phase) {
    case 'running':
      if (s.selected !== d) phase = 'stopping';
      else if (!s.run) phase = 'stopped';
      break;
    case 'stopped':
      // Its valves shut once at rest; started again, they open first.
      if (s.selected !== d) phase = 'stopping';
      else if (s.run) phase = 'opening';
      break;
    case 'stopping':
      if (speed[d] === 0) phase = 'closing';
      break;
    case 'closing':
      if (valve[d] === 0) {
        duty = s.selected;
        phase = 'opening';
      }
      break;
    case 'opening':
      if (valve[d] === 1) phase = s.run ? 'starting' : 'stopped';
      break;
    case 'starting':
      if (speed[d] === 1) phase = 'running';
      else if (!s.run) phase = 'stopped';
      break;
  }
  return { ...s, phase, duty, speed, valve };
}

/** The set's delivery, m³/h: each pump's at its speed, through its valves. */
export function changeoverFlow(s: BoosterChangeover): number {
  const q = [s.speed[0] * s.valve[0], s.speed[1] * s.valve[1]];
  // Two in parallel share one pressure: about 1.7 times one, not twice.
  return CHANGEOVER.rate * (q[0] + q[1]) * (1 - 0.15 * Math.min(q[0], q[1]));
}

/**
 * Its discharge manifold's pressure, bar (the owner, 2026-10-26: none
 * once stopped): each pump's head as the square of its speed, through its
 * valves, the higher of the two; a little more with both in parallel, the
 * pipework's resistance rising with their flow. Into an open sink, nothing
 * holds it once they stop.
 */
export function changeoverPressure(s: BoosterChangeover): number {
  const head = [0, 1].map((p) => s.speed[p] ** 2 * s.valve[p]);
  return (
    SET_PRESSURE *
    Math.max(head[0], head[1]) *
    (1 + 0.12 * Math.min(head[0], head[1]))
  );
}

/** What its controller's display says it is doing. */
export function changeoverStatus(s: BoosterChangeover): string {
  const n = (p: BoosterPump) => `P${p + 1}`;
  switch (s.phase) {
    case 'running':
      return s.boost && s.speed[1 - s.duty] > 0
        ? 'BOOST P1+P2'
        : `${n(s.duty)} DUTY RUNNING`;
    case 'stopped':
      return `${n(s.duty)} DUTY STOPPED`;
    case 'stopping':
      return `${n(s.duty)} STOPPING`;
    case 'closing':
      return `${n(s.duty)} VALVES SHUT`;
    case 'opening':
      return `${n(s.duty)} VALVES OPEN`;
    case 'starting':
      return `${n(s.duty)} STARTING`;
  }
}
