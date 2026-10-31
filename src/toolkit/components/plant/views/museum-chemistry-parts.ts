import { CylinderGeometry, ExtrudeGeometry, Group, Mesh, Shape } from 'three';
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
  createCharacterLcd,
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

/** Each hazard's CLP pictogram number and its word on the label. */
const HAZARD: Record<string, { ghs: string; word: string }> = {
  corrosive: { ghs: 'GHS05', word: 'Corrosive' },
  oxidiser: { ghs: 'GHS03', word: 'Oxidiser' },
  irritant: { ghs: 'GHS07', word: 'Irritant' },
  environment: { ghs: 'GHS09', word: 'Environment' },
  gas: { ghs: 'GHS04', word: 'Gas under pressure' },
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
    name,
    formula,
    strength,
    unit,
    colour,
    hazards,
  }: {
    code: string;
    name: string;
    formula: string;
    strength: string;
    unit: string;
    colour: string;
    hazards: readonly string[];
  },
) {
  const t = tools(kit);
  const group = new Group();
  group.name = `Ideal tank ${code}`;
  // A clear cylinder on a steel base under a steel lid, its contents a
  // smaller coloured cylinder inside whose height is how much is there.
  const R = 0.2;
  const H = 1.5;
  const frame = t.paint('#3a4246', 0.5, 0.4);
  t.cyl(group, frame, R + 0.01, 0.04, 0, 0.02, 0, 'y', 28);
  t.cyl(group, frame, R + 0.01, 0.04, 0, H - 0.02, 0, 'y', 28);
  const glass = t.cyl(group, t.paint('#cfe3ea', 0.1), R, H - 0.08, 0, H / 2);
  glass.geometry = new CylinderGeometry(R, R, H - 0.08, 32, 1, true);
  const glassPaint = glass.material as {
    transparent?: boolean;
    opacity?: number;
    depthWrite?: boolean;
  };
  glassPaint.transparent = true;
  glassPaint.opacity = 0.25;
  glassPaint.depthWrite = false;
  const content = t.cyl(
    group,
    t.paint(colour, 0.3),
    R - 0.04,
    1,
    0,
    0,
    0,
    'y',
    24,
  );
  // The sticker, curved round the glass; its 100 % line just above it.
  const S = { y: 1.0, h: 0.42, arc: 1.9 };
  const full = S.y + S.h / 2 + 0.03 - 0.04;
  const level = (f: number) => {
    const h = Math.max(0.02, full * f);
    content.scale.y = h;
    content.position.y = 0.04 + h / 2;
  };
  level(1);
  const plate = t.printed(
    R * S.arc,
    S.h,
    (c, w, h) => {
      c.fillStyle = '#f6f4ec';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#16232b';
      c.textAlign = 'center';
      c.font = `bold ${h * 0.15}px Arial`;
      c.fillText(code, w / 2, h * 0.2);
      // Its name, formula and strength, then its hazards in words and
      // their CLP diamonds.
      c.font = `${h * 0.08}px Arial`;
      c.fillText(name, w / 2, h * 0.36, w * 0.92);
      c.font = `bold ${h * 0.09}px Arial`;
      c.fillText(formula, w / 2, h * 0.47, w * 0.92);
      c.font = `${h * 0.08}px Arial`;
      c.fillText(strength, w / 2, h * 0.57, w * 0.92);
      c.font = `${h * 0.055}px Arial`;
      c.fillText(
        hazards.map((z) => HAZARD[z].word).join(', '),
        w / 2,
        h * 0.67,
        w * 0.94,
      );
      hazards.forEach((z, k) => {
        const x = w * (0.5 + (k - (hazards.length - 1) / 2) * 0.22);
        const cy = h * 0.82;
        const r = h * 0.07;
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
        c.font = `bold ${h * 0.03}px Arial`;
        c.fillText(HAZARD[z].ghs, x, cy + h * 0.012, r * 1.3);
      });
    },
    256,
  );
  const sticker = new Mesh(
    new CylinderGeometry(
      R + 0.002,
      R + 0.002,
      S.h,
      24,
      1,
      true,
      -S.arc / 2,
      S.arc,
    ),
    plate.mesh.material,
  );
  sticker.position.set(0, S.y, 0);
  group.add(sticker);
  // The USED counter, in a box on the glass above the sticker and the
  // 100 % line, its back cut to the tube's curve so it sits flush.
  const counter = new Group();
  counter.position.set(0, full + 0.04 + 0.07, 0);
  const CW = 0.2;
  const CH = 0.08;
  const front = R + 0.025;
  const back = Math.sqrt(R * R - (CW / 2) ** 2);
  const outline = new Shape();
  outline.moveTo(-CW / 2, back);
  outline.lineTo(-CW / 2, front);
  outline.lineTo(CW / 2, front);
  outline.lineTo(CW / 2, back);
  outline.absarc(
    0,
    0,
    R,
    Math.atan2(back, CW / 2),
    Math.atan2(back, -CW / 2),
    false,
  );
  const housing = new ExtrudeGeometry(outline, {
    depth: CH,
    bevelEnabled: false,
    curveSegments: 12,
  });
  housing.rotateX(Math.PI / 2);
  housing.translate(0, CH / 2, 0);
  counter.add(new Mesh(housing, t.paint('#1b2328', 0.5)));
  const face = new Group();
  face.position.z = front;
  counter.add(face);
  const digits = createSevenSegment(kit, 5, { digitHeight: 0.035 });
  digits.group.position.set(0, 0.01, 0.001);
  face.add(digits.group);
  const unitLabel = createMicroLabel(kit, `USED ${unit}`, {
    height: 0.013,
    ink: '#f4f3ee',
  });
  unitLabel.position.set(0, -0.028, 0.001);
  face.add(unitLabel);
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
  /** The TIME buttons on the desk; none when they are on a wall panel of their own (`createTimePanel`). */
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
  // The swimmers: centred on the row when it is theirs alone.
  const sx = b.speeds.length || b.cards > 0 ? 0 : 0.685;
  parts.add(
    put(
      pushButton(kit, {
        colour: 'yellow',
        legend: '+20 SWIMMERS',
        action: b.group,
      }),
      -0.82 + sx,
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
      -0.55 + sx,
      -0.2,
      1.1,
    ),
  );
  text('SWIMMERS', -0.55 + sx, -0.28);
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
  if (b.speeds.length) text('TIME', -0.08, -0.28);
  let cardNo: ReturnType<typeof createSevenSegment> | null = null;
  // CHALLENGE, unless it has a wall panel of its own (`createChallengePanel`).
  if (b.cards > 0) {
    const cx = b.speeds.length ? 0 : -0.2;
    parts.add(
      put(
        pushButton(kit, {
          colour: 'black',
          symbol: '◄',
          name: 'CHALLENGE back',
          action: () => b.stepCard(-1),
        }),
        0.3 + cx,
        -0.2,
        0.8,
      ),
    );
    cardNo = createSevenSegment(kit, 2, { digitHeight: 0.03 });
    cardNo.group.position.set(0.42 + cx, -0.2, 0.002);
    face.add(cardNo.group);
    parts.add(
      put(
        pushButton(kit, {
          colour: 'black',
          symbol: '►',
          name: 'CHALLENGE on',
          action: () => b.stepCard(1),
        }),
        0.54 + cx,
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
        0.72 + cx,
        -0.2,
        0.8,
      ),
    );
    text(`CHALLENGE 1–${b.cards}`, 0.48 + cx, -0.28);
  }
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
      if (cardNo && c !== cardShown) cardNo.show((cardShown = c));
      parts.update(delta);
    },
  };
}

/**
 * The exhibit's TIME panel (the owner, 2026-10-31): a plate flush on the
 * wall, its back at its origin, facing +z, a screw in each corner; a
 * four-position cam selector, each position's speed engraved round it;
 * under it a 2-line character LCD, the rate and how far the simulation
 * has run ahead of real time since the hall was reset. The LCD redraws
 * only when its text changes.
 */
export function createTimePanel(
  kit: PanelKit,
  b: {
    speeds: readonly number[];
    speed(): number;
    setSpeed(s: number): void;
    /** Simulated seconds gained on real time since the reset. */
    ahead(): number;
  },
) {
  const t = tools(kit);
  const group = new Group();
  group.name = 'TIME panel';
  const W = 0.3;
  const H = 0.3;
  const T = 0.006;
  const plate = t.paint('#d8d4c6', 0.5);
  t.box(group, plate, W, H, T, 0, 0, T / 2);
  const screw = t.paint('#9aa0a3', 0.35, 0.8);
  for (const sx of [-1, 1])
    for (const sy of [-1, 1])
      t.cyl(group, screw, 0.007, 0.003, 0, 0, 0).position.set(
        sx * (W / 2 - 0.018),
        sy * (H / 2 - 0.018),
        T + 0.0015,
      );
  // The cylinders stand along y; turn the screws' heads to face out.
  group.children.slice(-4).forEach((o) => (o.rotation.x = Math.PI / 2));
  const parts = createPartSet();
  const knob = selector(kit, {
    positions: 4,
    name: 'TIME selector',
    bound: {
      get value() {
        return Math.max(0, b.speeds.indexOf(b.speed()));
      },
      set: (k: number) => b.setSpeed(b.speeds[Math.max(0, Math.min(3, k))]),
    },
  });
  const KY = 0.015;
  const S = 1.4;
  knob.object.position.set(0, KY, T + 0.001);
  knob.object.scale.setScalar(S);
  group.add(knob.object);
  parts.add(knob);
  t.label(group, 'TIME', 0, H / 2 - 0.025, T + 0.001, 0.022, '#16191b');
  // Each position engraved where its pointer points (the cam selector's
  // handle at π/4 − kπ/4).
  b.speeds.forEach((sp, k) => {
    const a = Math.PI / 4 - (k * Math.PI) / 4;
    const r = 0.068;
    t.label(
      group,
      `×${sp}`,
      -Math.sin(a) * r,
      KY + Math.cos(a) * r,
      T + 0.001,
      0.014,
      '#16191b',
    );
  });
  const lcd = createCharacterLcd(kit, {
    columns: 16,
    rows: 2,
    cell: 0.006,
  });
  lcd.group.position.set(0, -0.095, T);
  group.add(lcd.group);
  let shown = '';
  let due = 0;
  const two = (n: number) => String(n).padStart(2, ' ');
  return {
    group,
    parts,
    update(delta: number) {
      parts.update(delta);
      due -= delta;
      if (due > 0) return;
      due = 0.1; // at most 10 Hz
      const gain = Math.max(0, Math.floor(b.ahead()));
      const h = Math.floor(gain / 3600);
      const m = Math.floor(gain / 60) % 60;
      const ahead = h > 0 ? `${h}h ${two(m)}m` : `${m}m ${two(gain % 60)}s`;
      // The LCD's character set has no ×: an x, as such modules printed it.
      const text = `RATE x${b.speed()}|AHEAD ${ahead}`;
      if (text === shown) return;
      shown = text;
      lcd.show(text.split('|').map((l) => l.padEnd(16).slice(0, 16)));
    },
  };
}

/**
 * The exhibit's CHALLENGE panel (the owner, 2026-10-31), under the
 * challenge cards' poster: a plate flush on the wall, its back at its
 * origin, facing +z, a screw in each corner; ◄, the card's number, ► and
 * START under the legend SELECT YOUR CHALLENGE.
 */
export function createChallengePanel(
  kit: PanelKit,
  b: {
    card(): number;
    cards: number;
    stepCard(by: number): void;
    startCard(): void;
  },
) {
  const t = tools(kit);
  const group = new Group();
  group.name = 'CHALLENGE panel';
  const W = 0.5;
  const H = 0.24;
  const T = 0.006;
  t.box(group, t.paint('#d8d4c6', 0.5), W, H, T, 0, 0, T / 2);
  const screw = t.paint('#9aa0a3', 0.35, 0.8);
  for (const sx of [-1, 1])
    for (const sy of [-1, 1])
      t.cyl(group, screw, 0.007, 0.003, 0, 0, 0).position.set(
        sx * (W / 2 - 0.018),
        sy * (H / 2 - 0.018),
        T + 0.0015,
      );
  group.children.slice(-4).forEach((o) => (o.rotation.x = Math.PI / 2));
  const parts = createPartSet();
  const put = <P extends { object: Group }>(p: P, x: number) => {
    p.object.position.set(x, -0.03, T + 0.001);
    group.add(p.object);
    return p;
  };
  parts.add(
    put(
      pushButton(kit, {
        colour: 'black',
        symbol: '◄',
        name: 'CHALLENGE back',
        action: () => b.stepCard(-1),
      }),
      -0.17,
    ),
  );
  const no = createSevenSegment(kit, 2, { digitHeight: 0.04 });
  no.group.position.set(-0.06, -0.03, T + 0.001);
  group.add(no.group);
  parts.add(
    put(
      pushButton(kit, {
        colour: 'black',
        symbol: '►',
        name: 'CHALLENGE on',
        action: () => b.stepCard(1),
      }),
      0.05,
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
      0.17,
    ),
  );
  t.label(group, 'SELECT YOUR CHALLENGE', 0, 0.07, T + 0.001, 0.024, '#16191b');
  t.label(group, `CARDS 1–${b.cards}`, 0, -0.095, T + 0.001, 0.016, '#16191b');
  let shown = '';
  return {
    group,
    parts,
    update(delta: number) {
      parts.update(delta);
      const c = String(b.card() + 1).padStart(2);
      if (c !== shown) no.show((shown = c));
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
/**
 * The beam's tilt at full scale (±1.5), radians: small enough that its arms
 * and pans stay within the bezel round the card, and the card's arc drawn
 * to the same angle so the pointer reads true.
 */
const BEAM_TILT = 0.35;

export function createBalanceBeam(
  kit: PanelKit,
  /** Its plaque on its back panel, or none when its words stand on a lectern of their own. */
  plaque: { headline: string; body: string; caution: string } | null,
) {
  const t = tools(kit);
  const group = new Group();
  group.name = 'Balance Beam';
  const dark = t.paint('#2b3438', 0.5, 0.3);
  const brass = t.paint('#b8913a', 0.35, 0.8);
  t.box(group, dark, 1.9, 0.05, 0.5, 0, 0.025, 0);
  // The back panel, a bezel of even width (0.2 m) all round the coloured
  // card (the owner, 2026-10-31): 0.35 to 1.25 m, the term windows below.
  t.box(group, dark, 1.9, 0.9, 0.08, 0, 0.8, -0.15);
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
      const ang = (v: number) => -Math.PI / 2 + (v / 1.5) * BEAM_TILT;
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
      // In the card's top corners, clear of the beam's arms and pans.
      c.fillText('AGGRESSIVE', w * 0.15, h * 0.12);
      c.fillText('EATS GROUT', w * 0.15, h * 0.23);
      c.fillText('SOFT WATER', w * 0.15, h * 0.34);
      c.fillText('HARD WATER', w * 0.85, h * 0.23);
      c.fillText('BALANCED', cx, h * 0.12);
      c.fillText('SCALING', w * 0.85, h * 0.12);
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
    0.22,
    0.01,
    0,
    0.11,
    0.02,
  );
  void pointer;
  for (const sx of [-1, 1]) {
    t.box(beam, brass, 0.008, 0.12, 0.008, sx * 0.62, -0.065, 0);
    t.cyl(beam, brass, 0.12, 0.02, sx * 0.62, -0.13, 0);
  }
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
  if (plaque) {
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
  }
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
      const target = (Math.max(-1.5, Math.min(1.5, lsi)) / 1.5) * BEAM_TILT;
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
