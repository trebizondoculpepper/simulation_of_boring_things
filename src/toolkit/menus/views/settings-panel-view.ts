import { computed, effect, signal } from '@preact/signals-core';
import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  PlaneGeometry,
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
import type { PartSet } from '../../components/core/parts/parts';
import { createPs1Material } from '../../components/core/parts/ps1-material';
import type { Readable } from '../../components/core/logic/world/components';
import {
  PANEL_FONT,
  createMicroLabel,
  createPanelKit,
  createSevenSegment,
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
import { CARD, SPACING } from '../logic/panel-layout';
import type { ModuleBox, PanelLayout } from '../logic/panel-layout';
import {
  CONFIRM_WINDOW,
  METERS,
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
 * stage 0): a dark grey panel with a light grey module bolted in for each
 * setting, a quarter-turn fastener at each module's corners and its title
 * engraved along its top, grouped under silk-screened headings. Built from
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
  dispose(): void;
}

/** The panel's paints. */
const PANEL = '#3b3f43';
const SILK = '#ecebe4';
/** Lettering drawn at this multiple of its usual resolution: crisp up close. */
const LETTERING = 3;
/** A module's face stands this far proud of the panel. */
const MODULE_DEPTH = 0.004;

/** A quarter-turn (DZUS) fastener's head, its slot across it, at `x`, `y`. */
function fastener(kit: PanelKit, parent: Object3D, x: number, y: number) {
  const head = new Mesh(
    new CylinderGeometry(0.0034, 0.0036, 0.0012, 14),
    kitPaint(kit, '#8f9396', 0.7),
  );
  head.rotation.x = Math.PI / 2;
  head.position.set(x, y, 0.0006);
  parent.add(head);
  const slot = new Mesh(
    new BoxGeometry(0.0052, 0.0008, 0.0004),
    kitPaint(kit, '#26282a'),
  );
  slot.position.set(x, y, 0.0013);
  slot.rotation.z = ((x * 997 + y * 631) % 1) * Math.PI;
  parent.add(slot);
}

/** The instruction card's art: the bindings, printed small, in a table. */
function drawCard(
  kit: PanelKit,
  width: number,
  height: number,
  bindings: readonly (readonly [string, string, string])[],
  touch: string,
) {
  const perMetre = 9000;
  const w = Math.round(width * perMetre);
  const h = Math.round(height * perMetre);
  const { context: c, texture } = createCanvasTexture(w, h);
  kit.textures.push(texture);
  c.fillStyle = '#f3f1e8';
  c.fillRect(0, 0, w, h);
  const line = CARD.line * perMetre;
  const pad = CARD.pad * perMetre * 0.6;
  const narrow = width < 0.26;
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

  // The panel itself, and its silk-screened group outlines and headings.
  const base = new Mesh(new BoxGeometry(W, H, 0.02), kitPaint(kit, PANEL));
  base.position.z = -0.01;
  group.add(base);
  const silk = kitPaint(kit, SILK);
  const rule = (x: number, y: number, w: number, h: number) => {
    const m = new Mesh(new PlaneGeometry(w, h), silk);
    m.position.set(px(x + w / 2), py(y + h / 2), 0.0003);
    group.add(m);
  };
  for (const g of layout.groups) {
    const t = 0.0009;
    const top = g.y + SPACING.heading / 2;
    const heading = createMicroLabel(kit, g.zone.title, {
      height: 0.0055,
      ink: SILK,
      plate: PANEL,
    });
    heading.position.set(px(g.x + g.w / 2), py(top), 0.0004);
    group.add(heading);
    // The outline, broken where the heading crosses it.
    const label = 0.006 * g.zone.title.length + 0.012;
    const side = (g.w - label) / 2;
    rule(g.x, top - t / 2, side, t);
    rule(g.x + g.w - side, top - t / 2, side, t);
    rule(g.x, g.y + g.h - t, g.w, t);
    rule(g.x, top, t, g.h - (top - g.y));
    rule(g.x + g.w - t, top, t, g.h - (top - g.y));
    if (g.zone.dymo) {
      // The maintenance group is a site addition: its heading on tape too.
      const tape = createDymoLabel(kit, 'SITE ADDITION', { colour: 'red' });
      tape.position.set(px(g.x + g.w - 0.05), py(g.y + g.h - 0.008), 0.0006);
      group.add(tape);
    }
  }

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
  const bolt = (m: ModuleBox) => {
    const mod = new Group();
    mod.name = `Module: ${m.title}`;
    mod.position.set(px(m.x + m.w / 2), py(m.y + m.h / 2), 0);
    group.add(mod);
    const plate = new Mesh(
      new BoxGeometry(m.w, m.h, MODULE_DEPTH),
      kitPaint(kit, PENFOLD_GREY),
    );
    plate.position.z = MODULE_DEPTH / 2;
    mod.add(plate);
    const face = new Group();
    face.position.z = MODULE_DEPTH;
    mod.add(face);
    const inset = 0.0055;
    for (const [sx, sy] of [
      [-1, 1],
      [1, 1],
      [-1, -1],
      [1, -1],
    ])
      fastener(kit, face, sx * (m.w / 2 - inset), sy * (m.h / 2 - inset));
    // Its title: engraved, or Dymo tape for a site addition.
    const titleY = m.h / 2 - 0.004 - SPACING.title / 2;
    const dymo = 'dymo' in m.item && m.item.dymo;
    const title = dymo
      ? createDymoLabel(kit, m.title, { colour: 'black', seed: m.title.length })
      : createEngravedPlate(kit, [m.title], {
          width: m.w - 0.022,
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
        const meter = createPanelMeter(kit, spec.unit, {
          width: 0.088,
          scaleMax: spec.scaleMax,
          redFrom: spec.redFrom ?? 1,
          band: spec.band ?? null,
        });
        const meterH = 0.088 / 1.16;
        place(meter.group, -m.w / 2 + 0.01 + 0.044, body - 0.004 - meterH / 2);
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
        // A black dial plate behind it, so its white scale reads on the grey.
        const dial = new Mesh(
          new CylinderGeometry(0.031, 0.031, 0.001, 36),
          kitPaint(kit, '#1c1d1f'),
        );
        dial.rotation.x = Math.PI / 2;
        place(dial, m.w / 2 - 0.05, centreY + 0.002).position.z = 0.0005;
        place(knob.object, m.w / 2 - 0.05, centreY + 0.006);
        const readout = createSevenSegment(kit, item.digits, {
          digitHeight: 0.0105,
        });
        const readY = -m.h / 2 + 0.017;
        place(readout.group, -m.w / 2 + 0.054, readY);
        const unit = createMicroLabel(kit, item.unit, {
          height: 0.0045,
          ink: '#202120',
        });
        place(
          unit,
          item.unit.endsWith(':')
            ? -m.w / 2 + 0.054 - 0.038
            : -m.w / 2 + 0.054 + 0.038,
          readY,
        ).position.z = 0.0004;
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
        const art = drawCard(kit, cw, ch, bindings, touchHelp);
        const material = createPs1Material({ map: art, roughness: 0.35 });
        kit.materials.push(material);
        const card = new Mesh(new PlaneGeometry(cw, ch), material);
        place(card, 0, centreY - 0.002).position.z = 0.0022;
        break;
      }
    }
  };
  const meterSteps: ((delta: number) => void)[] = [];
  for (const m of layout.modules) bolt(m);

  return {
    group,
    parts,
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
