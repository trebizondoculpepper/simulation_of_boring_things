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

/**
 * Dev37's valve test rig (the owner, 2026-10-24: "a new room to test out
 * valves and their sounds"): an ideal mains-water source piped to an
 * ideal sink through one DN80 butterfly valve on a spring-return electric
 * actuator. Its Penfold panel commands it OPEN or SHUT; a throw switch,
 * its supply isolator, cuts its power, and its spring drives it shut. The
 * panel keeps its command on its own supply, so with power back the valve
 * does what the panel last asked. Water flows in proportion to how far the
 * disc stands open, none at the shut limit. Pure; seconds, m³/h.
 */

/** The rig's pipe and valve: DN80, 90 mm outside (`PIPE_SIZES[80].od`). */
export const RIG = { dn: 80, od: 0.09 } as const;

/** Below this opening its seat seals: the shut limit (`limits`). */
export const SEAL = 0.02;

/** The flow through the valve at `position` (0 shut to 1 open), as a share of its full-open flow `full`. */
export const valveFlow = (position: number, full: number) =>
  position <= SEAL ? 0 : full * Math.min(1, position);

export function createValveTestRig() {
  const source = createExperimentalSource({
    id: 'rig.source',
    substance: 'mains-water',
    maxRate: 20,
  });
  const sink = createExperimentalSink({
    id: 'rig.sink',
    substance: 'mains-water',
    maxRate: 30,
  });
  // An electric drive needs no air.
  let valve: ActuatedValveState = { ...newActuatedValve(false), air: true };
  let flow = 0;
  const stroke = strokeTime(RIG.od);
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
    step(dt: number) {
      if (!(dt > 0)) return;
      valve = stepActuatedValve(valve, dt, stroke);
      const amount = (valveFlow(valve.position, fullFlow()) * dt) / 3600;
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
