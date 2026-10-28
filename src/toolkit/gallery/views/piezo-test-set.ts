import { computed, effect, signal } from '@preact/signals-core';
import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  PlaneGeometry,
} from 'three';
import { partAudio } from '../../components/core/audio/part-audio';
import {
  beginPart,
  potentiometer,
  pushButton,
  selector,
} from '../../components/core/parts/parts';
import type { PartSet } from '../../components/core/parts/parts';
import { createPs1Material } from '../../components/core/parts/ps1-material';
import {
  createMicroLabel,
  kitPaint,
} from '../../components/core/views/eighties-controls';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { panelMakerMark } from '../../components/core/views/panel-maker-mark';
import { createCanvasTexture } from '../../components/core/views/screens';
import {
  piezoBeep,
  piezoLoop,
} from '../../components/sound/audio/piezo-recordings';
import {
  PIEZO_MEANINGS,
  PIEZO_PITCHES,
  PIEZO_ROOMS,
} from '../../components/sound/logic/piezo-beeps';
import type {
  PiezoLoopMeaning,
  PiezoMeaning,
  PiezoPitch,
  PiezoRoom,
} from '../../components/sound/logic/piezo-beeps';
import {
  piezoReadout,
  piezoSetting,
  piezoTestPress,
} from '../../components/sound/logic/piezo-test-set';

/** The bench's size, metres: its top's width and depth, and its height. */
export const PIEZO_BENCH = { width: 1.1, depth: 0.55, height: 0.8 };

/**
 * The piezo test set (mission 100): a 27 mm piezo sounder on a bench
 * controller built by Penfold Controls, for hearing the piezo beep
 * library (`components/sound/logic/piezo-beeps.ts`) in the game, placed
 * and panned as in play. Three selectors choose the beep: PITCH (low,
 * mid, high), MEANING (a thirteen-way rotary switch, its name on the
 * readout) and ROOM (the reverb rendered in: dry, small, large); TEST
 * sounds it once, or, for a looping cadence, holds it until TEST is
 * pressed again or MEANING is turned (PITCH and ROOM change it as it
 * sounds, for comparing them). The readout shows the setting and whether
 * the sounder is sounding; TEST is lit while it is. Built in metres,
 * facing +z, standing on the floor at its origin.
 */
export function createPiezoTestSet(kit: PanelKit, parts: PartSet) {
  const group = new Group();
  group.name = 'Piezo test set';
  // ---- The bench ------------------------------------------------------------
  const { width, depth, height } = PIEZO_BENCH;
  const benchPaint = kitPaint(kit, '#6b6f6a', 0.1);
  const legPaint = kitPaint(kit, '#2d3033', 0.5);
  const top = new Mesh(new BoxGeometry(width, 0.035, depth), benchPaint);
  top.position.y = height - 0.0175;
  group.add(top);
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const leg = new Mesh(
        new BoxGeometry(0.04, height - 0.035, 0.04),
        legPaint,
      );
      leg.position.set(
        sx * (width / 2 - 0.05),
        (height - 0.035) / 2,
        sz * (depth / 2 - 0.05),
      );
      group.add(leg);
    }

  // ---- The controller: a grey case with a sloping front ----------------------
  const casePaint = kitPaint(kit, '#3f454a', 0.3);
  const facePaint = kitPaint(kit, '#8a8f92', 0.2);
  const body = new Mesh(new BoxGeometry(0.5, 0.09, 0.3), casePaint);
  body.position.set(0, height + 0.045, -0.05);
  group.add(body);
  const panel = new Group();
  panel.position.set(0, height + 0.09 + 0.1, 0.02);
  panel.rotation.x = -0.62;
  group.add(panel);
  const PANEL = { width: 0.5, height: 0.26 };
  const plate = new Mesh(
    new BoxGeometry(PANEL.width, PANEL.height, 0.02),
    facePaint,
  );
  plate.position.z = -0.01;
  panel.add(plate);
  const back = new Mesh(new BoxGeometry(0.5, 0.2, 0.16), casePaint);
  back.position.set(0, height + 0.09 + 0.1, -0.14);
  group.add(back);
  panelMakerMark(kit, panel, {
    width: PANEL.width,
    height: PANEL.height,
    z: 0,
  });
  const title = createMicroLabel(kit, 'PIEZO TEST SET · PZ-27 SOUNDER', {
    height: 0.011,
    ink: '#1c1d1e',
    maxWidth: 0.34,
  });
  title.position.set(-0.05, 0.1, 0.001);
  panel.add(title);

  // ---- The sounder, on the case's top -----------------------------------------
  const sounderPaint = kitPaint(kit, '#121314', 0.1);
  const can = new Mesh(
    new CylinderGeometry(0.0145, 0.0145, 0.016, 28),
    sounderPaint,
  );
  can.position.set(0.17, height + 0.09 + 0.2 + 0.008, -0.14);
  group.add(can);
  const port = new Mesh(
    new CylinderGeometry(0.0022, 0.0022, 0.0006, 12),
    kitPaint(kit, '#000000'),
  );
  port.position.set(0, 0.0083, 0);
  can.add(port);
  const sounderLabel = createMicroLabel(kit, 'PZ-27 · 3.9 kHz', {
    height: 0.006,
    ink: '#e8e6dc',
    maxWidth: 0.1,
  });
  sounderLabel.rotation.x = -Math.PI / 2;
  sounderLabel.position.set(0.17, height + 0.09 + 0.2 + 0.0003, -0.095);
  group.add(sounderLabel);

  // ---- Its controls -------------------------------------------------------------
  const pitch = parts.add(
    selector(kit, {
      positions: 3,
      initial: PIEZO_PITCHES.indexOf('high'),
      legend: 'LOW · MID · HIGH',
      name: 'Piezo test set PITCH selector',
    }),
  );
  pitch.object.position.set(-0.18, -0.045, 0);
  panel.add(pitch.object);
  const meaning = parts.add(
    potentiometer(kit, {
      steps: PIEZO_MEANINGS.length - 1,
      initial: 0,
      legend: 'MEANING',
      name: 'Piezo test set MEANING switch',
    }),
  );
  meaning.object.position.set(-0.06, -0.045, 0);
  panel.add(meaning.object);
  const room = parts.add(
    selector(kit, {
      positions: 3,
      initial: 0,
      legend: 'DRY · SMALL · LARGE',
      name: 'Piezo test set ROOM selector',
    }),
  );
  room.object.position.set(0.07, -0.045, 0);
  panel.add(room.object);

  const setting = computed(() =>
    piezoSetting(
      pitch.position.value,
      meaning.position.value,
      room.position.value,
    ),
  );
  // The sounder, as a part: what it sounds, from where it is.
  const sounder = beginPart(kit, 'Piezo test set sounder');
  can.add(sounder.object);
  const holding = signal<PiezoLoopMeaning | null>(null);
  let beepLeft = 0;
  const beeping = signal(false);
  const sounding = computed(() => beeping.value || holding.value !== null);
  const owner = {};
  const audible = signal(true);
  // A held cadence follows PITCH and ROOM as they are turned, so the
  // three can be compared while it sounds; turning MEANING lets it go.
  const stopHolding = effect(() => {
    const held = holding.value;
    const { pitch: p, room: r, meaning: m } = setting.value;
    partAudio.hold(
      owner,
      held && held === m && audible.value
        ? piezoLoop(held, { pitch: p, room: r })
        : null,
      sounder.object,
    );
  });
  let shownMeaning = setting.value.meaning;
  sounder.updates.push((delta) => {
    if (setting.value.meaning !== shownMeaning) {
      shownMeaning = setting.value.meaning;
      holding.value = null;
    }
    if (beepLeft > 0) {
      beepLeft -= delta;
      if (beepLeft <= 0) beeping.value = false;
    }
  });
  sounder.shows(() =>
    sounding.value ? `sounding ${setting.value.meaning}` : 'silent',
  );
  sounder.disposers.push(() => {
    stopHolding();
    partAudio.hold(owner, null);
  });
  const sounderPart = sounder.part();
  parts.add({
    ...sounderPart,
    setAudible(on) {
      audible.value = on;
      sounderPart.setAudible(on);
    },
  });
  const test = () => {
    const { pitch: p, room: r, meaning: m } = setting.value;
    const action = piezoTestPress(m, holding.value !== null);
    if ('play' in action) {
      partAudio.play(
        piezoBeep(action.play, { pitch: p, room: r }),
        sounder.object,
      );
      beepLeft = action.seconds;
      beeping.value = true;
    } else if ('hold' in action) holding.value = action.hold;
    else holding.value = null;
  };
  const button = parts.add(
    pushButton(kit, {
      colour: 'green',
      head: 'illuminated',
      legend: 'TEST',
      name: 'Piezo test set TEST button',
      lamp: sounding,
      action: test,
    }),
  );
  button.object.position.set(0.185, -0.045, 0);
  panel.add(button.object);

  // ---- The readout ---------------------------------------------------------------
  const readout = createCanvasTexture(256, 64);
  kit.textures.push(readout.texture);
  const face = createPs1Material({ map: readout.texture }, true);
  kit.materials.push(face);
  const screen = new Mesh(new PlaneGeometry(0.15, 0.0375), face);
  screen.position.set(-0.05, 0.055, 0.001);
  screen.raycast = () => {};
  panel.add(screen);
  let shown = '';
  const showReadout = effect(() => {
    const [one, two] = piezoReadout(setting.value, sounding.value);
    const text = `${one}|${two}`;
    if (text === shown) return;
    shown = text;
    const c = readout.context;
    c.fillStyle = '#7f8f3a';
    c.fillRect(0, 0, 256, 64);
    c.fillStyle = '#1b2210';
    c.font = 'bold 24px monospace';
    c.textBaseline = 'middle';
    c.fillText(one, 10, 18);
    c.fillText(two, 10, 46);
    readout.texture.needsUpdate = true;
  });
  sounder.disposers.push(showReadout);

  return {
    group,
    /** Set the selectors (for tests and the console); undefined leaves one alone. */
    set(choice: {
      pitch?: PiezoPitch;
      meaning?: PiezoMeaning;
      room?: PiezoRoom;
    }) {
      const turn = (
        part: {
          position: { value: number };
          uses: Map<unknown, (d?: number) => void>;
        },
        to: number,
      ) => {
        const use = part.uses.values().next().value;
        for (let guard = 0; guard < 20 && part.position.value !== to; guard++)
          use?.(Math.sign(to - part.position.value));
      };
      if (choice.pitch) turn(pitch, PIEZO_PITCHES.indexOf(choice.pitch));
      if (choice.meaning) turn(meaning, PIEZO_MEANINGS.indexOf(choice.meaning));
      if (choice.room) turn(room, PIEZO_ROOMS.indexOf(choice.room));
    },
    /** Press TEST. */
    test: () => button.uses.values().next().value?.(),
    setting: () => setting.value,
  };
}
