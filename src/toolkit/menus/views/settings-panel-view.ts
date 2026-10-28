import { computed, effect, signal } from '@preact/signals-core';
import type { ReadonlySignal } from '@preact/signals-core';
import {
  BoxGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  Mesh,
  PlaneGeometry,
  Shape,
  SphereGeometry,
  TorusGeometry,
} from 'three';
import type { Object3D } from 'three';
import {
  createPartSet,
  keySwitch,
  ledPushbutton,
  potentiometer,
  pushButton,
  selector,
} from '../../components/core/parts/parts';
import type { Part, PartSet } from '../../components/core/parts/parts';
import type { MenuTarget } from '../../controls/logic/menu-navigation';
import { createPs1Material } from '../../components/core/parts/ps1-material';
import type { Readable } from '../../components/core/logic/world/components';
import {
  PANEL_FONT,
  createMicroLabel,
  createPanelKit,
  createSevenSegment,
  kitGlow,
  kitPaint,
} from '../../components/core/views/eighties-controls';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { createEngravedPlate } from '../../components/core/views/plant-signs';
import { createDymoLabel } from '../../components/core/views/hand-labels';
import { panelMakerMark } from '../../components/core/views/panel-maker-mark';
import { createCanvasTexture } from '../../components/core/views/screens';
import { withLetteringScale } from '../../components/core/views/lettering-resolution';
import {
  createPanelMeter,
  createVfd,
} from '../../components/industrial-control/views/panel-instruments';
import { PENFOLD_GREY } from '../../components/industrial-control/views/control-cubicle';
import { settings, updateSettings } from '../../settings/settings-store';
import { CARD, SPACING, narrowCard } from '../logic/panel-layout';
import { createMachinedMetal, polishParts } from './machined-metal';
import { markFrontCentre } from '../../components/core/audio/front-centre';
import type { ModuleBox, PanelLayout } from '../logic/panel-layout';
import {
  CONFIRM_WINDOW,
  METERS,
  dialScale,
  knobIndex,
  knobReadout,
  knobSteps,
  pressConfirm,
  savedMessage,
  selectorIndex,
  settingFor,
  statusLine,
} from '../logic/settings-panel';
import type { PanelAction, PanelItem } from '../logic/settings-panel';
import { needleSettled, stepNeedle } from '../logic/meter-ballistics';
import type { NeedleState } from '../logic/meter-ballistics';

/**
 * The settings menu built as a Penfold instrument panel (mission 096,
 * stage 0): a dark grey bezel round one continuous field of light grey
 * plates set edge to edge as avionics units are, a module for each setting
 * and blanking plates in every rack place left over, each plate with
 * rounded corners, a softened edge, a quarter-turn fastener in from each
 * corner and (a module) its title engraved along its top. Built from
 * the game's own parts (potentiometers, moving-coil meters, seven-segment
 * readouts, illuminated and latching push buttons, a lever selector, a key
 * switch, a VFD), at true size in metres, facing +z, centred on the origin.
 * The parts are bound to the player's settings (`settings-store.ts`), so a
 * knob turned here changes the game at once; the meters follow their knobs
 * with a real meter's damped lag (`meter-ballistics.ts`).
 */

/** What the panel's push buttons do: the app's to supply. */
export interface SettingsPanelActions {
  resume(): void;
  save(): boolean;
  /** Whether this tab saves the game (false while another tab holds it). */
  holding?: Readable<boolean>;
  quitToTitle(): void;
  quitToDesktop?: () => void;
  devPanel?: () => void;
  noclip?: Readable<boolean>;
  setNoclip?: (on: boolean) => void;
  copyCamera?: () => Promise<string>;
}

export interface SettingsPanelView {
  group: Group;
  parts: PartSet;
  /** Advance its parts; whether anything is still moving (so must be drawn). */
  update(delta: number): boolean;
  /** The controls the focus can rest on, in panel metres (x right, y down). */
  targets: readonly MenuTarget[];
  /** What the GAME zone's status line shows. */
  status: ReadonlySignal<string>;
  /** Ring the control `id` as focused, or none. */
  focus(id: string | null): void;
  /** Turn the control `id` a step, or press it. */
  work(id: string, direction?: number): void;
  dispose(): void;
}

/** The bezel's paint. */
const FRAME = '#3b3f43';
/** The focus ring's colour: the HUD's amber. */
const FOCUS = '#ffb43a';
/** Lettering drawn at this multiple of its usual resolution: crisp up close. */
const LETTERING = 3;
/** A module's plate: how thick it is, and how deep the rack's opening behind it. */
export const PLATE = 0.0016;
/** How far the plate's softened edge rounds over, and its corners' radius. */
export const BEVEL = 0.0005;
const CORNER = 0.0025;
/** The plate's face, where its parts are mounted. */
const PLATE_FRONT = PLATE;
/** The hairline seam left where two plates butt. */
const SEAM = 0.0004;
/** How deep the field's opening in the bezel is. */
const WELL = 0.004;

/** The shared paints of the rack and its fixings, made once per panel. */
export function rackPaints(kit: PanelKit) {
  return {
    frame: kitPaint(kit, FRAME),
    well: kitPaint(kit, '#0c0d0e'),
    lip: kitPaint(kit, '#5d6266', 0.6),
    plate: kitPaint(kit, '#aeb1ae', 0.15),
    face: kitPaint(kit, PENFOLD_GREY, 0.1),
    screw: kitPaint(kit, '#c3c7ca', 0.9),
    slot: kitPaint(kit, '#202224'),
    dial: (() => {
      const m = createPs1Material({ color: '#ffffff' });
      kit.materials.push(m);
      return m;
    })(),
  };
}
export type RackPaints = ReturnType<typeof rackPaints>;

/**
 * A quarter-turn (DZUS) fastener, as avionics units are held in their
 * rails: a slightly domed, polished head with a slot across it, sat in a
 * shallow dark countersink, at `x`, `y` on a plate's face, each turned as
 * it was left. Every plate has four, one in from each corner.
 */
function fastener(paints: RackPaints, parent: Object3D, x: number, y: number) {
  const r = FASTENER;
  const sink = new Mesh(
    new CylinderGeometry(r * 1.25, r * 1.25, 0.0003, 20),
    paints.slot,
  );
  sink.rotation.x = Math.PI / 2;
  sink.position.set(x, y, 0.00005);
  parent.add(sink);
  const head = new Mesh(
    new SphereGeometry(r, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2),
    paints.screw,
  );
  head.rotation.x = Math.PI / 2;
  head.scale.set(1, 0.38, 1);
  head.position.set(x, y, 0);
  parent.add(head);
  const slot = new Mesh(new BoxGeometry(r * 1.7, 0.0007, 0.0006), paints.slot);
  slot.position.set(x, y, r * 0.38 - 0.0001);
  slot.rotation.z = (Math.abs(x * 997 + y * 631) % 1) * Math.PI;
  parent.add(slot);
}

/** A fastener's head radius, and how far in from each corner of every plate it sits. */
const FASTENER = 0.0032;
const FASTENER_INSET = 0.0058;

/**
 * Four fasteners, one in from each corner of a plate `w` by `h`; a filler
 * strip too narrow for two side by side has one at its top and its foot.
 */
export function fastenAt(
  paints: RackPaints,
  face: Object3D,
  w: number,
  h: number,
) {
  if (w < 4 * FASTENER_INSET) {
    for (const sy of [1, -1])
      fastener(paints, face, 0, sy * (h / 2 - FASTENER_INSET));
    return;
  }
  for (const [sx, sy] of [
    [-1, 1],
    [1, 1],
    [-1, -1],
    [1, -1],
  ])
    fastener(
      paints,
      face,
      sx * (w / 2 - FASTENER_INSET),
      sy * (h / 2 - FASTENER_INSET),
    );
}

/**
 * A sheet-metal plate `w` by `h`, its corners rounded and its edge
 * softened, centred on the origin, its back at z = 0: a hairline smaller
 * than its rack cell, so a seam shows where it butts its neighbour.
 */
export function plateGeometry(w: number, h: number) {
  const a = w / 2 - SEAM / 2 - BEVEL;
  const b = h / 2 - SEAM / 2 - BEVEL;
  const r = Math.min(CORNER, a, b);
  const shape = new Shape();
  shape.moveTo(-a + r, -b);
  shape.lineTo(a - r, -b);
  shape.quadraticCurveTo(a, -b, a, -b + r);
  shape.lineTo(a, b - r);
  shape.quadraticCurveTo(a, b, a - r, b);
  shape.lineTo(-a + r, b);
  shape.quadraticCurveTo(-a, b, -a, b - r);
  shape.lineTo(-a, -b + r);
  shape.quadraticCurveTo(-a, -b, -a + r, -b);
  const geometry = new ExtrudeGeometry(shape, {
    depth: PLATE - BEVEL,
    bevelEnabled: true,
    bevelThickness: BEVEL,
    bevelSize: BEVEL,
    bevelSegments: 2,
    curveSegments: 4,
  });
  geometry.translate(0, 0, BEVEL);
  return geometry;
}

/**
 * A knob's dial, printed on a black disc behind it: a tick at each
 * detent, longer at its figures, and the figures (or words) round it.
 */
function drawDial(
  kit: PanelKit,
  material: RackPaints['dial'],
  radius: number,
  detents: number,
  marks: readonly { share: number; text: string }[],
) {
  const size = 512;
  const { context: c, texture } = createCanvasTexture(size, size);
  kit.textures.push(texture);
  const m = size / 2;
  const scale = m / radius;
  c.fillStyle = '#1b1c1e';
  c.beginPath();
  c.arc(m, m, m - 2, 0, Math.PI * 2);
  c.fill();
  // The knob's travel, as `createPotentiometer` turns it: 270°, from
  // lower left (share 0) round the top to lower right (share 1).
  const toward = (share: number) =>
    (Math.PI * 3) / 4 - share * ((Math.PI * 3) / 2);
  const at = (share: number, r: number) => {
    const a = toward(share);
    return [m - Math.sin(a) * r * scale, m - Math.cos(a) * r * scale];
  };
  c.strokeStyle = '#ecebe4';
  c.lineCap = 'round';
  const shares = new Set(marks.map((k) => k.share));
  for (let i = 0; i <= detents; i++) {
    const share = i / detents;
    const major = shares.has(share) || i === 0 || i === detents;
    c.lineWidth = major ? 5 : 2.5;
    const [x0, y0] = at(share, radius * (major ? 0.6 : 0.64));
    const [x1, y1] = at(share, radius * 0.72);
    c.beginPath();
    c.moveTo(x0, y0);
    c.lineTo(x1, y1);
    c.stroke();
  }
  c.fillStyle = '#ecebe4';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  for (const { share, text } of marks) {
    c.font = `bold ${text.length > 3 ? 34 : 40}px ${PANEL_FONT}`;
    const [x, y] = at(share, radius * 0.86);
    c.fillText(text, x, y);
  }
  texture.needsUpdate = true;
  const dialMaterial = material.clone();
  dialMaterial.map = texture;
  dialMaterial.transparent = true;
  dialMaterial.alphaTest = 0.5;
  kit.materials.push(dialMaterial);
  const mesh = new Mesh(
    new PlaneGeometry(radius * 2, radius * 2),
    dialMaterial,
  );
  mesh.name = 'Dial';
  return mesh;
}

/** The instruction card's art: the bindings, printed small, in a table. */
function drawCard(
  kit: PanelKit,
  width: number,
  height: number,
  bindings: readonly (readonly [string, string, string])[],
  touch: string,
  narrow: boolean,
) {
  const perMetre = 9000;
  const w = Math.round(width * perMetre);
  const h = Math.round(height * perMetre);
  const { context: c, texture } = createCanvasTexture(w, h);
  kit.textures.push(texture);
  c.fillStyle = '#f3f1e8';
  c.fillRect(0, 0, w, h);
  const pad = CARD.pad * perMetre * 0.6;
  // The lines spread to fill the card its rack rows give it, up to a third larger.
  const lines = bindings.length * (narrow ? 2 : 1) + 2;
  const line = Math.min(CARD.line * perMetre * 1.35, (h - 2 * pad) / lines);
  c.fillStyle = '#1d1e1b';
  c.textBaseline = 'middle';
  const font = (bold: boolean) =>
    `${bold ? 'bold ' : ''}${Math.round(line * 0.62)}px ${PANEL_FONT}`;
  let y = pad + line / 2;
  c.font = font(true);
  c.fillText('ACTION', pad, y);
  if (!narrow) {
    c.fillText('KEYBOARD AND MOUSE', w * 0.36, y);
    c.fillText('GAMEPAD', w * 0.74, y);
  }
  c.fillRect(pad, y + line * 0.45, w - 2 * pad, 2);
  y += line;
  for (const [what, keys, pad2] of bindings) {
    c.font = font(true);
    c.fillText(what, pad, y, narrow ? w - 2 * pad : w * 0.34 - pad);
    c.font = font(false);
    if (narrow) {
      y += line;
      c.fillText(
        [keys, pad2].filter(Boolean).join('  ·  '),
        pad * 2,
        y,
        w - 3 * pad,
      );
    } else {
      c.fillText(keys, w * 0.36, y, w * 0.37);
      c.fillText(pad2, w * 0.74, y, w * 0.25);
    }
    y += line;
  }
  c.font = font(false);
  c.fillText(`Touch: ${touch}`, pad, y, w - 2 * pad);
  texture.needsUpdate = true;
  return texture;
}

export function buildSettingsPanel(
  layout: PanelLayout,
  {
    actions,
    bindings,
    touchHelp,
    build,
    development,
    onChange,
  }: {
    actions: SettingsPanelActions;
    bindings: readonly (readonly [string, string, string])[];
    touchHelp: string;
    /** The build line (`buildLine()`): version, commit, date. */
    build: string;
    development: boolean;
    /** Something the panel shows changed (a message, a lamp): draw again. */
    onChange: () => void;
  },
): SettingsPanelView {
  return withLetteringScale(LETTERING, () =>
    build_(layout, {
      actions,
      bindings,
      touchHelp,
      build,
      development,
      onChange,
    }),
  );
}

function build_(
  layout: PanelLayout,
  {
    actions,
    bindings,
    touchHelp,
    build,
    development,
    onChange,
  }: Parameters<typeof buildSettingsPanel>[1],
): SettingsPanelView {
  const kit = createPanelKit();
  const group = new Group();
  group.name = 'Settings panel SP-1';
  // Its parts' clicks and detents are heard front centre, not in the room.
  markFrontCentre(group);
  const parts = createPartSet();
  const stops: (() => void)[] = [];
  const needles: (() => boolean)[] = [];
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const later = (ms: number, then: () => void) => {
    const t = setTimeout(() => {
      timers.delete(t);
      then();
    }, ms);
    timers.add(t);
  };
  const { width: W, height: H } = layout;
  // Panel coordinates (x right from the left edge, y down from the top) to the group's.
  const px = (x: number) => x - W / 2;
  const py = (y: number) => H / 2 - y;

  // The bezel, and in it one opening, a dark well with a metal lip, which
  // the plates fill edge to edge: one continuous field, as an avionics
  // panel is (the owner, 2026-10-27).
  const paints = rackPaints(kit);
  const base = new Mesh(new BoxGeometry(W, H, 0.02), paints.frame);
  base.position.z = -0.01;
  group.add(base);
  const plates = [...layout.modules, ...layout.blanks];
  const fx = Math.min(...plates.map((b) => b.x));
  const fy = Math.min(...plates.map((b) => b.y));
  const fw = Math.max(...plates.map((b) => b.x + b.w)) - fx;
  const fh = Math.max(...plates.map((b) => b.y + b.h)) - fy;
  const well = new Mesh(new BoxGeometry(fw, fh, 0.001), paints.well);
  well.position.set(px(fx + fw / 2), py(fy + fh / 2), -WELL);
  group.add(well);
  const lip = 0.002;
  const edge = (x: number, y: number, w: number, h: number) => {
    const m = new Mesh(new BoxGeometry(w, h, WELL + 0.0006), paints.lip);
    m.position.set(px(x + w / 2), py(y + h / 2), -WELL / 2 + 0.0003);
    group.add(m);
  };
  edge(fx - lip, fy - lip, fw + 2 * lip, lip);
  edge(fx - lip, fy + fh, fw + 2 * lip, lip);
  edge(fx - lip, fy, lip, fh);
  edge(fx + fw, fy, lip, fh);
  // Plates of one size share one geometry.
  const shapes = new Map<string, ExtrudeGeometry>();
  // Each plate machined at its own angle, its tone a shade its own.
  const metal = createMachinedMetal(kit);
  base.material = metal.bezel;
  const sheet = (w: number, h: number, column: number, row: number) => {
    const key = `${w.toFixed(5)}x${h.toFixed(5)}`;
    let geometry = shapes.get(key);
    if (!geometry) shapes.set(key, (geometry = plateGeometry(w, h)));
    const mesh = new Mesh(geometry, metal.plate(column, row));
    mesh.position.z = -BEVEL;
    return mesh;
  };

  // The header: the panel's name engraved, Penfold's mark top right.
  const name = createEngravedPlate(kit, ['SETTINGS', 'SYSTEM PANEL SP-1'], {
    width: 0.15,
    height: 0.036,
  });
  name.position.set(px(SPACING.margin + 0.075), py(SPACING.margin + 0.02), 0);
  group.add(name);
  panelMakerMark(kit, group, { width: W, height: H, z: 0, size: 0.016 });

  // The rating plate, engraved, along the foot; a Dymo strip on a development build.
  const plateW = Math.min(0.3, W - 2 * SPACING.margin);
  const rating = createEngravedPlate(
    kit,
    ['PENFOLD CONTROLS · SYSTEM PANEL SP-1', build.toUpperCase()],
    { colour: 'white', width: plateW, height: 0.026 },
  );
  rating.position.set(
    px(SPACING.margin + plateW / 2),
    py(H - SPACING.margin - 0.016),
    0,
  );
  group.add(rating);
  if (development) {
    const tape = createDymoLabel(kit, 'DEVELOPMENT BUILD', { colour: 'red' });
    tape.position.set(
      px(Math.min(W - SPACING.margin - 0.06, SPACING.margin + plateW + 0.07)),
      py(H - SPACING.margin - (plateW + 0.14 > W ? 0.036 : 0.016)),
      0.0004,
    );
    group.add(tape);
  }

  // The GAME zone's status line, and what feeds it.
  const message = signal<string | null>(null);
  const armedQuit = signal<PanelAction | null>(null);
  const armedAt = new Map<PanelAction, number | null>();
  const say = (text: string) => {
    message.value = text;
    later(4000, () => {
      if (message.peek() === text) message.value = null;
    });
  };
  const status = computed(() =>
    statusLine({
      armedQuit: armedQuit.value,
      message: message.value,
      holding: actions.holding?.value ?? true,
    }),
  );
  const doAction = (id: PanelAction) => {
    switch (id) {
      case 'resume':
        return actions.resume();
      case 'save':
        return say(savedMessage(actions.save(), new Date()));
      case 'copyLink':
        void actions.copyCamera?.().then(() => say('VIEW LINK COPIED'));
        return;
      case 'quitToTitle':
        return actions.quitToTitle();
      case 'quitToDesktop':
        return actions.quitToDesktop?.();
      case 'devPanel':
        return actions.devPanel?.();
    }
  };
  const press = (item: Extract<PanelItem, { kind: 'push' }>) => {
    if (!item.confirm) return doAction(item.id);
    const now = performance.now();
    const step = pressConfirm(armedAt.get(item.id) ?? null, now);
    armedAt.set(item.id, step.armedAt);
    if (step.fire) {
      armedQuit.value = null;
      return doAction(item.id);
    }
    armedQuit.value = item.id;
    later(CONFIRM_WINDOW + 50, () => {
      if (armedAt.get(item.id) === now) {
        armedAt.set(item.id, null);
        if (armedQuit.peek() === item.id) armedQuit.value = null;
      }
    });
  };
  // Whatever the panel shows besides its parts: draw again when it changes.
  stops.push(
    effect(() => {
      void status.value;
      void armedQuit.value;
      void actions.noclip?.value;
      void settings.value;
      onChange();
    }),
  );

  // ---- The modules -------------------------------------------------------
  // The controls the focus can rest on (keyboard and gamepad), each with
  // an amber ring round it, lit while it has the focus.
  const targets: (MenuTarget & {
    use: (direction?: number) => void;
    ring: Object3D;
  })[] = [];
  const ringPaint = kitGlow(kit, FOCUS);
  const focusable = (
    m: ModuleBox,
    face: Object3D,
    x: number,
    y: number,
    radius: number,
    turns: boolean,
    part: Part,
  ) => {
    const ring = new Mesh(new TorusGeometry(radius, 0.0011, 6, 48), ringPaint);
    ring.position.set(x, y, 0.0006);
    ring.visible = false;
    ring.raycast = () => {};
    face.add(ring);
    targets.push({
      id: m.title,
      x: m.x + m.w / 2 + x,
      y: m.y + m.h / 2 - y,
      turns,
      use: [...part.uses.values()][0],
      ring,
    });
  };
  const bolt = (m: ModuleBox) => {
    const mod = new Group();
    mod.name = `Module: ${m.title}`;
    mod.position.set(px(m.x + m.w / 2), py(m.y + m.h / 2), 0);
    group.add(mod);
    // The plate: its edge, darker, and its face a little in from it, so
    // its thickness and bevel show; it stands a hair proud of the frame.
    mod.add(sheet(m.w, m.h, m.column, m.row));
    const face = new Group();
    face.position.z = PLATE_FRONT;
    mod.add(face);
    fastenAt(paints, face, m.w, m.h);
    // Its title: engraved, or Dymo tape for a site addition.
    const titleY = m.h / 2 - 0.004 - SPACING.title / 2;
    const dymo = 'dymo' in m.item && m.item.dymo;
    const title = dymo
      ? createDymoLabel(kit, m.title, { colour: 'black', seed: m.title.length })
      : createEngravedPlate(kit, [m.title], {
          width: m.w - 0.02,
          height: SPACING.title,
        });
    title.position.set(0, titleY, 0.0002);
    face.add(title);
    const body = m.h / 2 - 0.004 - SPACING.title;
    const centreY = (body - m.h / 2) / 2;
    const place = (o: Object3D, x: number, y: number) => {
      o.position.set(x, y, 0);
      face.add(o);
      return o;
    };
    const item = m.item;
    switch (item.kind) {
      case 'pot': {
        const spec = METERS[item.id];
        const meterW = 0.1;
        const meter = createPanelMeter(kit, spec.unit, {
          width: meterW,
          scaleMax: spec.scaleMax,
          redFrom: spec.redFrom ?? 1,
          band: spec.band ?? null,
        });
        const meterX = -m.w / 2 + 0.011 + meterW / 2;
        place(meter.group, meterX, body - 0.006 - meterW / 1.16 / 2);
        const knob = parts.add(
          potentiometer(kit, {
            name: `${item.legend} knob`,
            steps: knobSteps(item.id),
            bound: {
              get value() {
                return knobIndex(item.id, settings.value[item.id]);
              },
              set: (index: number) =>
                updateSettings(settingFor(item.id, index)),
            },
          }),
        );
        // The knob's own printed 0–10 is for dark panels: this module
        // prints its setting's own scale on a dial behind it instead.
        knob.object.traverse((o) => {
          if (o.name.startsWith('Label 0')) o.visible = false;
        });
        const knobX = m.w / 2 - 0.05;
        const dial = drawDial(
          kit,
          paints.dial,
          0.04,
          knobSteps(item.id),
          dialScale(item.id),
        );
        place(dial, knobX, centreY).position.z = 0.0003;
        place(knob.object, knobX, centreY);
        focusable(m, face, knobX, centreY, 0.043, true, knob);
        const readout = createSevenSegment(kit, item.digits, {
          digitHeight: 0.012,
        });
        const readY = -m.h / 2 + 0.02;
        place(readout.group, meterX - 0.008, readY);
        const unit = createMicroLabel(kit, item.unit, {
          height: 0.0045,
          ink: '#202120',
        });
        place(unit, meterX + 0.036, readY).position.z = 0.0004;
        let last = '';
        let needle: NeedleState = {
          at: spec.reading(settings.peek()[item.id]),
          speed: 0,
        };
        meter.set(needle.at);
        needles.push(() => {
          const value = settings.peek()[item.id];
          const text = knobReadout(item.id, value);
          if (text !== last) readout.show((last = text));
          const target = spec.reading(value);
          return needleSettled(needle, target);
        });
        meterSteps.push((delta) => {
          const target = spec.reading(settings.peek()[item.id]);
          needle = stepNeedle(needle, target, delta);
          meter.set(Math.max(0, Math.min(1, needle.at)));
          // The view's own easing would add a second lag: the ballistics are ours.
          meter.update(1);
        });
        break;
      }
      case 'push': {
        const lamp = item.confirm
          ? computed(() => armedQuit.value === item.id)
          : undefined;
        const button = parts.add(
          pushButton(kit, {
            name: item.legend,
            colour: item.colour,
            head: item.confirm ? 'illuminated' : 'flush',
            lamp,
            action: () => press(item),
          }),
        );
        place(button.object, 0, centreY - 0.003);
        focusable(m, face, 0, centreY - 0.003, 0.024, false, button);
        if (item.confirm) {
          const note = createMicroLabel(kit, 'PRESS TWICE', {
            height: 0.0032,
            ink: '#8a1f18',
          });
          place(note, 0, -m.h / 2 + 0.008).position.z = 0.0004;
        }
        break;
      }
      case 'latch': {
        const button = parts.add(
          ledPushbutton(kit, {
            name: item.legend,
            colour: item.colour,
            bound: {
              get value() {
                return settings.value.invertY;
              },
              set: (on: boolean) => updateSettings({ invertY: on }),
            },
          }),
        );
        place(button.object, 0, centreY - 0.002);
        focusable(m, face, 0, centreY - 0.002, 0.024, false, button);
        const note = createMicroLabel(kit, 'LIT = ON', {
          height: 0.0032,
          ink: '#202120',
        });
        place(note, 0, -m.h / 2 + 0.008).position.z = 0.0004;
        break;
      }
      case 'key': {
        const noclip = actions.noclip;
        const key = parts.add(
          keySwitch(kit, {
            name: item.legend,
            bound: noclip
              ? {
                  get value() {
                    return noclip.value;
                  },
                  set: (on: boolean) => actions.setNoclip?.(on),
                }
              : undefined,
          }),
        );
        place(key.object, 0, centreY - 0.002);
        focusable(m, face, 0, centreY - 0.002, 0.024, false, key);
        for (const [text, x] of [
          ['0', -0.017],
          ['I', 0.017],
        ] as const) {
          const l = createMicroLabel(kit, text, {
            height: 0.004,
            ink: '#202120',
          });
          place(l, x, centreY + 0.012).position.z = 0.0004;
        }
        break;
      }
      case 'selector': {
        const sel = parts.add(
          selector(kit, {
            name: item.legend,
            positions: 3,
            bound: {
              get value() {
                return selectorIndex(settings.value.onScreenControls);
              },
              set: (index: number) =>
                updateSettings(settingFor('onScreenControls', index)),
            },
          }),
        );
        const cy = centreY - 0.008;
        place(sel.object, 0, cy);
        focusable(m, face, 0, cy, 0.026, true, sel);
        item.positions.forEach((text, i) => {
          const a = Math.PI / 4 - (i * Math.PI) / 4;
          const l = createMicroLabel(kit, text, {
            height: 0.0042,
            ink: '#202120',
          });
          place(l, -Math.sin(a) * 0.03, cy + Math.cos(a) * 0.025).position.z =
            0.0004;
        });
        break;
      }
      case 'vfd': {
        const vfd = createVfd(kit, { columns: item.columns, height: 0.009 });
        place(vfd.group, 0, centreY);
        stops.push(effect(() => vfd.show([status.value])));
        break;
      }
      case 'card': {
        const cw = m.w - 0.014;
        const ch = m.h - SPACING.title - 0.016;
        const holder = new Mesh(
          new BoxGeometry(cw + 0.004, ch + 0.004, 0.002),
          kitPaint(kit, '#2a2c2e'),
        );
        place(holder, 0, centreY - 0.002).position.z = 0.001;
        const art = drawCard(
          kit,
          cw,
          ch,
          bindings,
          touchHelp,
          narrowCard(m.columns),
        );
        const material = createPs1Material({ map: art, roughness: 0.35 });
        kit.materials.push(material);
        const card = new Mesh(new PlaneGeometry(cw, ch), material);
        place(card, 0, centreY - 0.002).position.z = 0.0022;
        break;
      }
    }
  };
  const meterSteps: ((delta: number) => void)[] = [];
  const partsFrom = kit.materials.length;
  for (const m of layout.modules) bolt(m);
  // Blanking plates, screwed into every rack place no module takes, as
  // on an aircraft's panel where a unit is missing or not fitted (the
  // owner, 2026-10-27): the same plate, seam and fasteners, nothing on it
  // but a small stamped part number.
  for (const b of layout.blanks) {
    const blank = new Group();
    blank.name = `Blanking plate ${b.columns} x ${b.rows}`;
    blank.position.set(px(b.x + b.w / 2), py(b.y + b.h / 2), 0);
    group.add(blank);
    blank.add(sheet(b.w, b.h, b.column, b.row));
    const face = new Group();
    face.position.z = PLATE_FRONT;
    blank.add(face);
    fastenAt(paints, face, b.w, b.h);
    const stamp = createMicroLabel(kit, `PN SP1-BLK-${b.columns}${b.rows}`, {
      height: 0.0022,
      ink: '#8b8e8b',
      bold: false,
    });
    stamp.position.set(0, -b.h / 2 + 0.006, 0.0002);
    face.add(stamp);
  }

  // The parts' own finishes, polished to catch the lights.
  polishParts(kit, new Set([paints.well, paints.slot]), partsFrom);

  return {
    group,
    parts,
    targets,
    status,
    focus(id) {
      for (const t of targets) t.ring.visible = t.id === id;
    },
    work(id, direction = 1) {
      targets.find((t) => t.id === id)?.use(direction);
    },
    update(delta) {
      parts.update(delta);
      for (const step of meterSteps) step(delta);
      let moving = false;
      for (const settled of needles) if (!settled()) moving = true;
      return moving;
    },
    dispose() {
      for (const stop of stops) stop();
      for (const t of timers) clearTimeout(t);
      parts.dispose();
      group.traverse((o) => {
        if (o instanceof Mesh) o.geometry.dispose();
      });
      for (const m of kit.materials) m.dispose();
      for (const t of kit.textures) t.dispose();
    },
  };
}
