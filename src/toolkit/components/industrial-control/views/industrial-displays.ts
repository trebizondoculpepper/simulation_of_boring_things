import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  PlaneGeometry,
} from 'three';
import type {
  BufferGeometry,
  Material,
  MeshBasicMaterial,
  Object3D,
} from 'three';
import { createPs1Material } from '../../core/parts/ps1-material';
import {
  PANEL_FONT,
  createMicroLabel,
  kitGlow,
  kitPaint,
} from '../../core/views/eighties-controls';
import { createBrandBadge } from '../../core/views/brand-badge';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createKeycap } from './panel-switchgear';
import type { Keycap } from './panel-switchgear';
import { createCanvasTexture } from '../../core/views/screens';

/**
 * Displays of a 1990s American plant floor: a stack light, an elapsed-time
 * meter, a two-line vacuum fluorescent message display of the kind that
 * scrolled plant messages over the motor control centre, a monochrome
 * operator terminal with function keys, and an AC drive's keypad (its
 * human interface module). Real size in metres, facing +z. Views only:
 * each shows what it is given.
 */

const add = (
  parent: Object3D,
  geometry: BufferGeometry,
  material: Material | Material[],
  x = 0,
  y = 0,
  z = 0,
) => {
  const mesh = new Mesh(geometry, material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};
const screen = (kit: PanelKit, width: number, height: number) => {
  const art = createCanvasTexture(width, height);
  kit.textures.push(art.texture);
  const material = createPs1Material(
    { map: art.texture },
    true,
    true,
  ) as MeshBasicMaterial;
  kit.materials.push(material);
  return { ...art, material };
};

export interface StackLightView {
  group: Group;
  /** Light each tier, top first. */
  set(lit: readonly boolean[]): void;
}

/**
 * A stack light: tiers of coloured lenses on a pole, red on top, seen
 * across the floor. Built standing on its base at the origin, up +y.
 */
export function createStackLight(
  kit: PanelKit,
  colours: readonly string[] = ['#e3261b', '#f0a01a', '#25a845'],
): StackLightView {
  const group = new Group();
  const black = kitPaint(kit, '#1b1b1c');
  add(group, new CylinderGeometry(0.03, 0.034, 0.02, 16), black, 0, 0.01, 0);
  add(
    group,
    new CylinderGeometry(0.008, 0.008, 0.12, 8),
    kitPaint(kit, '#b5b7b8', 0.7),
    0,
    0.08,
    0,
  );
  const tier = 0.055;
  const lenses = colours.map((colour, i) => {
    const material = kitGlow(kit, colour);
    const y = 0.14 + (colours.length - 1 - i) * tier + tier / 2;
    add(
      group,
      new CylinderGeometry(0.028, 0.028, tier - 0.004, 16),
      material,
      0,
      y,
      0,
    );
    add(
      group,
      new CylinderGeometry(0.0285, 0.0285, 0.004, 16),
      black,
      0,
      y - tier / 2,
      0,
    );
    return {
      material,
      on: new Color(colour),
      off: new Color(colour).multiplyScalar(0.25),
    };
  });
  add(
    group,
    new CylinderGeometry(0.027, 0.028, 0.012, 16),
    black,
    0,
    0.14 + colours.length * tier + 0.006,
    0,
  );
  return {
    group,
    set(lit) {
      lenses.forEach((lens, i) =>
        (lens.material as unknown as { color: Color }).color.copy(
          lit[i] ? lens.on : lens.off,
        ),
      );
    },
  };
}

export interface HourMeterView {
  group: Group;
  show(hours: number): void;
}

/**
 * An elapsed-time meter: a square black bezel with a drum counter behind
 * a window, five white figures of hours and a tenth on red, HOURS under it.
 */
export function createHourMeterView(kit: PanelKit): HourMeterView {
  const group = new Group();
  add(
    group,
    new BoxGeometry(0.052, 0.052, 0.008),
    kitPaint(kit, '#1a1a1b'),
    0,
    0,
    0.004,
  );
  add(
    group,
    new CylinderGeometry(0.02, 0.02, 0.002, 20),
    kitPaint(kit, '#0c0c0d'),
    0,
    0,
    0.009,
  ).rotation.x = Math.PI / 2;
  const art = screen(kit, 144, 32);
  const window = add(
    group,
    new PlaneGeometry(0.034, 0.0076),
    art.material,
    0,
    0.002,
    0.0101,
  );
  window.name = 'Hour meter window';
  const label = createMicroLabel(kit, 'HOURS', {
    height: 0.0026,
    ink: '#e9e5da',
  });
  label.position.set(0, -0.009, 0.0102);
  group.add(label);
  let last = '';
  const show = (hours: number) => {
    const tenths = Math.floor(Math.max(0, hours) * 10) % 1000000;
    const text = String(tenths).padStart(6, '0');
    if (text === last) return;
    last = text;
    const c = art.context;
    c.fillStyle = '#0a0a0a';
    c.fillRect(0, 0, 144, 32);
    c.font = `bold 22px ${PANEL_FONT}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    for (let i = 0; i < 6; i++) {
      const tenth = i === 5;
      c.fillStyle = tenth ? '#b51f17' : '#161616';
      c.fillRect(2 + i * 23.5, 2, 21, 28);
      c.fillStyle = '#f2efe6';
      c.fillText(text[i], 12.5 + i * 23.5, 17);
    }
    art.texture.needsUpdate = true;
  };
  show(0);
  return { group, show };
}

export interface MessageDisplayView {
  group: Group;
  show(lines: readonly string[], on: boolean): void;
}

/**
 * A plant message display: a long black case with a two-line, twenty-
 * character vacuum fluorescent window glowing blue-green, mounted above a
 * motor control centre to show what it is doing.
 */
export function createMessageDisplay(
  kit: PanelKit,
  { columns = 20, caption = 'DATALINE' } = {},
): MessageDisplayView {
  const group = new Group();
  const width = columns * 0.0105 + 0.04;
  add(
    group,
    new BoxGeometry(width, 0.07, 0.03),
    kitPaint(kit, '#232426'),
    0,
    0,
    0.015,
  );
  add(
    group,
    new BoxGeometry(width - 0.02, 0.046, 0.002),
    kitPaint(kit, '#0b0d0d'),
    0,
    0.002,
    0.031,
  );
  const cw = 18;
  const ch = 30;
  const art = screen(kit, columns * cw + 12, ch * 2 + 10);
  add(
    group,
    new PlaneGeometry(columns * 0.0105, 0.036),
    art.material,
    0,
    0.002,
    0.0322,
  );
  const label = createMicroLabel(kit, caption, {
    height: 0.003,
    ink: '#a9acae',
  });
  label.position.set(width / 2 - 0.03, -0.029, 0.0302);
  group.add(label);
  let last = '';
  const show = (lines: readonly string[], on: boolean) => {
    const key = `${on}${lines.join('|')}`;
    if (key === last) return;
    last = key;
    const c = art.context;
    c.fillStyle = '#030807';
    c.fillRect(0, 0, c.canvas.width, c.canvas.height);
    c.font = `bold 24px "Courier New", monospace`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    for (let r = 0; r < 2; r++)
      for (let k = 0; k < columns; k++) {
        const x = 6 + k * cw + cw / 2;
        const y = 5 + r * ch + ch / 2;
        // The unlit dot cells show faintly through the window.
        c.fillStyle = '#0b1f1c';
        c.fillRect(x - 7, y - 11, 14, 22);
        const letter = on ? (lines[r] ?? '')[k] : undefined;
        if (letter && letter !== ' ') {
          c.fillStyle = '#62f2e0';
          c.fillText(letter, x, y + 1);
        }
      }
    art.texture.needsUpdate = true;
  };
  show([], false);
  return { group, show };
}

export interface TerminalView {
  group: Group;
  /** The function keys F1 to F8, left to right. */
  functionKeys: Keycap[];
  /** The numeric keypad's keys, by legend. */
  keypad: Keycap[];
  /** Draw on the screen, 240 by 128 pixels; `null` blanks it. */
  draw(
    paint: ((c: CanvasRenderingContext2D, w: number, h: number) => void) | null,
  ): void;
  update(delta: number): void;
}

/**
 * An operator terminal of the mid-1990s: a grey moulded case with a
 * monochrome blue-white LCD, a row of function keys under it and a
 * numeric keypad beside it.
 */
export function createOperatorTerminal(kit: PanelKit): TerminalView {
  const group = new Group();
  add(
    group,
    new BoxGeometry(0.25, 0.17, 0.05),
    kitPaint(kit, '#8c8f8e'),
    0,
    0,
    0.025,
  );
  add(
    group,
    new BoxGeometry(0.236, 0.156, 0.002),
    kitPaint(kit, '#5d605f'),
    0,
    0,
    0.051,
  );
  add(
    group,
    new BoxGeometry(0.15, 0.085, 0.002),
    kitPaint(kit, '#111214'),
    -0.035,
    0.028,
    0.052,
  );
  const w = 240;
  const h = 128;
  const art = screen(kit, w, h);
  add(
    group,
    new PlaneGeometry(0.138, 0.0736),
    art.material,
    -0.035,
    0.028,
    0.0532,
  );
  const label = createMicroLabel(kit, 'OPERATOR TERMINAL', {
    height: 0.0035,
    ink: '#2b2c2c',
  });
  label.position.set(-0.07, 0.077, 0.0522);
  group.add(label);
  // Its maker's logo, small, in the bezel's top corner.
  const maker = createBrandBadge(kit, 'quorvane', { height: 0.0065 });
  maker.position.set(0.085, 0.077, 0.0522);
  group.add(maker);
  const functionKeys: Keycap[] = [];
  for (let i = 0; i < 8; i++) {
    const key = createKeycap(kit, `F${i + 1}`, {
      width: 0.014,
      height: 0.011,
      colour: '#2c3e5c',
      ink: '#f1efe8',
    });
    key.group.position.set(-0.1 + i * 0.0185, -0.035, 0.052);
    group.add(key.group);
    functionKeys.push(key);
  }
  const keypad: Keycap[] = [];
  const rows = [
    ['7', '8', '9'],
    ['4', '5', '6'],
    ['1', '2', '3'],
    ['0', '.', '↵'],
  ];
  rows.forEach((row, r) =>
    row.forEach((legend, k) => {
      const key = createKeycap(kit, legend, {
        width: 0.014,
        height: 0.011,
        colour: legend === '↵' ? '#c7c2a4' : '#d8d6cc',
      });
      key.group.position.set(0.068 + k * 0.018, 0.055 - r * 0.017, 0.052);
      group.add(key.group);
      keypad.push(key);
    }),
  );
  const draw: TerminalView['draw'] = (paint) => {
    const c = art.context;
    c.setTransform(1, 0, 0, 1, 0, 0);
    if (!paint) {
      c.fillStyle = '#0d1418';
      c.fillRect(0, 0, w, h);
    } else {
      c.fillStyle = '#26476e';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#e6eef4';
      c.strokeStyle = '#e6eef4';
      c.font = 'bold 13px "Courier New", monospace';
      c.textBaseline = 'top';
      paint(c, w, h);
    }
    art.texture.needsUpdate = true;
  };
  draw(null);
  return {
    group,
    functionKeys,
    keypad,
    draw,
    update(delta) {
      for (const key of [...functionKeys, ...keypad]) key.update(delta);
    },
  };
}

export interface DriveKeypadView {
  group: Group;
  /** The keys, by name. */
  keys: Record<
    | 'esc'
    | 'sel'
    | 'up'
    | 'down'
    | 'enter'
    | 'jog'
    | 'start'
    | 'stop'
    | 'reverse',
    Keycap
  >;
  show(lines: readonly string[], on: boolean): void;
  update(delta: number): void;
}

/**
 * An AC drive's keypad (its human interface module): a small charcoal
 * module with a two-line, sixteen-character backlit LCD, menu keys (ESC,
 * SEL, up, down, enter) and the drive's own green START, red STOP, JOG and
 * direction keys.
 */
export function createDriveKeypad(kit: PanelKit): DriveKeypadView {
  const group = new Group();
  add(
    group,
    new BoxGeometry(0.075, 0.115, 0.02),
    kitPaint(kit, '#2c2d30'),
    0,
    0,
    0.01,
  );
  add(
    group,
    new BoxGeometry(0.066, 0.03, 0.002),
    kitPaint(kit, '#141516'),
    0,
    0.033,
    0.021,
  );
  const cols = 16;
  const art = screen(kit, cols * 12 + 8, 44);
  add(group, new PlaneGeometry(0.06, 0.0138), art.material, 0, 0.033, 0.0222);
  const brand = createBrandBadge(kit, 'torvald', {
    form: 'wordmark',
    height: 0.0055,
    ink: '#b8babd',
  });
  brand.position.set(0, 0.051, 0.0202);
  group.add(brand);
  const key = (
    legend: string,
    x: number,
    y: number,
    colour = '#5b5e63',
    ink = '#eeeeea',
  ) => {
    const k = createKeycap(kit, legend, {
      width: 0.014,
      height: 0.01,
      colour,
      ink,
    });
    k.group.position.set(x, y, 0.02);
    group.add(k.group);
    return k;
  };
  const keys = {
    esc: key('ESC', -0.022, 0.008),
    sel: key('SEL', 0.022, 0.008),
    up: key('▲', 0, 0.014),
    down: key('▼', 0, 0.001),
    enter: key('↵', 0, -0.012),
    reverse: key('⇄', -0.022, -0.012),
    jog: key('JOG', 0.022, -0.012),
    start: key('I', -0.016, -0.035, '#1f8a3a'),
    stop: key('O', 0.016, -0.035, '#c8261c'),
  };
  let last = '';
  const show = (lines: readonly string[], on: boolean) => {
    const keyText = `${on}${lines.join('|')}`;
    if (keyText === last) return;
    last = keyText;
    const c = art.context;
    c.fillStyle = on ? '#9fd05a' : '#4a5a38';
    c.fillRect(0, 0, c.canvas.width, c.canvas.height);
    if (on) {
      c.fillStyle = '#16240c';
      c.font = 'bold 16px "Courier New", monospace';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      lines.slice(0, 2).forEach((line, r) => {
        for (let k = 0; k < Math.min(cols, line.length); k++)
          c.fillText(line[k], 4 + k * 12 + 6, 4 + r * 18 + 9);
      });
    }
    art.texture.needsUpdate = true;
  };
  show([], false);
  return {
    group,
    keys,
    show,
    update(delta) {
      for (const k of Object.values(keys)) k.update(delta);
    },
  };
}
