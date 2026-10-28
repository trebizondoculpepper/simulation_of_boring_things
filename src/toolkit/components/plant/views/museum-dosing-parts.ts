import { Group, MeshStandardMaterial } from 'three';
import { signal } from '@preact/signals-core';
import type { PanelKit } from '../../core/views/eighties-controls';
import {
  createMicroLabel,
  createSevenSegment,
} from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';
import {
  createPartSet,
  pilotLight,
  pushButton,
  selector,
} from '../../core/parts/parts';
import { panelMakerMark } from '../../core/views/panel-maker-mark';
import { createBrandBadge } from '../../core/views/brand-badge';
import { dpdColour, phenolColour } from '../logic/dpd-colours';

/**
 * Hall 3's own pieces (107c): the 24-hour chart recorder that tells the
 * hall's time, the DPD test kit, the SWIMMERS dial, the fault pedestal and
 * the small day tank with its sight gauge. Each a working thing: driven by
 * the hall's model, redrawn only when what it shows changes.
 */

const SANS = 'Arial, Helvetica, sans-serif';

/**
 * A 24-hour circular chart recorder (Kessler-Moody, after a Chessell-style
 * circular recorder): its paper turns once a plant day, the hour lines
 * printed on it, so the time is read off the paper at the top, where the
 * pens write; two pens, red free chlorine (0 to 3 mg/l) and blue pH (6.5
 * to 8.0). `fresh` puts in a clean chart, its pens at the given time.
 * Facing +z.
 */
export function createDayChartRecorder(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  group.name = '24-hour circular chart recorder';
  const S = 0.5;
  t.box(group, t.paint('#2a2c2e', 0.4), S, S, 0.07, 0, 0, 0.035);
  const chart = t.printed(S - 0.06, S - 0.06, () => {}, 512);
  chart.mesh.position.set(0, 0, 0.0705);
  group.add(chart.mesh);
  const badge = createBrandBadge(kit, 'kessler-moody', { height: 0.022 });
  badge.position.set(0, -S / 2 + 0.015, 0.0705);
  group.add(badge);
  const ctx = chart.context;
  const N = ctx.canvas.width;
  const m = N / 2;
  const R = m * 0.95;
  const radius = (v: number) => (0.15 + Math.max(0, Math.min(1, v)) * 0.8) * R;
  /** The paper at `start` (seconds after midnight) has turned so that time `at` is under the pens at the top. */
  let start = 0;
  let last: ([number, number] | null)[] = [null, null];
  const angleOf = (at: number) =>
    -Math.PI / 2 - ((at - start) / 86400) * Math.PI * 2;
  const paper = () => {
    ctx.fillStyle = '#f4f2e8';
    ctx.fillRect(0, 0, N, N);
    ctx.strokeStyle = '#9ec29a';
    ctx.lineWidth = 1;
    for (let r = 1; r <= 6; r++) {
      ctx.beginPath();
      ctx.arc(m, m, (0.15 + (r / 6) * 0.8) * R, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.font = `bold ${N / 34}px ${SANS}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let h = 0; h < 24; h++) {
      // The paper's own frame: hour h printed where it will pass under the pens.
      const a = -Math.PI / 2 + ((h * 3600 - start) / 86400) * Math.PI * 2;
      ctx.strokeStyle = h % 6 === 0 ? '#5d8a58' : '#9ec29a';
      ctx.beginPath();
      ctx.moveTo(m + Math.cos(a) * R * 0.15, m + Math.sin(a) * R * 0.15);
      ctx.lineTo(m + Math.cos(a) * R, m + Math.sin(a) * R);
      ctx.stroke();
      ctx.fillStyle = '#3b5a37';
      ctx.fillText(
        String(h).padStart(2, '0'),
        m + Math.cos(a) * R * 1.0,
        m + Math.sin(a) * R * 1.0,
      );
    }
    ctx.fillStyle = '#333';
    ctx.font = `bold ${N / 30}px ${SANS}`;
    ctx.fillText('FREE Cl₂ 0–3 mg/l  ·  pH 6.5–8.0', m, m + R * 0.08);
    ctx.font = `${N / 36}px ${SANS}`;
    ctx.fillText('24 HOURS · M3-QR1', m, m - R * 0.06);
  };
  /** The paper rotates on the screen as it turns: its mesh turned by the time gone. */
  const turnTo = (at: number) => {
    chart.mesh.rotation.z = ((at - start) / 86400) * Math.PI * 2;
  };
  const fresh = (now: number) => {
    start = now;
    last = [null, null];
    paper();
    chart.texture.needsUpdate = true;
    turnTo(now);
  };
  fresh(0);
  // The pen arm, fixed, at the top.
  t.box(
    group,
    t.paint('#7b7f82', 0.4),
    0.006,
    S / 2 - 0.04,
    0.004,
    0,
    S / 4 - 0.005,
    0.075,
  );
  return {
    group,
    fresh,
    /** Ink to time `at` (s since the chart's start, as a time of day plus whole days), each pen 0 to 1. */
    show(at: number, values: readonly [number, number]) {
      turnTo(at);
      const a = angleOf(at);
      let inked = false;
      ['#c4211b', '#1c48b8'].forEach((colour, i) => {
        // In the paper's frame the pens are at angle −a − π (the top, unturned).
        const pa = -Math.PI / 2 + ((at - start) / 86400) * Math.PI * 2;
        void a;
        const r = radius(values[i]);
        const p: [number, number] = [
          m + Math.cos(pa) * r,
          m + Math.sin(pa) * r,
        ];
        const from = last[i];
        if (from && Math.hypot(p[0] - from[0], p[1] - from[1]) < 1.5) return;
        if (from && at - start < 86400) {
          ctx.strokeStyle = colour;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(...from);
          ctx.lineTo(...p);
          ctx.stroke();
          inked = true;
        }
        last[i] = p;
      });
      if (inked) chart.texture.needsUpdate = true;
    },
  };
}

/**
 * The DPD test kit (TK1), after a Palintest comparator on a lectern: three
 * tubes (DPD 1, DPD 3, phenol red) before their colour discs, PRESS TO TEST
 * (a sample drawn at the cell's tap and tested), and a ticket readout of
 * free, total, combined and pH. Facing +z, standing on the floor.
 */
export function createDpdTestKit(
  kit: PanelKit,
  { tag, test }: { tag: string; test: () => void },
) {
  const t = tools(kit);
  const group = new Group();
  group.name = `${tag} DPD test kit`;
  const post = t.paint('#3a4246', 0.5, 0.3);
  t.box(group, post, 0.08, 0.95, 0.08, 0, 0.475, -0.05);
  const top = new Group();
  top.position.set(0, 1.05, 0);
  top.rotation.x = -0.45;
  group.add(top);
  t.box(top, t.paint('#e8e6de', 0.6), 0.6, 0.36, 0.04, 0, 0, 0);
  const tubes = [0, 1, 2].map((k) => {
    const x = -0.2 + k * 0.13;
    t.cyl(top, t.paint('#d9eef2', 0.15), 0.017, 0.12, x, 0.05, 0.04, 'y', 16);
    const liquid = new MeshStandardMaterial({
      color: '#f6f2f0',
      roughness: 0.3,
    });
    const water = t.cyl(top, liquid, 0.014, 0.09, x, 0.04, 0.04, 'y', 16);
    void water;
    const disc = t.printed(0.1, 0.1, () => {}, 128);
    disc.mesh.position.set(x, -0.08, 0.021);
    top.add(disc.mesh);
    return { liquid, disc };
  });
  const paintDisc = (k: number, lit: number) => {
    const c = tubes[k].disc.context;
    const n = c.canvas.width;
    c.clearRect(0, 0, n, n);
    const steps =
      k === 2
        ? [6.8, 7.0, 7.2, 7.4, 7.6, 7.8, 8.0, 8.2]
        : [0, 0.2, 0.5, 1.0, 1.5, 2.0, 3.0];
    steps.forEach((v, i) => {
      const a0 = (i / steps.length) * Math.PI * 2 - Math.PI / 2;
      const a1 = ((i + 1) / steps.length) * Math.PI * 2 - Math.PI / 2;
      c.fillStyle = k === 2 ? phenolColour(v) : dpdColour(v);
      c.beginPath();
      c.moveTo(n / 2, n / 2);
      c.arc(n / 2, n / 2, n * 0.48, a0, a1);
      c.fill();
      if (i === lit) {
        c.strokeStyle = '#111';
        c.lineWidth = 5;
        c.stroke();
      }
    });
    tubes[k].disc.texture.needsUpdate = true;
    return steps;
  };
  [0, 1, 2].forEach((k) => paintDisc(k, -1));
  ['DPD 1', 'DPD 3', 'PHENOL RED'].forEach((text, k) => {
    const l = createMicroLabel(kit, text, { height: 0.016, ink: '#16191b' });
    l.position.set(-0.2 + k * 0.13, 0.14, 0.021);
    top.add(l);
  });
  const ticket = t.printed(0.17, 0.26, () => {}, 256);
  ticket.mesh.position.set(0.2, 0.0, 0.021);
  top.add(ticket.mesh);
  const writeTicket = (lines: string[]) => {
    const c = ticket.context;
    const w = c.canvas.width;
    const h = c.canvas.height;
    c.fillStyle = '#fbfbf7';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#1b1b1b';
    c.font = `bold ${w / 11}px monospace`;
    lines.forEach((l, i) => c.fillText(l, w * 0.06, h * (0.12 + i * 0.12)));
    ticket.texture.needsUpdate = true;
  };
  writeTicket([tag, '', 'PRESS', 'TO TEST']);
  const parts = createPartSet();
  const button = parts.add(
    pushButton(kit, {
      colour: 'green',
      legend: 'TEST',
      name: `${tag} PRESS TO TEST`,
      action: test,
    }),
  );
  button.object.position.set(-0.2, -0.15, 0.022);
  button.object.scale.setScalar(1.4);
  top.add(button.object);
  const label = createMicroLabel(kit, `${tag}  POOL TEST KIT`, {
    height: 0.02,
    ink: '#16191b',
    plate: '#f4f3ee',
  });
  label.position.set(0, -0.155, 0.021);
  top.add(label);
  let shown = '';
  return {
    group,
    parts,
    show(r: { dpd1: number; dpd3: number; phenolRed: number } | null) {
      const key = r ? `${r.dpd1}|${r.dpd3}|${r.phenolRed}` : '';
      if (key === shown) return;
      shown = key;
      if (!r) {
        tubes.forEach((x, k) => {
          x.liquid.color.set('#f6f2f0');
          paintDisc(k, -1);
        });
        writeTicket([tag, '', 'PRESS', 'TO TEST']);
        return;
      }
      const nearest = (steps: number[], v: number) =>
        steps.reduce(
          (b, s, i) => (Math.abs(s - v) < Math.abs(steps[b] - v) ? i : b),
          0,
        );
      tubes[0].liquid.color.set(dpdColour(r.dpd1));
      tubes[1].liquid.color.set(dpdColour(r.dpd3));
      tubes[2].liquid.color.set(phenolColour(r.phenolRed));
      [r.dpd1, r.dpd3, r.phenolRed].forEach((v, k) => {
        const steps = paintDisc(k, -1);
        paintDisc(k, nearest(steps, v));
      });
      writeTicket([
        tag,
        `FREE  ${r.dpd1.toFixed(2)}`,
        `TOTAL ${r.dpd3.toFixed(2)}`,
        `COMB  ${Math.max(0, r.dpd3 - r.dpd1).toFixed(2)}`,
        `pH    ${r.phenolRed.toFixed(1)}`,
        'mg/l Cl2',
      ]);
    },
  };
}

/**
 * The SWIMMERS dial (BA1) on its pedestal, Penfold-built: a four-position
 * rotary switch, CLOSED · QUIET · NORMAL · CROWD, and a lit counter of the
 * swimmers in the water. Facing +z.
 */
export function createSwimmersDial(
  kit: PanelKit,
  {
    tag,
    swimmers,
  }: { tag: string; swimmers: { value: number; set(p: number): void } },
) {
  const t = tools(kit);
  const group = new Group();
  group.name = `${tag} SWIMMERS dial`;
  t.box(group, t.paint('#55616a', 0.5), 0.08, 1.0, 0.08, 0, 0.5, -0.04);
  const W = 0.42;
  const H = 0.34;
  const face = new Group();
  face.position.set(0, 1.2, 0);
  face.rotation.x = -0.3;
  group.add(face);
  t.box(face, t.paint('#d8dbd6', 0.5), W, H, 0.06, 0, 0, -0.03);
  const parts = createPartSet();
  const dial = parts.add(
    selector(kit, {
      positions: 4,
      legend: 'CLOSED · QUIET · NORMAL · CROWD',
      name: `${tag} SWIMMERS dial`,
      bound: swimmers,
    }),
  );
  dial.object.scale.setScalar(2);
  dial.object.position.set(-0.08, -0.03, 0.002);
  face.add(dial.object);
  const digits = createSevenSegment(kit, 3, { digitHeight: 0.045 });
  digits.group.position.set(0.12, 0.0, 0.004);
  digits.group.traverse((o) => (o.userData.live = true));
  face.add(digits.group);
  const unit = createMicroLabel(kit, 'IN THE WATER', {
    height: 0.014,
    ink: '#16191b',
  });
  unit.position.set(0.12, -0.05, 0.003);
  face.add(unit);
  const plate = createMicroLabel(kit, `${tag}  SWIMMERS`, {
    height: 0.022,
    ink: '#16191b',
    plate: '#f4f3ee',
  });
  plate.position.set(-0.04, 0.13, 0.003);
  face.add(plate);
  panelMakerMark(kit, face, {
    width: W,
    height: H,
    z: 0.002,
    corner: 'bottom-right',
  });
  let shown = '';
  return {
    group,
    parts,
    show(bathers: number, delta: number) {
      const text = String(Math.round(bathers)).padStart(3, ' ');
      if (text !== shown) digits.show((shown = text));
      parts.update(delta);
    },
  };
}

/**
 * The fault pedestal (FP1), PLANTROOMS' own: two mushroom-headed buttons
 * with their lamps, AIR IN THE PUMP and WEAK DELIVERY, each lamp lit while
 * its fault stands. Facing +z.
 */
export function createFaultPedestal(
  kit: PanelKit,
  {
    tag,
    air,
    weak,
    airLit,
    weakLit,
  }: {
    tag: string;
    air: () => void;
    weak: () => void;
    airLit: () => boolean;
    weakLit: () => boolean;
  },
) {
  const t = tools(kit);
  const group = new Group();
  group.name = `${tag} fault pedestal`;
  t.box(group, t.paint('#3b2f2f', 0.5), 0.1, 1.0, 0.1, 0, 0.5, -0.04);
  const W = 0.46;
  const H = 0.3;
  const face = new Group();
  face.position.set(0, 1.15, 0);
  face.rotation.x = -0.35;
  group.add(face);
  t.box(face, t.paint('#f2c230', 0.5), W, H, 0.06, 0, 0, -0.03);
  const parts = createPartSet();
  const lit = [signal(airLit()), signal(weakLit())];
  (
    [
      ['AIR IN THE PUMP', air],
      ['WEAK DELIVERY', weak],
    ] as const
  ).forEach(([legend, action], k) => {
    const x = k ? 0.11 : -0.11;
    const b = parts.add(
      pushButton(kit, {
        colour: 'red',
        head: 'extended',
        legend,
        name: `${tag} ${legend}`,
        action,
      }),
    );
    b.object.scale.setScalar(1.8);
    b.object.position.set(x, -0.03, 0.002);
    face.add(b.object);
    const lamp = parts.add(
      pilotLight(kit, {
        colour: 'amber',
        legend,
        drive: lit[k],
        name: `${tag} ${legend} lamp`,
        pushToTest: false,
      }),
    );
    lamp.object.position.set(x, 0.08, 0.002);
    face.add(lamp.object);
    const l = createMicroLabel(kit, legend, { height: 0.016, ink: '#16191b' });
    l.position.set(x, -0.12, 0.002);
    face.add(l);
  });
  const plate = createMicroLabel(kit, `${tag}  WHEN IT GOES WRONG`, {
    height: 0.018,
    ink: '#f4f3ee',
    plate: '#16191b',
  });
  plate.position.set(0, 0.13, 0.002);
  face.add(plate);
  return {
    group,
    parts,
    update(delta: number) {
      if (lit[0].value !== airLit()) lit[0].value = airLit();
      if (lit[1].value !== weakLit()) lit[1].value = weakLit();
      parts.update(delta);
    },
  };
}

/**
 * A 60 l day tank: a natural polyethylene drum in its bund, its sight tube
 * up its side with a litre scale, its chemical's band and hazard label,
 * and its maker's badge. `show` moves the level in the drum and the tube.
 * Standing on the floor, its front +z.
 */
export function createSmallDayTank(
  kit: PanelKit,
  {
    tag,
    chemical,
    r,
    h,
    bund,
    litres,
  }: {
    tag: string;
    chemical: 'hypochlorite' | 'acid';
    r: number;
    h: number;
    bund: number;
    litres: number;
  },
) {
  const t = tools(kit);
  const group = new Group();
  group.name = `${tag} day tank`;
  const band = chemical === 'hypochlorite' ? '#f2d03b' : '#c8261c';
  t.box(group, t.paint('#2a2f31', 0.6), 2.4 * r, bund, 2.4 * r, 0, bund / 2, 0);
  t.cyl(
    group,
    t.paint('#e9e6d6', 0.35),
    r,
    h,
    0,
    bund + h / 2,
    0,
    'y',
    28,
  ).material = new MeshStandardMaterial({
    color: '#e9e6d6',
    roughness: 0.4,
    transparent: true,
    opacity: 0.55,
  });
  const liquid = new MeshStandardMaterial({
    color: chemical === 'hypochlorite' ? '#d9d27a' : '#e6e0c8',
    roughness: 0.3,
  });
  const fill = t.cyl(group, liquid, r * 0.94, 1, 0, bund, 0, 'y', 24);
  t.cyl(
    group,
    t.paint(band, 0.5),
    r + 0.003,
    0.04,
    0,
    bund + h - 0.06,
    0,
    'y',
    28,
  );
  // The sight tube and its scale.
  t.cyl(
    group,
    t.paint('#d9eef2', 0.15),
    0.008,
    h,
    r + 0.03,
    bund + h / 2,
    0.08,
    'y',
    10,
  );
  const tubeLevel = t.cyl(
    group,
    t.paint('#7a6f2a', 0.4),
    0.006,
    1,
    r + 0.03,
    bund,
    0.08,
    'y',
    10,
  );
  const scale = t.printed(
    0.05,
    h,
    (c, w, hh) => {
      c.fillStyle = '#f4f3ee';
      c.fillRect(0, 0, w, hh);
      c.fillStyle = '#16191b';
      c.font = `bold ${w * 0.32}px ${SANS}`;
      for (let l = 0; l <= litres; l += 10) {
        const y = hh - (l / litres) * hh * 0.98 - 2;
        c.fillRect(0, y, w * 0.3, 2);
        c.fillText(String(l), w * 0.36, y + w * 0.12);
      }
    },
    256,
  );
  scale.mesh.position.set(r + 0.08, bund + h / 2, 0.08);
  group.add(scale.mesh);
  const label = createMicroLabel(
    kit,
    `${tag} ${chemical === 'hypochlorite' ? 'SODIUM HYPOCHLORITE 14%' : 'HYDROCHLORIC ACID 10%'} · CORROSIVE`,
    { height: 0.016, ink: '#16191b', plate: '#f4f3ee', maxWidth: 2 * r },
  );
  label.position.set(0, bund + h * 0.55, r + 0.003);
  group.add(label);
  const maker = createBrandBadge(kit, 'grundflow', { height: 0.018 });
  maker.position.set(0, bund + h * 0.3, r + 0.004);
  group.add(maker);
  let shown = -1;
  return {
    group,
    show(level: number) {
      const share = Math.max(0.001, Math.min(1, level / litres));
      const k = Math.round(share * 200);
      if (k === shown) return;
      shown = k;
      fill.scale.y = share * h;
      fill.position.y = bund + (share * h) / 2;
      tubeLevel.scale.y = share * h;
      tubeLevel.position.y = bund + (share * h) / 2;
    },
  };
}
