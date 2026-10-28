import { Group, Mesh } from 'three';
import type { Object3D } from 'three';
import { signal } from '@preact/signals-core';
import type { Signal } from '@preact/signals-core';
import type { PanelKit } from '../../core/views/eighties-controls';
import {
  createMicroLabel,
  createSevenSegment,
} from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';
import { createPartSet, pushButton, selector } from '../../core/parts/parts';
import { panelMakerMark } from '../../core/views/panel-maker-mark';
import {
  createPanelMeter,
  createVfd,
} from '../../industrial-control/views/panel-instruments';

/**
 * The working fittings Hall 4 of the museum adds (107d): an ideal chemical
 * tank with its "used" counter, the Penfold dosing desk with its
 * thumbwheel switch, the ideal analyser's readout board, and the Balance
 * Beam. Each is worked through the control scheme and shows only what it
 * is given; displays redraw only when what they show changes. In metres,
 * each facing +z.
 */

const HAZARD_GLYPH: Record<string, string> = {
  corrosive: 'CORROSIVE',
  oxidiser: 'OXIDISER',
  irritant: 'IRRITANT',
  environment: 'ENVIRONMENT',
  gas: 'GAS UNDER PRESSURE',
};

/**
 * An ideal chemical tank (an ideal source: it never empties): a tall
 * clear-fronted tank showing its contents' colour, its name plate and its
 * hazard diamonds, and a USED counter in its unit. Its level dips while
 * its valve doses and comes back after, being ideal.
 */
export function createChemicalTank(
  kit: PanelKit,
  {
    code,
    product,
    unit,
    colour,
    hazards,
  }: {
    code: string;
    product: string;
    unit: string;
    colour: string;
    hazards: readonly string[];
  },
) {
  const t = tools(kit);
  const group = new Group();
  group.name = `Ideal tank ${code}`;
  const W = 0.44;
  const H = 1.5;
  const frame = t.paint('#3a4246', 0.5, 0.4);
  t.box(group, frame, W, 0.04, W, 0, 0.02, 0);
  t.box(group, frame, W, 0.04, W, 0, H - 0.02, 0);
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      t.box(
        group,
        frame,
        0.03,
        H,
        0.03,
        (sx * (W - 0.03)) / 2,
        H / 2,
        (sz * (W - 0.03)) / 2,
      );
  const content = t.box(
    group,
    t.paint(colour, 0.3),
    W - 0.04,
    1,
    W - 0.04,
    0,
    0,
    0,
  );
  const glass = t.box(
    group,
    t.paint('#cfe3ea', 0.1),
    W - 0.035,
    H - 0.08,
    0.004,
    0,
    H / 2,
    W / 2 - 0.01,
  );
  (glass.material as { transparent?: boolean; opacity?: number }).transparent =
    true;
  (glass.material as { opacity?: number }).opacity = 0.25;
  const full = 0.85 * (H - 0.08);
  const level = (f: number) => {
    const h = Math.max(0.02, full * f);
    content.scale.y = h;
    content.position.y = 0.04 + h / 2;
  };
  level(1);
  const plate = t.printed(
    W - 0.04,
    0.3,
    (c, w, h) => {
      c.fillStyle = '#f6f4ec';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#16232b';
      c.font = `bold ${h * 0.22}px Arial`;
      c.fillText(code, w * 0.05, h * 0.24);
      c.font = `${h * 0.12}px Arial`;
      const words = product.split(' ');
      let line = '';
      let y = h * 0.42;
      for (const word of words) {
        if (c.measureText(`${line} ${word}`).width > w * 0.9 && line) {
          c.fillText(line, w * 0.05, y);
          y += h * 0.14;
          line = word;
        } else line = line ? `${line} ${word}` : word;
      }
      c.fillText(line, w * 0.05, y);
      hazards.forEach((z, k) => {
        const x = w * (0.15 + k * 0.32);
        const cy = h * 0.86;
        const r = h * 0.11;
        c.save();
        c.translate(x, cy);
        c.rotate(Math.PI / 4);
        c.fillStyle = '#ffffff';
        c.strokeStyle = '#c8261c';
        c.lineWidth = r * 0.25;
        c.fillRect(-r * 0.7, -r * 0.7, r * 1.4, r * 1.4);
        c.strokeRect(-r * 0.7, -r * 0.7, r * 1.4, r * 1.4);
        c.restore();
        c.fillStyle = '#16232b';
        c.font = `bold ${h * 0.045}px Arial`;
        c.fillText(
          HAZARD_GLYPH[z].split(' ')[0],
          x - r,
          cy + r * 1.35,
          r * 2.2,
        );
      });
    },
    256,
  );
  plate.mesh.position.set(0, 1.12, W / 2 + 0.004);
  group.add(plate.mesh);
  // The USED counter, on the bund's front below.
  const counter = new Group();
  counter.position.set(0, 0.22, W / 2 + 0.01);
  t.box(counter, t.paint('#1b2328', 0.5), W - 0.06, 0.12, 0.02, 0, 0, 0);
  const digits = createSevenSegment(kit, 5, { digitHeight: 0.04 });
  digits.group.position.set(0, 0.015, 0.011);
  counter.add(digits.group);
  const unitLabel = createMicroLabel(kit, `USED ${unit}`, {
    height: 0.016,
    ink: '#f4f3ee',
  });
  unitLabel.position.set(0, -0.042, 0.011);
  counter.add(unitLabel);
  group.add(counter);
  let shown = '';
  return {
    group,
    /** Its counter, and how far through a dose it is (0 none). */
    show(used: number, dosing: number) {
      const text = Math.min(9999.9, used).toFixed(1).padStart(6);
      if (text !== shown) digits.show((shown = text));
      level(1 - 0.08 * Math.sin(Math.PI * Math.min(1, Math.max(0, dosing))));
    },
  };
}

/**
 * A thumbwheel switch (a period interface: the visitor dials 012.7): four
 * drums, each turned by its + above and − below, the decimal point before
 * the last. New to the control-part kit; its drums are one canvas, drawn
 * only when a digit changes.
 */
export function createThumbwheel(
  kit: PanelKit,
  {
    digit,
    step,
  }: { digit: (d: number) => number; step: (d: number, by: number) => void },
) {
  const t = tools(kit);
  const group = new Group();
  group.name = 'Thumbwheel switch';
  const uses = new Map<Object3D, (direction?: number) => void>();
  const N = 4;
  const P = 0.04;
  const W = N * P + 0.02;
  t.box(group, t.paint('#202426', 0.5), W, 0.12, 0.02, 0, 0, 0.01);
  const face = t.printed(W - 0.01, 0.05, () => {}, 256);
  face.mesh.position.set(0, 0, 0.021);
  group.add(face.mesh);
  const draw = (values: number[]) => {
    const c = face.context;
    const w = c.canvas.width;
    const h = c.canvas.height;
    c.fillStyle = '#202426';
    c.fillRect(0, 0, w, h);
    values.forEach((v, k) => {
      const x = (w / N) * k;
      c.fillStyle = '#f2f0e6';
      c.fillRect(x + w * 0.02, h * 0.08, w / N - w * 0.04, h * 0.84);
      c.fillStyle = '#111';
      c.font = `bold ${h * 0.7}px monospace`;
      c.textAlign = 'center';
      c.fillText(String(v), x + w / N / 2, h * 0.75);
      if (k === N - 2) {
        c.fillStyle = '#f2f0e6';
        c.beginPath();
        c.arc(x + w / N, h * 0.85, h * 0.06, 0, Math.PI * 2);
        c.fill();
      }
    });
    face.texture.needsUpdate = true;
  };
  const black = t.paint('#3a3e40', 0.5);
  for (let d = 0; d < N; d++) {
    const x = -W / 2 + 0.01 + P * (d + 0.5);
    const up = t.box(group, black, P * 0.7, 0.025, 0.02, x, 0.042, 0.022);
    const down = t.box(group, black, P * 0.7, 0.025, 0.02, x, -0.042, 0.022);
    t.label(group, '+', x, 0.042, 0.033, 0.012, '#f4f3ee');
    t.label(group, '−', x, -0.042, 0.033, 0.012, '#f4f3ee');
    uses.set(up, (dir = 1) => step(d, dir >= 0 ? 1 : -1));
    uses.set(down, (dir = 1) => step(d, dir >= 0 ? -1 : 1));
  }
  let shown = '';
  const update = () => {
    const values = [0, 1, 2, 3].map(digit);
    const key = values.join('');
    if (key !== shown) {
      shown = key;
      draw(values);
    }
  };
  update();
  return { group, uses, update };
}

export interface DeskBindings {
  tanks: readonly { code: string; short: string }[];
  select(k: number): void;
  selected(): number | null;
  digit(d: number): number;
  wheel(d: number, by: number): void;
  dose(): void;
  cancel(): void;
  dosing(): boolean;
  vfd(): string;
  group(): void;
  swimmers: { value: number; set(position: number): void };
  speeds: readonly number[];
  speed(): number;
  setSpeed(s: number): void;
  card(): number;
  cards: number;
  stepCard(by: number): void;
  startCard(): void;
  cardTitle(): string;
}

/**
 * The Penfold dosing desk DS1: a sloped console. Top row, left to right,
 * a lit SELECT button for each tank; below, the thumbwheels, DOSE and
 * CANCEL, the VFD showing the choice; then the swimmers (+20 and the
 * SWIMMERS dial), the TIME buttons, and the CHALLENGE selector (◄ ►, its
 * number, START). Penfold's mark top right.
 */
export function createDosingDesk(kit: PanelKit, b: DeskBindings) {
  const t = tools(kit);
  const group = new Group();
  group.name = 'Dosing desk';
  const W = 2.0;
  const D = 0.75;
  const body = t.paint('#c9c5b8', 0.6);
  t.box(group, body, W, 0.78, D, 0, 0.39, 0);
  const face = new Group();
  face.position.set(0, 0.95, 0.05);
  face.rotation.x = -0.75;
  group.add(face);
  const FW = W - 0.04;
  const FH = 0.62;
  t.box(face, t.paint('#d8d4c6', 0.5), FW, FH, 0.04, 0, 0, -0.02);
  t.box(group, body, W, 0.25, 0.3, 0, 0.88, -0.24);
  panelMakerMark(kit, face, { width: FW, height: FH, z: 0.001 });
  const parts = createPartSet();
  const put = <P extends { object: Group }>(
    p: P,
    x: number,
    y: number,
    s = 0.9,
  ) => {
    p.object.position.set(x, y, 0.001);
    p.object.scale.setScalar(s);
    face.add(p.object);
    return p;
  };
  const text = (s: string, x: number, y: number, h = 0.018) =>
    t.label(face, s, x, y, 0.002, h, '#16191b');
  // SELECT row.
  const lit: Signal<boolean>[] = b.tanks.map(() => signal(false));
  b.tanks.forEach((tank, k) => {
    const x = -FW / 2 + 0.12 + k * 0.165;
    parts.add(
      put(
        pushButton(kit, {
          colour: 'white',
          head: 'illuminated',
          lamp: lit[k],
          name: `${tank.code} SELECT`,
          action: () => b.select(k),
        }),
        x,
        0.2,
      ),
    );
    text(tank.code, x, 0.27);
    text(tank.short, x, 0.135, 0.014);
  });
  text('SELECT A CHEMICAL', 0, 0.29, 0.016);
  // Amount, DOSE, CANCEL, the VFD.
  const wheel = createThumbwheel(kit, { digit: b.digit, step: b.wheel });
  wheel.group.position.set(-0.72, 0.0, 0.001);
  wheel.group.scale.setScalar(1.3);
  face.add(wheel.group);
  text('AMOUNT', -0.72, 0.1);
  const vfd = createVfd(kit, { columns: 24, height: 0.03, dots: true });
  vfd.group.position.set(-0.05, 0.0, 0.002);
  face.add(vfd.group);
  const doseLamp = signal(false);
  parts.add(
    put(
      pushButton(kit, {
        colour: 'green',
        head: 'illuminated',
        lamp: doseLamp,
        legend: 'DOSE',
        action: b.dose,
      }),
      0.52,
      0.0,
    ),
  );
  parts.add(
    put(
      pushButton(kit, { colour: 'red', legend: 'CANCEL', action: b.cancel }),
      0.68,
      0.0,
    ),
  );
  // The swimmers.
  parts.add(
    put(
      pushButton(kit, {
        colour: 'yellow',
        legend: '+20 SWIMMERS',
        action: b.group,
      }),
      -0.82,
      -0.2,
    ),
  );
  parts.add(
    put(
      selector(kit, {
        positions: 3,
        legend: 'NONE · NORMAL · BUSY',
        name: 'SWIMMERS dial',
        bound: b.swimmers,
      }),
      -0.55,
      -0.2,
      1.1,
    ),
  );
  text('SWIMMERS', -0.55, -0.28);
  // TIME.
  const speedLit = b.speeds.map(() => signal(false));
  b.speeds.forEach((s, k) =>
    parts.add(
      put(
        pushButton(kit, {
          colour: 'white',
          head: 'illuminated',
          lamp: speedLit[k],
          legend: `×${s}`,
          name: `TIME ×${s}`,
          action: () => b.setSpeed(s),
        }),
        -0.25 + k * 0.11,
        -0.2,
        0.8,
      ),
    ),
  );
  text('TIME', -0.08, -0.28);
  // CHALLENGE.
  parts.add(
    put(
      pushButton(kit, {
        colour: 'black',
        symbol: '◄',
        name: 'CHALLENGE back',
        action: () => b.stepCard(-1),
      }),
      0.3,
      -0.2,
      0.8,
    ),
  );
  const cardNo = createSevenSegment(kit, 2, { digitHeight: 0.03 });
  cardNo.group.position.set(0.42, -0.2, 0.002);
  face.add(cardNo.group);
  parts.add(
    put(
      pushButton(kit, {
        colour: 'black',
        symbol: '►',
        name: 'CHALLENGE on',
        action: () => b.stepCard(1),
      }),
      0.54,
      -0.2,
      0.8,
    ),
  );
  parts.add(
    put(
      pushButton(kit, {
        colour: 'yellow',
        legend: 'START',
        name: 'CHALLENGE START',
        action: b.startCard,
      }),
      0.72,
      -0.2,
      0.8,
    ),
  );
  text(`CHALLENGE 1–${b.cards}`, 0.48, -0.28);
  let vfdShown = '';
  let cardShown = '';
  return {
    group,
    parts,
    uses: wheel.uses,
    update(delta: number) {
      const sel = b.selected();
      lit.forEach((l, k) => {
        if (l.value !== (sel === k)) l.value = sel === k;
      });
      if (doseLamp.value !== b.dosing()) doseLamp.value = b.dosing();
      speedLit.forEach((l, k) => {
        const on = b.speed() === b.speeds[k];
        if (l.value !== on) l.value = on;
      });
      wheel.update();
      const line = b.vfd();
      if (line !== vfdShown)
        vfd.show([(vfdShown = line).padEnd(24).slice(0, 24)]);
      const c = String(b.card() + 1).padStart(2);
      if (c !== cardShown) cardNo.show((cardShown = c));
      parts.update(delta);
    },
  };
}

export interface ReadoutMeter {
  id: string;
  tag: string;
  label: string;
  /** Its scale's ends, and the green band, in its unit. */
  min: number;
  max: number;
  green: readonly [number, number] | null;
  places: number;
  /** A mark printed on the dial at a value: the grout limit. */
  mark?: { at: number; text: string };
}

/**
 * The ideal analyser's readout board AN1 on the pool's wall: for each
 * reading a moving-coil meter, its recommended range green, and a
 * seven-segment value. Needles ease; digits redraw only when they change.
 */
export function createReadoutBoard(
  kit: PanelKit,
  meters: readonly ReadoutMeter[],
) {
  const t = tools(kit);
  const group = new Group();
  group.name = 'Analyser readout board';
  const cols = Math.ceil(meters.length / 2);
  const W = cols * 0.56 + 0.16;
  const H = 1.5;
  t.box(group, t.paint('#e3e1d8', 0.5), W, H, 0.06, 0, 0, 0.03);
  const head = t.printed(
    W - 0.04,
    0.16,
    (c, w, h) => {
      c.fillStyle = '#16232b';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#ffffff';
      c.font = `bold ${h * 0.42}px Arial`;
      c.fillText('THE POOL’S WATER, NOW', w * 0.02, h * 0.5, w * 0.6);
      c.font = `${h * 0.24}px Arial`;
      c.fillText(
        'AN1: the museum’s ideal analyser, which knows the water exactly. Green: within the recommended range (PWTAG).',
        w * 0.02,
        h * 0.85,
        w * 0.96,
      );
    },
    768,
  );
  head.mesh.position.set(0, H / 2 - 0.1, 0.061);
  group.add(head.mesh);
  const rows = meters.map((m, k) => {
    const span = m.max - m.min;
    const band = m.green
      ? {
          from: (m.green[0] - m.min) / span,
          to: (m.green[1] - m.min) / span,
          colour: '#2f9e44',
        }
      : null;
    const meter = createPanelMeter(kit, '', {
      width: 0.07,
      scaleMax: span,
      band,
    });
    meter.group.scale.setScalar(5.5);
    const x = -W / 2 + 0.36 + (k % cols) * 0.56;
    const y = k < cols ? 0.22 : -0.45;
    meter.group.position.set(x, y + 0.08, 0.065);
    group.add(meter.group);
    const digits = createSevenSegment(kit, 5, { digitHeight: 0.045 });
    digits.group.position.set(x, y - 0.17, 0.062);
    group.add(digits.group);
    const range = m.min !== 0 ? ` (${m.min} TO ${m.max})` : '';
    const label = createMicroLabel(kit, `${m.tag} ${m.label}${range}`, {
      height: 0.02,
      ink: '#16191b',
      maxWidth: 0.5,
    });
    label.position.set(x, y - 0.245, 0.062);
    group.add(label);
    if (m.mark) {
      const markLabel = createMicroLabel(kit, `▲ ${m.mark.text} ${m.mark.at}`, {
        height: 0.02,
        ink: '#c8261c',
      });
      markLabel.position.set(
        x - 0.17 + 0.34 * ((m.mark.at - m.min) / span),
        y - 0.1,
        0.07,
      );
      group.add(markLabel);
    }
    return { m, meter, digits, shown: '' };
  });
  panelMakerMark(kit, group, {
    width: W,
    height: H,
    z: 0.062,
    corner: 'bottom-right',
  });
  return {
    group,
    show(values: Record<string, number>, delta: number) {
      for (const r of rows) {
        const v = values[r.m.id] ?? 0;
        r.meter.set((v - r.m.min) / (r.m.max - r.m.min));
        r.meter.update(delta);
        const text = v.toFixed(r.m.places).slice(0, 6).padStart(5);
        if (text !== r.shown) r.digits.show((r.shown = text));
      }
    },
  };
}

/**
 * The Balance Beam BB1: a period mechanical balance whose beam tips from
 * AGGRESSIVE (−1.5, eats grout) through BALANCED to SCALING (+1.5) with
 * the balance index, its pointer on an arc; beneath, four windows giving
 * the index's terms (pH, hardness, alkalinity, temperature and TDS), and
 * the index itself. It shows what it is given; no maths of its own.
 */
export function createBalanceBeam(
  kit: PanelKit,
  plaque: { headline: string; body: string; caution: string },
) {
  const t = tools(kit);
  const group = new Group();
  group.name = 'Balance Beam';
  const dark = t.paint('#2b3438', 0.5, 0.3);
  const brass = t.paint('#b8913a', 0.35, 0.8);
  t.box(group, dark, 1.9, 0.05, 0.5, 0, 0.025, 0);
  t.box(group, dark, 1.9, 1.0, 0.08, 0, 0.55, -0.15);
  // The arc scale and the pillar.
  const scale = t.printed(
    1.5,
    0.5,
    (c, w, h) => {
      c.fillStyle = '#f6f4ec';
      c.fillRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h * 1.6;
      const R = h * 1.3;
      const zones: [number, number, string][] = [
        [-1.5, -0.5, '#e8a13a'],
        [-0.5, 0.5, '#4caf50'],
        [0.5, 1.5, '#4f8ad6'],
      ];
      const ang = (v: number) => -Math.PI / 2 + (v / 1.5) * 0.6;
      for (const [a, b, col] of zones) {
        c.strokeStyle = col;
        c.lineWidth = h * 0.12;
        c.beginPath();
        c.arc(cx, cy, R, ang(a), ang(b));
        c.stroke();
      }
      c.fillStyle = '#16232b';
      c.font = `bold ${h * 0.09}px Arial`;
      c.textAlign = 'center';
      for (const v of [-1.5, -1, -0.5, 0, 0.5, 1, 1.5]) {
        const a = ang(v);
        c.fillText(
          `${v > 0 ? '+' : ''}${v}`,
          cx + Math.cos(a) * R * 0.86,
          cy + Math.sin(a) * R * 0.86,
        );
      }
      c.font = `bold ${h * 0.1}px Arial`;
      c.fillText('AGGRESSIVE: EATS GROUT', w * 0.18, h * 0.95);
      c.fillText('BALANCED', cx, h * 0.12);
      c.fillText('SCALING', w * 0.84, h * 0.95);
    },
    768,
  );
  scale.mesh.position.set(0, 0.8, -0.105);
  group.add(scale.mesh);
  t.box(group, brass, 0.05, 0.75, 0.05, 0, 0.42, 0.05);
  const beam = new Group();
  beam.position.set(0, 0.8, 0.05);
  group.add(beam);
  t.box(beam, brass, 1.3, 0.03, 0.03, 0, 0, 0);
  const pointer = t.box(
    beam,
    t.paint('#c8261c', 0.4),
    0.012,
    0.5,
    0.01,
    0,
    0.25,
    0.02,
  );
  void pointer;
  for (const sx of [-1, 1]) {
    t.box(beam, brass, 0.008, 0.25, 0.008, sx * 0.62, -0.13, 0);
    t.cyl(beam, brass, 0.12, 0.02, sx * 0.62, -0.26, 0);
  }
  t.label(group, 'SOFT WATER', -0.62, 0.3, 0.16, 0.025, '#16191b');
  t.label(group, 'HARD WATER', 0.62, 0.3, 0.16, 0.025, '#16191b');
  // The term windows.
  const terms = ['pH', 'HARDNESS', 'ALKALINITY', 'TEMP + TDS', 'INDEX'];
  const windows = terms.map((name, k) => {
    const x = -0.72 + k * 0.36;
    const d = createSevenSegment(kit, 5, { digitHeight: 0.04 });
    d.group.position.set(x, 0.17, 0.25);
    group.add(d.group);
    t.label(group, name, x, 0.11, 0.251, 0.02, '#f4f3ee');
    return { d, shown: '' };
  });
  const sign = ['', ' +', ' +', ' +', ' ='];
  sign.forEach((s, k) => {
    if (s)
      t.label(
        group,
        s.trim(),
        -0.72 + k * 0.36 - 0.18,
        0.17,
        0.251,
        0.03,
        '#f4f3ee',
      );
  });
  t.box(group, dark, 1.9, 0.18, 0.06, 0, 0.15, 0.22);
  const plaqueFace = t.printed(
    1.8,
    0.3,
    (c, w, h) => {
      c.fillStyle = '#f6f4ec';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#16232b';
      c.font = `bold ${h * 0.14}px Arial`;
      c.fillText(plaque.headline.toUpperCase(), w * 0.02, h * 0.16);
      c.font = `${h * 0.075}px Arial`;
      const words = `${plaque.body} ${plaque.caution}`.split(' ');
      let line = '';
      let y = h * 0.32;
      for (const word of words) {
        if (c.measureText(`${line} ${word}`).width > w * 0.96 && line) {
          c.fillText(line, w * 0.02, y);
          y += h * 0.1;
          line = word;
        } else line = line ? `${line} ${word}` : word;
      }
      c.fillText(line, w * 0.02, y);
    },
    1024,
  );
  plaqueFace.mesh.position.set(0, 1.25, -0.105);
  group.add(plaqueFace.mesh);
  let tilt = 0;
  return {
    group,
    show(
      t4: {
        ph: number;
        hardness: number;
        alkalinity: number;
        temperatureTds: number;
      },
      lsi: number,
      delta: number,
    ) {
      const target = (Math.max(-1.5, Math.min(1.5, lsi)) / 1.5) * 0.6;
      tilt += (target - tilt) * Math.min(1, delta * 2);
      beam.rotation.z = -tilt;
      const vals = [t4.ph, t4.hardness, t4.alkalinity, t4.temperatureTds, lsi];
      vals.forEach((v, k) => {
        const text = (v >= 0 && k > 0 ? '+' : '') + v.toFixed(2);
        const s = text.padStart(5).slice(-6);
        if (s !== windows[k].shown) windows[k].d.show((windows[k].shown = s));
      });
    },
  };
}

/** A plain mesh, so the hall can raycast it. */
export type Pickable = Mesh;
