import {
  createExperimentalSink,
  createExperimentalSource,
} from '../../../game/plant/experimental-source';
import {
  energised,
  limits,
  newActuatedValve,
  stepActuatedValve,
  strokeTime,
  target,
} from '../../components/plant/logic/actuated-valve';
import type { ActuatedValveState } from '../../components/plant/logic/actuated-valve';
import { MOTOR_STROKE } from '../../components/plant/logic/motorised-valve';

/**
 * Dev37's valve test rigs (the owner, 2026-10-24: "a new room to test out
 * valves and their sounds"), one of each kind of actuated valve: an ideal
 * mains-water source piped to an ideal sink through a valve on a
 * spring-return electric actuator, a DN80 butterfly valve on one line
 * (`RIG`) and a 35 mm ball valve on the other (`BALL_RIG`). Each line's
 * Penfold panel commands its valve OPEN or SHUT; a throw switch, its
 * supply isolator, cuts its power, and its spring drives it shut. The
 * panel keeps its command on its own supply, so with power back the valve
 * does what the panel last asked. Water flows in proportion to how far the
 * valve stands open, none at the shut limit. Pure; seconds, m³/h.
 */

/** The butterfly valve's line: DN80, 90 mm outside (`PIPE_SIZES[80].od`), 20 m³/h wide open. */
export const RIG = { dn: 80, od: 0.09, maxRate: 20 } as const;

/** The ball valve's line: 35 mm copper, 3 m³/h wide open; its stroke a motorised ball valve's (`MOTOR_STROKE`). */
export const BALL_RIG = {
  od: 0.035,
  maxRate: 3,
  stroke: MOTOR_STROKE,
} as const;

/**
 * The direct solenoid valve on the butterfly line's bypass (the owner,
 * 2026-10-24: "a solenoid valve in parallel with the spring butterfly
 * valve"): 54 mm, passing 4 m³/h of the line's flow when open. Normally
 * closed: it opens the moment its coil is energised, powered and commanded
 * open, and snaps shut when either goes.
 */
export const BYPASS = { od: 0.054, maxRate: 4 } as const;

/** Below this opening its seat seals: the shut limit (`limits`). */
export const SEAL = 0.02;

/** The flow through the valve at `position` (0 shut to 1 open), as a share of its full-open flow `full`. */
export const valveFlow = (position: number, full: number) =>
  position <= SEAL ? 0 : full * Math.min(1, position);

export function createValveTestRig({
  id = 'rig',
  od = RIG.od,
  maxRate = RIG.maxRate,
  stroke = strokeTime(od),
  bypass,
}: {
  id?: string;
  /** Its pipe's outside diameter, metres. */
  od?: number;
  /** Its source's most, m³/h. */
  maxRate?: number;
  /** Its valve's full stroke, seconds. */
  stroke?: number;
  /** A solenoid valve in parallel with its valve, passing this most, m³/h; none if not given. */
  bypass?: number;
} = {}) {
  const source = createExperimentalSource({
    id: `${id}.source`,
    substance: 'mains-water',
    maxRate,
  });
  const sink = createExperimentalSink({
    id: `${id}.sink`,
    substance: 'mains-water',
    maxRate: maxRate * 1.5,
  });
  // An electric drive needs no air.
  let valve: ActuatedValveState = { ...newActuatedValve(false), air: true };
  let flow = 0;
  let solenoidCommand = false;
  /** The bypass's solenoid valve: open while its coil is energised. */
  const solenoidOpen = () =>
    bypass !== undefined && valve.power && solenoidCommand;
  /** The line's flow wide open: the pressure across the two resistances in series, up to either's most. */
  const fullFlow = () =>
    source.remaining() > 0 && sink.space() > 0
      ? Math.min(
          source.flow.maxRate,
          sink.flow.maxRate,
          Math.max(0, source.flow.potential - sink.flow.potential) /
            (source.flow.resistance + sink.flow.resistance),
        )
      : 0;
  return {
    source,
    sink,
    stroke,
    fullFlow,
    /** The panel's command: open. */
    command: () => valve.command,
    setCommand(open: boolean) {
      valve = { ...valve, command: open };
    },
    /** Whether the throw switch passes power to the actuator. */
    supply: () => valve.power,
    setSupply(on: boolean) {
      valve = { ...valve, power: on };
    },
    position: () => valve.position,
    /** Whether it has a bypass solenoid valve. */
    hasBypass: bypass !== undefined,
    /** The bypass solenoid valve's command, and whether it stands open. */
    solenoidCommand: () => solenoidCommand,
    setSolenoidCommand(open: boolean) {
      solenoidCommand = open;
    },
    solenoidOpen,
    step(dt: number) {
      if (!(dt > 0)) return;
      valve = stepActuatedValve(valve, dt, stroke);
      // The two in parallel: each its share of the line's flow, together
      // no more than the line passes.
      const full = fullFlow();
      const share = Math.min(
        1,
        valveFlow(valve.position, 1) +
          (solenoidOpen() ? (bypass ?? 0) / maxRate : 0),
      );
      const amount = (full * share * dt) / 3600;
      const took = sink.accept(source.draw(amount, dt), dt);
      flow = (took * 3600) / dt;
    },
    readings() {
      return {
        position: valve.position,
        ...limits(valve),
        /** Its motor powered and driving it open (its lamp lit). */
        energised: energised(valve),
        moving: Math.abs(valve.position - target(valve)) > 1e-6,
        flow,
        received: sink.received(),
        supply: valve.power,
        command: valve.command,
        solenoidOpen: solenoidOpen(),
      };
    },
  };
}

export type ValveTestRig = ReturnType<typeof createValveTestRig>;

/** The panel's two-line readout: the flow, and how open the valve stands and which way it goes. */
export function rigLcdLines(r: ReturnType<ValveTestRig['readings']>) {
  const percent = Math.round(r.position * 100);
  const state = r.open
    ? 'OPEN'
    : r.shut
      ? 'SHUT'
      : r.moving
        ? r.energised
          ? 'OPENING'
          : 'CLOSING'
        : 'STOPPED';
  return [
    `FLOW${`${r.flow.toFixed(1)} m3/h`.padStart(12)}`,
    `${`${percent}%`.padStart(4)}${state.padStart(12)}`,
  ];
}
