import {
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  TorusGeometry,
} from 'three';
import { ExtrudeGeometry, Shape } from 'three';
import type { Object3D, Vector2 } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { PanelKit } from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';
import { createCanvasTexture } from '../../core/views/screens';
import { createBootInset } from '../../core/views/boot-screens';
import type { BootDrawOptions } from '../../core/views/boot-screens';
import type { BootFrame } from '../../core/logic/boot-sequence';
import { setLcdBacklight } from '../../core/views/display-reach';
import { createBrandBadge } from '../../core/views/brand-badge';
import { createPs1Material } from '../../core/parts/ps1-material';
import { createPartSet, doorLatch, selector } from '../../core/parts/parts';
import { signal } from '@preact/signals-core';
import { createGlassRotameter } from './small-flowmeters';
import { piezoSounder } from '../../sound/audio/piezo-recordings';
import type {
  PiezoLoopMeaning,
  PiezoOneShot,
} from '../../sound/logic/piezo-beeps';
import { partAudio } from '../../core/audio/part-audio';
import type { LoopRecipe } from '../../core/audio/part-audio';
import { PERISTALTIC_PUMP } from '../audio/dosing-pump-sounds';
import { SCREEN } from '../../../../game/plant/aqualis-types';
import type { Selector } from '../../../../game/plant/aqualis-types';
import {
  CABINET,
  CABINET_MODELS,
  DOOR_OPEN,
  OVERLAY,
  OVERLAY_SCALE,
  overlayCanvasSize,
  POSTIT,
  POSTIT_TEXT,
  overlayPixel,
  GLAND_LABELS,
  glandsOf,
  portsOf,
  CONTROL_PLATE,
  KNOB_AT,
  POWER_AT,
  LEDS,
  PORTS,
  SAMPLE_VALVE_AT,
  POD_HALF,
  SCREEN_AREA,
  SCREEN_AT,
  SCREEN_POD,
  screenTilt,
  screenPixel,
  selectorAt,
  selectorIndex,
} from '../logic/aqualis-cabinet';
import type { CabinetModel, LedId, LedState } from '../logic/aqualis-cabinet';

/**
 * The Aqualis Interactive water-quality controller (mission 114,
 * `doc/plans/114/`): a floor-standing white cabinet of the early 2000s, its
 * lower section the sampling and wet chemistry behind an opaque white door
 * (the flow cell and its probes, the sample rotameter, the reagent bottles,
 * the sample pump, its circuit boards; drawn only while the door is open or
 * opening, so a shut cabinet costs nothing for its insides), the sample
 * inlet and outlet out of its side, an isolating ball valve on the inlet;
 * its upper section the compute and control: on its door a 12-inch colour
 * TFT (a canvas texture, `SCREEN`, a backlit `lcd`, washing out off its
 * narrow angle and black with its power off) and its status lamps; its
 * engraved HAND · OFF · AUTO selector and its power switch on a plate
 * inside the lower section, behind its door's catch; cable glands on top for
 * its three control ports and its alarm output. A glossy rounded top cap and
 * a blue accent strip, as the period liked.
 *
 * Its origin is on the floor at the middle of its back, facing +z. The
 * screen's content is the host's: drawn into `context`, then
 * `screenChanged()` uploads it, so it is uploaded only when it changes. A
 * touch arrives as a mesh and its UV through the room's controls, never a
 * key of its own.
 */

export interface CabinetHost {
  /** A touch on the screen, in its pixels (x right, y down, `SCREEN`). */
  screenTouch(x: number, y: number): void;
  /** Whether a touch there would do anything (the crosshair); any touch counts if left out. */
  screenAimed?(x: number, y: number): boolean;
  /** The knob turned to `s`. */
  selector?(s: Selector): void;
  /** The sample inlet's valve opened or shut. */
  sampleValve?(open: boolean): void;
  /** Its own power switch, at the top of the lower door, turned off or on. */
  power?(on: boolean): void;
}

/**
 * The sample pump's sound: the dosing room's peristaltic pump's geared
 * whirr (`PERISTALTIC_PUMP`), a third as loud, a small pump behind a door.
 */
const SAMPLE_PUMP_SOUND: LoopRecipe = (context, out) => {
  const quiet = context.createGain();
  quiet.gain.value = 0.35;
  quiet.connect(out);
  const sources = PERISTALTIC_PUMP(context, quiet);
  return [
    ...sources,
    {
      stop: () => quiet.disconnect(),
    },
  ];
};

/** The screen's brightness: its white is this grey, under the bloom threshold (as the console's). */
const SCREEN_LEVEL = 0xb8b8b8;

/** The handwriting the developer's note is in: whatever of these the browser has. */
const HAND =
  "'Bradley Hand', 'Segoe Print', 'Comic Sans MS', 'Chalkboard SE', cursive";

/** The developer's Post-it: yellow, a little shadowed at its top, in a hurried hand. */
function drawPostIt(c: CanvasRenderingContext2D, cw: number, ch: number) {
  c.fillStyle = '#fbe96a';
  c.fillRect(0, 0, cw, ch);
  const glue = c.createLinearGradient(0, 0, 0, ch * 0.18);
  glue.addColorStop(0, 'rgba(160,130,0,0.25)');
  glue.addColorStop(1, 'rgba(160,130,0,0)');
  c.fillStyle = glue;
  c.fillRect(0, 0, cw, ch * 0.18);
  c.fillStyle = '#1d2a6b';
  c.textBaseline = 'top';
  const pad = cw * 0.06;
  let y = pad;
  const line = (text: string, size: number, gap: number) => {
    c.font = `${size}px ${HAND}`;
    let row = '';
    for (const word of text.split(' ')) {
      const next = row ? `${row} ${word}` : word;
      if (c.measureText(next).width > cw - 2 * pad && row) {
        c.fillText(row, pad, y);
        y += size * 1.12;
        row = word;
      } else row = next;
    }
    if (row) c.fillText(row, pad, y);
    y += size * 1.12 + gap;
  };
  const s = cw / 384;
  line(POSTIT_TEXT[0], 30 * s, 6 * s);
  line(POSTIT_TEXT[1], 26 * s, 8 * s);
  line(POSTIT_TEXT[2], 26 * s, 4 * s);
  // A signature and a little heart.
  c.font = `${28 * s}px ${HAND}`;
  c.textAlign = 'right';
  c.fillText('— the dev ♥', cw - pad, Math.min(y, ch - pad - 30 * s));
  c.textAlign = 'left';
}

export function createAqualisCabinet(
  kit: PanelKit,
  host: CabinetHost,
  /** Which of the Dr Aqualis series: its name, and its control glands (3, 2 or 0). */
  model: CabinetModel = 'trio',
  /** The overlay canvas's resolution against the screen's (`OVERLAY_SCALE`). */
  overlayScale = OVERLAY_SCALE,
) {
  const info = CABINET_MODELS[model];
  const t = tools(kit);
  const group = new Group();
  group.name = info.name;
  const { w, h, d, plinth, split, cap, door } = CABINET;
  const white = t.paint('#eef1f2', 0.35);
  const whiteDoor = t.paint('#f6f8f9', 0.25);
  const grey = t.paint('#c3c9cc', 0.5);
  const dark = t.paint('#1a1d20', 0.4);
  const blue = t.paint('#1f7fd6', 0.25, 0.1);
  const pvc = t.paint('#8a9094', 0.5);
  const steel = t.paint('#a7adb1', 0.35, 0.7);
  const front = d;

  // ---- The carcass, plinth and top cap ---------------------------------------------
  t.box(
    group,
    t.paint('#4a5056', 0.8),
    w - 0.04,
    plinth,
    d - 0.04,
    0,
    plinth / 2,
    d / 2,
  );
  // The upper section's carcass is closed; the lower's is a shell (sides,
  // back, floor and roof), so its open door shows the wet chemistry inside.
  const upperH = h - cap - split;
  t.box(
    group,
    white,
    w,
    upperH,
    d - door,
    0,
    split + upperH / 2,
    (d - door) / 2,
  );
  const lowerH = split - plinth;
  const skin = 0.015;
  for (const x of [-w / 2 + skin / 2, w / 2 - skin / 2])
    t.box(
      group,
      white,
      skin,
      lowerH,
      d - door,
      x,
      plinth + lowerH / 2,
      (d - door) / 2,
    );
  t.box(group, white, w, lowerH, skin, 0, plinth + lowerH / 2, skin / 2);
  t.box(group, white, w, skin, d - door, 0, plinth + skin / 2, (d - door) / 2);
  const capMesh = new Mesh(
    new RoundedBoxGeometry(w + 0.02, cap + 0.02, d + 0.02, 4, 0.025),
    t.paint('#fbfcfd', 0.15),
  );
  capMesh.position.set(0, h - cap / 2 - 0.01, d / 2);
  group.add(capMesh);
  // The blue accent strip along the cap's front, and the dark seam between the sections.
  t.box(group, blue, w + 0.004, 0.014, 0.004, 0, h - cap + 0.004, d + 0.012);
  t.box(group, dark, w, 0.008, 0.004, 0, split, front);

  // ---- The lower section: the wet chemistry behind its door -------------------------
  const lowH = split - plinth - 0.006;
  const lowY = plinth + lowH / 2;
  const frameW = 0.05;
  // The door: an opaque white leaf, as the cabinet, hinged on its right edge
  // so it swings clear of the sample valve on the left; its catch on the left.
  const lowerDoor = new Group();
  lowerDoor.name = `${info.name} lower door`;
  lowerDoor.position.set(w / 2, 0, front - door / 2);
  group.add(lowerDoor);
  const leaf = (mesh: Mesh) => {
    mesh.name = lowerDoor.name;
    return mesh;
  };
  leaf(t.box(lowerDoor, whiteDoor, w, lowH, door, -w / 2, lowY, 0));
  // Its hinges, on the right.
  for (const y of [plinth + 0.12, split - 0.12])
    t.cyl(
      group,
      steel,
      0.006,
      0.06,
      w / 2 + 0.002,
      y,
      front - door / 2,
      'y',
      8,
    );
  // The developer's note, stuck inside the door's left stile.
  // Drawn once on its own canvas: it never changes, so it never uploads again.
  const noteCanvas = createCanvasTexture(256, 256);
  drawPostIt(noteCanvas.context, 256, 256);
  noteCanvas.texture.needsUpdate = true;
  kit.textures.push(noteCanvas.texture);
  const notePaper = createPs1Material({ map: noteCanvas.texture });
  kit.materials.push(notePaper);
  const note = new Mesh(new PlaneGeometry(POSTIT.m, POSTIT.m), notePaper);
  note.position.set(-w + frameW / 2 + 0.012, plinth + 0.3, -door / 2 - 0.001);
  note.rotation.set(0, Math.PI, 0.06);
  note.name = lowerDoor.name;
  lowerDoor.add(note);
  const doorMeshes = new Set<Object3D>();
  lowerDoor.traverse((o) => doorMeshes.add(o));
  const parts = createPartSet();
  // The door's catch (the owner, 2026-10-31): the quarter-turn wing latch
  // the game's other cabinet doors have (`doorLatch`), with its sounds; a
  // click on it, or on the door, turns it and opens the door or shuts it.
  const doorState = signal(false);
  const latch = parts.add(
    doorLatch(kit, {
      material: t.paint('#25292c', 0.45),
      bound: {
        get value() {
          return doorState.value;
        },
        set: (open: boolean) => {
          doorState.value = open;
          showContents();
        },
      },
      name: `${info.name} lower door catch`,
    }),
  );
  latch.object.position.set(-w + frameW / 2 + 0.008, lowY, door / 2);
  lowerDoor.add(latch.object);
  const latchUse = [...latch.uses.values()][0];
  let latchAngle = 0;
  // Everything inside the lower section, drawn only while its door is
  // open or opening (the owner, 2026-10-31); the note inside the door with it.
  const contents = new Group();
  contents.name = `${info.name} lower section contents`;
  contents.visible = false;
  // Shown and hidden: never merged with the still parts (`mergeStatic`).
  contents.userData.live = true;
  note.userData.live = true;
  note.visible = false;
  group.add(contents);
  // Inside: a pale back plate, with the analyser's plumbing on it.
  const back = 0.03;
  t.box(
    contents,
    t.paint('#d9dee1', 0.7),
    w - 0.06,
    lowH - 0.04,
    0.01,
    0,
    lowY,
    back,
  );
  const inside = new Group();
  inside.position.set(0, 0, back + 0.005);
  contents.add(inside);
  // The flow cell: a clear acrylic block, its four probes standing in it.
  const cellY = 0.66;
  const acrylic = createPs1Material({
    color: '#bfe6ff',
    transparent: true,
    opacity: 0.45,
    roughness: 0.1,
  });
  kit.materials.push(acrylic);
  t.box(inside, acrylic, 0.26, 0.09, 0.07, 0.06, cellY, 0.05);
  t.box(inside, grey, 0.28, 0.012, 0.08, 0.06, cellY - 0.051, 0.05);
  const probeCaps = ['#2e3438', '#c33a2a', '#2a6ec3', '#2e3438'];
  probeCaps.forEach((c, i) => {
    const x = -0.04 + i * 0.065;
    t.cyl(inside, t.paint('#20262a', 0.4), 0.009, 0.16, x, cellY + 0.06, 0.05);
    t.cyl(inside, t.paint(c, 0.4), 0.013, 0.03, x, cellY + 0.15, 0.05);
    // Each probe's cable up to the upper section.
    t.cyl(
      inside,
      dark,
      0.003,
      split - cellY - 0.17,
      x,
      (split + cellY + 0.17) / 2,
      0.05,
    );
  });
  t.label(inside, 'ANALYSIS CELL', 0.06, cellY - 0.07, 0.092, 0.012, '#30383e');
  // The sample rotameter, upright on the left, its float riding with the flow.
  const meter = createGlassRotameter(kit, { od: 0.016, tag: 'AQ-FI', max: 60 });
  meter.group.rotation.z = Math.PI / 2;
  meter.group.scale.setScalar(0.9);
  meter.group.position.set(-0.2, 0.52, 0.05);
  // The reagents' shelf.
  t.box(inside, grey, w - 0.08, 0.012, 0.12, 0, plinth + 0.074, 0.06);
  inside.add(meter.group);
  // The reagent bottles on the floor of the section.
  const reagents = [
    { colour: '#f5f2e6', cap: '#c3352a', label: 'DPD 1' },
    { colour: '#f5f2e6', cap: '#2a63c3', label: 'DPD 3' },
    { colour: '#e9dcae', cap: '#3a9a3a', label: 'BUFFER' },
    { colour: '#d8ecf2', cap: '#e0a21c', label: 'TA' },
  ];
  reagents.forEach((r, i) => {
    const x = -0.14 + i * 0.095;
    t.cyl(
      inside,
      t.paint(r.colour, 0.3),
      0.032,
      0.15,
      x,
      plinth + 0.08 + 0.075,
      0.06,
    );
    t.cyl(
      inside,
      t.paint(r.cap, 0.4),
      0.016,
      0.025,
      x,
      plinth + 0.08 + 0.16,
      0.06,
    );
    t.label(
      inside,
      r.label,
      x,
      plinth + 0.17,
      0.0925,
      0.011,
      '#30383e',
      '#ffffff',
    );
    t.cyl(
      inside,
      t.paint('#e8e8e0', 0.5),
      0.002,
      cellY - plinth - 0.3,
      x,
      (cellY + plinth + 0.2) / 2,
      0.055,
    );
  });
  // The sample's way: in at the side, up to the meter, across to the cell, out at the side.
  const pipe = (
    len: number,
    x: number,
    y: number,
    z: number,
    axis: 'x' | 'y' | 'z',
  ) => t.cyl(inside, pvc, 0.007, len, x, y, z, axis, 10);
  pipe(0.13, -w / 2 + 0.065, PORTS.sampleIn.at[1], 0.05, 'x');
  pipe(0.33, -0.19, (PORTS.sampleIn.at[1] + 0.53) / 2, 0.05, 'y');
  pipe(0.18, 0.2, cellY - 0.09 - 0.09, 0.05, 'y');
  pipe(0.47, -0.035, PORTS.sampleOut.at[1] + 0.13, 0.03, 'x');
  // The sample pump: a small peristaltic pump drawing the sample from the
  // meter and driving it up into the analysis cell, its rotor turning while
  // the sample flows.
  const pumpAt = { x: 0.03, y: 0.47, z: 0.04 };
  t.box(
    inside,
    t.paint('#3b4a57', 0.5),
    0.09,
    0.09,
    0.06,
    pumpAt.x,
    pumpAt.y,
    pumpAt.z,
  );
  t.cyl(
    inside,
    t.paint('#d7dde0', 0.3),
    0.036,
    0.012,
    pumpAt.x,
    pumpAt.y,
    pumpAt.z + 0.036,
    'z',
    24,
  );
  const rotor = new Group();
  rotor.position.set(pumpAt.x, pumpAt.y, pumpAt.z + 0.046);
  inside.add(rotor);
  const rollerPaint = t.paint('#e3e6e8', 0.3, 0.5);
  t.cyl(rotor, t.paint('#2a2f33', 0.4), 0.008, 0.012, 0, 0, 0, 'z', 12);
  for (let k = 0; k < 3; k++) {
    const a = (k * 2 * Math.PI) / 3;
    t.box(
      rotor,
      t.paint('#2a2f33', 0.4),
      0.004,
      0.022,
      0.004,
      Math.sin(a) * 0.011,
      Math.cos(a) * 0.011,
      0,
    ).rotation.z = -a;
    t.cyl(
      rotor,
      rollerPaint,
      0.006,
      0.012,
      Math.sin(a) * 0.022,
      Math.cos(a) * 0.022,
      0,
      'z',
      10,
    );
  }
  const tubing = createPs1Material({
    color: '#efe9d8',
    transparent: true,
    opacity: 0.85,
    roughness: 0.3,
  });
  kit.materials.push(tubing);
  // The pump's tube round its rollers, then in from the meter and up to the cell.
  const loop = new Mesh(new TorusGeometry(0.03, 0.004, 6, 20, Math.PI), tubing);
  loop.position.set(pumpAt.x, pumpAt.y, pumpAt.z + 0.046);
  loop.rotation.z = Math.PI;
  inside.add(loop);
  const tube = (
    len: number,
    x: number,
    y: number,
    z: number,
    axis: 'x' | 'y' | 'z',
  ) => t.cyl(inside, tubing, 0.004, len, x, y, z, axis, 8);
  tube(0.17, -0.115, 0.69, pumpAt.z + 0.046, 'x');
  tube(0.22, -0.03, 0.58, pumpAt.z + 0.046, 'y');
  tube(0.11, 0.06, 0.525, pumpAt.z + 0.046, 'y');
  t.label(
    inside,
    'SAMPLE PUMP',
    pumpAt.x,
    pumpAt.y - 0.058,
    pumpAt.z + 0.031,
    0.009,
    '#30383e',
  );
  // The analyser's circuit boards, green, on brass standoffs: one on the
  // back plate, one on the right-hand wall.
  const pcb = t.paint('#1f6b35', 0.45);
  const chip = t.paint('#16181a', 0.4);
  const brass = t.paint('#b08d3c', 0.35, 0.7);
  const board = (parent: Group, bw: number, bh: number, seed: number) => {
    const g = new Group();
    parent.add(g);
    t.box(g, pcb, bw, bh, 0.002, 0, 0, 0.012);
    for (const [sx, sy] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ])
      t.cyl(
        g,
        brass,
        0.003,
        0.012,
        (sx * (bw - 0.012)) / 2,
        (sy * (bh - 0.012)) / 2,
        0.006,
        'z',
        6,
      );
    // Its chips, a crystal and a row of header pins, laid out by its seed.
    for (let k = 0; k < 4; k++) {
      const cw = 0.012 + ((seed * 7 + k * 5) % 4) * 0.004;
      t.box(
        g,
        chip,
        cw,
        0.01,
        0.003,
        -bw / 2 + 0.014 + (k * (bw - 0.02)) / 4 + cw / 2 - 0.004,
        bh / 2 - 0.022 - (k % 2) * 0.022,
        0.0145,
      );
    }
    t.box(
      g,
      t.paint('#c9cdd0', 0.3, 0.8),
      0.008,
      0.004,
      0.003,
      bw / 2 - 0.014,
      -bh / 2 + 0.012,
      0.0145,
    );
    t.box(
      g,
      t.paint('#202224', 0.4),
      bw * 0.6,
      0.005,
      0.006,
      0,
      -bh / 2 + 0.008,
      0.016,
    );
    return g;
  };
  board(inside, 0.1, 0.085, 1).position.set(-0.115, 0.475, -0.012);
  const sideBoard = board(contents, 0.14, 0.1, 2);
  sideBoard.position.set(w / 2 - 0.015, 0.56, 0.16);
  sideBoard.rotation.y = -Math.PI / 2;
  // The sample pipes out of the side, and the inlet's ball valve on its pipe.
  for (const port of [PORTS.sampleIn, PORTS.sampleOut]) {
    const [x, y, z] = port.at;
    t.cyl(group, pvc, 0.011, 0.18, x - 0.09, y, z, 'x', 12);
    t.cyl(group, steel, 0.016, 0.02, x - 0.005, y, z, 'x', 12);
  }
  const valve = new Group();
  valve.position.set(...SAMPLE_VALVE_AT);
  group.add(valve);
  t.cyl(valve, t.paint('#5c6367', 0.4), 0.019, 0.05, 0, 0, 0, 'x', 14);
  t.cyl(valve, steel, 0.005, 0.03, 0, 0.025, 0);
  const lever = new Group();
  lever.position.set(0, 0.04, 0);
  valve.add(lever);
  const handle = t.box(
    lever,
    t.paint('#c8281e', 0.5),
    0.09,
    0.012,
    0.016,
    0.035,
    0,
    0,
  );
  handle.name = 'Aqualis sample inlet valve';
  t.label(
    group,
    'SAMPLE IN',
    SAMPLE_VALVE_AT[0],
    0.27,
    SAMPLE_VALVE_AT[2] + 0.03,
    0.012,
    '#1b1b1b',
    '#ffffff',
  );
  t.label(
    group,
    'SAMPLE OUT',
    SAMPLE_VALVE_AT[0],
    0.075,
    SAMPLE_VALVE_AT[2] + 0.03,
    0.012,
    '#1b1b1b',
    '#ffffff',
  );

  // ---- The upper section: the compute and control -----------------------------------
  const upH = h - cap - split - 0.006;
  const upY = split + 0.006 + upH / 2;
  // Its door is fixed, not meant to be opened: no handle (the owner, 2026-10-31).
  t.box(group, whiteDoor, w, upH, door, 0, upY, front - door / 2);
  const face = new Group();
  face.position.set(0, 0, front);
  group.add(face);
  const S = SCREEN_AREA;
  // The screen's tilting pod (the owner, 2026-10-31): turned about its top
  // edge, where it always was, so its face looks up at the eye of someone
  // standing a hand's span from the door (`screenTilt`); its
  // children are placed about the screen's middle, `POD_HALF` below the
  // hinge. A wedge of the cabinet's white closes it in beneath.
  const tilt = screenTilt();
  const hinge = new Group();
  hinge.position.set(SCREEN_AT.x, SCREEN_POD.top, 0);
  hinge.rotation.x = -tilt;
  face.add(hinge);
  const pod = new Group();
  pod.position.set(0, -POD_HALF, 0);
  hinge.add(pod);
  const podW = S.w + 2 * S.bezel + 0.008;
  const wedgeShape = new Shape();
  const drop = 2 * POD_HALF * Math.cos(tilt);
  const out = 2 * POD_HALF * Math.sin(tilt);
  // Its lower front edge, under the screen's foot, rounded off (the owner,
  // 2026-10-31: "less sharp"): the corner cut back `round` along both its
  // faces and joined by a curve.
  const round = 0.02;
  const foot = { x: out, y: SCREEN_POD.top - drop };
  const along = Math.hypot(out, drop);
  wedgeShape.moveTo(0, SCREEN_POD.top);
  wedgeShape.lineTo(
    foot.x - (out / along) * round,
    foot.y + (drop / along) * round,
  );
  wedgeShape.quadraticCurveTo(foot.x, foot.y, foot.x - round, foot.y);
  wedgeShape.lineTo(0, foot.y);
  wedgeShape.closePath();
  const wedgeGeometry = new ExtrudeGeometry(wedgeShape, {
    depth: podW,
    bevelEnabled: false,
    curveSegments: 8,
  });
  // The shape's x is out from the door; turned so it is, and centred across.
  wedgeGeometry.rotateY(-Math.PI / 2);
  wedgeGeometry.translate(SCREEN_AT.x + podW / 2, 0, -0.001);
  const wedge = new Mesh(wedgeGeometry, whiteDoor);
  wedge.name = 'Aqualis screen pod';
  face.add(wedge);
  // The screen's bezel: a dark glossy frame, a silver rim round it.
  t.box(
    pod,
    t.paint('#b9c0c5', 0.25, 0.6),
    S.w + 2 * S.bezel + 0.008,
    S.h + 2 * S.bezel + 0.008,
    0.008,
    0,
    0,
    0.004,
  );
  t.box(
    pod,
    t.paint('#111418', 0.15),
    S.w + 2 * S.bezel,
    S.h + 2 * S.bezel,
    0.01,
    0,
    0,
    0.007,
  );
  // A colour TFT of its period (the owner, 2026-10-31): a backlit `lcd`,
  // washed out off its narrow angle, black with its power off; quicker than
  // a character LCD, it shows Dr Aqualis's 10 Hz.
  const { context, texture } = createCanvasTexture(SCREEN.w, SCREEN.h, 'lcd', {
    maxHz: 10,
  });
  kit.textures.push(texture);
  const material = new MeshBasicMaterial({
    map: texture,
    toneMapped: false,
    color: SCREEN_LEVEL,
  });
  kit.materials.push(material);
  const screen = new Mesh(new PlaneGeometry(S.w, S.h), material);
  screen.position.set(0, 0, 0.0125);
  screen.name = 'Aqualis touch screen';
  pod.add(screen);
  // Dr Aqualis's overlay: a canvas of its own just in front of the screen,
  // transparent where he is not, so his frames upload a fraction of it.
  const overSize = overlayCanvasSize(overlayScale);
  const over = createCanvasTexture(overSize.w, overSize.h, 'lcd', {
    maxHz: 10,
  });
  // Drawn in the box's own pixels (0 to OVERLAY.w across), whatever its resolution.
  const toBox = () =>
    over.context.setTransform(
      overSize.w / OVERLAY.w,
      0,
      0,
      overSize.h / OVERLAY.h,
      0,
      0,
    );
  toBox();
  kit.textures.push(over.texture);
  const overMaterial = new MeshBasicMaterial({
    map: over.texture,
    toneMapped: false,
    color: SCREEN_LEVEL,
    transparent: true,
    depthWrite: false,
  });
  kit.materials.push(overMaterial);
  const pxW = S.w / SCREEN.w;
  const pxH = S.h / SCREEN.h;
  const overlayMesh = new Mesh(
    new PlaneGeometry(OVERLAY.w * pxW, OVERLAY.h * pxH),
    overMaterial,
  );
  overlayMesh.position.set(
    -S.w / 2 + (OVERLAY.x + OVERLAY.w / 2) * pxW,
    S.h / 2 - (OVERLAY.y + OVERLAY.h / 2) * pxH,
    0.013,
  );
  overlayMesh.renderOrder = 3;
  overlayMesh.name = 'Aqualis touch screen (Dr Aqualis)';
  overlayMesh.visible = false;
  pod.add(overlayMesh);
  over.context.clearRect(0, 0, OVERLAY.w, OVERLAY.h);
  // Its boot's live element (a memory count, the marquee, a spinner, the
  // splash's bar) on a small canvas of its own over the screen, so the
  // boot uploads the whole screen only when its still picture changes.
  const bootInset = createBootInset({
    px: SCREEN,
    size: { w: S.w, h: S.h },
    kind: 'lcd',
    level: SCREEN_LEVEL,
    maxHz: 10,
  });
  screen.add(bootInset.mesh);
  // The maker's badge above the screen; the bezel itself plain (the owner,
  // 2026-10-31).

  const badge = createBrandBadge(kit, 'aqualis', {
    height: 0.04,
    maxWidth: 0.3,
  });
  badge.position.set(0, h - cap - 0.05, 0.002);
  face.add(badge);
  // A blue accent strip across the door below the badge, the period's swoosh.
  t.box(face, blue, w - 0.06, 0.006, 0.002, 0, h - cap - 0.085, 0.001);
  // ---- The inside control plate: the selector and the power switch -----------------
  // Inside the lower section, near its top (the owner, 2026-10-31): reached
  // by opening the lower door, drawn and usable only while it is open, with
  // the rest of the section's insides. Their positions are signals, so the
  // knobs' views follow what they are bound to (a plain variable behind a
  // binding never told the knob's computed position it had moved, so the
  // knob never turned on screen and every later turn started from where it
  // was built).
  const P = CONTROL_PLATE;
  const plateZ = P.z - 0.003;
  t.box(contents, t.paint('#dfe4e7', 0.4), P.w, P.h, 0.004, P.x, P.y, plateZ);
  // Its flange back to the section's left wall, which holds it.
  t.box(
    contents,
    t.paint('#c9cfd2', 0.45),
    0.004,
    P.h,
    0.06,
    P.x - P.w / 2 + 0.002,
    P.y,
    plateZ - 0.03,
  );
  // The HAND · OFF · AUTO selector, its positions engraved under it.
  const sel = signal<Selector>('auto');
  const knob = parts.add(
    selector(kit, {
      positions: 3,
      initial: selectorIndex(sel.peek()),
      bound: {
        get value() {
          return selectorIndex(sel.value);
        },
        set: (k: number) => {
          sel.value = selectorAt(k);
          host.selector?.(sel.peek());
        },
      },
      legend: 'HAND · OFF · AUTO',
      name: `${info.name} HAND OFF AUTO selector`,
    }),
  );
  knob.object.position.set(KNOB_AT.x, KNOB_AT.y, P.z);
  contents.add(knob.object);

  // Each knob's positions are on its own legend tag above it, its title
  // above that: no second legend below (the owner, 2026-10-31).
  // Its own power switch (the owner, 2026-10-31): OFF · ON, on from the
  // start; off and on again, it power-cycles the computer.
  const mainOn = signal(true);
  const mainSwitch = parts.add(
    selector(kit, {
      positions: 2,
      initial: 1,
      bound: {
        get value() {
          return mainOn.value ? 1 : 0;
        },
        set: (k: number) => {
          mainOn.value = k === 1;
          host.power?.(mainOn.peek());
        },
      },
      legend: 'OFF · ON',
      name: `${info.name} power switch`,
    }),
  );
  mainSwitch.object.position.set(POWER_AT.x, POWER_AT.y, P.z);
  contents.add(mainSwitch.object);
  t.label(
    contents,
    'POWER',
    POWER_AT.x,
    POWER_AT.y + 0.05,
    P.z + 0.0005,
    0.009,
    '#1b1b1b',
  );

  t.label(
    contents,
    'CONTROL',
    KNOB_AT.x,
    KNOB_AT.y + 0.05,
    P.z + 0.0005,
    0.009,
    '#1b1b1b',
  );
  /** Each knob's whole part (its ring nut and legend too), to the use it works. */
  const knobs = new Map<Object3D, (direction?: number) => void>();
  for (const k of [knob, mainSwitch])
    knobs.set(k.object, [...k.uses.values()][0]);
  // Its piezo sounder, behind the upper door.
  const sounder = piezoSounder({ pitch: 'high', room: 'small' }, group);
  let looping: PiezoLoopMeaning | null = null;
  // The status lamps, each with its legend under it.
  const leds = new Map<LedId, ReturnType<typeof t.led>>();
  for (const l of LEDS) {
    t.cyl(
      face,
      t.paint('#c9cfd2', 0.3, 0.5),
      0.011,
      0.006,
      l.x,
      l.y,
      0.003,
      'z',
      16,
    );
    leds.set(l.id, t.led(face, l.colour, 0.0075, l.x, l.y, 0.007));
    t.label(face, l.label, l.x, l.y - 0.025, 0.002, 0.009, '#3a4248');
  }
  // A key-locked latch, and the controller's rating plate low on the door.
  t.label(
    face,
    `AQUALIS INTERACTIVE · ${info.name.toUpperCase()} · ${info.code} · 230 V 50 Hz · IP65`,
    0,
    split + 0.03,
    0.002,
    0.008,
    '#59636a',
  );

  // ---- The glands on top: the control ports and the alarm output --------------------
  for (const id of glandsOf(model)) {
    const label = GLAND_LABELS[id];
    const [x, , z] = PORTS[id].at;
    t.cyl(
      group,
      t.paint('#2b2f33', 0.5),
      0.012,
      0.03,
      x,
      h + 0.005,
      z,
      'y',
      12,
    );
    t.cyl(
      group,
      t.paint('#2b2f33', 0.5),
      0.016,
      0.012,
      x,
      h + 0.025,
      z,
      'y',
      6,
    );
    // Its cable away up the wall, cut short (the room routes the rest).
    t.cyl(
      group,
      t.paint(id === 'alarm' ? '#d43a2a' : '#30363b', 0.6),
      0.006,
      0.25,
      x,
      h + 0.15,
      z,
      'y',
      8,
    );
    const tag = t.label(
      group,
      label,
      x,
      h + 0.0005,
      z + 0.035,
      0.012,
      '#1b1b1b',
    );
    tag.rotation.x = -Math.PI / 2;
  }

  // ---- State -----------------------------------------------------------------------
  let valveOpen = true;
  let leverAngle = 0;
  let sampleFlow = 30;
  /** Whether its sample pump's whirr is held, and the owner it is held by. */
  let pumpHeard = false;
  const samplePumpSound = {};
  /** The lower door: open or shut (its catch's state), and where its swing is. */
  const doorOpen = () => doorState.peek();
  let doorAngle = 0;
  let powered = true;
  /** Whether the host wants Dr Aqualis's overlay shown, and whether a drawing waits for the power. */
  let overlayWanted = false;
  let screenWaiting = false;
  let overlayWaiting = false;
  /** The lower section's insides drawn only while its door is open or opening. */
  const showContents = () => {
    const shown = doorOpen() || doorAngle > 0;
    contents.visible = shown;
    note.visible = shown;
  };

  // Black until its host draws (its boot, as a rule).
  context.fillStyle = '#000000';
  context.fillRect(0, 0, SCREEN.w, SCREEN.h);
  texture.needsUpdate = true;

  /** Whether an object is drawn: it and every parent visible (a ray hits hidden meshes too). */
  const drawn = (object: Object3D) => {
    for (let o: Object3D | null = object; o; o = o.parent)
      if (!o.visible) return false;
    return true;
  };
  /**
   * The use a hit works, from the mesh up: a knob's whole part (its ring
   * nut and legend as well as its lever), the door's catch, or the door
   * itself through its catch; nothing hidden (the knobs while the door is
   * shut).
   */
  const useOf = (object: Object3D) => {
    if (!drawn(object)) return null;
    if (doorMeshes.has(object)) return latchUse;
    for (let o: Object3D | null = object; o; o = o.parent) {
      const use = parts.uses.get(o) ?? knobs.get(o);
      if (use) return use;
    }
    return null;
  };

  const doorTouchables: Object3D[] = [
    screen,
    overlayMesh,
    handle,
    ...doorMeshes,
    ...latch.uses.keys(),
  ];
  const insideTouchables: Object3D[] = [knob.object, mainSwitch.object];
  /** A touch on the screen or its overlay, as the screen's pixels. */
  const pixelOf = (object: Object3D, uv: Vector2 | undefined) =>
    !uv
      ? null
      : object === screen
        ? screenPixel(uv.x, uv.y)
        : object === overlayMesh
          ? overlayPixel(uv.x, uv.y)
          : null;

  return {
    group,
    /**
     * What takes touches and turns: the screen and its overlay, the sample
     * valve's lever, the lower door and its catch; and, only while the door
     * is open (and so they are drawn), the selector and power switch inside.
     */
    get touchables(): Object3D[] {
      return contents.visible
        ? [...doorTouchables, ...insideTouchables]
        : doorTouchables;
    },
    /** The screen's 2D context, `SCREEN` (640 × 480), for the host to draw into. */
    context,
    /** The screen's mesh. */
    screen,
    /** Upload what was drawn into `context` (call only when it changed). */
    screenChanged() {
      // Off, nothing is shown: uploaded once its power is back.
      if (powered) texture.needsUpdate = true;
      else screenWaiting = true;
    },
    get powered() {
      return powered;
    },
    /** Its own power switch's position. */
    get mainSwitchOn() {
      return mainOn.peek();
    },
    /** Show its own power switch at `on` (it does not tell the host). */
    setMainSwitch(on: boolean) {
      mainOn.value = on;
    },
    /** Its piezo sounder: a one-shot beep. */
    beep(meaning: PiezoOneShot) {
      sounder.play(meaning);
    },
    /** Its piezo sounder held on a looping cadence, or silent (null). */
    beepLoop(meaning: PiezoLoopMeaning | null) {
      // `hold` restarts what it holds, so only on a change.
      if (meaning === looping) return;
      looping = meaning;
      partAudio.hold(sounder, meaning ? sounder.loop(meaning) : null, group);
    },
    /**
     * Switch it on or off: off, its backlight is out and its screen a
     * black glossy panel, Dr Aqualis's overlay hidden, its drawings held
     * back until it is on again.
     */
    setPower(on: boolean) {
      if (on === powered) return;
      powered = on;
      setLcdBacklight(material, on);
      setLcdBacklight(overMaterial, on);
      bootInset.setPower(on);
      overlayMesh.visible = on && overlayWanted;
      if (on && screenWaiting) texture.needsUpdate = true;
      if (on && overlayWaiting) over.texture.needsUpdate = true;
      screenWaiting = overlayWaiting = false;
    },
    /**
     * Show a boot's live element over the screen (its still picture is
     * drawn into `context` as any other), or none: whether it uploaded.
     */
    showBoot(frame: BootFrame | null, opts?: BootDrawOptions) {
      return bootInset.show(frame, opts);
    },
    /** A use on `object` (the knob turned `direction`, a screen touch at `uv`): whether it did anything. */
    touch(object: Object3D, uv?: Vector2, direction = 1) {
      if (object === screen || object === overlayMesh) {
        const p = pixelOf(object, uv);
        if (!p) return false;
        host.screenTouch(...p);
        return true;
      }
      if (object === handle) {
        valveOpen = !valveOpen;
        host.sampleValve?.(valveOpen);
        return true;
      }
      const use = useOf(object);
      if (!use) return false;
      use(direction);
      return true;
    },
    /** Whether a use there would do anything (the crosshair). */
    aimed(object: Object3D, uv?: Vector2) {
      if (object === screen || object === overlayMesh) {
        const p = pixelOf(object, uv);
        return p !== null && (host.screenAimed?.(...p) ?? true);
      }
      return object === handle || useOf(object) !== null;
    },
    get selector() {
      return sel.peek();
    },
    /** Show the knob at `s` (it does not tell the host). */
    setSelector(s: Selector) {
      sel.value = s;
    },
    get sampleValveOpen() {
      return valveOpen;
    },
    setSampleValve(open: boolean) {
      valveOpen = open;
    },
    /** Light the lamps: each on, off or a level 0..1. */
    setLeds(state: LedState) {
      for (const [id, lit] of Object.entries(state) as [
        LedId,
        boolean | number,
      ][])
        leds.get(id)?.set(lit);
    },
    /**
     * Dr Aqualis's overlay over the screen's pixels `OVERLAY` (230 × 300):
     * draw into `context` (transparent where he is not), `changed()` to
     * upload it, `visible(false)` to hide it while another screen shows.
     */
    overlay: {
      context: over.context,
      box: OVERLAY,
      changed() {
        if (powered) over.texture.needsUpdate = true;
        else overlayWaiting = true;
      },
      visible(on: boolean) {
        overlayWanted = on;
        overlayMesh.visible = on && powered;
      },
    },
    get doorOpen() {
      return doorOpen();
    },
    /** Open or shut the lower door, as a click on it would (silently). */
    setDoorOpen(open: boolean) {
      doorState.value = open;
      showContents();
    },
    /** The lower section's insides, drawn only while its door is open or opening. */
    contents,
    /** The sample's flow through the rotameter and its pump, l/h. */
    setSampleFlow(lh: number) {
      sampleFlow = lh;
    },
    model,
    /** Its ports, in the cabinet's frame (`PORTS`), for pipes and cables: only its model's. */
    ports: portsOf(model),
    update(dt: number) {
      parts.update(dt);
      // Its sample pump turns only with its power on and its own switch on
      // (the owner, 2026-10-31), whatever the room asks.
      const flowing = powered && mainOn.peek() && valveOpen ? sampleFlow : 0;
      // Its sample pump's quiet whirr, while it turns (the owner, 2026-10-31).
      const whirring = flowing > 0;
      if (whirring !== pumpHeard) {
        pumpHeard = whirring;
        partAudio.hold(
          samplePumpSound,
          whirring ? SAMPLE_PUMP_SOUND : null,
          group,
        );
      }
      const swing = doorOpen() ? DOOR_OPEN : 0;
      // The catch turns a quarter to open, and back to shut.
      const turned = doorOpen() ? Math.PI / 2 : 0;
      if (latchAngle !== turned) {
        latchAngle +=
          Math.sign(turned - latchAngle) *
          Math.min(Math.abs(turned - latchAngle), dt * 12);
        latch.object.rotation.z = latchAngle;
      }
      if (doorAngle !== swing) {
        doorAngle +=
          Math.sign(swing - doorAngle) *
          Math.min(Math.abs(swing - doorAngle), dt * 3);
        lowerDoor.rotation.y = doorAngle;
        showContents();
      }
      // Its insides worked only while they are drawn.
      if (contents.visible) {
        meter.show(flowing, dt);
        // The sample pump's rotor: about a turn a second at 30 l/h.
        if (flowing > 0) rotor.rotation.z -= dt * 2 * Math.PI * (flowing / 30);
      }
      const target = valveOpen ? 0 : Math.PI / 2;
      if (leverAngle !== target) {
        leverAngle +=
          Math.sign(target - leverAngle) *
          Math.min(Math.abs(target - leverAngle), dt * 6);
        lever.rotation.y = leverAngle;
      }
    },
    dispose() {
      partAudio.hold(sounder, null);
      partAudio.hold(samplePumpSound, null);
      parts.dispose();
      bootInset.dispose();
    },
  };
}

export type AqualisCabinet = ReturnType<typeof createAqualisCabinet>;
