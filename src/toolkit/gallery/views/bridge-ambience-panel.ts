import { computed, signal } from '@preact/signals-core';
import { BoxGeometry, Group, Mesh } from 'three';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import {
  createMicroLabel,
  kitPaint,
} from '../../components/core/views/eighties-controls';
import {
  beginPart,
  createPartSet,
  ledPushbutton,
} from '../../components/core/parts/parts';
import { bridgeAmbience } from '../../components/sound/audio/bridge-ambience';
import {
  BRIDGE_AMBIENCE,
  BRIDGE_AMBIENCE_IDS,
} from '../../components/sound/logic/bridge-ambience';
import type { BridgeAmbienceId } from '../../components/sound/logic/bridge-ambience';
import type { LiveExhibit } from '../rooms/plant/exhibit';

/** The trial panel's size, metres. */
export const AMBIENCE_PANEL = { w: 0.62, h: 0.36, d: 0.05 } as const;

/**
 * Dev47's trial of the bridge's ambience (mission 095): a small plate on
 * the wall, a lit push button for each variant (QUIET, STANDARD, BUSY),
 * one at a time, pressed again for silence; the sound fills the room as
 * it will the bridge, not placed at the panel.
 */
export function createBridgeAmbiencePanel(kit: PanelKit): LiveExhibit {
  const object = new Group();
  const { w, h, d } = AMBIENCE_PANEL;
  const plate = new Mesh(new BoxGeometry(w, h, d), kitPaint(kit, '#2b2a30'));
  plate.position.z = d / 2;
  object.add(plate);
  const face = new Group();
  face.position.z = d + 0.001;
  object.add(face);
  const title = createMicroLabel(kit, 'BRIDGE AMBIENCE', {
    height: 0.026,
    ink: '#ffcc66',
    maxWidth: w - 0.06,
  });
  title.position.set(0, h / 2 - 0.045, 0);
  face.add(title);
  const caption = createMicroLabel(
    kit,
    'Synthesised room tone for the bridge: drone, air and chirps\nOne at a time; press again for silence',
    { height: 0.011, ink: '#d8d2c4', bold: false, maxWidth: w - 0.06 },
  );
  caption.position.set(0, h / 2 - 0.095, 0);
  face.add(caption);

  const parts = createPartSet();
  const chosen = signal<BridgeAmbienceId | null>(null);
  const sound = beginPart(kit, 'Bridge ambience');
  face.add(sound.object);
  BRIDGE_AMBIENCE_IDS.forEach((id, i) => {
    const variant = BRIDGE_AMBIENCE[id];
    const on = computed(() => chosen.value === id);
    const x = (i - (BRIDGE_AMBIENCE_IDS.length - 1) / 2) * 0.18;
    const button = parts.add(
      ledPushbutton(kit, {
        colour: i === 0 ? 'blue' : i === 1 ? 'green' : 'amber',
        legend: variant.name,
        name: `Bridge ambience ${variant.name}`,
        bound: {
          get value() {
            return on.value;
          },
          set(next: boolean) {
            chosen.value = next ? id : null;
          },
        },
      }),
    );
    button.object.position.set(x, -0.03, 0);
    face.add(button.object);
    const line = createMicroLabel(kit, variant.caption, {
      height: 0.0075,
      ink: '#b9b3a6',
      bold: false,
      maxWidth: 0.17,
    });
    line.position.set(x, -0.11, 0);
    face.add(line);
    // Not placed: a room tone is heard everywhere in its room.
    sound.holdWhile(on, bridgeAmbience(id), null);
  });
  parts.add(sound.part());
  return {
    object,
    parts,
    status: () =>
      chosen.value ? `Playing ${BRIDGE_AMBIENCE[chosen.value].name}` : 'Silent',
  };
}
