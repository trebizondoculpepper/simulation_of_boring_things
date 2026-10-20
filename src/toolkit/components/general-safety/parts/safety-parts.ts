import { SpotLight } from 'three';
import { ALARM_BUZZER } from '../../core/audio/part-loops';
import type { Binding, Readable } from '../../core/logic/world/components';
import { effect } from '@preact/signals-core';
import type { Group } from 'three';
import { createChangeover } from '../logic/emergency-changeover';
import {
  createAlarmReset,
  createEmergencyBulkhead,
  createEmergencyLight,
  createExitSign,
  createKeyPlate,
  createOverDoorLight,
  createToiletAlarm,
} from '../views/safety-fittings';
import type { PanelKit } from '../../core/views/eighties-controls';
import { beginPart } from '../../core/parts/parts';
import type { Part } from '../../core/parts/parts';
import {
  CORD,
  KEY_TURN,
  PRESS,
  emitter,
  show,
} from '../../core/parts/building-part-tools';

/**
 * General safety fittings as parts: emergency lighting and its test key,
 * exit signs, and the accessible WC's alarm, bound to a building's model.
 */

/** A key switch plate, as for the emergency lighting test. */
export function keyPlate(
  kit: PanelKit,
  props: { name?: string; legend: string; bound: Binding<boolean> },
): Part {
  const a = beginPart(kit, props.name ?? `${props.legend} key switch`);
  const view = createKeyPlate(kit, props.legend);
  a.object.add(view.group);
  const e = emitter();
  a.voice(e, { on: KEY_TURN, off: KEY_TURN });
  a.uses.set(view.key, () => {
    props.bound.set(!props.bound.value);
    e.emit(props.bound.value ? 'on' : 'off');
  });
  show(a, () => view.set(props.bound.value));
  return a.part();
}

/** How an emergency light lights the room, when it does. */
export interface EmergencyBeam {
  /** Its intensity on its axis on battery, candela, as drawn. */
  candela: number;
  /** Half the angle of its beam, radians, and how far it reaches, metres. */
  angle: number;
  range: number;
  /** Scene units to the metre. */
  metre: number;
}

/**
 * What lights an emergency fitting: either the voltage at it (`volts`, 0
 * with its supply cut), when it changes over to its battery at its own
 * threshold (`emergency-changeover.ts`), or, simply, `lit` and
 * `charging`.
 */
type EmergencySupply =
  | { volts: Readable<number>; seed?: number }
  | { lit: Readable<boolean>; charging: Readable<boolean> };

/** An emergency fitting's view, its beam's direction and its supply. */
function emergencyFitting(
  kit: PanelKit,
  name: string,
  view: { group: Group; set(lit: boolean, charged: boolean): void },
  supply: EmergencySupply,
  beam: EmergencyBeam | undefined,
  aim: { x: number; y: number; z: number },
): Part {
  const a = beginPart(kit, name);
  a.object.add(view.group);
  const spot = beam
    ? new SpotLight('#e8eef8', 0, beam.range * beam.metre, beam.angle, 0.9, 2)
    : null;
  if (spot) {
    spot.position.set(aim.x * 0.05, aim.y * 0.05, aim.z * 0.05);
    spot.target.position.set(aim.x, aim.y, aim.z);
    a.object.add(spot, spot.target);
  }
  const show = (lit: boolean, charged: boolean) => {
    view.set(lit, charged);
    if (spot && beam)
      spot.intensity = lit ? beam.candela * beam.metre * beam.metre : 0;
  };
  if ('volts' in supply) {
    const changeover = createChangeover(supply.seed);
    let shown: boolean | null = null;
    let charged: boolean | null = null;
    a.updates.push((delta) => {
      const volts = supply.volts.value;
      const lit = changeover.step(delta, volts);
      const charging = !lit && volts > 0;
      if (lit === shown && charging === charged) return;
      shown = lit;
      charged = charging;
      show(lit, charging);
    });
  } else
    a.disposers.push(
      effect(() => show(supply.lit.value, supply.charging.value)),
    );
  return a.part();
}

/**
 * A non-maintained emergency downlight in the ceiling. With `beam`, it
 * lights the floor below it while lit, a cool, steady light from its
 * battery.
 */
export function emergencyLight(
  kit: PanelKit,
  props: EmergencySupply & { beam?: EmergencyBeam },
): Part {
  return emergencyFitting(
    kit,
    'emergency light',
    createEmergencyLight(kit),
    props,
    props.beam,
    { x: 0, y: -1, z: 0 },
  );
}

/**
 * A non-maintained emergency bulkhead on a wall, over a door. With `beam`,
 * it lights the way out in front of it and below.
 */
export function emergencyBulkhead(
  kit: PanelKit,
  props: EmergencySupply & { beam?: EmergencyBeam },
): Part {
  return emergencyFitting(
    kit,
    'emergency bulkhead',
    createEmergencyBulkhead(kit),
    props,
    props.beam,
    { x: 0, y: -1, z: 0.8 },
  );
}

/** A maintained exit sign. */
export function exitSign(
  kit: PanelKit,
  props: { level: Readable<number> },
): Part {
  const a = beginPart(kit, 'exit sign');
  const view = createExitSign(kit);
  a.object.add(view.group);
  show(a, () => view.set(props.level.value));
  return a.part();
}

/** The accessible toilet's emergency pull cord, hanging from y = 0. */
export function toiletAlarmCord(
  kit: PanelKit,
  props: { pull: () => void },
): Part {
  const a = beginPart(kit, 'toilet alarm cord');
  const view = createToiletAlarm(kit);
  a.object.add(view.group);
  const e = emitter();
  a.voice(e, { press: CORD });
  const pull = () => {
    view.pull();
    props.pull();
    e.emit('press');
  };
  for (const child of view.cord.children) a.uses.set(child, pull);
  a.updates.push(view.update);
  return a.part();
}

/** The toilet alarm's reset plate, which buzzes while the alarm is on. */
export function toiletAlarmReset(
  kit: PanelKit,
  props: { on: Readable<boolean>; reset: () => void },
): Part {
  const a = beginPart(kit, 'toilet alarm reset');
  const view = createAlarmReset(kit);
  a.object.add(view.group);
  const e = emitter();
  a.voice(e, { press: PRESS });
  a.uses.set(view.button, () => {
    props.reset();
    e.emit('press');
  });
  show(a, () => view.set(props.on.value));
  a.holdWhile(props.on, ALARM_BUZZER);
  return a.part();
}

/** The over-door light outside the accessible toilet. */
export function overDoorLight(
  kit: PanelKit,
  props: { on: Readable<boolean> },
): Part {
  const a = beginPart(kit, 'over-door alarm light');
  const view = createOverDoorLight(kit);
  a.object.add(view.group);
  show(a, () => view.set(props.on.value));
  a.updates.push(view.update);
  return a.part();
}
