import { BoxGeometry, CylinderGeometry, Mesh } from 'three';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { kitPaint } from '../../components/core/views/eighties-controls';
import { createDymoLabel } from '../../components/core/views/hand-labels';
import { markComponent } from '../../components/core/views/component-identity';
import { beginPart, LOCKED } from '../../components/core/parts/parts';
import type { ReadonlySignal } from '@preact/signals-core';
import { createSelector } from '../../components/core/logic/world/components';
import type { Binding } from '../../components/core/logic/world/components';
import { createKnob } from '../../components/industrial-control/views/panel-switchgear';
import { recording } from '../../components/core/audio/part-audio';
import { CONTROL_ROOM_MODES } from '../logic/control-room-mode';

const NAME = 'CONTROL ROOM MODE knob';

/** A selector clicking over a detent, as the parts library's selectors sound. */
const DETENT = recording(
  new URL(
    '../../components/core/audio/assets/switch-click.wav',
    import.meta.url,
  ),
  0.06,
);

/**
 * The CONTROL ROOM MODE knob (`logic/control-room-mode.ts`): the parts
 * library's black pointer knob (`createKnob`, its `pointer` style, a bar
 * with a white line to its pointing end), 40 mm across, a selector of two
 * detents 45° either side of upright, on a small screwed grey plate,
 * labelled in embossed Dymo tape: CONTROL ROOM MODE across the top, OLD
 * and NEW at its two positions (upper left and upper right). A click
 * turns it to its other position, whichever side is clicked. `bound`: its
 * detent in the world, 0 OLD, 1 NEW. Metres, facing +z, its plate's back
 * at z = 0. Marked set decoration for the model (it works only where the
 * doors lead, no plant), though it works. `locked`: while true (the
 * control room's doors stand open, the owner, 2026-10-27), it will not
 * turn: it rattles against its stop.
 */
export function createControlRoomModeKnob(
  kit: PanelKit,
  bound: Binding<number>,
  locked?: ReadonlySignal<boolean>,
) {
  const a = beginPart(kit, NAME);
  const { object } = a;
  // The plate behind it, light grey steel, four screws.
  const plateW = 0.14;
  // Tall enough for its RESET button under the knob.
  const plateH = 0.17;
  const plateT = 0.004;
  const plate = new Mesh(
    new BoxGeometry(plateW, plateH, plateT),
    kitPaint(kit, '#a9aeb0', 0.3),
  );
  plate.position.set(0, -0.008, plateT / 2);
  object.add(plate);
  const screw = kitPaint(kit, '#d0d3d3', 0.7);
  for (const sx of [-1, 1])
    for (const sy of [-1, 1]) {
      const head = new Mesh(
        new CylinderGeometry(0.003, 0.003, 0.0015, 10),
        screw,
      );
      head.rotation.x = Math.PI / 2;
      head.position.set(
        sx * (plateW / 2 - 0.008),
        -0.008 + sy * (plateH / 2 - 0.008),
        plateT + 0.0007,
      );
      object.add(head);
    }
  // Its Dymo tape: the title across the top, OLD and NEW at its positions.
  const title = createDymoLabel(kit, 'CONTROL ROOM MODE', { seed: 97 });
  title.position.set(0, 0.06, plateT + 0.0004);
  object.add(title);
  CONTROL_ROOM_MODES.forEach((mode, i) => {
    const label = createDymoLabel(kit, mode.toUpperCase(), { seed: 98 + i });
    label.position.set((i ? 1 : -1) * 0.04, 0.036, plateT + 0.0004);
    object.add(label);
  });
  // The knob: 45° left of upright at OLD, 45° right at NEW (its 270°
  // sweep's third and two thirds).
  const share = (position: number) => (position ? 2 / 3 : 1 / 3);
  const knob = createKnob(kit, { radius: 0.016, style: 'pointer' });
  knob.group.position.z = plateT;
  object.add(knob.group);
  const selector = createSelector({ positions: 2, bound, latch: locked });
  knob.set(share(selector.position.peek()));
  a.voice(selector, { detent: DETENT, refused: LOCKED });
  // A click turns it to its other position, from either side.
  a.uses.set(knob.spindle, () =>
    selector.turn(selector.position.peek() ? -1 : 1),
  );
  a.updates.push((delta) => {
    knob.set(share(selector.position.value));
    knob.update(delta);
  });
  a.disposers.push(selector.dispose);
  // In the model: set decoration, though it works (it touches no plant).
  markComponent(object, { name: NAME, decorative: true });
  // What the overlay sees: where its pointer points.
  markComponent(knob.group, {
    part: {
      kind: 'visible',
      label: NAME,
      shows: () =>
        `at ${CONTROL_ROOM_MODES[selector.position.value].toUpperCase()}`,
    },
    key: object.uuid,
  });
  return { ...a.part(), position: selector.position };
}
