import { Group } from 'three';
import type { LiveExhibit, PlantExhibit } from './exhibit';
import type { PanelKit } from '../../../components/core/views/eighties-controls';
import {
  createMicroLabel,
  createSevenSegment,
} from '../../../components/core/views/eighties-controls';
import { tools } from '../../../components/core/views/fitting-tools';
import { panelMakerMark } from '../../../components/core/views/panel-maker-mark';
import { createEngravedPlate } from '../../../components/core/views/plant-signs';
import {
  createPartSet,
  pilotLight,
  pushButton,
} from '../../../components/core/parts/parts';
import { PENFOLD_GREY } from '../../../components/industrial-control/views/control-cubicle';
import { worldStore } from '../../../save/world-store';

/**
 * dev14 and dev15: the world state at work across rooms. dev14 has a
 * push-on, push-off button; dev15, across the corridor, has a lamp that
 * shows it, a count of its presses and a RESET that turns it off. Neither
 * room holds the button's state: both show and set the one world
 * (`src/game/world.ts`), kept in the dev rooms' save slot, so it carries
 * from room to room and survives a reload. Both show the world's clock,
 * which runs on while neither room is open.
 */

/** The dev rooms' world: one save slot for all of them. */
const world = () => worldStore('dev');

/**
 * A small grey Penfold control station on the wall, `w` × `h`: `object`
 * against the wall, `face` its front, for the parts.
 */
function station(kit: PanelKit, title: string, w: number, h: number) {
  const t = tools(kit);
  const object = new Group();
  // A dark backboard behind the grey box, so it stands off the wall.
  t.box(object, t.paint('#2a2c2e', 0.7), w + 0.08, h + 0.08, 0.01, 0, 0, 0.005);
  t.box(object, t.paint(PENFOLD_GREY, 0.55), w, h, 0.12, 0, 0, 0.07);
  const face = new Group();
  face.position.z = 0.13;
  object.add(face);
  const plate = createEngravedPlate(kit, [title], {
    colour: 'white',
    width: w - 0.06,
    height: 0.05,
  });
  plate.position.set(0, h / 2 - 0.05, 0.002);
  face.add(plate);
  panelMakerMark(kit, face, {
    width: w,
    height: h,
    z: 0,
    corner: 'bottom-right',
  });
  return { object, face };
}

/** A seven-segment readout in its bezel, with a legend under it. */
function readout(
  kit: PanelKit,
  parent: Group,
  legend: string,
  x: number,
  y: number,
) {
  const t = tools(kit);
  t.box(parent, t.paint('#141516', 0.4), 0.15, 0.07, 0.01, x, y, 0.005);
  const digits = createSevenSegment(kit, 5, { digitHeight: 0.024 });
  digits.group.position.set(x, y + 0.004, 0.011);
  digits.group.traverse((o) => (o.userData.live = true));
  parent.add(digits.group);
  const label = createMicroLabel(kit, legend, {
    height: 0.009,
    ink: '#16181a',
  });
  label.position.set(x, y - 0.048, 0.002);
  parent.add(label);
  return digits;
}

/** The world's clock, whole seconds, as five digits. */
const clockText = (seconds: number) =>
  String(Math.floor(seconds) % 100000).padStart(5, ' ');

const SIZE = { w: 0.5, d: 0.15, h: 0.6, mount: 'wall', y: 1.4 } as const;

export const REMOTE_BUTTON: PlantExhibit = {
  title: 'Remote button',
  reference:
    'A push-on, push-off button in the world state: its lamp and RESET are in dev15',
  size: SIZE,
  build(kit): LiveExhibit {
    const store = world();
    const { object, face: group } = station(
      kit,
      'BUTTON  ·  LAMP IN DEV15',
      0.4,
      0.5,
    );
    const parts = createPartSet();
    // Push on, push off: each press turns it the other way.
    const button = parts.add(
      pushButton(kit, {
        colour: 'green',
        legend: 'ON / OFF',
        name: 'Remote button',
        action: () =>
          store.dispatch({ type: 'demo/set', on: !store.world.value.demo.on }),
      }),
    );
    button.object.position.set(0.08, 0.08, 0);
    group.add(button.object);
    const lamp = parts.add(
      pilotLight(kit, {
        colour: 'green',
        legend: 'ON',
        drive: store.read((w) => w.demo.on),
        pushToTest: false,
        name: 'Remote button lamp',
      }),
    );
    lamp.object.position.set(-0.08, 0.08, 0);
    group.add(lamp.object);
    const clock = readout(kit, group, 'WORLD TIME  s', 0, -0.12);
    return {
      object,
      parts,
      update: () => clock.show(clockText(store.world.value.time)),
    };
  },
};

export const REMOTE_LAMP: PlantExhibit = {
  title: 'Remote lamp',
  reference:
    'Shows dev14’s button from the world state; RESET turns it off from here',
  size: SIZE,
  build(kit): LiveExhibit {
    const store = world();
    const { object, face: group } = station(
      kit,
      'LAMP  ·  BUTTON IN DEV14',
      0.4,
      0.5,
    );
    const parts = createPartSet();
    const lamp = parts.add(
      pilotLight(kit, {
        colour: 'green',
        legend: 'BUTTON ON',
        drive: store.read((w) => w.demo.on),
        pushToTest: false,
        name: 'Remote lamp',
      }),
    );
    lamp.object.position.set(-0.08, 0.09, 0);
    group.add(lamp.object);
    const reset = parts.add(
      pushButton(kit, {
        colour: 'black',
        legend: 'RESET',
        action: () => store.dispatch({ type: 'demo/reset' }),
        name: 'Remote reset',
      }),
    );
    reset.object.position.set(0.08, 0.09, 0);
    group.add(reset.object);
    const presses = readout(kit, group, 'PRESSES', -0.09, -0.08);
    const clock = readout(kit, group, 'WORLD TIME  s', 0.09, -0.08);
    return {
      object,
      parts,
      update() {
        const w = store.world.value;
        presses.show(String(w.demo.presses).padStart(5, ' '));
        clock.show(clockText(w.time));
      },
    };
  },
};

// A development handle for the console: the dev rooms' world, to read it
// or start it afresh (`devWorld.reset()`).
if (typeof window !== 'undefined')
  (window as unknown as { devWorld: unknown }).devWorld = world();
