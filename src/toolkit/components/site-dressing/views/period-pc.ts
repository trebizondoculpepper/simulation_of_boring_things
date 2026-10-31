import {
  BoxGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  Group,
  Mesh,
  PlaneGeometry,
  TubeGeometry,
  Vector3,
} from 'three';
import type { BufferGeometry, MeshBasicMaterial, Object3D } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createPs1Material } from '../../core/parts/ps1-material';
import { kitGlow, kitPaint } from '../../core/views/eighties-controls';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createCanvasTexture } from '../../core/views/screens';
import { createCrtSurface } from '../../industrial-control/views/crt-surface';
import {
  PC_BOOT,
  PC_MAKER,
  SCREENSAVER_HZ,
  clockText,
  cowSpots,
  diskBusy,
  duckPositions,
  newPc,
  pcFrame,
  pressPower,
  stepPc,
  touchPc,
} from '../logic/period-pc';
import type { PcState } from '../logic/period-pc';

/**
 * The hook for a boot sequence (`core/logic/boot-sequence.ts`, its `'gui'`
 * family, when it comes): its length, and how to draw its picture at
 * `seconds` into the boot on the PC's 4:3 screen. Without one, the PC
 * draws its own BIOS screen and splash.
 */
export interface PcBootScreen {
  seconds: number;
  draw(
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
    seconds: number,
  ): void;
}

export interface PeriodPcOptions {
  /** The time on the taskbar clock, minutes since midnight: by default the browser's. */
  clock?: () => number;
  /** A boot sequence to show instead of the PC's own (see `PcBootScreen`). */
  boot?: PcBootScreen;
}

const BEIGE = PC_MAKER.beige;
const BEIGE_DARK = '#c4baa0';
const SANS = 'Arial, Helvetica, sans-serif';

/** Black Holstein blotches over `w × h` of a canvas at (x, y). */
export function paintCowSpots(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  seed: number,
  count: number,
) {
  const side = Math.min(w, h);
  context.save();
  context.beginPath();
  context.rect(x, y, w, h);
  context.clip();
  context.fillStyle = '#141414';
  for (const spot of cowSpots(seed, count)) {
    const cx = x + spot.x * w;
    const cy = y + spot.y * h;
    // A little larger on a long panel.
    const r = spot.r * side * (w / side > 1.5 ? 1.2 : 1);
    const n = spot.lobes.length;
    // Wider than tall, as a coat's blotches are.
    const points = spot.lobes.map((k, i) => {
      const a = (i / n) * Math.PI * 2;
      return [cx + Math.cos(a) * r * k * 1.15, cy + Math.sin(a) * r * k * 0.85];
    });
    // A smooth closed outline through the lobes' midpoints.
    const mid = (i: number) => {
      const [ax, ay] = points[i % n];
      const [bx, by] = points[(i + 1) % n];
      return [(ax + bx) / 2, (ay + by) / 2];
    };
    context.beginPath();
    const [sx, sy] = mid(n - 1);
    context.moveTo(sx, sy);
    for (let i = 0; i < n; i++) {
      const [px, py] = points[i];
      const [mx, my] = mid(i);
      context.quadraticCurveTo(px, py, mx, my);
    }
    context.fill();
  }
  context.restore();
}

/**
 * The Gateway 3000's mark, our own drawing (the owner, 2026-10-31): a
 * little cow-spotted carton, drawn in perspective, beside the name in a
 * heavy italic, at (x, y) `h` pixels high.
 */
export function drawGatewayLogo(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  h: number,
  ink = '#1d1d1d',
) {
  const s = h;
  // The carton: front, top and side faces, white with black spots.
  context.save();
  context.lineWidth = Math.max(1, s * 0.05);
  context.strokeStyle = ink;
  const fx = x;
  const fy = y + s * 0.3;
  const fw = s * 0.6;
  const fh = s * 0.66;
  const dx = s * 0.26;
  const dy = s * 0.24;
  const faces: [number, number][][] = [
    [
      [fx, fy],
      [fx + fw, fy],
      [fx + fw, fy + fh],
      [fx, fy + fh],
    ],
    [
      [fx, fy],
      [fx + dx, fy - dy],
      [fx + fw + dx, fy - dy],
      [fx + fw, fy],
    ],
    [
      [fx + fw, fy],
      [fx + fw + dx, fy - dy],
      [fx + fw + dx, fy + fh - dy],
      [fx + fw, fy + fh],
    ],
  ];
  for (const [i, face] of faces.entries()) {
    context.beginPath();
    for (const [j, [px, py]] of face.entries())
      if (j === 0) context.moveTo(px, py);
      else context.lineTo(px, py);
    context.closePath();
    context.fillStyle = i === 2 ? '#dedede' : '#ffffff';
    context.fill();
    context.save();
    context.clip();
    paintCowSpots(context, x, y - dy, fw + dx, fh + dy * 2, 7 + i, 9);
    context.restore();
    // The face's outline again, the spots' paths having replaced it.
    context.beginPath();
    for (const [j, [px, py]] of face.entries())
      if (j === 0) context.moveTo(px, py);
      else context.lineTo(px, py);
    context.closePath();
    context.stroke();
  }
  context.restore();
  // The name, heavy and leaning, after the carton.
  context.fillStyle = ink;
  context.textBaseline = 'alphabetic';
  context.font = `italic 900 ${Math.round(s * 0.62)}px ${SANS}`;
  context.fillText('GATEWAY', x + fw + dx + s * 0.18, y + s * 0.74);
  const nameW = context.measureText('GATEWAY').width;
  context.font = `italic 700 ${Math.round(s * 0.36)}px ${SANS}`;
  context.fillText('3000', x + fw + dx + s * 0.22 + nameW, y + s * 0.74);
  return fw + dx + s * 0.22 + nameW + context.measureText('3000').width;
}

/** The plain four-pane sash window of the PANES 95 sticker (not anyone's flag). */
export function drawPanesSticker(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  version = '95',
) {
  context.save();
  context.fillStyle = '#f4f1e6';
  context.fillRect(x, y, w, h);
  context.strokeStyle = '#2c4f8f';
  context.lineWidth = Math.max(1, w * 0.02);
  context.strokeRect(x, y, w, h);
  const ww = w * 0.42;
  const wx = x + (w - ww) / 2;
  const wy = y + h * 0.1;
  const wh = h * 0.42;
  context.fillStyle = '#e3d7b4';
  context.fillRect(wx, wy, ww, wh);
  context.strokeStyle = '#2c4f8f';
  context.strokeRect(wx, wy, ww, wh);
  context.beginPath();
  context.moveTo(wx + ww / 2, wy);
  context.lineTo(wx + ww / 2, wy + wh);
  context.moveTo(wx, wy + wh / 2);
  context.lineTo(wx + ww, wy + wh / 2);
  context.stroke();
  context.fillStyle = '#1f2f55';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = `${Math.round(h * 0.11)}px ${SANS}`;
  context.fillText('Designed for', x + w / 2, y + h * 0.65);
  context.font = `bold ${Math.round(h * 0.17)}px ${SANS}`;
  context.fillText(`PANES ${version}`, x + w / 2, y + h * 0.83);
  context.restore();
}

/** Boxes `w × h × d` centred at (x, y, z) in `group`, of `material`. */
const block = (
  group: Group,
  geometry: BufferGeometry,
  material: Mesh['material'],
  x: number,
  y: number,
  z: number,
) => {
  const mesh = new Mesh(geometry, material);
  mesh.position.set(x, y, z);
  group.add(mesh);
  return mesh;
};

/**
 * A box tapering towards its back, as a CRT's moulded rear does: its front
 * `w × h` at z = 0, its back `bw × bh` at z = −d, lowered so the bottoms
 * stay level.
 */
function taperedBox(w: number, h: number, d: number, bw: number, bh: number) {
  const geometry = new BoxGeometry(w, h, d);
  geometry.translate(0, h / 2, -d / 2);
  const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++)
    if (p.getZ(i) < -d / 2) {
      p.setX(i, (p.getX(i) * bw) / w);
      p.setY(i, (p.getY(i) * bh) / h);
    }
  geometry.computeVertexNormals();
  return geometry;
}

/** A printed texture, drawn once, as an unlit-free lit material. */
function printed(
  kit: PanelKit,
  width: number,
  height: number,
  draw: (context: CanvasRenderingContext2D) => void,
) {
  const { context, texture } = createCanvasTexture(width, height, 'printed');
  draw(context);
  texture.needsUpdate = true;
  kit.textures.push(texture);
  const material = createPs1Material({ map: texture, roughness: 0.75 });
  kit.materials.push(material);
  return material;
}

/** The tower's front fascia: bays, slots, sticker, badge and lettering. */
function drawFascia(context: CanvasRenderingContext2D, W: number, H: number) {
  // Fascia proportions follow the tower's: 0.19 m wide, 0.43 m high.
  const px = (m: number) => (m / 0.19) * W;
  const py = (m: number) => (m / 0.43) * H;
  context.fillStyle = BEIGE;
  context.fillRect(0, 0, W, H);
  // A moulded recess down the middle, where the bays sit.
  context.fillStyle = '#cfc5aa';
  context.fillRect(px(0.012), py(0.02), px(0.166), py(0.2));
  // Bay outlines: two 5.25", two 3.5" (one with a floppy drive).
  context.strokeStyle = '#9d947c';
  context.lineWidth = 2;
  for (const y of [0.03, 0.078])
    context.strokeRect(px(0.015), py(y), px(0.16), py(0.044));
  for (const y of [0.13, 0.163])
    context.strokeRect(px(0.045), py(y), px(0.1), py(0.027));
  // Labels for the buttons and lamps beneath.
  context.fillStyle = '#5b5446';
  context.textAlign = 'center';
  context.font = `bold ${Math.round(py(0.0065))}px ${SANS}`;
  context.fillText('POWER', px(0.045), py(0.285));
  context.fillText('RESET', px(0.12), py(0.257));
  context.fillText('TURBO', px(0.155), py(0.257));
  context.fillText('HDD', px(0.12), py(0.297));
  context.fillText('TURBO', px(0.155), py(0.297));
  // Vent slots near the foot.
  context.fillStyle = '#857c66';
  for (let i = 0; i < 9; i++)
    context.fillRect(px(0.025), py(0.35 + i * 0.007), px(0.14), py(0.0025));
  // The badge, cow spots and all, and the PANES 95 sticker beside a
  // processor sticker, as shipped.
  context.fillStyle = '#ffffff';
  context.fillRect(px(0.02), py(0.31), px(0.15), py(0.03));
  drawGatewayLogo(context, px(0.025), py(0.313), py(0.024));
  drawPanesSticker(context, px(0.02), py(0.197), px(0.032), py(0.036));
  context.fillStyle = '#2b3f7a';
  context.fillRect(px(0.06), py(0.2), px(0.03), py(0.03));
  context.fillStyle = '#f0d36a';
  context.textAlign = 'center';
  context.font = `bold ${Math.round(py(0.0075))}px ${SANS}`;
  context.fillText('QUINTIUM', px(0.075), py(0.212));
  context.font = `${Math.round(py(0.0055))}px ${SANS}`;
  context.fillText('processor', px(0.075), py(0.22));
  context.fillText('166 MHz', px(0.075), py(0.227));
}

/** The keyboard's keys, printed on its top: a 102-key UK layout's blocks. */
function drawKeyboard(context: CanvasRenderingContext2D, W: number, H: number) {
  context.fillStyle = BEIGE_DARK;
  context.fillRect(0, 0, W, H);
  const u = W / 23.5;
  const key = (x: number, y: number, w: number, h = 1, dark = false) => {
    context.fillStyle = dark ? '#a59c84' : '#e4dcc6';
    context.fillRect(x * u + 1.5, y * u + 1.5, w * u - 3, h * u - 3);
    context.fillStyle = '#5a5446';
    context.fillRect(x * u + u * 0.25, y * u + u * 0.3, u * 0.18, u * 0.18);
  };
  const top = 1.3;
  // Escape and the function keys.
  key(0.3, top, 1, 1, true);
  for (let g = 0; g < 3; g++)
    for (let i = 0; i < 4; i++) key(2.3 + g * 4.5 + i, top, 1, 1, true);
  // The main block.
  const rows: [number, number[]][] = [
    [0, [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2]],
    [0, [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5]],
    [0, [1.75, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.25]],
    [0, [1.25, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.75]],
    [0, [1.5, 1.25, 1.5, 6.75, 1.5, 1.25, 1.25]],
  ];
  for (const [r, [, widths]] of rows.entries()) {
    let x = 0.3;
    for (const w of widths) {
      key(x, top + 1.5 + r, w, 1, w > 1.2 && w < 6);
      x += w;
    }
  }
  // Arrows and the editing block, and the number pad.
  for (let i = 0; i < 3; i++) {
    key(15.5 + i, top + 1.5, 1);
    key(15.5 + i, top + 2.5, 1);
  }
  key(16.5, top + 4.5, 1, 1, true);
  for (let i = 0; i < 3; i++) key(15.5 + i, top + 5.5, 1, 1, true);
  for (let r = 0; r < 5; r++)
    for (let c = 0; c < 4; c++) key(19 + c, top + 1.5 + r, 1);
  // The three lock lamps and a badge.
  context.fillStyle = '#2f3a2c';
  for (let i = 0; i < 3; i++)
    context.fillRect((19.4 + i) * u, top * u + u * 0.3, u * 0.3, u * 0.3);
  context.fillStyle = '#5a5446';
  context.font = `italic bold ${Math.round(u * 0.5)}px ${SANS}`;
  context.textAlign = 'left';
  context.fillText('GATEWAY 3000', 0.3 * u, 0.85 * u);
}

/** The mouse mat: a promotional freebie from a chemical supplier, of course. */
function drawMouseMat(context: CanvasRenderingContext2D, W: number, H: number) {
  const g = context.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#2b7fb8');
  g.addColorStop(1, '#0d3c66');
  context.fillStyle = g;
  context.fillRect(0, 0, W, H);
  // Pool tiles' lines, wavering.
  context.strokeStyle = 'rgba(160, 220, 255, 0.35)';
  context.lineWidth = 2;
  for (let i = 1; i < 8; i++) {
    context.beginPath();
    for (let x = 0; x <= W; x += 8) {
      const y = (i * H) / 8 + Math.sin(x / 17 + i) * 3;
      if (x === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.stroke();
  }
  context.fillStyle = '#ffffff';
  context.textAlign = 'center';
  context.font = `bold ${Math.round(H * 0.11)}px ${SANS}`;
  context.fillText('DoseRight Gold', W / 2, H * 0.78);
  context.font = `${Math.round(H * 0.06)}px ${SANS}`;
  context.fillText('Langelier Labs · Keep it balanced', W / 2, H * 0.88);
}

/** The screen's pictures: BIOS and splash, desktop, screensaver. */
function screenPainter(boot: PcBootScreen | undefined) {
  const bios = (
    c: CanvasRenderingContext2D,
    W: number,
    H: number,
    t: number,
  ) => {
    c.fillStyle = '#000000';
    c.fillRect(0, 0, W, H);
    if (t > 4) {
      // The splash: sky and clouds, the system's name.
      const g = c.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#2f6fd0');
      g.addColorStop(1, '#9cc6f2');
      c.fillStyle = g;
      c.fillRect(0, 0, W, H);
      c.fillStyle = 'rgba(255,255,255,0.85)';
      for (const [x, y, r] of [
        [0.2, 0.25, 0.08],
        [0.27, 0.22, 0.1],
        [0.7, 0.6, 0.09],
        [0.78, 0.63, 0.07],
        [0.45, 0.82, 0.1],
      ]) {
        c.beginPath();
        c.arc(x * W, y * H, r * W, 0, Math.PI * 2);
        c.fill();
      }
      c.fillStyle = '#ffffff';
      c.textAlign = 'center';
      c.font = `bold ${Math.round(H * 0.12)}px ${SANS}`;
      c.fillText('PANES 95', W / 2, H * 0.48);
      c.font = `${Math.round(H * 0.045)}px ${SANS}`;
      c.fillText('Starting PANES…', W / 2, H * 0.58);
      // The progress bar's march.
      c.fillStyle = '#163a8a';
      c.fillRect(0, H - H * 0.04, W, H * 0.04);
      c.fillStyle = '#7fb0ff';
      const k = Math.floor(t * 4) % 16;
      c.fillRect((k / 16) * W, H - H * 0.04, W / 5, H * 0.04);
      return;
    }
    c.fillStyle = '#c8c8c8';
    c.textAlign = 'left';
    const line = H / 24;
    c.font = `${Math.round(line * 0.8)}px "Courier New", monospace`;
    const kb = Math.min(32768, Math.floor((t / 2.2) * 32768));
    const lines = [
      'Gateway 3000 BIOS v1.00.07  (C) 1996',
      'P5-166 Family PC',
      '',
      'Quintium(tm) CPU at 166 MHz',
      `Memory Test : ${kb}K${kb >= 32768 ? ' OK' : ''}`,
      '',
      t > 2.4 ? 'Detecting IDE Primary Master ... 2.1 GB' : '',
      t > 2.9 ? 'Detecting IDE Secondary Master ... 8X CD-ROM' : '',
      '',
      t > 3.4 ? 'Starting PANES 95...' : '',
    ];
    for (const [i, text] of lines.entries())
      c.fillText(text, line, line * (1.5 + i));
    c.fillText('Press DEL to enter SETUP', line, H - line);
  };
  const icon = (
    c: CanvasRenderingContext2D,
    x: number,
    y: number,
    s: number,
    label: string,
    colour: string,
  ) => {
    c.fillStyle = colour;
    c.fillRect(x + s * 0.2, y, s * 0.6, s * 0.5);
    c.strokeStyle = '#000000';
    c.lineWidth = 1;
    c.strokeRect(x + s * 0.2, y, s * 0.6, s * 0.5);
    c.fillStyle = '#ffffff';
    c.textAlign = 'center';
    c.font = `${Math.round(s * 0.18)}px ${SANS}`;
    c.fillText(label, x + s / 2, y + s * 0.72);
  };
  const desktop = (
    c: CanvasRenderingContext2D,
    W: number,
    H: number,
    minutes: number,
  ) => {
    c.fillStyle = '#008080';
    c.fillRect(0, 0, W, H);
    const s = W / 9;
    icon(c, s * 0.2, s * 0.2, s, 'This Machine', '#c9c0a3');
    icon(c, s * 0.2, s * 1.2, s, 'Wastebasket', '#9aa3a8');
    icon(c, s * 0.2, s * 2.2, s, 'BookIt! Pro', '#d9a33a');
    icon(c, s * 0.2, s * 3.2, s, 'COSHH 95', '#d86a28');
    icon(c, s * 0.2, s * 4.2, s, 'Pool Sim 97', '#3a8fd9');
    // A window: today's bookings, half filled in.
    const wx = W * 0.24;
    const wy = H * 0.1;
    const ww = W * 0.68;
    const wh = H * 0.68;
    c.fillStyle = '#c0c0c0';
    c.fillRect(wx, wy, ww, wh);
    c.fillStyle = '#000080';
    c.fillRect(wx + 3, wy + 3, ww - 6, H * 0.05);
    c.fillStyle = '#ffffff';
    c.textAlign = 'left';
    c.font = `bold ${Math.round(H * 0.034)}px ${SANS}`;
    c.fillText('BookIt! Pro - [Main Pool - Today]', wx + 8, wy + H * 0.04);
    c.fillStyle = '#ffffff';
    const gx = wx + 8;
    const gy = wy + H * 0.08;
    const gw = ww - 16;
    const gh = wh - H * 0.1;
    c.fillRect(gx, gy, gw, gh);
    c.strokeStyle = '#808080';
    const rows = 9;
    const cols = 6;
    const sessions = [
      'Early swim',
      'Lanes',
      'Schools',
      'Aquafit',
      'Club',
      'Public',
      'Lessons',
      'Lanes',
      'Closed',
    ];
    c.font = `${Math.round(H * 0.026)}px ${SANS}`;
    for (let r = 0; r <= rows; r++) {
      c.beginPath();
      c.moveTo(gx, gy + (r * gh) / rows);
      c.lineTo(gx + gw, gy + (r * gh) / rows);
      c.stroke();
    }
    for (let k = 0; k <= cols; k++) {
      c.beginPath();
      c.moveTo(gx + (k * gw) / cols, gy);
      c.lineTo(gx + (k * gw) / cols, gy + gh);
      c.stroke();
    }
    for (let r = 0; r < rows; r++) {
      c.fillStyle = '#000000';
      c.fillText(
        `${String(6 + r * 2).padStart(2, '0')}:00`,
        gx + 4,
        gy + ((r + 0.7) * gh) / rows,
      );
      for (let k = 1; k < cols; k++) {
        if ((r * 7 + k * 3) % 5 === 0) continue;
        c.fillStyle = ['#ffe28a', '#a9d8ff', '#c7f0b3', '#f5b5c8'][(r + k) % 4];
        c.fillRect(
          gx + (k * gw) / cols + 2,
          gy + (r * gh) / rows + 2,
          gw / cols - 4,
          gh / rows - 4,
        );
        c.fillStyle = '#000000';
        c.fillText(
          sessions[(r + k) % sessions.length],
          gx + (k * gw) / cols + 5,
          gy + ((r + 0.7) * gh) / rows,
          gw / cols - 8,
        );
      }
    }
    // The taskbar, its Go button and its clock.
    const tb = H * 0.07;
    c.fillStyle = '#c0c0c0';
    c.fillRect(0, H - tb, W, tb);
    c.fillStyle = '#ffffff';
    c.fillRect(0, H - tb, W, 2);
    c.fillStyle = '#c0c0c0';
    c.strokeStyle = '#404040';
    c.strokeRect(4, H - tb + 5, W * 0.12, tb - 10);
    c.fillStyle = '#000000';
    c.font = `bold ${Math.round(tb * 0.45)}px ${SANS}`;
    c.fillText('Go', 4 + W * 0.035, H - tb * 0.32);
    c.strokeRect(W * 0.14, H - tb + 5, W * 0.3, tb - 10);
    c.font = `${Math.round(tb * 0.4)}px ${SANS}`;
    c.fillText('BookIt! Pro', W * 0.15, H - tb * 0.32);
    c.strokeRect(W - W * 0.13, H - tb + 5, W * 0.12, tb - 10);
    c.textAlign = 'center';
    c.fillText(clockText(minutes), W - W * 0.07, H - tb * 0.32);
  };
  const saver = (
    c: CanvasRenderingContext2D,
    W: number,
    H: number,
    step: number,
  ) => {
    c.fillStyle = '#000000';
    c.fillRect(0, 0, W, H);
    const r = H * 0.06;
    for (const d of duckPositions(step)) {
      const x = r * 1.5 + d.x * (W - r * 3);
      const y = r * 1.5 + d.y * (H - r * 3);
      const f = d.flip ? -1 : 1;
      c.fillStyle = '#f5d22c';
      c.beginPath();
      c.ellipse(x, y, r * 1.2, r * 0.8, 0, 0, Math.PI * 2);
      c.fill();
      c.beginPath();
      c.arc(x + f * r * 0.9, y - r * 0.8, r * 0.55, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#ef7d1a';
      c.beginPath();
      c.moveTo(x + f * r * 1.35, y - r * 0.85);
      c.lineTo(x + f * r * 1.85, y - r * 0.7);
      c.lineTo(x + f * r * 1.35, y - r * 0.6);
      c.fill();
      c.fillStyle = '#000000';
      c.beginPath();
      c.arc(x + f * r * 1.05, y - r * 0.95, r * 0.08, 0, Math.PI * 2);
      c.fill();
    }
  };
  return (
    c: CanvasRenderingContext2D,
    W: number,
    H: number,
    pc: PcState,
    minutes: number,
    step: number,
  ) => {
    if (pc.screen === 'off') {
      c.fillStyle = '#050605';
      c.fillRect(0, 0, W, H);
    } else if (pc.screen === 'booting') {
      if (boot) boot.draw(c, W, H, pc.since);
      else bios(c, W, H, pc.since);
    } else if (pc.screen === 'desktop') desktop(c, W, H, minutes);
    else saver(c, W, H, step);
    // A faint sheen across the glass.
    const sheen = c.createLinearGradient(0, 0, W * 0.6, H * 0.6);
    sheen.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
    sheen.addColorStop(1, 'rgba(255, 255, 255, 0)');
    c.fillStyle = sheen;
    c.fillRect(0, 0, W, H);
  };
}

/** The tube: a 15-inch CRT monitor in beige, its deep body behind, on a tilt-and-swivel foot. Origin the middle of its foot, facing +z. */
function buildMonitor(kit: PanelKit, group: Group) {
  const beige = kitPaint(kit, BEIGE);
  const dark = kitPaint(kit, '#b5ab90');
  const W = 0.366;
  const H = 0.352;
  const D = 0.395;
  const footH = 0.03;
  // The foot, a squat disc, and the neck.
  const foot = new Mesh(new CylinderGeometry(0.12, 0.13, footH, 24), beige);
  foot.scale.z = 1.2;
  foot.position.set(0, footH / 2, -0.12);
  group.add(foot);
  const y0 = footH + 0.008;
  // The bezel, rounded, and the moulded body tapering back.
  const bezel = block(
    group,
    new RoundedBoxGeometry(W, H, 0.06, 3, 0.012),
    beige,
    0,
    y0 + H / 2,
    0,
  );
  bezel.name = 'Monitor bezel';
  const body = new Mesh(
    taperedBox(W * 0.94, H * 0.94, D - 0.06, W * 0.52, H * 0.6),
    beige,
  );
  body.position.set(0, y0 + H * 0.02, -0.03);
  group.add(body);
  // Vent grille on the top of the body.
  for (let i = 0; i < 7; i++)
    block(
      group,
      new BoxGeometry(W * 0.5, 0.002, 0.008),
      dark,
      0,
      y0 + H * 0.955 - i * 0.008,
      -0.09 - i * 0.03,
    );
  // The glass: a curved 15-inch tube, its picture 4:3, in a dark surround.
  const surround = block(
    group,
    new BoxGeometry(W * 0.86, H * 0.8, 0.004),
    kitPaint(kit, '#2a2a28'),
    0,
    y0 + H * 0.56,
    0.031,
  );
  surround.name = 'Monitor surround';
  const glassDark = createPs1Material({ color: '#040605', roughness: 0.2 });
  kit.materials.push(glassDark);
  const tube = new Mesh(createCrtSurface(W * 0.8, H * 0.73), glassDark);
  // Its corners curve back 11 mm: set forward so they clear the bezel.
  tube.position.set(0, y0 + H * 0.56, 0.0415);
  group.add(tube);
  const screenW = W * 0.74;
  const screenH = screenW * 0.75;
  const shown = createCanvasTexture(512, 384, 'crt', { maxHz: SCREENSAVER_HZ });
  kit.textures.push(shown.texture);
  const glass = createPs1Material(
    {
      map: shown.texture,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    },
    true,
    true,
  );
  kit.materials.push(glass);
  const face = new Mesh(createCrtSurface(screenW, screenH), glass);
  face.position.set(0, y0 + H * 0.56, 0.043);
  face.name = 'Monitor screen';
  group.add(face);
  // Its controls along the chin: a power rocker and its green lamp, and
  // the little badge with its cow spots.
  const chinY = y0 + H * 0.08;
  const power = block(
    group,
    new BoxGeometry(0.022, 0.012, 0.006),
    dark,
    W * 0.36,
    chinY,
    0.031,
  );
  power.name = 'Monitor power switch';
  const lamp = block(
    group,
    new CylinderGeometry(0.0025, 0.0025, 0.004, 8),
    kitGlow(kit, '#4dff6a'),
    W * 0.3,
    chinY,
    0.032,
  );
  lamp.rotation.x = Math.PI / 2;
  lamp.userData.live = true;
  for (let i = 0; i < 4; i++)
    block(
      group,
      new BoxGeometry(0.008, 0.006, 0.004),
      dark,
      -W * 0.05 + i * 0.013,
      chinY,
      0.031,
    );
  const badge = printed(kit, 256, 40, (c) => {
    c.fillStyle = BEIGE;
    c.fillRect(0, 0, 256, 40);
    drawGatewayLogo(c, 6, 4, 32, '#3d382d');
  });
  const badgeMesh = new Mesh(new PlaneGeometry(0.1, 0.0156), badge);
  badgeMesh.position.set(-W * 0.3, chinY, 0.0305);
  group.add(badgeMesh);
  return { face, shown, lamp: lamp.material as MeshBasicMaterial };
}

/** The midi tower: 0.19 × 0.43 × 0.45 m, beige, its front panel period. Origin the middle of its foot, facing +z. */
function buildTower(kit: PanelKit, outer: Group) {
  // The case stands on its feet, 8 mm up.
  const group = new Group();
  group.position.y = 0.008;
  outer.add(group);
  const W = 0.19;
  const H = 0.43;
  const D = 0.45;
  const beige = kitPaint(kit, BEIGE);
  const dark = kitPaint(kit, '#26241f');
  const shell = block(
    group,
    new RoundedBoxGeometry(W, H, D, 2, 0.006),
    beige,
    0,
    H / 2,
    0,
  );
  shell.name = 'Gateway 3000 tower';
  // The fascia, printed, just proud of the front.
  const fascia = printed(kit, 256, 580, (c) => drawFascia(c, 256, 580));
  const front = new Mesh(new PlaneGeometry(W, H), fascia);
  front.position.set(0, H / 2, D / 2 + 0.0008);
  group.add(front);
  const yAt = (fromTop: number) => H - fromTop;
  // The CD-ROM drive in the top 5.25" bay: its tray, eject button, lamp
  // and headphone socket; a blank cover in the next.
  const cd = block(
    group,
    new BoxGeometry(0.146, 0.04, 0.006),
    kitPaint(kit, '#e2d9c2'),
    0,
    yAt(0.052),
    D / 2 + 0.003,
  );
  cd.name = 'CD-ROM drive';
  block(
    group,
    new BoxGeometry(0.12, 0.0025, 0.002),
    dark,
    -0.008,
    yAt(0.046),
    D / 2 + 0.0065,
  );
  block(
    group,
    new BoxGeometry(0.014, 0.006, 0.004),
    kitPaint(kit, '#b9af95'),
    0.052,
    yAt(0.064),
    D / 2 + 0.007,
  );
  const jack = block(
    group,
    new CylinderGeometry(0.002, 0.002, 0.003, 8),
    dark,
    -0.06,
    yAt(0.064),
    D / 2 + 0.007,
  );
  jack.rotation.x = Math.PI / 2;
  block(
    group,
    new BoxGeometry(0.146, 0.04, 0.003),
    beige,
    0,
    yAt(0.1),
    D / 2 + 0.0015,
  );
  // The floppy drive: its slot, its button, its lamp.
  block(
    group,
    new BoxGeometry(0.098, 0.025, 0.005),
    kitPaint(kit, '#e2d9c2'),
    0,
    yAt(0.1435),
    D / 2 + 0.0025,
  );
  block(
    group,
    new BoxGeometry(0.07, 0.003, 0.002),
    dark,
    -0.008,
    yAt(0.141),
    D / 2 + 0.0055,
  );
  block(
    group,
    new BoxGeometry(0.012, 0.007, 0.003),
    kitPaint(kit, '#b9af95'),
    0.034,
    yAt(0.15),
    D / 2 + 0.0055,
  );
  // The power button, square and big; reset and turbo, small; three lamps.
  const power = block(
    group,
    new RoundedBoxGeometry(0.032, 0.032, 0.012, 2, 0.003),
    kitPaint(kit, '#cfc5a9'),
    -0.05,
    yAt(0.262),
    D / 2 + 0.006,
  );
  power.name = 'Power button';
  const reset = block(
    group,
    new BoxGeometry(0.01, 0.006, 0.005),
    kitPaint(kit, '#b9af95'),
    0.03,
    yAt(0.25),
    D / 2 + 0.0025,
  );
  reset.name = 'Reset button';
  const turbo = block(
    group,
    new BoxGeometry(0.01, 0.006, 0.005),
    kitPaint(kit, '#b9af95'),
    0.065,
    yAt(0.25),
    D / 2 + 0.0025,
  );
  turbo.name = 'Turbo button';
  const lampAt = (x: number, colour: string) => {
    const lamp = block(
      group,
      new CylinderGeometry(0.0022, 0.0022, 0.003, 8),
      kitGlow(kit, colour),
      x,
      yAt(0.282),
      D / 2 + 0.002,
    );
    lamp.rotation.x = Math.PI / 2;
    lamp.userData.live = true;
    return lamp.material as MeshBasicMaterial;
  };
  const powerLamp = lampAt(-0.05, '#3cff5a');
  const diskLamp = lampAt(0.03, '#ffb020');
  const turboLamp = lampAt(0.065, '#ffe040');
  // Its feet.
  for (const x of [-0.07, 0.07])
    for (const z of [-0.19, 0.19])
      block(outer, new BoxGeometry(0.02, 0.008, 0.02), dark, x, 0.004, z);
  return { power, powerLamp, diskLamp, turboLamp };
}

/** A 102-key keyboard, beige, on its feet; origin the middle of its underside, facing +z. */
function buildKeyboard(kit: PanelKit, group: Group) {
  const W = 0.46;
  const D = 0.19;
  const body = block(
    group,
    new RoundedBoxGeometry(W, 0.03, D, 2, 0.006),
    kitPaint(kit, BEIGE),
    0,
    0.016,
    0,
  );
  body.rotation.x = 0.07;
  body.name = 'Keyboard';
  const keys = printed(kit, 512, 212, (c) => drawKeyboard(c, 512, 212));
  const top = new Mesh(new PlaneGeometry(W - 0.012, D - 0.012), keys);
  top.rotation.x = -Math.PI / 2;
  top.position.y = 0.0161;
  body.add(top);
  return body;
}

/** A two-button ball mouse on a mouse mat; origin the mat's middle. */
function buildMouse(kit: PanelKit, group: Group) {
  const mat = printed(kit, 256, 212, (c) => drawMouseMat(c, 256, 212));
  const pad = block(
    group,
    new BoxGeometry(0.23, 0.004, 0.19),
    [
      kitPaint(kit, '#1b2a3a'),
      kitPaint(kit, '#1b2a3a'),
      mat,
      kitPaint(kit, '#1b2a3a'),
      kitPaint(kit, '#1b2a3a'),
      kitPaint(kit, '#1b2a3a'),
    ],
    0,
    0.002,
    0,
  );
  pad.name = 'Mouse mat';
  const mouse = new Mesh(
    new RoundedBoxGeometry(0.062, 0.034, 0.105, 3, 0.016),
    kitPaint(kit, BEIGE),
  );
  mouse.position.set(0.02, 0.004 + 0.017, -0.01);
  mouse.rotation.y = -0.18;
  mouse.name = 'Mouse';
  group.add(mouse);
  // The buttons' parting line.
  const parting = new Mesh(
    new BoxGeometry(0.002, 0.002, 0.03),
    kitPaint(kit, '#8f8670'),
  );
  parting.position.set(0, 0.017, -0.035);
  mouse.add(parting);
  return { mouse, pad };
}

/**
 * The engineer's Gateway 3000 (the owner's choice, 2026-10-31; see
 * `logic/period-pc.ts`): a beige 15-inch CRT monitor with its deep
 * moulded body, a beige midi tower with its CD-ROM, floppy, power, reset
 * and turbo, a 102-key keyboard and a ball mouse on a mouse mat.
 * Set decoration with a little life: its power button switches it, its
 * keyboard, mouse and screen wake it, and its screen shows a BIOS and a
 * splash, its desktop or its screensaver, redrawn only when the picture
 * changes (the screensaver at `SCREENSAVER_HZ`). Every piece is placed by
 * the caller: `monitor`, `tower`, `keyboard` and `mouse` are groups, each
 * with its origin at its foot's middle, facing +z.
 */
export function createPeriodPc(kit: PanelKit, options: PeriodPcOptions = {}) {
  const monitor = new Group();
  monitor.name = 'Gateway 3000 monitor';
  const tower = new Group();
  tower.name = 'Gateway 3000 tower';
  const keyboard = new Group();
  keyboard.name = 'Gateway 3000 keyboard';
  const mouse = new Group();
  mouse.name = 'Mouse and mat';
  const screen = buildMonitor(kit, monitor);
  const box = buildTower(kit, tower);
  buildKeyboard(kit, keyboard);
  buildMouse(kit, mouse);
  const paint = screenPainter(options.boot);
  const clock =
    options.clock ??
    (() => {
      const now = new Date();
      return now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
    });
  let pc = newPc();
  let drawn = '';
  const show = () => {
    const minutes = clock();
    const frame = pcFrame(pc, minutes);
    if (frame.key === drawn) return;
    drawn = frame.key;
    const { context, canvas, texture } = screen.shown;
    paint(context, canvas.width, canvas.height, pc, minutes, frame.step);
    texture.needsUpdate = true;
  };
  const lamps = () => {
    const on = pc.power;
    screen.lamp.color.set(
      on ? (pc.screen === 'screensaver' ? '#ffb020' : '#4dff6a') : '#1d2a1f',
    );
    box.powerLamp.color.set(on ? '#3cff5a' : '#14301a');
    box.diskLamp.color.set(diskBusy(pc) ? '#ffb020' : '#3a2a10');
    box.turboLamp.color.set(on ? '#ffe040' : '#3a3410');
  };
  const uses = new Map<Object3D, () => void>();
  const wake = () => {
    pc = touchPc(pc);
    show();
    lamps();
  };
  uses.set(box.power, () => {
    pc = pressPower(pc);
    show();
    lamps();
  });
  uses.set(keyboard, wake);
  uses.set(mouse, wake);
  uses.set(screen.face, wake);
  show();
  lamps();
  let lastDisk = diskBusy(pc);
  return {
    monitor,
    tower,
    keyboard,
    mouse,
    uses,
    /** The PC's state, for a test or a console. */
    state: () => pc,
    update(delta: number) {
      pc = stepPc(pc, delta, options.boot?.seconds ?? PC_BOOT.seconds);
      show();
      const disk = diskBusy(pc);
      if (disk !== lastDisk || pc.screen === 'booting' || pc.screen === 'off') {
        lastDisk = disk;
        lamps();
      }
    },
  };
}

/**
 * The PC's shipping carton, standing empty with its flaps open: white
 * board printed all over with Holstein spots, as the Gateway 2000's were,
 * and the Gateway 3000's name and arrows on its sides. Origin the middle
 * of its base. `w × h × d` metres.
 */
export function createPcCarton(kit: PanelKit, w = 0.62, h = 0.5, d = 0.52) {
  const group = new Group();
  group.name = 'Gateway 3000 carton';
  const side = (seed: number, sw: number, sh: number, words: boolean) =>
    printed(kit, 512, Math.round((512 * sh) / sw), (c) => {
      const W = 512;
      const H = Math.round((512 * sh) / sw);
      c.fillStyle = '#f7f5ee';
      c.fillRect(0, 0, W, H);
      paintCowSpots(c, 0, 0, W, H, seed, 9);
      if (!words) return;
      c.fillStyle = 'rgba(247, 245, 238, 0.92)';
      c.fillRect(W * 0.1, H * 0.36, W * 0.8, H * 0.3);
      drawGatewayLogo(c, W * 0.14, H * 0.39, H * 0.13);
      c.fillStyle = '#1d1d1d';
      c.font = `bold ${Math.round(H * 0.05)}px ${SANS}`;
      c.textAlign = 'center';
      c.fillText('P5-166 FAMILY PC  ·  THIS WAY UP  ↑↑', W / 2, H * 0.6);
    });
  const board = (sw: number, sh: number) => new PlaneGeometry(sw, sh);
  const sides: [number, number, number, number, number, number][] = [
    // width, height, x, z, yaw, seed
    [w, h, 0, d / 2, 0, 11],
    [w, h, 0, -d / 2, Math.PI, 12],
    [d, h, w / 2, 0, Math.PI / 2, 13],
    [d, h, -w / 2, 0, -Math.PI / 2, 14],
  ];
  const inside = kitPaint(kit, '#b89a6a');
  for (const [i, [sw, sh, x, z, yaw, seed]] of sides.entries()) {
    const outside = new Mesh(board(sw, sh), side(seed, sw, sh, i < 3));
    outside.position.set(x, sh / 2, z);
    outside.rotation.y = yaw;
    group.add(outside);
    const back = new Mesh(board(sw, sh), inside);
    back.position.set(x * 0.99, sh / 2, z * 0.99);
    back.rotation.y = yaw + Math.PI;
    group.add(back);
    // Its flap, opened and standing up a little splayed.
    const flapH = Math.min(w, d) / 2;
    const flap = new Mesh(board(sw, flapH), side(seed + 20, sw, flapH, false));
    flap.geometry.translate(0, flapH / 2, 0);
    const hinge = new Group();
    hinge.position.set(x, sh, z);
    hinge.rotation.y = yaw;
    hinge.add(flap);
    flap.rotation.x = 0.16 + 0.1 * (i % 2);
    const flapBack = new Mesh(flap.geometry, inside);
    flapBack.rotation.y = Math.PI;
    flap.add(flapBack);
    group.add(hinge);
  }
  const floor = new Mesh(new BoxGeometry(w, 0.004, d), inside);
  floor.position.y = 0.002;
  group.add(floor);
  // A crumpled sheet of the polystyrene packing left inside.
  const foam = new Mesh(
    new BoxGeometry(w * 0.7, 0.06, d * 0.3),
    kitPaint(kit, '#f1f1ea'),
  );
  foam.position.set(0, 0.034, -d * 0.2);
  foam.rotation.y = 0.2;
  group.add(foam);
  return group;
}

/** The leads from the tower to the monitor, keyboard and mouse: a few tubes along `points`. */
export function createLead(kit: PanelKit, points: Vector3[], radius = 0.003) {
  const lead = new Mesh(
    new TubeGeometry(new CatmullRomCurve3(points), 24, radius, 6, false),
    kitPaint(kit, '#d2c9b0'),
  );
  lead.name = 'Lead';
  return lead;
}
