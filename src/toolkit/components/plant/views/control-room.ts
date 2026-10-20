import { Group } from 'three';
import type { Object3D } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { SANS } from '../../core/views/fitting-tools';
import { createBrandBadge } from '../../core/views/brand-badge';
import { brandLivery } from '../../core/views/brand-livery';
import type { BrandId } from '../../core/logic/brands';
import { plantTools } from './plant-tools';

/**
 * The control centre's equipment, in metres, each modelled at true size
 * on a real product (named in its exhibit's reference) under a maker of
 * the game's own:
 *
 * - the BMS outstation (Quorvane): controller modules on DIN rail in a
 *   wall enclosure, its door open;
 * - the operator's desk: two SCADA screens (Kessler-Moody) showing the
 *   pool circuits, keyboard, telephone (Pepperdyne), the plant logbook;
 * - the pool water controller's remote display (Grundflow);
 * - the fire alarm repeater panel (Warden);
 * - the CCTV monitor (Kessler-Moody) on its wall bracket;
 * - the poolside alarm receiver and a poolside call point (Poolguard);
 * - the water-test kit (Chlorella) on a bench;
 * - the plant schematic board.
 *
 * Floor equipment stands on its origin facing +z; wall equipment has its
 * back at z = 0, facing +z.
 */

type Tools = ReturnType<typeof plantTools>;
type Draw = (c: CanvasRenderingContext2D, w: number, h: number) => void;

/** A printed face `w` × `h` facing +z at (x, y, z); `glow` for a screen. */
function face(
  t: Tools,
  parent: Object3D,
  w: number,
  h: number,
  x: number,
  y: number,
  z: number,
  draw: Draw,
  glow = false,
  pixels = 512,
) {
  const p = t.printed(w, h, draw, pixels, glow);
  p.mesh.position.set(x, y, z);
  parent.add(p.mesh);
  return p.mesh;
}

function badge(
  kit: PanelKit,
  parent: Object3D,
  id: BrandId,
  x: number,
  y: number,
  z: number,
  height = 0.02,
) {
  const mark = createBrandBadge(kit, id, { height });
  mark.position.set(x, y, z);
  parent.add(mark);
}

/** Text in lines on a canvas, from (x, y) down, `size` a fraction of h. */
function lines(
  c: CanvasRenderingContext2D,
  h: number,
  text: readonly string[],
  x: number,
  y: number,
  size: number,
  colour: string,
  bold = false,
) {
  c.fillStyle = colour;
  c.font = `${bold ? 'bold ' : ''}${h * size}px ${SANS}`;
  text.forEach((line, i) => c.fillText(line, x, y + i * h * size * 1.35));
}

/**
 * The pool's main circuit as a SCADA mimic: balance tank, pumps, filters,
 * UV, heat exchanger, dosing and the pool, with live-looking values.
 */
const drawMimic: Draw = (c, w, h) => {
  c.fillStyle = '#1b2228';
  c.fillRect(0, 0, w, h);
  c.fillStyle = '#2c3a44';
  c.fillRect(0, 0, w, h * 0.07);
  lines(
    c,
    h,
    ['MAIN POOL CIRCULATION  ·  1xx'],
    w * 0.02,
    h * 0.05,
    0.04,
    '#e8eef0',
    true,
  );
  const box = (
    x: number,
    y: number,
    bw: number,
    bh: number,
    name: string,
    value: string,
    colour = '#4fb3c9',
  ) => {
    c.strokeStyle = colour;
    c.lineWidth = h * 0.006;
    c.strokeRect(w * x, h * y, w * bw, h * bh);
    lines(c, h, [name], w * (x + 0.01), h * (y + 0.05), 0.032, '#d7e3e6', true);
    lines(c, h, [value], w * (x + 0.01), h * (y + bh - 0.03), 0.03, '#7ef0a8');
  };
  c.strokeStyle = '#4fb3c9';
  c.lineWidth = h * 0.012;
  c.beginPath();
  c.moveTo(w * 0.14, h * 0.62);
  c.lineTo(w * 0.94, h * 0.62);
  c.lineTo(w * 0.94, h * 0.2);
  c.lineTo(w * 0.07, h * 0.2);
  c.lineTo(w * 0.07, h * 0.5);
  c.stroke();
  box(0.02, 0.5, 0.12, 0.25, 'BT-101', 'LT 62 %');
  box(0.18, 0.55, 0.1, 0.15, 'P-101', '48.2 Hz', '#7ef0a8');
  box(0.18, 0.75, 0.1, 0.15, 'P-102', 'STANDBY', '#8a959a');
  for (let i = 0; i < 4; i++)
    box(
      0.32 + i * 0.075,
      0.5,
      0.06,
      0.24,
      `F-10${i + 1}`,
      i === 2 ? 'dP 0.7' : 'dP 0.4',
    );
  box(0.64, 0.55, 0.08, 0.14, 'UV-101', 'ON');
  box(0.75, 0.55, 0.08, 0.14, 'HX-101', '29.6 °C', '#f0a64f');
  box(0.86, 0.3, 0.12, 0.14, 'DOSING', 'Cl 1.4 pH 7.3', '#f0d64f');
  box(0.35, 0.1, 0.3, 0.16, 'MAIN POOL', '29.2 °C  612 m³/h');
  lines(
    c,
    h,
    ['ALARMS: 0 ACTIVE   1 UNACKNOWLEDGED (F-103 dP HIGH)'],
    w * 0.02,
    h * 0.97,
    0.03,
    '#f0a64f',
  );
};

/** A trend of the last 24 hours: chlorine, pH, temperature. */
const drawTrend: Draw = (c, w, h) => {
  c.fillStyle = '#12171b';
  c.fillRect(0, 0, w, h);
  c.strokeStyle = '#2a333a';
  c.lineWidth = 1;
  for (let i = 1; i < 8; i++) {
    c.beginPath();
    c.moveTo((w * i) / 8, h * 0.1);
    c.lineTo((w * i) / 8, h * 0.9);
    c.stroke();
  }
  lines(c, h, ['POOL WATER  24 h'], w * 0.02, h * 0.07, 0.045, '#e8eef0', true);
  const pens = [
    ['#f0d64f', 0.45, 0.06],
    ['#7ec8f0', 0.6, 0.03],
    ['#f08a4f', 0.3, 0.015],
  ] as const;
  pens.forEach(([colour, base, wobble], k) => {
    c.strokeStyle = colour;
    c.lineWidth = h * 0.008;
    c.beginPath();
    for (let i = 0; i <= 96; i++) {
      const x = (w * i) / 96;
      const y =
        h *
        (base +
          wobble * Math.sin(i * 0.31 + k) +
          wobble * 0.5 * Math.sin(i * 1.7 + k * 2));
      if (i) c.lineTo(x, y);
      else c.moveTo(x, y);
    }
    c.stroke();
  });
  lines(
    c,
    h,
    ['Free Cl 1.4 mg/l', 'pH 7.3', 'Temp 29.2 °C'],
    w * 0.75,
    h * 0.8,
    0.035,
    '#d7e3e6',
  );
};

/**
 * The BMS outstation, after a Trend IQ4E controller in a Rittal AE 1076
 * enclosure (600 × 760 × 210 mm): its door swung open on a mounting plate
 * of DIN rails carrying the controller, I/O modules, a 24 V supply and
 * MCBs, with slotted trunking between and a door-mounted display.
 */
export function createBmsOutstation(kit: PanelKit) {
  const t = plantTools(kit);
  const group = new Group();
  const L = brandLivery(kit, 'quorvane');
  const grey = L.paint.casing;
  const w = 0.6,
    h = 0.76,
    d = 0.21;
  // The box: back, sides, top and bottom.
  t.box(group, grey, w, h, 0.01, 0, 0, 0.005);
  for (const x of [-w / 2, w / 2]) t.box(group, grey, 0.01, h, d, x, 0, d / 2);
  for (const y of [-h / 2, h / 2]) t.box(group, grey, w, 0.01, d, 0, y, d / 2);
  // The mounting plate, galvanised.
  t.box(group, t.paint('#c4c8c6', 0.45, 0.5), 0.549, 0.73, 0.004, 0, 0, 0.03);
  const rail = t.paint('#a9aeae', 0.4, 0.7);
  const trunking = t.paint('#9da1a3', 0.6);
  for (const y of [0.24, 0.0, -0.24]) {
    t.box(group, rail, 0.5, 0.035, 0.008, 0, y, 0.036);
    t.box(group, trunking, 0.5, 0.06, 0.06, 0, y + 0.12, 0.062);
  }
  t.box(group, trunking, 0.06, 0.66, 0.06, -0.245, 0, 0.062);
  // The controller and its I/O modules (105 mm wide each), on the top rail.
  const module = t.paint('#e8e9e6', 0.5);
  [0, 1, 2].forEach((i) => {
    const x = -0.15 + i * 0.11;
    t.box(group, module, 0.105, 0.11, 0.06, x, 0.24, 0.07);
    face(
      t,
      group,
      0.09,
      0.03,
      x,
      0.27,
      0.101,
      (c, cw, ch) => {
        c.fillStyle = '#e8e9e6';
        c.fillRect(0, 0, cw, ch);
        lines(
          c,
          ch,
          [i === 0 ? 'IQ CONTROLLER' : `I/O ${i}  8UI 4AO`],
          cw * 0.05,
          ch * 0.4,
          0.32,
          '#2a2a2a',
          true,
        );
        for (let k = 0; k < 8; k++) {
          c.fillStyle = k % 3 ? '#2fbf4a' : '#2b2b2b';
          c.fillRect(cw * (0.06 + k * 0.11), ch * 0.65, cw * 0.06, ch * 0.2);
        }
      },
      false,
      128,
    );
  });
  badge(kit, group, 'quorvane', -0.15, 0.2, 0.101, 0.012);
  // Terminals on the middle rail; the 24 V supply and MCBs on the bottom.
  for (let i = 0; i < 24; i++)
    t.box(
      group,
      t.paint(i % 6 === 5 ? '#2050b0' : '#8c9295', 0.5),
      0.0062,
      0.05,
      0.045,
      -0.2 + i * 0.0075,
      0,
      0.062,
    );
  t.box(group, t.paint('#6c7174', 0.5), 0.09, 0.1, 0.07, 0.15, -0.24, 0.075);
  for (let i = 0; i < 4; i++)
    t.box(
      group,
      t.paint('#f6f6f2', 0.4),
      0.0175,
      0.08,
      0.06,
      -0.18 + i * 0.018,
      -0.24,
      0.068,
    );
  // The door, swung open on its left hinge, with a small display on it.
  const leaf = new Group();
  leaf.position.set(-w / 2, 0, d);
  leaf.rotation.y = -1.9;
  t.box(leaf, grey, w, h, 0.02, w / 2, 0, -0.01);
  face(
    t,
    leaf,
    0.16,
    0.1,
    w / 2,
    0.15,
    0.001,
    (c, cw, ch) => {
      c.fillStyle = '#0d2233';
      c.fillRect(0, 0, cw, ch);
      lines(
        c,
        ch,
        ['OUTSTATION 4', 'PLANT ROOM', 'COMMS OK  0 ALM'],
        cw * 0.06,
        ch * 0.28,
        0.16,
        '#bfe8ff',
      );
    },
    true,
    256,
  );
  face(
    t,
    leaf,
    0.2,
    0.26,
    w / 2,
    -0.15,
    0.001,
    (c, cw, ch) => {
      c.fillStyle = '#f8f8f2';
      c.fillRect(0, 0, cw, ch);
      lines(
        c,
        ch,
        ['WIRING DIAGRAM', 'DRG 4471-OS4 REV C'],
        cw * 0.06,
        ch * 0.08,
        0.06,
        '#1b1b1b',
        true,
      );
      c.strokeStyle = '#555';
      for (let k = 0; k < 12; k++) {
        c.beginPath();
        c.moveTo(cw * 0.08, ch * (0.25 + k * 0.06));
        c.lineTo(cw * 0.92, ch * (0.25 + k * 0.06));
        c.stroke();
      }
    },
    false,
    256,
  );
  group.add(leaf);
  return group;
}

/**
 * The plant operator's desk, 1800 × 800 × 740 mm: two 24-inch SCADA
 * screens on stands (about 540 × 320 mm each) showing the main circuit
 * and its trends, keyboard and mouse, a desk telephone, the plant
 * logbook open at today, and a mug.
 */
export function createOperatorDesk(kit: PanelKit) {
  const t = plantTools(kit);
  const group = new Group();
  const top = 0.74;
  const wood = t.paint('#b89a73', 0.6);
  t.box(group, wood, 1.8, 0.03, 0.8, 0, top - 0.015, 0);
  const frame = t.paint('#3a3d40', 0.5);
  for (const x of [-0.86, 0.86]) {
    t.box(group, frame, 0.05, top - 0.03, 0.7, x, (top - 0.03) / 2, 0);
  }
  t.box(group, frame, 1.7, 0.3, 0.02, 0, top - 0.2, -0.36);
  // Two screens on stands, angled in a little.
  const black = t.paint('#18191b', 0.4);
  const monitor = brandLivery(kit, 'kessler-moody');
  [
    [-0.29, 0.12, drawMimic],
    [0.29, -0.12, drawTrend],
  ].forEach(([x, yaw, draw]) => {
    const screen = new Group();
    screen.position.set(x as number, top, -0.18);
    screen.rotation.y = yaw as number;
    t.box(screen, monitor.paint.shade, 0.22, 0.012, 0.18, 0, 0.006, 0);
    t.box(screen, monitor.paint.shade, 0.05, 0.14, 0.03, 0, 0.08, -0.03);
    t.box(screen, monitor.paint.casing, 0.54, 0.32, 0.03, 0, 0.32, 0);
    face(t, screen, 0.52, 0.29, 0, 0.325, 0.0155, draw as Draw, true, 512);
    badge(kit, screen, 'kessler-moody', 0, 0.169, 0.016, 0.009);
    group.add(screen);
  });
  // Keyboard and mouse.
  t.box(group, black, 0.44, 0.02, 0.14, -0.1, top + 0.01, 0.15);
  face(
    t,
    group,
    0.42,
    0.12,
    -0.1,
    top + 0.021,
    0.15,
    (c, cw, ch) => {
      c.fillStyle = '#18191b';
      c.fillRect(0, 0, cw, ch);
      c.fillStyle = '#3b3e42';
      for (let r = 0; r < 5; r++)
        for (let k = 0; k < 15; k++)
          c.fillRect(
            cw * (0.02 + k * 0.065),
            ch * (0.06 + r * 0.19),
            cw * 0.055,
            ch * 0.15,
          );
    },
    false,
    256,
  ).rotation.x = -Math.PI / 2;
  t.box(group, black, 0.06, 0.03, 0.1, 0.24, top + 0.015, 0.16);
  // The telephone (after a BT Converse-style desk phone, about 200 × 190 mm).
  const phone = brandLivery(kit, 'pepperdyne').paint.casing;
  t.box(group, phone, 0.2, 0.06, 0.19, 0.66, top + 0.03, 0.1);
  t.box(group, phone, 0.06, 0.04, 0.2, 0.6, top + 0.08, 0.1);
  face(
    t,
    group,
    0.1,
    0.08,
    0.7,
    top + 0.061,
    0.12,
    (c, cw, ch) => {
      c.fillStyle = '#2a2b2d';
      c.fillRect(0, 0, cw, ch);
      c.fillStyle = '#c9cbc6';
      for (let r = 0; r < 4; r++)
        for (let k = 0; k < 3; k++)
          c.fillRect(
            cw * (0.1 + k * 0.3),
            ch * (0.08 + r * 0.23),
            cw * 0.22,
            ch * 0.17,
          );
    },
    false,
    128,
  ).rotation.x = -Math.PI / 2;
  badge(kit, group, 'pepperdyne', 0.66, top + 0.062, 0.05, 0.008);
  // The plant logbook, open.
  for (const side of [-1, 1]) {
    const page = face(
      t,
      group,
      0.21,
      0.297,
      -0.66 + side * 0.106,
      top + 0.006,
      0.12,
      (c, cw, ch) => {
        c.fillStyle = '#f7f4ea';
        c.fillRect(0, 0, cw, ch);
        c.strokeStyle = '#9fb7d1';
        for (let k = 1; k < 24; k++) {
          c.beginPath();
          c.moveTo(0, (ch * k) / 24);
          c.lineTo(cw, (ch * k) / 24);
          c.stroke();
        }
        if (side < 0)
          lines(
            c,
            ch,
            [
              '20/10  06:30  Cl 1.4  pH 7.3',
              '        29.2 °C  backwash F-103',
              '        UV lamp hrs 7412',
              '        DM: J. R.',
            ],
            cw * 0.06,
            ch * 0.08,
            0.035,
            '#1c2f6b',
          );
      },
      false,
      256,
    );
    page.rotation.x = -Math.PI / 2;
  }
  t.box(
    group,
    t.paint('#7a1f1f', 0.6),
    0.44,
    0.006,
    0.31,
    -0.66,
    top + 0.002,
    0.12,
  );
  // A mug.
  t.cyl(
    group,
    t.paint('#e9e6dc', 0.4),
    0.04,
    0.095,
    0.38,
    top + 0.048,
    -0.02,
    'y',
    16,
  );
  return group;
}

/**
 * The pool water controller's display, after ProMinent's DULCOMARIN 3
 * (430 × 290 × 150 mm): free chlorine, combined chlorine, pH, redox and
 * temperature for each pool on its touch screen, in a white housing.
 */
export function createWaterControllerDisplay(kit: PanelKit) {
  const t = plantTools(kit);
  const group = new Group();
  const w = 0.43,
    h = 0.29,
    d = 0.15;
  const L = brandLivery(kit, 'grundflow');
  t.box(group, L.paint.casing, w, h, d, 0, 0, d / 2);
  t.box(
    group,
    L.paint.main,
    w - 0.02,
    0.03,
    0.004,
    0,
    h / 2 - 0.025,
    d + 0.001,
  );
  face(
    t,
    group,
    0.3,
    0.19,
    -0.03,
    -0.015,
    d + 0.002,
    (c, cw, ch) => {
      c.fillStyle = '#f3f7f8';
      c.fillRect(0, 0, cw, ch);
      c.fillStyle = L.palette.main;
      c.fillRect(0, 0, cw, ch * 0.13);
      lines(
        c,
        ch,
        ['POOL 1  MAIN', '12:41  20.10'],
        cw * 0.03,
        ch * 0.09,
        0.07,
        '#ffffff',
        true,
      );
      const rows = [
        ['Free chlorine', '1.42 mg/l'],
        ['Combined Cl', '0.18 mg/l'],
        ['pH', '7.31'],
        ['Redox', '762 mV'],
        ['Temperature', '29.2 °C'],
      ];
      rows.forEach(([name, value], i) => {
        lines(
          c,
          ch,
          [name],
          cw * 0.04,
          ch * (0.27 + i * 0.16),
          0.08,
          '#1a1a1a',
        );
        lines(
          c,
          ch,
          [value],
          cw * 0.6,
          ch * (0.27 + i * 0.16),
          0.09,
          '#0d6b3a',
          true,
        );
      });
    },
    true,
    512,
  );
  // The keys beside the screen.
  for (let i = 0; i < 4; i++)
    t.box(
      group,
      t.paint('#c9ccc8', 0.4),
      0.045,
      0.03,
      0.01,
      0.17,
      0.06 - i * 0.045,
      d + 0.005,
    );
  badge(kit, group, 'grundflow', 0.12, h / 2 - 0.025, d + 0.004, 0.018);
  return group;
}

/**
 * The fire alarm repeater panel, after Kentec's Syncro View (330 × 255 ×
 * 90 mm): a red steel box with its LCD, fire and fault LEDs, controls
 * behind an enable key, by the duty manager's desk.
 */
export function createFireRepeater(kit: PanelKit) {
  const t = plantTools(kit);
  const group = new Group();
  const w = 0.33,
    h = 0.255,
    d = 0.09;
  const L = brandLivery(kit, 'warden');
  t.box(group, L.paint.casing, w, h, d, 0, 0, d / 2);
  face(
    t,
    group,
    0.3,
    0.22,
    0,
    0,
    d + 0.001,
    (c, cw, ch) => {
      c.fillStyle = '#d9dad5';
      c.fillRect(0, 0, cw, ch);
      c.fillStyle = L.palette.main;
      c.fillRect(0, 0, cw, ch * 0.14);
      lines(
        c,
        ch,
        ['FIRE ALARM REPEATER'],
        cw * 0.04,
        ch * 0.1,
        0.08,
        '#ffffff',
        true,
      );
      c.fillStyle = '#7d9b56';
      c.fillRect(cw * 0.06, ch * 0.22, cw * 0.62, ch * 0.24);
      lines(
        c,
        ch,
        ['SYSTEM NORMAL', '20/10 12:41'],
        cw * 0.09,
        ch * 0.32,
        0.07,
        '#18240f',
        true,
      );
      const leds = ['FIRE', 'FAULT', 'DISABLED', 'TEST', 'SOUNDERS', 'POWER'];
      leds.forEach((name, i) => {
        c.fillStyle = i === 5 ? '#2fbf4a' : '#4a2b2b';
        c.beginPath();
        c.arc(cw * 0.76, ch * (0.24 + i * 0.11), ch * 0.025, 0, Math.PI * 2);
        c.fill();
        lines(c, ch, [name], cw * 0.8, ch * (0.26 + i * 0.11), 0.05, '#1b1b1b');
      });
      const keys = ['SILENCE', 'RESOUND', 'RESET', 'MUTE'];
      keys.forEach((name, i) => {
        c.fillStyle = '#4a4d50';
        c.fillRect(cw * (0.06 + i * 0.16), ch * 0.6, cw * 0.13, ch * 0.12);
        lines(
          c,
          ch,
          [name],
          cw * (0.065 + i * 0.16),
          ch * 0.79,
          0.045,
          '#1b1b1b',
        );
      });
    },
    true,
    512,
  );
  t.cyl(
    group,
    t.paint('#c9cbc6', 0.3, 0.8),
    0.012,
    0.012,
    0.11,
    -0.08,
    d + 0.006,
    'z',
    14,
  );
  badge(kit, group, 'warden', -0.1, -0.1, d + 0.002, 0.018);
  return group;
}

/**
 * The CCTV monitor, a 22-inch screen (about 510 × 300 mm) on a wall
 * bracket, showing four cameras: the pool hall from two ends, reception
 * and the plant room door.
 */
export function createCctvMonitor(kit: PanelKit) {
  const t = plantTools(kit);
  const group = new Group();
  const black = brandLivery(kit, 'kessler-moody').paint.casing;
  t.box(group, t.paint('#5a5e61', 0.5), 0.1, 0.1, 0.01, 0, 0, 0.005);
  t.box(group, t.paint('#5a5e61', 0.5), 0.04, 0.04, 0.1, 0, 0, 0.06);
  t.box(group, black, 0.51, 0.3, 0.04, 0, 0, 0.13);
  const cams = [
    'CAM 1 POOL N',
    'CAM 2 POOL S',
    'CAM 3 RECEPTION',
    'CAM 4 PLANT DR',
  ];
  face(
    t,
    group,
    0.49,
    0.28,
    0,
    0,
    0.151,
    (c, cw, ch) => {
      c.fillStyle = '#000';
      c.fillRect(0, 0, cw, ch);
      cams.forEach((name, i) => {
        const x = (i % 2) * (cw / 2),
          y = Math.floor(i / 2) * (ch / 2);
        const g = c.createLinearGradient(0, y, 0, y + ch / 2);
        g.addColorStop(0, i < 2 ? '#8fa7a9' : '#7f8178');
        g.addColorStop(1, i < 2 ? '#3f7d86' : '#4d4b44');
        c.fillStyle = g;
        c.fillRect(x + 2, y + 2, cw / 2 - 4, ch / 2 - 4);
        if (i < 2) {
          c.fillStyle = '#5fc3cf';
          c.fillRect(x + cw * 0.05, y + ch * 0.3, cw * 0.4, ch * 0.12);
        }
        lines(
          c,
          ch,
          [name, '20/10/26 12:41:07'],
          x + cw * 0.015,
          y + ch * 0.05,
          0.035,
          '#ffffff',
        );
      });
    },
    true,
    512,
  );
  badge(kit, group, 'kessler-moody', 0, -0.142, 0.151, 0.01);
  return group;
}

/**
 * The poolside emergency alarm: the receiver in the control room, after
 * Hoyles' Aidalarm A600 controller (about 250 × 180 × 80 mm; its size is
 * not published), with its zone lamps, sounder and reset key; beside it a
 * waterproof poolside call point (a big red push button on a yellow
 * back box, pressed by lifeguards to summon help) and a sounder beacon.
 */
export function createPoolAlarm(kit: PanelKit) {
  const t = plantTools(kit);
  const group = new Group();
  // The receiver.
  const L = brandLivery(kit, 'poolguard');
  t.box(group, L.paint.casing, 0.25, 0.18, 0.08, -0.2, 0, 0.04);
  face(
    t,
    group,
    0.23,
    0.16,
    -0.2,
    0,
    0.081,
    (c, cw, ch) => {
      c.fillStyle = '#eceee9';
      c.fillRect(0, 0, cw, ch);
      lines(
        c,
        ch,
        ['POOL EMERGENCY ALARM'],
        cw * 0.05,
        ch * 0.14,
        0.09,
        '#b5211b',
        true,
      );
      ['MAIN POOL', 'LEARNER', 'SPA', 'RAPIDS'].forEach((zone, i) => {
        c.fillStyle = i === 0 ? '#e8261b' : '#6b2a2a';
        c.beginPath();
        c.arc(cw * 0.1, ch * (0.32 + i * 0.15), ch * 0.04, 0, Math.PI * 2);
        c.fill();
        lines(
          c,
          ch,
          [zone],
          cw * 0.18,
          ch * (0.35 + i * 0.15),
          0.07,
          '#1b1b1b',
        );
      });
      c.fillStyle = '#4a4d50';
      c.fillRect(cw * 0.65, ch * 0.4, cw * 0.28, ch * 0.16);
      lines(c, ch, ['SILENCE'], cw * 0.67, ch * 0.66, 0.06, '#1b1b1b');
    },
    true,
    256,
  );
  t.cyl(
    group,
    t.paint('#c9cbc6', 0.3, 0.8),
    0.009,
    0.01,
    -0.12,
    -0.06,
    0.085,
    'z',
    12,
  );
  badge(kit, group, 'poolguard', -0.2, -0.075, 0.082, 0.014);
  // The poolside call point.
  t.box(group, L.paint.main, 0.12, 0.12, 0.06, 0.12, 0, 0.03);
  t.cyl(
    group,
    t.paint('#c8261c', 0.4),
    0.04,
    0.025,
    0.12,
    0.005,
    0.07,
    'z',
    24,
  );
  face(
    t,
    group,
    0.11,
    0.022,
    0.12,
    -0.048,
    0.061,
    (c, cw, ch) => {
      c.fillStyle = '#e8c215';
      c.fillRect(0, 0, cw, ch);
      lines(c, ch, ['POOL ALARM'], cw * 0.12, ch * 0.75, 0.7, '#141414', true);
    },
    false,
    128,
  );
  // A sounder beacon.
  t.box(group, t.paint('#e9e6dc', 0.4), 0.1, 0.1, 0.05, 0.3, 0.02, 0.025);
  t.cyl(group, t.paint('#d33a2a', 0.3), 0.035, 0.05, 0.3, 0.02, 0.07, 'z', 20);
  return group;
}

/**
 * The water-test kit on a small bench, after Palintest's Pooltest 25
 * photometer kit: its open carry case (about 270 × 170 mm), the
 * photometer, reagent tablets and test tubes, and a sample bottle.
 */
export function createWaterTestKit(kit: PanelKit) {
  const t = plantTools(kit);
  const group = new Group();
  const top = 0.9;
  const bench = t.paint('#e3e4df', 0.5);
  t.box(group, bench, 0.8, 0.03, 0.5, 0, top - 0.015, 0);
  for (const x of [-0.37, 0.37])
    t.box(
      group,
      t.paint('#5a5e61', 0.5),
      0.04,
      top - 0.03,
      0.44,
      x,
      (top - 0.03) / 2,
      0,
    );
  // The case, open: its base and lid propped up behind.
  const blue = brandLivery(kit, 'chlorella').paint.casing;
  t.box(group, blue, 0.27, 0.06, 0.17, -0.12, top + 0.03, 0.05);
  t.box(
    group,
    t.paint('#2b2b2b', 0.8),
    0.25,
    0.005,
    0.15,
    -0.12,
    top + 0.058,
    0.05,
  );
  const lid = t.box(group, blue, 0.27, 0.17, 0.02, -0.12, top + 0.13, -0.04);
  lid.rotation.x = -0.25;
  // The photometer, with its screen.
  t.box(
    group,
    t.paint('#f0f0ea', 0.4),
    0.08,
    0.035,
    0.16,
    -0.17,
    top + 0.075,
    0.05,
  );
  face(
    t,
    group,
    0.06,
    0.035,
    -0.17,
    top + 0.093,
    0.02,
    (c, cw, ch) => {
      c.fillStyle = '#b7c7a8';
      c.fillRect(0, 0, cw, ch);
      lines(c, ch, ['Cl 1.42'], cw * 0.08, ch * 0.62, 0.45, '#16220f', true);
    },
    true,
    128,
  ).rotation.x = -Math.PI / 2;
  // Test tubes in their rack, and tablet strips.
  for (let i = 0; i < 4; i++)
    t.cyl(
      group,
      t.paint('#d9eef2', 0.1),
      0.008,
      0.08,
      -0.07 + i * 0.02,
      top + 0.1,
      0.05,
      'y',
      10,
    );
  t.box(
    group,
    t.paint('#c9cbc6', 0.4, 0.6),
    0.1,
    0.004,
    0.04,
    0.12,
    top + 0.002,
    0.1,
  );
  t.box(
    group,
    t.paint('#c9cbc6', 0.4, 0.6),
    0.1,
    0.004,
    0.04,
    0.12,
    top + 0.006,
    0.05,
  );
  // A sample bottle, and the case's brand.
  t.cyl(
    group,
    t.paint('#e6f0f2', 0.15),
    0.03,
    0.12,
    0.25,
    top + 0.06,
    -0.05,
    'y',
    16,
  );
  t.cyl(
    group,
    t.paint('#1d4f9e', 0.4),
    0.018,
    0.02,
    0.25,
    top + 0.13,
    -0.05,
    'y',
    12,
  );
  badge(kit, group, 'chlorella', -0.12, top + 0.16, -0.027, 0.02);
  return group;
}

/**
 * The plant schematic board: the pool plant drawn as a wall chart (1800 ×
 * 1000 mm), its circuits coloured as the pipes are banded (BS 1710), with
 * every tag the controls use.
 */
export function createSchematicBoard(kit: PanelKit) {
  const t = plantTools(kit);
  const group = new Group();
  t.box(group, t.paint('#2a2d30', 0.6), 1.84, 1.04, 0.02, 0, 0, 0.01);
  face(
    t,
    group,
    1.8,
    1.0,
    0,
    0,
    0.021,
    (c, w, h) => {
      c.fillStyle = '#f4f3ec';
      c.fillRect(0, 0, w, h);
      lines(
        c,
        h,
        ['POOL PLANT SCHEMATIC  ·  DRG PP-001 REV D'],
        w * 0.02,
        h * 0.06,
        0.04,
        '#1b1b1b',
        true,
      );
      const pipe = (
        points: readonly [number, number][],
        colour: string,
        width = 0.012,
      ) => {
        c.strokeStyle = colour;
        c.lineWidth = h * width;
        c.beginPath();
        points.forEach(([x, y], i) =>
          i ? c.lineTo(w * x, h * y) : c.moveTo(w * x, h * y),
        );
        c.stroke();
      };
      const unit = (
        x: number,
        y: number,
        bw: number,
        bh: number,
        tag: string,
      ) => {
        c.fillStyle = '#ffffff';
        c.fillRect(w * x, h * y, w * bw, h * bh);
        c.strokeStyle = '#1b1b1b';
        c.lineWidth = h * 0.004;
        c.strokeRect(w * x, h * y, w * bw, h * bh);
        lines(
          c,
          h,
          [tag],
          w * (x + 0.005),
          h * (y + bh * 0.6),
          0.024,
          '#1b1b1b',
          true,
        );
      };
      // Pool water (green), heating (orange-red), chemicals (violet, yellow).
      pipe(
        [
          [0.06, 0.8],
          [0.9, 0.8],
          [0.9, 0.2],
          [0.1, 0.2],
          [0.1, 0.7],
        ],
        '#2f8a3a',
      );
      pipe(
        [
          [0.62, 0.8],
          [0.62, 0.92],
          [0.95, 0.92],
        ],
        '#c43a1e',
      );
      pipe(
        [
          [0.78, 0.6],
          [0.78, 0.8],
        ],
        '#8c6bc4',
        0.006,
      );
      pipe(
        [
          [0.82, 0.6],
          [0.82, 0.8],
        ],
        '#e8c215',
        0.006,
      );
      unit(0.03, 0.62, 0.1, 0.16, 'BT-101');
      unit(0.17, 0.74, 0.06, 0.1, 'P-101');
      unit(0.17, 0.86, 0.06, 0.1, 'P-102');
      for (let i = 0; i < 4; i++)
        unit(0.27 + i * 0.065, 0.66, 0.05, 0.2, `F-10${i + 1}`);
      unit(0.54, 0.74, 0.06, 0.1, 'UV-101');
      unit(0.6, 0.74, 0.06, 0.1, 'HX-101');
      unit(0.75, 0.5, 0.1, 0.1, 'DP-101/102');
      unit(0.3, 0.12, 0.4, 0.14, 'MAIN POOL 50 × 20 m');
      lines(
        c,
        h,
        [
          'KEY:  green pool water · red LTHW · violet acid · yellow hypochlorite',
        ],
        w * 0.02,
        h * 0.97,
        0.026,
        '#1b1b1b',
      );
    },
    false,
    1024,
  );
  return group;
}
