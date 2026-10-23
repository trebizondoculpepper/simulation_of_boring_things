/**
 * A solenoid-operated valve's working (the owner, 2026-10-23: the Olympic's
 * valves solenoid-operated, automatic). On a main, a butterfly valve on a
 * spring-return pneumatic actuator (rack and pinion), piloted by a NAMUR
 * 3/2 solenoid valve: energised, the solenoid lets the air in and the
 * actuator drives the valve open against its springs; de-energised, or
 * with its air lost, the air is let out and the springs drive it shut. So
 * it fails safe, shut. Its travel takes longer the bigger the valve. A
 * limit switch box reports it fully open or fully shut; the solenoid's
 * manual override opens it by hand while there is air. Pure; seconds.
 */

export interface ActuatedValveState {
  /** 0 shut to 1 fully open. */
  position: number;
  /** The panel's command: open. */
  command: boolean;
  /** Its supplies: the solenoid's power and the actuator's air. */
  power: boolean;
  air: boolean;
  /** The solenoid's manual override, pressed in. */
  override: boolean;
}

/** Its full stroke's time for an outside diameter, seconds: a small actuator fast, a large one slow. */
export const strokeTime = (od: number) =>
  od <= 0.07 ? 2 : od <= 0.17 ? 4 : od <= 0.25 ? 6 : 9;

export function newActuatedValve(open = true): ActuatedValveState {
  return {
    position: open ? 1 : 0,
    command: open,
    power: true,
    air: true,
    override: false,
  };
}

/** Whether its solenoid is energised (its coil's lamp lit). */
export const energised = (s: ActuatedValveState) => s.command && s.power;

/** Where its springs and its air would put it: open only with air, and the solenoid energised or overridden. */
export const target = (s: ActuatedValveState) =>
  s.air && (energised(s) || s.override) ? 1 : 0;

export function stepActuatedValve(
  s: ActuatedValveState,
  dt: number,
  stroke: number,
): ActuatedValveState {
  if (!(dt > 0)) return s;
  const goal = target(s);
  const step = dt / stroke;
  const position =
    goal > s.position
      ? Math.min(goal, s.position + step)
      : Math.max(goal, s.position - step);
  return { ...s, position };
}

/** What its limit switches say. */
export const limits = (s: ActuatedValveState) => ({
  open: s.position >= 0.98,
  shut: s.position <= 0.02,
});
