import {
  BoxGeometry,
  CircleGeometry,
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  PlaneGeometry,
  TorusGeometry,
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
  kitGlow,
  kitPaint,
} from '../../core/views/eighties-controls';
import { createBrandBadge } from '../../core/views/brand-badge';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createCanvasTexture } from '../../core/views/screens';

/**
 * Indicators and displays for the 1980s panels: a rectangular moving-coil
 * panel meter, a round gauge in a chrome bezel, a character LCD, a
 * blue-green vacuum fluorescent display, an amber LED dot matrix and a
 * faceted jewel lamp. Real size in metres, back on the panel face, facing
 * +z. Needles ease toward their reading in `update`.
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
const printed = (
  kit: PanelKit,
  map: ReturnType<typeof createCanvasTexture>['texture'],
  glow = false,
) => {
  kit.textures.push(map);
  const material = createPs1Material({ map }, true, glow);
  kit.materials.push(material);
  return material as MeshBasicMaterial;
};

export interface Needle {
  group: Group;
  /** Set the reading, 0 to 1 across the scale. */
  set(value: number): void;
  update(delta: number): void;
}

function easedNeedle(pivot: Group, sweep: number, start: number) {
  // The needle turns: not merged with the still parts (`mergeStatic`).
  pivot.userData.live = true;
  let target = 0;
  let shown = 0;
  return {
    set(value: number) {
      target = Math.max(0, Math.min(1, value));
    },
    update(delta: number) {
      shown += (target - shown) * Math.min(1, delta * 4);
      pivot.rotation.z = -(start + shown * sweep);
    },
  };
}

/**
 * A moving-coil panel meter after the common DH-670 (70 × 60 mm): a black
 * moulded case under a clear front, the white scale in its upper half, a
 * shallow 90° arc whose pivot hides in the black moulding below, with the
 * zero-adjust screw in the middle of it. The unit is printed large in the
 * middle of the scale with its current's sign under it ("A  AC" draws A
 * over ~; anything else after the letter is printed small), the maker's
 * name small at the bottom left and the accuracy class at the right.
 * `width` is the case's width.
 */
export function createPanelMeter(
  kit: PanelKit,
  unit: string,
  {
    width = 0.07,
    redFrom = 0.8,
    /** The value printed at full scale. */
    scaleMax = 10,
    /** A coloured band across part of the scale, 0 to 1, instead of the red one. */
    band = null as { from: number; to: number; colour: string } | null,
  } = {},
): Needle {
  const group = new Group();
  // The case, and the scale's window in its upper part (DH-670 proportions).
  const W = width;
  const H = W / 1.16;
  const dialW = W * 0.93;
  const dialH = H * 0.565;
  const dialTop = H / 2 - H * 0.03;
  const dialBottom = dialTop - dialH;
  const pivotY = -H * 0.243;
  const w = 256;
  const ph = Math.round((w * dialH) / dialW);
  const pxPerM = w / dialW;
  const art = createCanvasTexture(w, ph);
  const c = art.context;
  c.fillStyle = '#f4f3ee';
  c.fillRect(0, 0, w, ph);
  const cx = w / 2;
  const cy = (dialTop - pivotY) * pxPerM;
  const r = W * 0.5 * pxPerM;
  const arc = (from: number, to: number, radius = r) => {
    c.beginPath();
    c.arc(
      cx,
      cy,
      radius,
      Math.PI * (1.25 + from * 0.5),
      Math.PI * (1.25 + to * 0.5),
    );
    c.stroke();
  };
  c.strokeStyle = '#1d1d1b';
  c.lineWidth = 1.6;
  arc(0, 1);
  c.strokeStyle = band?.colour ?? '#b8342a';
  c.lineWidth = 3;
  arc(band?.from ?? redFrom, band?.to ?? 1, r - 2.5);
  // Ticks hang inside the arc; the figures stand outside it.
  c.strokeStyle = '#1d1d1b';
  c.fillStyle = '#1d1d1b';
  c.font = `13px ${PANEL_FONT}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  for (let i = 0; i <= 40; i++) {
    const a = Math.PI * (1.25 + (i / 40) * 0.5);
    const long = i % 10 === 0;
    const mid = i % 5 === 0;
    c.lineWidth = long ? 1.8 : 1;
    const inner = r - (long ? 13 : mid ? 9 : 6);
    c.beginPath();
    c.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
    c.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    c.stroke();
    if (long)
      c.fillText(
        String(+((i / 40) * scaleMax).toFixed(2)).replace(/^0\./, '.'),
        cx + Math.cos(a) * (r + 10),
        cy + Math.sin(a) * (r + 10),
      );
  }
  // The unit, large, with the sign of its current under it.
  const [letter, ...rest] = unit.trim().split(/\s+/);
  const kind = rest.join(' ');
  c.font = `bold 26px ${PANEL_FONT}`;
  c.fillText(letter, cx, ph * 0.6);
  if (kind === 'AC' || kind === 'DC') {
    c.lineWidth = 1.6;
    c.beginPath();
    if (kind === 'AC')
      for (let x = -8; x <= 8; x++) {
        const y = ph * 0.76 - Math.sin((x / 8) * Math.PI) * 2.5;
        if (x === -8) c.moveTo(cx + x, y);
        else c.lineTo(cx + x, y);
      }
    else {
      c.moveTo(cx - 8, ph * 0.75);
      c.lineTo(cx + 8, ph * 0.75);
    }
    c.stroke();
  } else if (kind) {
    c.font = `bold 10px ${PANEL_FONT}`;
    c.fillText(kind, cx, ph * 0.77);
  }
  c.font = `9px ${PANEL_FONT}`;
  c.textAlign = 'left';
  c.fillText('CLASS 2.5', w * 0.72, ph * 0.86);
  art.texture.needsUpdate = true;
  // The case's back, the scale set into it, then the needle over the scale.
  const black = kitPaint(kit, '#18181a');
  add(group, new BoxGeometry(W, H, 0.012), black, 0, 0, 0.006);
  add(
    group,
    new PlaneGeometry(dialW, dialH),
    printed(kit, art.texture),
    0,
    (dialTop + dialBottom) / 2,
    0.0125,
  );
  const maker = createBrandBadge(kit, 'kessler-moody', {
    form: 'wordmark',
    height: dialH * 0.07,
    ink: '#2a2a28',
  });
  maker.position.set(-dialW * 0.33, dialBottom + dialH * 0.14, 0.0128);
  group.add(maker);
  const pivot = new Group();
  pivot.position.set(0, pivotY, 0.0135);
  group.add(pivot);
  const length = W * 0.5 * 0.97;
  add(
    pivot,
    new BoxGeometry(0.0007, length, 0.0004),
    kitPaint(kit, '#e0662a'),
    0,
    length / 2,
    0,
  );
  // The moulding in front: the lower half, hiding the pivot and the
  // needle's foot, and the narrow frame round the window, under the
  // clear front's rim.
  add(
    group,
    new BoxGeometry(W, dialBottom + H / 2, 0.003),
    black,
    0,
    (dialBottom - H / 2) / 2,
    0.0155,
  );
  add(
    group,
    new BoxGeometry(W, H / 2 - dialTop, 0.003),
    black,
    0,
    (dialTop + H / 2) / 2,
    0.0155,
  );
  for (const sx of [-1, 1])
    add(
      group,
      new BoxGeometry((W - dialW) / 2, dialH, 0.003),
      black,
      (sx * (W + dialW)) / 4,
      (dialTop + dialBottom) / 2,
      0.0155,
    );
  // The small shroud over the needle's slot, at the scale's foot.
  add(
    group,
    new BoxGeometry(W * 0.23, H * 0.03, 0.002),
    kitPaint(kit, '#0e0e0f'),
    0,
    dialBottom + H * 0.012,
    0.0145,
  );
  const rim = kitPaint(kit, '#2c2d30', 0.1);
  for (const sy of [-1, 1])
    add(
      group,
      new BoxGeometry(W, 0.0015, 0.0015),
      rim,
      0,
      sy * (H / 2 - 0.00075),
      0.0175,
    );
  for (const sx of [-1, 1])
    add(
      group,
      new BoxGeometry(0.0015, H, 0.0015),
      rim,
      sx * (W / 2 - 0.00075),
      0,
      0.0175,
    );
  // The zero-adjust screw, with its slot.
  const screwY = -H * 0.307;
  add(
    group,
    new CylinderGeometry(W * 0.047, W * 0.047, 0.002, 20),
    kitPaint(kit, '#0c0c0d', 0.2),
    0,
    screwY,
    0.018,
  ).rotation.x = Math.PI / 2;
  const slot = add(
    group,
    new BoxGeometry(W * 0.008, W * 0.06, 0.0005),
    kitPaint(kit, '#3a3a3c'),
    0,
    screwY,
    0.0192,
  );
  slot.rotation.z = -0.25;
  const needle = easedNeedle(pivot, Math.PI / 2, -Math.PI / 4);
  needle.update(1);
  return { group, ...needle };
}

/**
 * A round gauge: chrome bezel ring, black case, cream dial with a 270-degree
 * scale and a red limit, a needle and a glass that catches the light.
 */
export function createRoundGauge(
  kit: PanelKit,
  {
    radius = 0.05,
    redFrom = 0.8,
    label = 'mbar',
    /** The value printed at full scale. */
    scaleMax = 5,
  } = {},
): Needle {
  const group = new Group();
  const size = 128;
  const art = createCanvasTexture(size, size);
  const c = art.context;
  const m = size / 2;
  c.fillStyle = '#ece6d2';
  c.fillRect(0, 0, size, size);
  const toCanvas = (share: number) =>
    ((-135 + share * 270 - 90) * Math.PI) / 180;
  c.strokeStyle = '#c43a22';
  c.lineWidth = 6;
  c.beginPath();
  c.arc(m, m, 50, toCanvas(redFrom), toCanvas(1));
  c.stroke();
  c.strokeStyle = '#26251f';
  c.fillStyle = '#26251f';
  c.font = `bold 11px ${PANEL_FONT}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  for (let i = 0; i <= 50; i++) {
    const a = toCanvas(i / 50);
    const long = i % 5 === 0;
    c.lineWidth = long ? 2 : 1;
    c.beginPath();
    c.moveTo(
      m + Math.cos(a) * (long ? 44 : 48),
      m + Math.sin(a) * (long ? 44 : 48),
    );
    c.lineTo(m + Math.cos(a) * 54, m + Math.sin(a) * 54);
    c.stroke();
    if (i % 10 === 0)
      c.fillText(
        String(+((i / 50) * scaleMax).toFixed(2)).replace(/^0\./, '.'),
        m + Math.cos(a) * 35,
        m + Math.sin(a) * 35,
      );
  }
  c.font = `bold 10px ${PANEL_FONT}`;
  c.fillText(label, m, m + 26);
  art.texture.needsUpdate = true;
  // The face, needle and hub each stand clear of the layer below by at
  // least a millimetre, so small gauges do not flicker into their bodies.
  const front = radius * 0.24;
  const faceZ = front + Math.max(radius * 0.005, 0.001);
  const needleZ = faceZ + 0.001;
  const chrome = kitPaint(kit, '#d4d7d7', 0.7);
  const ring = add(
    group,
    new TorusGeometry(radius, radius * 0.09, 6, 28),
    chrome,
    0,
    0,
    radius * 0.12,
  );
  ring.name = 'bezel';
  add(
    group,
    new CylinderGeometry(radius * 1.02, radius * 1.05, radius * 0.24, 28),
    kitPaint(kit, '#1d1e20'),
    0,
    0,
    radius * 0.12,
  ).rotation.x = Math.PI / 2;
  add(
    group,
    new CircleGeometry(radius * 0.97, 28),
    printed(kit, art.texture),
    0,
    0,
    faceZ,
  );
  const pivot = new Group();
  pivot.position.z = needleZ;
  group.add(pivot);
  const black = kitPaint(kit, '#1b1b18');
  add(
    pivot,
    new BoxGeometry(radius * 0.035, radius * 0.86, 0.0006),
    black,
    0,
    radius * 0.33,
    0,
  );
  add(
    group,
    new CylinderGeometry(radius * 0.07, radius * 0.07, 0.002, 10),
    black,
    0,
    0,
    needleZ + 0.0008,
  ).rotation.x = Math.PI / 2;
  const needle = easedNeedle(pivot, (Math.PI * 3) / 2, -(Math.PI * 3) / 4);
  needle.update(1);
  return { group, ...needle };
}

export interface TextDisplay {
  group: Group;
  show(lines: string[], on?: boolean): void;
}

/**
 * A reflective character LCD of `columns` by `rows` 5x7 cells: grey-green
 * glass, dark characters, behind a black bezel. It shows nothing when off.
 */
export function createCharacterLcd(
  kit: PanelKit,
  { columns = 16, rows = 2, cell = 0.0032 } = {},
): TextDisplay {
  const group = new Group();
  const cw = 12;
  const ch = 18;
  const art = createCanvasTexture(columns * cw + 8, rows * ch + 8);
  const width = (columns * cw + 8) * (cell / cw) * 1.6;
  const height = (rows * ch + 8) * (cell / cw) * 1.6;
  add(
    group,
    new BoxGeometry(width + 0.012, height + 0.012, 0.004),
    kitPaint(kit, '#202122'),
    0,
    0,
    0.002,
  );
  const face = printed(kit, art.texture);
  add(group, new PlaneGeometry(width, height), face, 0, 0, 0.0042);
  let last = '';
  const show = (lines: string[], on = true) => {
    const key = `${on}${lines.join('|')}`;
    if (key === last) return;
    last = key;
    const c = art.context;
    c.fillStyle = on ? '#a8b874' : '#7d8566';
    c.fillRect(0, 0, c.canvas.width, c.canvas.height);
    for (let r = 0; r < rows; r++)
      for (let k = 0; k < columns; k++) {
        const x = 4 + k * cw;
        const y = 4 + r * ch;
        // Each cell's faint dot grid shows even when blank.
        c.fillStyle = on ? 'rgba(40,52,24,0.12)' : 'rgba(40,52,24,0.06)';
        c.fillRect(x + 1, y + 1, cw - 2, ch - 2);
      }
    if (on) {
      c.fillStyle = '#1f2914';
      c.font = 'bold 15px "Courier New", monospace';
      c.textBaseline = 'middle';
      c.textAlign = 'center';
      lines.slice(0, rows).forEach((line, r) => {
        for (let k = 0; k < Math.min(columns, line.length); k++)
          c.fillText(line[k], 4 + k * cw + cw / 2, 4 + r * ch + ch / 2 + 1);
      });
    }
    art.texture.needsUpdate = true;
  };
  show([], false);
  return { group, show };
}

/**
 * A vacuum fluorescent display: blue-green glowing characters on black
 * behind a smoked window, the period's sign of a modern instrument.
 */
export function createVfd(
  kit: PanelKit,
  { columns = 10, height = 0.009 } = {},
): TextDisplay {
  const group = new Group();
  const cw = 14;
  const ph = 24;
  const art = createCanvasTexture(columns * cw + 10, ph);
  const width = ((columns * cw + 10) / ph) * height;
  add(
    group,
    new BoxGeometry(width + 0.008, height + 0.008, 0.004),
    kitPaint(kit, '#111214'),
    0,
    0,
    0.002,
  );
  add(
    group,
    new PlaneGeometry(width, height),
    printed(kit, art.texture, true),
    0,
    0,
    0.0042,
  );
  let last = '';
  const show = (lines: string[], on = true) => {
    const text = lines[0] ?? '';
    const key = `${on}${text}`;
    if (key === last) return;
    last = key;
    const c = art.context;
    c.fillStyle = '#05100e';
    c.fillRect(0, 0, c.canvas.width, ph);
    c.font = `bold 18px ${PANEL_FONT}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    for (let k = 0; k < columns; k++) {
      const x = 5 + k * cw + cw / 2;
      c.fillStyle = '#0d2a26';
      c.fillText('8', x, ph / 2 + 1);
      if (on && text[k]) {
        c.fillStyle = '#6ff7d8';
        c.fillText(text[k], x, ph / 2 + 1);
      }
    }
    art.texture.needsUpdate = true;
  };
  show([], false);
  return { group, show };
}

export interface LedMatrix {
  group: Group;
  /** Light the dots for which `lit(column, row)` is true. */
  draw(lit: (column: number, row: number) => boolean): void;
}

/** An amber LED dot matrix behind a tinted window. */
export function createLedMatrix(
  kit: PanelKit,
  { columns = 8, rows = 5, pitch = 0.004, colour = '#ff9a2e' } = {},
): LedMatrix {
  const group = new Group();
  const px = 10;
  const art = createCanvasTexture(columns * px, rows * px);
  const width = columns * pitch;
  const height = rows * pitch;
  add(
    group,
    new BoxGeometry(width + 0.008, height + 0.008, 0.004),
    kitPaint(kit, '#2a1a0c'),
    0,
    0,
    0.002,
  );
  add(
    group,
    new PlaneGeometry(width, height),
    printed(kit, art.texture, true),
    0,
    0,
    0.0042,
  );
  let last = '';
  return {
    group,
    draw(lit) {
      let key = '';
      for (let r = 0; r < rows; r++)
        for (let k = 0; k < columns; k++) key += lit(k, r) ? '1' : '0';
      if (key === last) return;
      last = key;
      const c = art.context;
      c.fillStyle = '#1a0d05';
      c.fillRect(0, 0, columns * px, rows * px);
      for (let r = 0; r < rows; r++)
        for (let k = 0; k < columns; k++) {
          c.fillStyle = key[r * columns + k] === '1' ? colour : '#3a1f0c';
          c.beginPath();
          c.arc(k * px + px / 2, r * px + px / 2, px * 0.36, 0, Math.PI * 2);
          c.fill();
        }
      art.texture.needsUpdate = true;
    },
  };
}

export interface JewelLamp {
  group: Group;
  set(on: boolean): void;
}

/**
 * A faceted jewel indicator lamp: a chrome bezel and a domed coloured lens
 * cut in facets, lit from a filament bulb behind.
 */
export function createJewelLamp(
  kit: PanelKit,
  colour = '#ff4a2e',
  { radius = 0.007, on = false } = {},
): JewelLamp {
  const group = new Group();
  add(
    group,
    new CylinderGeometry(radius * 1.35, radius * 1.45, 0.004, 12),
    kitPaint(kit, '#cfd2d2', 0.65),
    0,
    0,
    0.002,
  ).rotation.x = Math.PI / 2;
  const lens = kitGlow(kit, colour);
  const dark = new Color(colour).multiplyScalar(0.3);
  const lit = new Color(colour);
  add(
    group,
    new CylinderGeometry(radius * 0.55, radius, radius * 0.9, 8),
    lens,
    0,
    0,
    0.004 + radius * 0.45,
  ).rotation.x = Math.PI / 2;
  const made: JewelLamp = {
    group,
    set(value) {
      lens.color.copy(value ? lit : dark);
    },
  };
  made.set(on);
  return made;
}
