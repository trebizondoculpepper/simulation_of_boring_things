import { Group, MeshBasicMaterial } from 'three';
import type { Object3D } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import {
  createMicroLabel,
  createSevenSegment,
} from '../../core/views/eighties-controls';
import { createPartSet, potentiometer } from '../../core/parts/parts';
import { illuminatedRocker, membraneKey } from '../../core/parts/small-parts';
import { brandLivery } from '../../core/views/brand-livery';
import { createDialGauge } from '../../industrial-control/views/dial-gauge';
import type { DialGaugeView } from '../../industrial-control/views/dial-gauge';
import {
  boilerDisplay,
  boilerLamps,
  SETPOINT_RANGE,
} from '../logic/boiler-house';
import type { BoilerKey, BoilerState } from '../logic/boiler-house';
import { plantTools } from './plant-tools';

/**
 * A boiler's own controls, after the period Remeha code-display panel (the
 * Gas 310 ECO's: a digital code display, LED indicators, function keys,
 * an on/off switch), in Hamwarmy's livery: a four-digit red LED display
 * showing the status code and flow temperature or a flashing fault code,
 * four LEDs (burner, lockout, pump, manual), membrane keys for MODE, STEP,
 * − and +, STORE, RESET and MANUAL, a flow temperature knob, an
 * illuminated rocker switch and a 63 mm water pressure gauge. Its keys and switch are the shared small
 * parts (`core/parts/small-parts.ts`). In metres, facing +z.
 */

export interface BoilerPanelView {
  group: Group;
  parts: ReturnType<typeof createPartSet>;
  /** Show the boiler's state; call each frame with the time. */
  show(boiler: BoilerState, seconds: number, delta: number): void;
}

/**
 * The boiler's control panel, 0.5 × 0.18 m, to set into the top of its
 * front. Each key and the switch call `press` with what was pressed.
 */
export function createBoilerPanel(
  kit: PanelKit,
  press: (key: BoilerKey) => void,
  /** The flow temperature knob turned to `celsius`. */
  setSetpoint: (celsius: number) => void = () => {},
): BoilerPanelView {
  const t = plantTools(kit);
  const livery = brandLivery(kit, 'hamwarmy');
  const group = new Group();
  group.name = 'Boiler control panel';
  t.box(group, livery.paint.main, 0.5, 0.18, 0.02, 0, 0, 0.01);
  t.box(group, livery.paint.shade, 0.16, 0.06, 0.004, -0.14, 0.035, 0.021);
  const display = createSevenSegment(kit, 4, { digitHeight: 0.026 });
  display.group.position.set(-0.14, 0.035, 0.024);
  display.group.traverse((o) => (o.userData.live = true));
  group.add(display.group);
  const caption = createMicroLabel(kit, 'CODE  ·  °C', {
    height: 0.008,
    ink: livery.palette.onMain,
  });
  caption.position.set(-0.14, -0.005, 0.0205);
  group.add(caption);
  // The LEDs, over the keys.
  const lamps = (['BURNER', 'LOCKOUT', 'PUMP', 'MANUAL'] as const).map(
    (name, i) => {
      const colour =
        name === 'LOCKOUT'
          ? '#ff3b24'
          : name === 'MANUAL'
            ? '#ffb02a'
            : '#5dff7a';
      const material = new MeshBasicMaterial({ color: '#3a2a20' });
      kit.materials.push(material);
      const x = -0.01 + i * 0.045;
      const led = t.cyl(
        group,
        material,
        0.004,
        0.004,
        x,
        0.055,
        0.022,
        'z',
        10,
      );
      led.userData.live = true;
      const label = createMicroLabel(kit, name, {
        height: 0.0065,
        ink: livery.palette.onMain,
      });
      label.position.set(x, 0.04, 0.0205);
      group.add(label);
      return { material, colour };
    },
  );
  // The keys and the switch.
  const parts = createPartSet();
  const keys: [string, BoilerKey, string][] = [
    ['MODE', 'mode', '#2a2b2c'],
    ['STEP', 'step', '#2a2b2c'],
    ['−', 'minus', '#2a2b2c'],
    ['+', 'plus', '#2a2b2c'],
    ['STORE', 'store', '#2a2b2c'],
    ['RESET', 'reset', '#a8261d'],
    ['MANUAL', 'manual', '#5d4a1a'],
  ];
  keys.forEach(([legend, key, colour], i) => {
    const part = membraneKey(kit, { legend, colour, action: () => press(key) });
    part.object.position.set(-0.2 + i * 0.045, -0.055, 0.02);
    group.add(part.object);
    parts.add(part);
  });
  let lit = true;
  const power = illuminatedRocker(kit, {
    lit: () => lit,
    action: () => press('power'),
    name: 'Boiler on/off switch',
  });
  power.object.position.set(0.19, -0.05, 0.02);
  group.add(power.object);
  parts.add(power);
  // The flow temperature knob, 40 to 90 °C in degrees: it and − and +
  // set one setpoint, so the knob shows the boiler's, however set.
  let setpoint = 80;
  const knob = potentiometer(kit, {
    steps: SETPOINT_RANGE.max - SETPOINT_RANGE.min,
    legend: 'FLOW °C',
    name: 'Boiler flow temperature knob',
    bound: {
      get value() {
        return setpoint - SETPOINT_RANGE.min;
      },
      set: (position: number) => setSetpoint(SETPOINT_RANGE.min + position),
    },
  });
  knob.object.position.set(0.125, -0.05, 0.02);
  knob.object.scale.setScalar(0.6);
  group.add(knob.object);
  parts.add(knob);
  // The system's water pressure gauge, 63 mm.
  const gauge: DialGaugeView = createDialGauge(kit, {
    dia: 0.063,
    max: 6,
    unit: 'bar',
    entry: 'back',
    red: { from: 0, to: 0.8 },
    maker: 'hamwarmy',
  });
  gauge.group.position.set(0.21, 0.035, 0.026);
  group.add(gauge.group);
  return {
    group,
    parts,
    show(boiler, seconds, delta) {
      lit = boiler.on;
      setpoint = boiler.setpoint;
      display.show(boilerDisplay(boiler, seconds));
      const on = boilerLamps(boiler);
      const states = [
        on.burner,
        on.lockout && Math.floor(seconds * 2) % 2 === 0,
        on.pump,
        on.manual,
      ];
      lamps.forEach((lamp, i) =>
        lamp.material.color.set(states[i] ? lamp.colour : '#3a2a20'),
      );
      gauge.set(boiler.pressure);
      gauge.update(delta);
      parts.update(delta);
    },
  };
}

/** Mark everything under `o` live, so a room does not merge it. */
export const markLive = (o: Object3D) =>
  o.traverse((x) => (x.userData.live = true));
