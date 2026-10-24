import { signal } from '@preact/signals-core';
import { partAudio } from '../../core/audio/part-audio';
import { RELAY_CLICK, VALVE_STOP } from '../audio/actuated-valve';
import { machineTone } from '../../sound/audio/machine-tones';
import type { PanelKit } from '../../core/views/eighties-controls';
import { beginPart } from '../../core/parts/parts';
import { MOTOR_STROKE } from '../logic/motorised-valve';
import { remoteValveGeometry } from '../logic/remote-valve';
import {
  energised,
  limits,
  newActuatedValve,
  stepActuatedValve,
  target,
} from '../logic/actuated-valve';
import { createRemoteValve } from './remote-actuators';

/**
 * An actuated ball valve, for small pipes: a threaded ball valve with the
 * plant's one kind of actuator on its stem (the owner, 2026-10-24), as the
 * actuated butterfly valve has it (`actuated-butterfly-valve.ts`): a
 * spring-return electric actuator, its domed indicator turning a quarter
 * with the ball, its power lamp, its red override; its motor heard running
 * up, steady and down (`gear-motor`), a relay's click as it sets off or its
 * power goes, and the end stop's thud as it arrives; its spring shutting it
 * when its power goes. Drawn by `createRemoteValve`, set into its line (no
 * stand).
 *
 * Driven by `binding` (open or shut, as a panel commands, and its power);
 * its override, pressed, toggles it. Its own frame: its pipe along x
 * through the origin, its actuator up.
 */
export function createActuatedBallValve(
  kit: PanelKit,
  /** Its pipe's outside diameter, metres. */
  od: number,
  name: string,
  binding?: {
    open(): boolean;
    set(open: boolean): void;
    power?(): boolean;
    /** Where it stands, if its owner steps it (0 shut, 1 open). */
    position?(): number;
  },
  /** Its full stroke, seconds. */
  stroke = MOTOR_STROKE,
) {
  const a = beginPart(kit, name);
  const g = remoteValveGeometry('water', od, 0);
  const view = createRemoteValve(kit, g, { stand: false });
  a.object.add(view.group);
  // Its override: the red push on the actuator's end over the stem.
  const override = view.overrideButton!;

  let state = { ...newActuatedValve(binding?.open() ?? false), air: true };
  const moving = signal(false);
  const pitch = signal(1);
  a.holdWhile(moving, machineTone('gear-motor', pitch, 0.1), view.group);
  let audible = true;
  let prime = true;
  let wasEnergised = energised(state);
  let wasMoving = false;
  const toggle = () => {
    if (binding) binding.set(!binding.open());
    else state = { ...state, command: !state.command };
  };
  a.uses.set(override, toggle);
  a.updates.push((delta) => {
    if (binding)
      state = {
        ...state,
        command: binding.open(),
        power: binding.power?.() ?? state.power,
      };
    state = binding?.position
      ? { ...state, position: binding.position() }
      : stepActuatedValve(state, delta, stroke);
    const travelling = Math.abs(state.position - target(state)) > 1e-6;
    view.show(limits(state).open, travelling, state.position, state.power);
    const coil = energised(state);
    if (audible && !prime) {
      if (coil !== wasEnergised) partAudio.play(RELAY_CLICK, view.group);
      if (wasMoving && !travelling) partAudio.play(VALVE_STOP, view.group);
    }
    // A little lower unwinding shut than driving open.
    pitch.value = target(state) > state.position ? 1 : 0.9;
    moving.value = audible && travelling;
    wasEnergised = coil;
    wasMoving = travelling;
    prime = false;
  });
  const base = a.part();
  const setAudible = base.setAudible;
  return Object.assign(base, {
    setAudible(on: boolean) {
      if (on !== audible) {
        moving.value = false;
        prime = true;
      }
      audible = on;
      setAudible(on);
    },
    /** How open it stands, and what its limit switches say. */
    position: () => state.position,
    limits: () => limits(state),
  });
}
