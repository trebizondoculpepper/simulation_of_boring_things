import { computed } from '@preact/signals-core';
import {
  beginPart,
  createPartSet,
  potentiometer,
  studioSwitch,
} from '../../core/parts/parts';
import type { PanelKit } from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';
import { panelMakerMark } from '../../core/views/panel-maker-mark';
import { createRackUnit } from '../../industrial-control/views/rack-equipment';
import type { MusicBinding } from './music-binding';

/** A 3U amplifier: facility-powered, with an output switch and level pot. */
export function amplifier(kit: PanelKit, binding: MusicBinding) {
  const a = beginPart(kit, 'amplifier');
  const controls = createPartSet();
  const unit = createRackUnit(kit, {
    u: 3,
    style: 'controls',
    colour: 'grey',
    label: 'SYNCLEX · JACUZZI AMPLIFIER',
  });
  a.object.add(unit.group);
  const t = tools(kit);
  const on = computed(
    () => binding.powered.value && binding.amplifier.value.on,
  );
  const power = controls.add(
    studioSwitch(kit, {
      name: 'Jacuzzi music on/off',
      legend: 'ON/OFF',
      cap: 'graphite',
      led: 'green',
      lamp: on,
      power: binding.powered,
      action: binding.toggle,
    }),
  );
  power.object.position.set(-0.14, 0, 0.003);
  unit.face.add(power.object);
  const level = controls.add(
    potentiometer(kit, {
      name: 'Jacuzzi music volume',
      steps: 20,
      bound: {
        get value() {
          return Math.round(binding.amplifier.value.volume * 20);
        },
        set: (value) => binding.volume(value / 20),
      },
    }),
  );
  level.object.position.set(0.11, 0, 0.003);
  unit.face.add(level.object);
  t.label(unit.face, 'JACUZZI', 0, 0.035, 0.003, 0.009, '#111716');
  t.label(unit.face, 'VOLUME', 0.11, -0.037, 0.003, 0.006, '#111716');
  const lcd = t.label(
    unit.face,
    '100 V LINE',
    -0.02,
    -0.035,
    0.003,
    0.005,
    '#111716',
  );
  lcd.name = 'Amplifier output marking';
  panelMakerMark(kit, unit.face, {
    width: unit.faceWidth,
    height: 0.133,
    z: 0.003,
    size: 0.01,
    inset: 0.008,
  });
  a.updates.push((delta) => controls.update(delta));
  a.disposers.push(controls.dispose);
  return {
    ...a.part(),
    unit: { ...unit, group: a.object },
    uses: controls.uses,
  };
}
