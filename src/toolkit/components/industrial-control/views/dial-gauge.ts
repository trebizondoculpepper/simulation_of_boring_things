import {
  CanvasTexture,
  CircleGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  PlaneGeometry,
  RingGeometry,
  SRGBColorSpace,
} from 'three';
import type { BrandId } from '../../core/logic/brands';
import { brandById } from '../../core/logic/brands';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createPs1Material } from '../../core/parts/ps1-material';
import { SANS, tools } from '../../core/views/fitting-tools';
import { wordmarkFont } from '../../core/views/brand-logo';
import {
  START,
  SWEEP,
  dialScale,
  markText,
  pointerAngle,
} from '../logic/dial-scale';

/**
 * A process dial gauge, after the common EN 837-1 Bourdon-tube gauge in a
 * stainless case (as the WIKA 232.50: 63, 100 or 160 mm, glycerine
 * filled, ½" BSP bottom or back connection), or its bimetal thermometer
 * cousin on a stem into a pocket (as the WIKA TG53). White dial, black
 * 270° scale with its maker, unit and accuracy class, an optional red
 * band, a black pointer with a counterweight, a glass with the filling's
 * bubble at the top. Live: `set` a value and the pointer eases to it,
 * damped by the filling, fluttering with the flow's pulsation.
 *
 * In metres: the dial's middle at the origin, facing +z.
 */

export type DialKind = 'pressure' | 'compound' | 'thermometer';

export interface DialGaugeOptions {
  kind?: DialKind;
  /** The dial's diameter, metres (0.063, 0.1, 0.16). */
  dia?: number;
  min?: number;
  max?: number;
  unit?: string;
  /** Where its connection comes out: below (on a pipe's top) or behind. */
  entry?: 'bottom' | 'back';
  /** A red band over part of the scale, in the gauge's units. */
  red?: { from: number; to: number } | null;
  /** Glycerine filled: slower, steadier pointer, a bubble under the glass. */
  filled?: boolean;
  /** How much the pointer flutters, as a share of the scale. */
  flutter?: number;
  /** The maker printed on the dial. */
  maker?: BrandId;
  /** A legend printed on the dial: "SUCTION". */
  legend?: string;
}

export interface DialGaugeView {
  group: Group;
  /** Set the reading, in the gauge's units. */
  set(value: number): void;
  /** Move the pointer: call each frame. */
  update(delta: number): void;
  /** What the pointer shows now. */
  readonly value: number;
}

export function createDialGauge(
  kit: PanelKit,
  {
    kind = 'pressure',
    dia = 0.1,
    min = kind === 'compound' ? -1 : 0,
    max = kind === 'compound' ? 1.5 : 4,
    unit = kind === 'thermometer' ? '°C' : 'bar',
    entry = kind === 'thermometer' ? 'back' : 'bottom',
    red = null,
    filled = kind !== 'thermometer',
    flutter = kind === 'thermometer' ? 0 : 0.004,
    maker = 'kessler-moody',
    legend = '',
  }: DialGaugeOptions = {},
): DialGaugeView {
  const t = tools(kit);
  const group = new Group();
  group.name = `Dial gauge ${min}–${max} ${unit}`;
  const steel = t.paint('#c9cdcf', 0.28, 0.85);
  const brass = t.paint('#b8913f', 0.35, 0.7);
  const r = dia / 2;
  // The case and its bayonet ring.
  t.cyl(group, steel, r + 0.004, 0.035, 0, 0, -0.0175, 'z', 40);
  const ring = new Mesh(new RingGeometry(r * 0.97, r + 0.007, 48), steel);
  ring.position.z = 0.0065;
  group.add(ring);
  const rim = new Mesh(
    new CylinderGeometry(r + 0.007, r + 0.007, 0.008, 48, 1, true),
    steel,
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.z = 0.0025;
  group.add(rim);
  // The connection: a hex and ½" stem below, or a stem into its pocket.
  if (entry === 'bottom') {
    t.cyl(group, brass, 0.011, 0.016, 0, -r - 0.012, -0.012, 'y', 6);
    t.cyl(group, brass, 0.0075, 0.03, 0, -r - 0.035, -0.012, 'y', 12);
  } else {
    t.cyl(
      group,
      steel,
      0.004,
      kind === 'thermometer' ? 0.12 : 0.03,
      0,
      0,
      -0.035 - (kind === 'thermometer' ? 0.06 : 0.015),
      'z',
      10,
    );
    t.cyl(group, brass, 0.011, 0.014, 0, 0, -0.04, 'z', 6);
  }
  // The dial.
  const px = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = px;
  const c = canvas.getContext('2d');
  if (!c) throw new Error('No 2D canvas context.');
  const m = px / 2;
  const scale = dialScale(min, max);
  const at = (value: number) => pointerAngle(value, min, max);
  c.fillStyle = '#f7f7f2';
  c.beginPath();
  c.arc(m, m, m, 0, Math.PI * 2);
  c.fill();
  if (red) {
    c.strokeStyle = '#c8261c';
    c.lineWidth = px * 0.035;
    c.beginPath();
    c.arc(m, m, m * 0.8, at(red.from), at(red.to));
    c.stroke();
  }
  if (kind === 'compound') {
    // The vacuum side, tinted, as compound gauges mark it.
    c.strokeStyle = '#7d93b8';
    c.lineWidth = px * 0.02;
    c.beginPath();
    c.arc(m, m, m * 0.8, at(min), at(0));
    c.stroke();
  }
  c.strokeStyle = '#141414';
  c.fillStyle = '#141414';
  c.lineCap = 'butt';
  const step =
    scale.majors.length > 1 ? scale.majors[1] - scale.majors[0] : max - min;
  const minor = step / scale.minorPerMajor;
  for (let v = scale.majors[0] - step; v <= max + 1e-9; v += minor) {
    if (v < min - 1e-9) continue;
    const a = at(v);
    const major = Math.abs(v / step - Math.round(v / step)) < 1e-6;
    c.lineWidth = major ? px * 0.012 : px * 0.005;
    const inner = major ? 0.7 : 0.76;
    c.beginPath();
    c.moveTo(m + Math.cos(a) * m * inner, m + Math.sin(a) * m * inner);
    c.lineTo(m + Math.cos(a) * m * 0.84, m + Math.sin(a) * m * 0.84);
    c.stroke();
  }
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.font = `bold ${px * 0.085}px ${SANS}`;
  for (const v of scale.majors) {
    const a = at(v);
    c.fillText(
      markText(v),
      m + Math.cos(a) * m * 0.55,
      m + Math.sin(a) * m * 0.55,
    );
  }
  c.font = `bold ${px * 0.07}px ${SANS}`;
  c.fillText(unit, m, m + m * 0.32);
  if (legend) {
    c.font = `bold ${px * 0.05}px ${SANS}`;
    c.fillText(legend, m, m + m * 0.5);
  }
  const brand = brandById(maker);
  c.fillStyle = brand.colours[0];
  c.font = wordmarkFont(brand, px * 0.045);
  c.fillText(brand.wordmark ?? brand.name, m, m - m * 0.32, px * 0.5);
  c.fillStyle = '#555';
  c.font = `${px * 0.032}px ${SANS}`;
  c.fillText(
    kind === 'thermometer' ? 'EN 13190  cl.1' : 'EN 837-1  cl.1.0',
    m,
    m + m * 0.68,
  );
  c.strokeStyle = '#999';
  c.lineWidth = px * 0.008;
  c.beginPath();
  c.arc(m, m, m * 0.985, 0, Math.PI * 2);
  c.stroke();
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  kit.textures.push(texture);
  const dial = createPs1Material({
    map: texture,
    transparent: true,
    alphaTest: 0.5,
  });
  kit.materials.push(dial);
  const face = new Mesh(new PlaneGeometry(dia, dia), dial);
  face.position.z = 0.0005;
  group.add(face);
  // The pointer and its cap: live, so it is not merged.
  const pointer = new Group();
  pointer.userData.live = true;
  pointer.position.z = 0.003;
  const black = t.paint('#141414', 0.45);
  t.box(pointer, black, r * 0.82, 0.0035, 0.001, r * 0.33, 0, 0);
  t.box(pointer, black, r * 0.2, 0.006, 0.001, -r * 0.1, 0, 0);
  t.cyl(group, black, 0.004, 0.003, 0, 0, 0.0045, 'z', 12);
  group.add(pointer);
  // The glass, and the filling's bubble at the top.
  const glass = createPs1Material({
    color: '#dfe8ea',
    transparent: true,
    opacity: filled ? 0.16 : 0.1,
    roughness: 0.05,
  });
  glass.depthWrite = false;
  kit.materials.push(glass);
  const pane = new Mesh(new CircleGeometry(r * 0.98, 48), glass);
  pane.position.z = 0.006;
  group.add(pane);
  if (filled) {
    const bubble = createPs1Material({
      color: '#ffffff',
      transparent: true,
      opacity: 0.35,
    });
    bubble.depthWrite = false;
    kit.materials.push(bubble);
    const top = new Mesh(new PlaneGeometry(dia * 0.32, dia * 0.06), bubble);
    top.position.set(0, r * 0.88, 0.0062);
    group.add(top);
  }
  let target = min;
  let shown = min;
  let clock = Math.random() * 10;
  const span = max - min;
  const place = () => {
    const wobble =
      flutter *
      span *
      (Math.sin(clock * 23) * 0.6 + Math.sin(clock * 37) * 0.4);
    pointer.rotation.z = -pointerAngle(shown + wobble, min, max);
  };
  place();
  return {
    group,
    set(value) {
      target = value;
    },
    update(delta) {
      clock += delta;
      const rate = filled ? 2.5 : kind === 'thermometer' ? 0.6 : 6;
      shown += (target - shown) * Math.min(1, delta * rate);
      place();
    },
    get value() {
      return shown;
    },
  };
}

/** How far the pointer can travel, for callers that need it. */
export const DIAL_SWEEP = { START, SWEEP };
