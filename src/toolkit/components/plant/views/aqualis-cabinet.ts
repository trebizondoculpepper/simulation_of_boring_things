import { Group, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three';
import type { Object3D, Vector2 } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { PanelKit } from '../../core/views/eighties-controls';
import { tools, SANS } from '../../core/views/fitting-tools';
import { createCanvasTexture } from '../../core/views/screens';
import { createBrandBadge } from '../../core/views/brand-badge';
import { createPs1Material } from '../../core/parts/ps1-material';
import { createPartSet, selector } from '../../core/parts/parts';
import { createGlassRotameter } from './small-flowmeters';
import { SCREEN } from '../../../../game/plant/aqualis-types';
import type { Selector } from '../../../../game/plant/aqualis-types';
import {
  CABINET,
  CABINET_MODELS,
  GLAND_LABELS,
  glandsOf,
  portsOf,
  KNOB_AT,
  LEDS,
  PORTS,
  SAMPLE_VALVE_AT,
  SCREEN_AREA,
  SCREEN_AT,
  screenPixel,
  selectorAt,
  selectorIndex,
} from '../logic/aqualis-cabinet';
import type { CabinetModel, LedId, LedState } from '../logic/aqualis-cabinet';

/**
 * The Aqualis Interactive water-quality controller (mission 114,
 * `doc/plans/114/`): a floor-standing white cabinet of the early 2000s, its
 * lower section the sampling and wet chemistry behind a windowed door (the
 * flow cell and its probes, the sample rotameter, the reagent bottles, the
 * sample inlet and outlet out of its side, an isolating ball valve on the
 * inlet), its upper section the compute and control: on its door a 7-inch
 * touch screen (a canvas texture, `SCREEN` 800 × 480, unlit), an engraved
 * HAND · OFF · AUTO selector and its status lamps; cable glands on top for
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
}

/** The screen's brightness: its white is this grey, under the bloom threshold (as the console's). */
const SCREEN_LEVEL = 0xb8b8b8;

/** The placeholder the screen shows until its host draws: the period's boot screen. */
export function drawBootScreen(
  c: CanvasRenderingContext2D,
  progress = 0.6,
  model: CabinetModel = 'trio',
) {
  const { w, h } = SCREEN;
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#0d3f7a');
  g.addColorStop(0.55, '#1a76c4');
  g.addColorStop(1, '#0a2d5c');
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  // An Aero sheen across the top.
  const sheen = c.createLinearGradient(0, 0, 0, h * 0.45);
  sheen.addColorStop(0, 'rgba(255,255,255,0.28)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = sheen;
  c.fillRect(0, 0, w, h * 0.45);
  // The water drop.
  c.save();
  c.translate(w / 2, 150);
  const drop = c.createRadialGradient(-12, 10, 4, 0, 18, 60);
  drop.addColorStop(0, '#e9f7ff');
  drop.addColorStop(0.35, '#5fc3ff');
  drop.addColorStop(1, '#0b6fc0');
  c.fillStyle = drop;
  c.beginPath();
  c.moveTo(0, -55);
  c.bezierCurveTo(30, -10, 48, 15, 48, 35);
  c.arc(0, 35, 48, 0, Math.PI, false);
  c.bezierCurveTo(-48, 15, -30, -10, 0, -55);
  c.fill();
  c.restore();
  c.fillStyle = '#ffffff';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.font = `bold 46px ${SANS}`;
  c.fillText(CABINET_MODELS[model].name, w / 2, 270);
  c.font = `20px ${SANS}`;
  c.fillStyle = '#cfe7ff';
  c.fillText('Water quality controller  ·  v2.4', w / 2, 312);
  // The progress bar.
  const bw = 360;
  const bx = (w - bw) / 2;
  c.fillStyle = 'rgba(0,0,0,0.35)';
  c.fillRect(bx, 360, bw, 16);
  const bar = c.createLinearGradient(0, 360, 0, 376);
  bar.addColorStop(0, '#b8f3a0');
  bar.addColorStop(1, '#3fae2a');
  c.fillStyle = bar;
  c.fillRect(bx + 2, 362, (bw - 4) * Math.max(0, Math.min(1, progress)), 12);
  c.font = `16px ${SANS}`;
  c.fillStyle = '#cfe7ff';
  c.fillText('Starting analyser…', w / 2, 400);
  c.textAlign = 'right';
  c.fillText('© 2003 Aqualis Interactive', w - 16, h - 18);
}

export function createAqualisCabinet(
  kit: PanelKit,
  host: CabinetHost,
  /** Which of the Dr Aqualis series: its name, and its control glands (3, 2 or 0). */
  model: CabinetModel = 'trio',
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
  // back, floor and roof), so its window shows the wet chemistry inside.
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

  // ---- The lower section: the wet chemistry behind its window -----------------------
  const lowH = split - plinth - 0.006;
  const lowY = plinth + lowH / 2;
  const frameW = 0.05;
  // The door: a frame round a clear window.
  for (const x of [-w / 2 + frameW / 2, w / 2 - frameW / 2])
    t.box(group, whiteDoor, frameW, lowH, door, x, lowY, front - door / 2);
  for (const y of [plinth + frameW / 2, split - 0.006 - frameW / 2])
    t.box(group, whiteDoor, w, frameW, door, 0, y, front - door / 2);
  const glass = createPs1Material({
    color: '#cfe6f2',
    transparent: true,
    opacity: 0.18,
    roughness: 0.05,
  });
  kit.materials.push(glass);
  const pane = new Mesh(
    new PlaneGeometry(w - 2 * frameW, lowH - 2 * frameW),
    glass,
  );
  pane.position.set(0, lowY, front - door / 2);
  pane.renderOrder = 2;
  group.add(pane);
  t.box(
    group,
    grey,
    0.012,
    0.08,
    0.02,
    w / 2 - frameW - 0.01,
    lowY,
    front + 0.004,
  );
  // Inside: a pale back plate, with the analyser's plumbing on it.
  const back = 0.03;
  t.box(
    group,
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
  group.add(inside);
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
  t.label(inside, 'FLOW CELL', 0.06, cellY - 0.07, 0.092, 0.012, '#30383e');
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
  pipe(0.14, -0.13, 0.69, 0.05, 'x');
  pipe(0.18, 0.2, cellY - 0.09 - 0.09, 0.05, 'y');
  pipe(0.47, -0.035, PORTS.sampleOut.at[1] + 0.13, 0.03, 'x');
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
  t.box(group, whiteDoor, w, upH, door, 0, upY, front - door / 2);
  t.box(group, grey, 0.012, 0.08, 0.02, w / 2 - 0.03, upY - 0.1, front + 0.004);
  const face = new Group();
  face.position.set(0, 0, front);
  group.add(face);
  // The screen's bezel: a dark glossy frame, a silver rim round it.
  const S = SCREEN_AREA;
  t.box(
    face,
    t.paint('#b9c0c5', 0.25, 0.6),
    S.w + 2 * S.bezel + 0.008,
    S.h + 2 * S.bezel + 0.008,
    0.008,
    SCREEN_AT.x,
    SCREEN_AT.y,
    0.004,
  );
  t.box(
    face,
    t.paint('#111418', 0.15),
    S.w + 2 * S.bezel,
    S.h + 2 * S.bezel,
    0.01,
    SCREEN_AT.x,
    SCREEN_AT.y,
    0.007,
  );
  const { context, texture } = createCanvasTexture(SCREEN.w, SCREEN.h, 'touch');
  kit.textures.push(texture);
  const material = new MeshBasicMaterial({
    map: texture,
    toneMapped: false,
    color: SCREEN_LEVEL,
  });
  kit.materials.push(material);
  const screen = new Mesh(new PlaneGeometry(S.w, S.h), material);
  screen.position.set(SCREEN_AT.x, SCREEN_AT.y, 0.0125);
  screen.name = 'Aqualis touch screen';
  face.add(screen);
  // The software's name under the screen, the maker's badge above it.
  t.label(
    face,
    info.name,
    SCREEN_AT.x + S.w / 2 + S.bezel - 0.04,
    SCREEN_AT.y - S.h / 2 - S.bezel + 0.007,
    0.0125,
    0.008,
    '#9fb4c4',
  );
  const badge = createBrandBadge(kit, 'aqualis', {
    height: 0.04,
    maxWidth: 0.3,
  });
  badge.position.set(0, h - cap - 0.05, 0.002);
  face.add(badge);
  // A blue accent strip across the door below the badge, the period's swoosh.
  t.box(face, blue, w - 0.06, 0.006, 0.002, 0, h - cap - 0.085, 0.001);
  // The HAND · OFF · AUTO selector, engraved, on its own plate.
  const parts = createPartSet();
  let sel: Selector = 'auto';
  const knob = parts.add(
    selector(kit, {
      positions: 3,
      initial: selectorIndex(sel),
      bound: {
        get value() {
          return selectorIndex(sel);
        },
        set: (k: number) => {
          sel = selectorAt(k);
          host.selector?.(sel);
        },
      },
      legend: 'HAND · OFF · AUTO',
      name: `${info.name} HAND OFF AUTO selector`,
    }),
  );
  t.box(
    face,
    t.paint('#dfe4e7', 0.4),
    0.13,
    0.15,
    0.004,
    KNOB_AT.x,
    KNOB_AT.y + 0.01,
    0.002,
  );
  knob.object.position.set(KNOB_AT.x, KNOB_AT.y, 0.004);
  face.add(knob.object);
  t.label(
    face,
    'HAND   OFF   AUTO',
    KNOB_AT.x,
    KNOB_AT.y - 0.05,
    0.0045,
    0.011,
    '#1b1b1b',
  );
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

  drawBootScreen(context, 0.6, model);
  texture.needsUpdate = true;

  const useOf = (object: Object3D) => {
    for (let o: Object3D | null = object; o; o = o.parent) {
      const use = parts.uses.get(o);
      if (use) return use;
    }
    return null;
  };

  const touchables: Object3D[] = [screen, handle, ...parts.uses.keys()];

  return {
    group,
    /** The meshes that take touches and turns: the screen, the knob, the sample valve's lever. */
    touchables,
    /** The screen's 2D context, 800 × 480, for the host to draw into. */
    context,
    /** The screen's mesh. */
    screen,
    /** Upload what was drawn into `context` (call only when it changed). */
    screenChanged() {
      texture.needsUpdate = true;
    },
    /** A use on `object` (the knob turned `direction`, a screen touch at `uv`): whether it did anything. */
    touch(object: Object3D, uv?: Vector2, direction = 1) {
      if (object === screen) {
        if (!uv) return false;
        host.screenTouch(...screenPixel(uv.x, uv.y));
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
      if (object === screen)
        return (
          Boolean(uv) &&
          (host.screenAimed?.(...screenPixel(uv!.x, uv!.y)) ?? true)
        );
      return object === handle || useOf(object) !== null;
    },
    get selector() {
      return sel;
    },
    /** Show the knob at `s` (it does not tell the host). */
    setSelector(s: Selector) {
      sel = s;
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
    /** The sample's flow through the rotameter, l/h. */
    setSampleFlow(lh: number) {
      sampleFlow = lh;
    },
    model,
    /** Its ports, in the cabinet's frame (`PORTS`), for pipes and cables: only its model's. */
    ports: portsOf(model),
    update(dt: number) {
      parts.update(dt);
      meter.show(valveOpen ? sampleFlow : 0, dt);
      const target = valveOpen ? 0 : Math.PI / 2;
      if (leverAngle !== target) {
        leverAngle +=
          Math.sign(target - leverAngle) *
          Math.min(Math.abs(target - leverAngle), dt * 6);
        lever.rotation.y = leverAngle;
      }
    },
    dispose() {
      parts.dispose();
    },
  };
}

export type AqualisCabinet = ReturnType<typeof createAqualisCabinet>;
