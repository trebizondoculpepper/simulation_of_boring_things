import { GALLERY_CONTROLS } from '../logic/gallery-controls';
import type { PortableObject } from '../../controls/input/object-handling';
import { createPcbBackplane } from '../../components/industrial-control/views/pcb-backplane';
import { computed, signal } from '@preact/signals-core';
import { BoxGeometry, Box3, Group, Mesh } from 'three';
import { MACHINE_COMPONENTS } from '../../components/industrial-control/logic/machine-components';
import { MACHINE_REFERENCES } from '../../components/industrial-control/logic/machine-references';
import {
  createMicroLabel,
  kitPaint,
} from '../../components/core/views/eighties-controls';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { machineComponent } from '../../components/industrial-control/parts/machine-components';
import {
  createPartSet,
  ledPushbutton,
  pilotLight,
  potentiometer,
  pushButton,
  selector,
} from '../../components/core/parts/parts';
import type { Part } from '../../components/core/parts/parts';
import type { TestFitting } from './test-boards';

export const MACHINE_PLINTH_WIDTH = 0.9;
/** Six plinths per row, with full walking aisles between rows. */
export const MACHINE_GALLERY_LAYOUT = MACHINE_COMPONENTS.map(([kind], i) => ({
  kind,
  x: ((i % 6) - 2.5) * 2,
  z: -2.8 + Math.floor(i / 6) * 3,
}));

/** One true-size production part per plinth; test controls use the common scheme. */
export function createMachineGallery(kit: PanelKit): TestFitting[] {
  const stone = kitPaint(kit, '#5d625f');
  const top = kitPaint(kit, '#343936');
  const panelPaint = kitPaint(kit, '#c4c6bf');
  return MACHINE_COMPONENTS.map(([kind, title]) => {
    const group = new Group();
    group.name = `${title} plinth`;
    const parts = createPartSet();
    const column = new Mesh(new BoxGeometry(0.9, 0.95, 0.9), stone);
    column.position.y = 0.475;
    group.add(column);
    const deck = new Mesh(new BoxGeometry(0.94, 0.03, 0.94), top);
    deck.position.y = 0.965;
    deck.userData.boardSupport = true;
    group.userData.placementSurface = deck;
    group.add(deck);
    const panel = new Group();
    panel.name = 'Pedestal test controls';
    panel.position.set(0, 0.991, 0.31);
    panel.rotation.x = -Math.PI / 2;
    group.add(panel);
    const face = new Mesh(new BoxGeometry(0.84, 0.3, 0.012), panelPaint);
    face.position.z = -0.006;
    panel.add(face);
    const label = (text: string, x: number, y: number, height = 0.005) => {
      const mark = createMicroLabel(kit, text, { height, ink: '#252922' });
      mark.position.set(x, y, 0.001);
      panel.add(mark);
    };
    const put = <P extends Part>(part: P, x: number, y: number) => {
      part.object.position.set(x, y, 0.012);
      panel.add(part.object);
      return parts.add(part);
    };
    const spec = GALLERY_CONTROLS[kind];
    const supply = spec.supply
      ? selector(kit, {
          positions: 2,
          initial: 1,
          series: 'xb4',
          name: `${title} supply`,
        })
      : null;
    const input = spec.input
      ? potentiometer(kit, {
          initial: kind === 'fuse' ? 0.1 : kind === 'overload' ? 0.2 : 0.5,
          name: `${title} input`,
        })
      : null;
    const level = input?.share ?? signal(0.5);
    const power = computed(() => (supply ? supply.position.value === 1 : true));
    const device = parts.add(
      machineComponent(kit, kind, {
        attachment: 'detachable',
        power,
        input: level,
        current: computed(() => level.value * 8),
        voltage: computed(() => level.value * 600),
      }),
    );
    if (kind === 'drive-power') {
      const pcb = createPcbBackplane(kit, 0.3, 0.45, 650, 'DRIVE BACKPLANE');
      pcb.position.set(-0.05, 0, -0.012);
      device.object.add(pcb);
    }
    // Put the actual geometry on the deck, without scaling or guessing its origin.
    device.object.updateMatrixWorld(true);
    const envelope = new Box3().setFromObject(device.object);
    device.object.position.set(
      -(envelope.min.x + envelope.max.x) / 2,
      0.98 - envelope.min.y,
      -(envelope.min.z + envelope.max.z) / 2 - 0.12,
    );
    group.add(device.object);
    const looseParts: PortableObject[] = [];
    device.object.traverse((object) => {
      if (object.userData.portable)
        looseParts.push(object.userData.portable as PortableObject);
    });
    const main = device.object.userData.portable as PortableObject;
    const lock = (value: boolean) => {
      for (const part of looseParts) part.component.setLocked(value);
    };
    lock(true);
    const controls: { part: Part; text: string }[] = [];
    if (supply) controls.push({ part: supply, text: 'SUPPLY' });
    if (input) controls.push({ part: input, text: spec.input! });
    if (spec.test)
      controls.push({
        part: pushButton(kit, {
          colour: 'red',
          name: `${title} ${device.testLabel}`,
          action: device.test,
        }),
        text: device.testLabel,
      });
    controls.push({
      part: pushButton(kit, {
        colour: 'blue',
        name: `${title} reset/replace`,
        action: () => {
          for (const part of looseParts) part.component.reset();
          device.repair();
          for (const card of device.cards ?? []) card.repair();
          lock(true);
        },
      }),
      text: 'RESET / RETURN',
    });
    controls.push({
      part: ledPushbutton(kit, {
        colour: 'amber',
        name: `${title} lock/release`,
        bound: {
          get value() {
            return main.component.locked.value;
          },
          set: lock,
        },
      }),
      text: 'LOCK / RELEASE',
    });
    controls.push({
      part: pilotLight(kit, {
        colour: 'green',
        name: `${title} active`,
        drive: device.active,
        pushToTest: false,
        series: 'xb4',
      }),
      text: 'ACTIVE',
    });
    controls.push({
      part: pilotLight(kit, {
        colour: 'amber',
        name: `${title} fault/withdrawn`,
        drive: device.faulted,
        pushToTest: false,
        series: 'xb4',
      }),
      text: 'FAULT / OUT',
    });
    controls.forEach(({ part, text }, i) => {
      const x =
        controls.length > 1 ? -0.35 + (i * 0.7) / (controls.length - 1) : 0;
      put(part, x, 0.035);
      label(text, x, -0.035, 0.0035);
    });
    group.userData.galleryControls = controls.map((control) => control.text);
    const reference = MACHINE_REFERENCES[kind];
    const plaque = createMicroLabel(kit, title, {
      height: 0.009,
      width: 0.84,
      ink: '#171b18',
    });
    plaque.name = 'Pedestal title';
    plaque.rotation.x = -Math.PI / 2;
    plaque.position.set(0, 0.993, 0.415);
    group.add(plaque);
    const referenceLabel = createMicroLabel(kit, reference.model, {
      height: 0.0045,
      width: 0.84,
      ink: '#30382e',
    });
    referenceLabel.name = 'Pedestal catalogue reference';
    referenceLabel.rotation.x = -Math.PI / 2;
    referenceLabel.position.set(0, 0.993, 0.446);
    group.add(referenceLabel);
    group.userData.machineReference = reference;
    return {
      group,
      parts,
      update: (_t, dt) => parts.update(dt),
      dispose: () => parts.dispose(),
    };
  });
}

/** Complete the last row, leaving museum-style service placeholders. */
export const EMPTY_GALLERY_LAYOUT = Array.from(
  {
    length:
      Math.ceil(MACHINE_COMPONENTS.length / 6) * 6 - MACHINE_COMPONENTS.length,
  },
  (_, offset) => {
    const index = MACHINE_COMPONENTS.length + offset;
    return { x: ((index % 6) - 2.5) * 2, z: -2.8 + Math.floor(index / 6) * 3 };
  },
);
export const ALL_GALLERY_LAYOUT = [
  ...MACHINE_GALLERY_LAYOUT,
  ...EMPTY_GALLERY_LAYOUT,
];

export function createEmptyMachinePlinths(kit: PanelKit): TestFitting[] {
  const stone = kitPaint(kit, '#5d625f'),
    top = kitPaint(kit, '#343936');
  const paper = kitPaint(kit, '#eee9db');
  return EMPTY_GALLERY_LAYOUT.map((_, index) => {
    const group = new Group();
    group.name = `Temporarily empty exhibit ${index + 1}`;
    group.userData.emptyExhibit = true;
    const column = new Mesh(new BoxGeometry(0.9, 0.95, 0.9), stone);
    column.position.y = 0.475;
    const deck = new Mesh(new BoxGeometry(0.94, 0.03, 0.94), top);
    deck.position.y = 0.965;
    deck.userData.boardSupport = true;
    group.userData.placementSurface = deck;
    group.add(column, deck);
    const sign = new Group();
    sign.name = 'Folded exhibit out of service card';
    sign.userData.attachment = 'fixed';
    sign.position.y = 0.98;
    group.add(sign);
    for (const yaw of [0, Math.PI]) {
      const half = new Group();
      half.rotation.y = yaw;
      sign.add(half);
      const face = new Group();
      face.position.set(0, (0.105 * Math.cos(Math.PI / 6)) / 2, 0.105 / 4);
      face.rotation.x = -Math.PI / 6;
      half.add(face);
      face.add(new Mesh(new BoxGeometry(0.21, 0.105, 0.0007), paper));
      const title = createMicroLabel(kit, 'EXHIBIT OUT OF SERVICE', {
        height: 0.008,
        maxWidth: 0.19,
        ink: '#282a25',
      });
      title.position.set(0, 0.008, 0.00045);
      face.add(title);
      const note = createMicroLabel(
        kit,
        'Temporarily removed by the curators',
        {
          height: 0.003,
          maxWidth: 0.19,
          ink: '#55564d',
          bold: false,
        },
      );
      note.position.set(0, -0.012, 0.00045);
      face.add(note);
    }
    const parts = createPartSet();
    return { group, parts, update: () => {}, dispose: () => parts.dispose() };
  });
}
