import { Group, MeshBasicMaterial } from 'three';
import type { BrandId } from '../../core/logic/brands';
import type { PanelKit } from '../../core/views/eighties-controls';
import { SANS } from '../../core/views/fitting-tools';
import { createBrandBadge } from '../../core/views/brand-badge';
import { plantTools } from '../../plant/views/plant-tools';

/**
 * Instruments of a control room about twenty-five years out of date, in
 * metres, each facing +z: a CRT monitor and a circular chart recorder (the
 * alarm printer is the teleprinter, `teleprinter.ts`). Each is live: what it shows is set while it
 * runs. Tried on dev0's PERIOD INSTRUMENTS board first, then used in the
 * plant rooms.
 */

type Tools = ReturnType<typeof plantTools>;

/** A small glowing lamp. */
function lamp(
  kit: PanelKit,
  t: Tools,
  parent: Group,
  colour: string,
  x: number,
  y: number,
  z: number,
  r = 0.003,
) {
  const material = new MeshBasicMaterial({ color: colour });
  kit.materials.push(material);
  return t.cyl(parent, material, r, 0.004, x, y, z, 'z', 12);
}

/** Draw `draw` and the tube's scan lines and dark corners. */
function tube(
  c: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  draw: (c: CanvasRenderingContext2D, cw: number, ch: number) => void,
) {
  draw(c, cw, ch);
  c.fillStyle = 'rgba(0,0,0,0.18)';
  for (let y = 0; y < ch; y += 3) c.fillRect(0, y, cw, 1);
  const g = c.createRadialGradient(
    cw / 2,
    ch / 2,
    ch * 0.3,
    cw / 2,
    ch / 2,
    cw * 0.62,
  );
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.45)');
  c.fillStyle = g;
  c.fillRect(0, 0, cw, ch);
}

/** Green text on a dark tube, as a text-mode terminal draws it. */
export function drawTerminal(
  lines: readonly string[],
  { ink = '#3cff6a', ground = '#031407' } = {},
) {
  return (c: CanvasRenderingContext2D, cw: number, ch: number) => {
    c.fillStyle = ground;
    c.fillRect(0, 0, cw, ch);
    c.fillStyle = ink;
    c.font = `bold ${ch / 22}px "Courier New", monospace`;
    c.textBaseline = 'top';
    lines.forEach((line, i) =>
      c.fillText(line, cw * 0.03, ch * 0.04 + i * (ch / 18.5)),
    );
  };
}

export interface CrtMonitorView {
  group: Group;
  /** Draw a new picture on the tube (scan lines and vignette added). */
  show(
    draw: (c: CanvasRenderingContext2D, cw: number, ch: number) => void,
  ): void;
  /** Show lines of text, as a terminal. */
  text(lines: readonly string[]): void;
}

/**
 * A 17-inch CRT monitor in beige plastic, about 400 × 390 × 420 mm: a
 * deep body tapering behind its bezel on a swivel foot. Stands on its
 * foot at the origin, facing +z.
 */
export function createCrtMonitor(
  kit: PanelKit,
  { colour = '#d8d1bd', brand = 'synclex' as BrandId } = {},
): CrtMonitorView {
  const t = plantTools(kit);
  const group = new Group();
  const beige = t.paint(colour, 0.6);
  const dark = t.paint('#1a1b1c', 0.4);
  t.cyl(group, beige, 0.11, 0.02, 0, 0.01, 0.02, 'y', 24);
  t.box(group, beige, 0.08, 0.05, 0.08, 0, 0.045, 0.02);
  t.box(group, beige, 0.4, 0.37, 0.06, 0, 0.26, 0.17);
  t.box(group, beige, 0.34, 0.31, 0.2, 0, 0.255, 0.04);
  t.box(group, beige, 0.24, 0.21, 0.16, 0, 0.25, -0.13);
  t.box(group, dark, 0.33, 0.25, 0.004, 0, 0.27, 0.201);
  let draw: (c: CanvasRenderingContext2D, cw: number, ch: number) => void =
    drawTerminal([]);
  const face = t.printed(
    0.31,
    0.235,
    (c, cw, ch) => tube(c, cw, ch, draw),
    512,
    true,
  );
  face.mesh.position.set(0, 0.27, 0.2035);
  group.add(face.mesh);
  for (let i = 0; i < 4; i++)
    t.box(group, dark, 0.012, 0.006, 0.004, 0.06 + i * 0.022, 0.105, 0.201);
  lamp(kit, t, group, '#5dff7a', -0.15, 0.106, 0.2);
  const badge = createBrandBadge(kit, brand, { height: 0.012 });
  badge.position.set(-0.1, 0.106, 0.2015);
  group.add(badge);
  const show = (next: typeof draw) => {
    draw = next;
    const c = face.context;
    tube(c, c.canvas.width, c.canvas.height, draw);
    face.texture.needsUpdate = true;
  };
  return { group, show, text: (lines) => show(drawTerminal(lines)) };
}

export interface CircularChartView {
  group: Group;
  /** Each pen's position, 0 (centre) to 1 (rim). */
  set(values: readonly number[]): void;
  /** Turn the chart: `delta` seconds, at `rate` turns a second. */
  update(delta: number): void;
}

/**
 * A circular chart recorder: a square steel case 420 mm across with a
 * glazed door over a paper disc that turns once a week (here, `rate`
 * turns a second), each pen drawing its value outward from the centre.
 */
export function createCircularChartRecorder(
  kit: PanelKit,
  {
    pens = ['#c4211b', '#1c48b8'] as readonly string[],
    title = 'HALL AIR °C / %RH  7 DAY',
    rate = 1 / 600,
    brand = 'kessler-moody' as BrandId,
  } = {},
): CircularChartView {
  const t = plantTools(kit);
  const group = new Group();
  t.box(group, t.paint('#2a2c2e', 0.4), 0.42, 0.42, 0.06, 0, 0, 0.03);
  const values = pens.map(() => 0.5);
  const last: ([number, number] | null)[] = pens.map(() => null);
  let turned = 0;
  const chart = t.printed(
    0.36,
    0.36,
    (c, cw) => {
      const m = cw / 2;
      c.fillStyle = '#f4f2e8';
      c.fillRect(0, 0, cw, cw);
      c.strokeStyle = '#9ec29a';
      c.lineWidth = 1;
      for (let r = 1; r <= 8; r++) {
        c.beginPath();
        c.arc(m, m, (r / 8) * m * 0.95, 0, Math.PI * 2);
        c.stroke();
      }
      for (let d = 0; d < 7; d++) {
        const a = (d / 7) * Math.PI * 2;
        c.beginPath();
        c.moveTo(m, m);
        c.lineTo(m + Math.cos(a) * m * 0.95, m + Math.sin(a) * m * 0.95);
        c.stroke();
      }
      c.fillStyle = '#333';
      c.font = `bold ${cw / 20}px ${SANS}`;
      c.textAlign = 'center';
      c.fillText(title, m, m + m * 0.15);
      c.beginPath();
      c.arc(m, m, 6, 0, Math.PI * 2);
      c.fill();
    },
    512,
  );
  chart.mesh.position.set(0, 0, 0.061);
  group.add(chart.mesh);
  const badge = createBrandBadge(kit, brand, { height: 0.02 });
  badge.position.set(0, -0.19, 0.0605);
  group.add(badge);
  return {
    group,
    set(next) {
      next.forEach((v, i) => (values[i] = Math.max(0, Math.min(1, v))));
    },
    update(delta) {
      turned += delta * rate;
      const c = chart.context;
      const m = c.canvas.width / 2;
      const a = turned * Math.PI * 2 - Math.PI / 2;
      pens.forEach((colour, i) => {
        const r = (0.12 + values[i] * 0.83) * m * 0.95;
        const point: [number, number] = [
          m + Math.cos(a) * r,
          m + Math.sin(a) * r,
        ];
        const from = last[i];
        if (from) {
          c.strokeStyle = colour;
          c.lineWidth = 3;
          c.beginPath();
          c.moveTo(...from);
          c.lineTo(...point);
          c.stroke();
        }
        last[i] = point;
      });
      chart.texture.needsUpdate = true;
    },
  };
}
