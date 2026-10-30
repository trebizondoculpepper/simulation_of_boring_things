import {
  CylinderGeometry,
  DoubleSide,
  Group,
  LatheGeometry,
  Mesh,
  PlaneGeometry,
  SphereGeometry,
  TorusGeometry,
  Vector2,
} from 'three';
import type { BufferGeometry, Material } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createCanvasTexture } from '../../core/views/screens';
import { createPs1Material } from '../../core/parts/ps1-material';
import { markComponent } from '../../core/views/component-identity';
import { drawClass8 } from '../../general-safety/views/dangerous-goods';
import {
  CONTENTS_COLOURS,
  CONTENTS_WORDS,
  contentsText,
  cylinderKind,
  cylinderName,
  cylinderStatus,
  seamlessProfile,
  stampLines,
  testDates,
  weldedProfile,
} from '../logic/gas-cylinders';
import type {
  AdrLabel,
  Contents,
  CylinderKind,
  GasId,
  GasKind,
  SizeId,
} from '../logic/gas-cylinders';

/**
 * The shared gas cylinder builder (the owner, 2026-10-30): an industrial
 * gas cylinder of any gas and size the supplier fills
 * (`logic/gas-cylinders.ts`), drawn true to size: its turned body, foot
 * ring and shoulder in BS EN 1089-3's colours; its valve with handwheel
 * (or acetylene's and chlorine's square spindle), its outlet threaded
 * left-hand for a flammable gas (the notched nut that marks it), its
 * residual pressure valve where the supplier fits one, and its guard: an
 * open tulip guard, a screwed cap, or an LPG cylinder's shroud; the BS EN
 * ISO 7225 shoulder label with its ADR diamonds, the supplier's collar
 * label, the marks stamped in its shoulder, and two tags hung from its
 * neck: its contents (FULL, IN USE, EMPTY) and its next test.
 *
 * Cheap to stand by the dozen: every shape, paint and label is made once
 * per kit and kind and shared by every cylinder of it; a contents tag is
 * changed by swapping its material, never by redrawing. Origin on the
 * floor at its middle; its labels face +z, its outlet +x.
 */

export interface GasCylinderSpec {
  gas: GasId;
  /** One of the gas's sizes; the largest when left out. */
  size?: SizeId;
  contents?: Contents;
  /** Hang the contents and test tags (true unless said otherwise). */
  tags?: boolean;
}

export interface GasCylinderView {
  group: Group;
  kind: CylinderKind;
  /** Its radius and the height of its valve's outlet, metres (for a pigtail). */
  radius: number;
  outlet: readonly [number, number, number];
  readonly contents: Contents;
  /** Show its contents tag: only a material swapped, and only when it changes. */
  setContents(contents: Contents): void;
}

// ---- What is shared, per kit ---------------------------------------------

const caches = new WeakMap<PanelKit, Map<string, unknown>>();
function shared<T>(kit: PanelKit, key: string, make: () => T): T {
  let cache = caches.get(kit);
  if (!cache) caches.set(kit, (cache = new Map()));
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key) as T;
}

const paint = (
  kit: PanelKit,
  color: string,
  roughness = 0.5,
  metalness = 0,
  double = false,
) =>
  shared(kit, `paint:${color}:${roughness}:${metalness}:${double}`, () => {
    const m = createPs1Material({ color, roughness, metalness });
    if (double) m.side = DoubleSide;
    kit.materials.push(m);
    return m;
  });

const cylGeo = (
  kit: PanelKit,
  rTop: number,
  rBottom: number,
  h: number,
  segments = 16,
  open = false,
  thetaStart = 0,
  thetaLength = Math.PI * 2,
) =>
  shared(
    kit,
    `cyl:${rTop}:${rBottom}:${h}:${segments}:${open}:${thetaStart}:${thetaLength}`,
    () =>
      new CylinderGeometry(
        rTop,
        rBottom,
        h,
        segments,
        1,
        open,
        thetaStart,
        thetaLength,
      ),
  );

const lathe = (kit: PanelKit, key: string, points: [number, number][]) =>
  shared(
    kit,
    `lathe:${key}`,
    () =>
      new LatheGeometry(
        points.map(([r, y]) => new Vector2(r, y)),
        24,
      ),
  );

/** A material printed once on a canvas, `pw` × `ph` pixels. */
const printed = (
  kit: PanelKit,
  key: string,
  pw: number,
  ph: number,
  draw: (c: CanvasRenderingContext2D, w: number, h: number) => void,
) =>
  shared(kit, `print:${key}`, () => {
    const { context, texture } = createCanvasTexture(pw, ph);
    draw(context, pw, ph);
    texture.needsUpdate = true;
    kit.textures.push(texture);
    const m = createPs1Material({ map: texture, roughness: 0.6 });
    kit.materials.push(m);
    return m;
  });

const add = (
  parent: Group,
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

const FONT = '"Helvetica Neue", Arial, sans-serif';

// ---- The ADR diamonds ----------------------------------------------------

function diamondPath(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  h: number,
) {
  c.beginPath();
  c.moveTo(x, y - h);
  c.lineTo(x + h, y);
  c.lineTo(x, y + h);
  c.lineTo(x - h, y);
  c.closePath();
}

/** A flame, its base at (x, y), `u` a twentieth of the diamond. */
function flame(c: CanvasRenderingContext2D, x: number, y: number, u: number) {
  c.beginPath();
  c.moveTo(x - 3.2 * u, y);
  c.bezierCurveTo(
    x - 4.5 * u,
    y - 3 * u,
    x - 2 * u,
    y - 4 * u,
    x - 1.6 * u,
    y - 7.5 * u,
  );
  c.bezierCurveTo(
    x - 0.4 * u,
    y - 5 * u,
    x + 0.6 * u,
    y - 5 * u,
    x + 0.4 * u,
    y - 8.5 * u,
  );
  c.bezierCurveTo(x + 3 * u, y - 6 * u, x + 4.4 * u, y - 3 * u, x + 3.2 * u, y);
  c.closePath();
  c.fill();
  c.fillRect(x - 4 * u, y + 0.3 * u, 8 * u, 0.9 * u);
}

/**
 * An ADR danger label, centred at (x, y), `s` corner to corner: 2.1 red
 * with a black flame, 2.2 green with a white cylinder, 2.3 white with a
 * skull, 5.1 yellow with a flame over a circle, 8 the corrosive's
 * (`drawClass8`); its class number in its lower corner.
 */
export function drawAdrLabel(
  c: CanvasRenderingContext2D,
  label: AdrLabel,
  x: number,
  y: number,
  s: number,
) {
  if (label === '8') return drawClass8(c, x, y, s);
  const h = s / 2;
  const u = s / 20;
  const ground = {
    '2.1': '#d2201c',
    '2.2': '#139a48',
    '2.3': '#ffffff',
    '5.1': '#f6d21a',
  }[label];
  const ink = label === '2.2' ? '#ffffff' : '#111111';
  c.save();
  diamondPath(c, x, y, h);
  c.fillStyle = ground;
  c.fill();
  c.lineWidth = s * 0.012;
  diamondPath(c, x, y, h - s * 0.045);
  c.strokeStyle = ink;
  c.stroke();
  c.fillStyle = ink;
  if (label === '2.1') flame(c, x, y - 0.5 * u, u);
  else if (label === '5.1') {
    flame(c, x, y - 2.6 * u, u * 0.8);
    c.beginPath();
    c.arc(x, y - 0.4 * u, 1.9 * u, 0, Math.PI * 2);
    c.fill();
  } else if (label === '2.2') {
    // A gas cylinder, lying.
    c.fillRect(x - 4.5 * u, y - 3.2 * u, 7 * u, 2.6 * u);
    c.beginPath();
    c.arc(x - 4.5 * u, y - 1.9 * u, 1.3 * u, Math.PI / 2, (Math.PI * 3) / 2);
    c.fill();
    c.fillRect(x + 2.5 * u, y - 2.5 * u, 1.5 * u, 1.2 * u);
    c.fillRect(x + 4 * u, y - 2.8 * u, 0.6 * u, 1.8 * u);
  } else {
    // A skull and crossbones.
    c.beginPath();
    c.arc(x, y - 4.6 * u, 2.4 * u, 0, Math.PI * 2);
    c.fill();
    c.fillRect(x - 1.4 * u, y - 3.2 * u, 2.8 * u, 2.2 * u);
    c.fillStyle = ground;
    for (const dx of [-0.9, 0.9]) {
      c.beginPath();
      c.arc(x + dx * u, y - 4.7 * u, 0.7 * u, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = ink;
    c.lineWidth = 0.9 * u;
    c.strokeStyle = ink;
    c.beginPath();
    c.moveTo(x - 3.5 * u, y - 1.5 * u);
    c.lineTo(x + 3.5 * u, y + 0.5 * u);
    c.moveTo(x + 3.5 * u, y - 1.5 * u);
    c.lineTo(x - 3.5 * u, y + 0.5 * u);
    c.stroke();
  }
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.font = `700 ${s * 0.15}px ${FONT}`;
  c.fillText(label === '5.1' ? '5.1' : '2', x, y + s * 0.32);
  c.restore();
}

// ---- The labels ------------------------------------------------------------

/** Lines of text fitted to `maxWidth`, broken at spaces. */
function wrap(c: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const out: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (line && c.measureText(next).width > maxWidth) {
      out.push(line);
      line = word;
    } else line = next;
  }
  if (line) out.push(line);
  return out;
}

/**
 * The BS EN ISO 7225 shoulder label, one per gas: on white, the gas's
 * name and formula, its UN number, its ADR diamonds to the right, its
 * hazard statements, and the supplier's band along its foot.
 */
function shoulderLabel(kit: PanelKit, gas: GasKind) {
  return printed(kit, `label:${gas.id}`, 512, 384, (c, w, h) => {
    c.fillStyle = '#f6f5ef';
    c.fillRect(0, 0, w, h);
    const n = gas.adr.length;
    const s = n > 1 ? 120 : 150;
    // Its diamonds down its right-hand side, staggered when there are three.
    gas.adr.forEach((label, i) => {
      if (n > 2)
        drawAdrLabel(c, label, w - 60 - (i % 2) * 72, 62 + i * 80, 104);
      else
        drawAdrLabel(c, label, w - s / 2 - 12, n > 1 ? 70 + i * 128 : 120, s);
    });
    const text = w - (n > 2 ? 190 : s + 30);
    c.fillStyle = '#111111';
    c.textAlign = 'left';
    c.textBaseline = 'alphabetic';
    let size = 54;
    c.font = `800 ${size}px ${FONT}`;
    while (c.measureText(gas.name).width > text - 20 && size > 26)
      c.font = `800 ${(size -= 2)}px ${FONT}`;
    c.fillText(gas.name, 16, 62);
    c.font = `700 30px ${FONT}`;
    c.fillText(`${gas.formula}   UN ${gas.un}`, 16, 104);
    c.font = `500 19px ${FONT}`;
    let y = 140;
    for (const statement of gas.hazards)
      for (const line of wrap(c, statement, text - 24)) {
        if (y > h - 70) break;
        c.fillText(line, 16, y);
        y += 23;
      }
    // The supplier's band.
    c.fillStyle = '#1f5f8b';
    c.fillRect(0, h - 56, w, 56);
    c.fillStyle = '#f6f5ef';
    c.font = `800 30px ${FONT}`;
    c.fillText('ARNCLIFFE GASES', 16, h - 18);
    c.font = `500 16px ${FONT}`;
    c.textAlign = 'right';
    c.fillText('24 h: 01632 960 333', w - 14, h - 20);
  });
}

/** The supplier's collar label round the neck, one per kind: its name, contents and product code, twice round. */
function collarLabel(kit: PanelKit, k: CylinderKind) {
  return printed(kit, `collar:${k.key}`, 512, 64, (c, w, h) => {
    c.fillStyle = '#f2f2ee';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#1f5f8b';
    c.fillRect(0, 0, w, 10);
    c.fillRect(0, h - 10, w, 10);
    c.fillStyle = '#14181b';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `700 22px ${FONT}`;
    const text = `${k.gas.formula} ${contentsText(k)} · ${k.size.id}`;
    c.fillText(text, w / 4, h / 2);
    c.fillText(`ARNCLIFFE · ${text}`, (w * 3) / 4, h / 2);
  });
}

/** The marks stamped in the shoulder: dark letters on its paint. */
function stampBand(kit: PanelKit, k: CylinderKind, ground: string) {
  return printed(kit, `stamp:${k.key}`, 512, 64, (c, w, h) => {
    c.fillStyle = ground;
    c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(0,0,0,0.35)';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#b8b8b0';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `600 19px "Courier New", monospace`;
    stampLines(k).forEach((line, i) =>
      c.fillText(line, w / 2, h * (0.3 + i * 0.42)),
    );
  });
}

/** A contents tag: FULL green, IN USE yellow, EMPTY red, both faces. */
const contentsTag = (kit: PanelKit, contents: Contents) =>
  printed(kit, `tag:${contents}`, 96, 160, (c, w, h) => {
    const k = CONTENTS_COLOURS[contents];
    c.fillStyle = k.ground;
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#f2f2ee';
    c.beginPath();
    c.arc(w / 2, 16, 7, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = k.ink;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `800 ${contents === 'in-use' ? 24 : 26}px ${FONT}`;
    c.save();
    c.translate(w / 2, h * 0.6);
    c.rotate(-Math.PI / 2);
    c.fillText(CONTENTS_WORDS[contents], 0, 0);
    c.restore();
  });

/** Its test tag: when its next periodic test is due. */
const testTag = (kit: PanelKit, k: CylinderKind) =>
  printed(kit, `test:${k.key}`, 96, 96, (c, w, h) => {
    c.fillStyle = '#f2f2ee';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = '#1f5f8b';
    c.lineWidth = 6;
    c.strokeRect(3, 3, w - 6, h - 6);
    c.fillStyle = '#14181b';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `700 15px ${FONT}`;
    c.fillText('TEST DUE', w / 2, h * 0.32);
    c.font = `800 22px ${FONT}`;
    c.fillText(testDates(k).due, w / 2, h * 0.64);
  });

// ---- The builder -----------------------------------------------------------

export function createGasCylinder(
  kit: PanelKit,
  spec: GasCylinderSpec,
): GasCylinderView {
  const k = cylinderKind(spec.gas, spec.size);
  const { gas, size } = k;
  const g = new Group();
  const r = size.dia / 2;
  const body = paint(kit, gas.body, 0.5, 0.2);
  const shoulderPaint = paint(kit, gas.shoulder.hex, 0.5, 0.2);
  const brass = paint(kit, '#b08d45', 0.35, 0.8);
  const steel = paint(kit, '#8d9396', 0.45, 0.6, true);
  const dark = paint(kit, '#1b1b1c', 0.7);
  /** The valve's scale: a 2 l cylinder's is smaller. */
  const vs = Math.min(1, Math.max(0.6, size.dia / 0.2));
  let top: number;
  /** Where the tags hang: their middle's height, how far forward, and how far their tops lean back to lie on the shoulder. */
  let tagAt: [number, number, number];
  let outlet: [number, number, number];

  if (size.build === 'seamless') {
    const p = seamlessProfile(size);
    top = p.top;
    add(g, lathe(kit, `body:${size.id}`, p.body), body);
    add(g, lathe(kit, `shoulder:${size.id}`, p.shoulder), shoulderPaint);
    // The foot ring: a pressed steel skirt the domed foot stands in.
    add(
      g,
      cylGeo(kit, r * 1.005, r * 1.01, 0.08, 24, true),
      paint(kit, '#3a3b3c', 0.6, 0.4, true),
      0,
      0.04,
      0,
    );
    // The shoulder label, on the body just under the shoulder, facing +z.
    const lh = Math.min(0.2, size.dia * 0.85);
    const arc = 1.7;
    add(
      g,
      cylGeo(kit, r + 0.0015, r + 0.0015, lh, 16, true, -arc / 2, arc),
      shoulderLabel(kit, gas),
      0,
      p.shoulderFrom - lh / 2 - 0.01,
      0,
    );
    // The stamped marks, on the shoulder to the right.
    const dome = p.top - p.shoulderFrom;
    const sy0 = p.shoulderFrom + dome * 0.12;
    const sy1 = p.shoulderFrom + dome * 0.42;
    const rs0 = r * Math.cos(0.12 * (Math.PI / 2)) + 0.002;
    const rs1 = r * Math.cos(0.42 * (Math.PI / 2)) + 0.002;
    add(
      g,
      cylGeo(kit, rs1, rs0, sy1 - sy0, 12, true, 0.9, 1.4),
      stampBand(kit, k, gas.shoulder.hex),
      0,
      (sy0 + sy1) / 2,
      0,
    );
    // The collar label: a plastic disc round the neck, printed round its edge.
    const cr = p.neck * 2.4 * vs + 0.01;
    add(
      g,
      cylGeo(kit, cr, cr, 0.018 * vs, 20),
      [
        collarLabel(kit, k),
        paint(kit, '#f2f2ee', 0.6),
        paint(kit, '#f2f2ee', 0.6),
      ],
      0,
      top - 0.005,
      0,
    );
    // Lying on the shoulder at 30° up its curve, a little off its paint.
    const a = Math.PI / 6;
    const n = Math.hypot(dome * Math.cos(a), r * Math.sin(a));
    tagAt = [
      p.shoulderFrom + dome * Math.sin(a) + (r * Math.sin(a) * 0.006) / n,
      r * Math.cos(a) + (dome * Math.cos(a) * 0.006) / n,
      Math.atan2(r * Math.sin(a), dome * Math.cos(a)),
    ];
  } else {
    const p = weldedProfile(size);
    top = size.h;
    add(g, lathe(kit, `welded:${size.id}`, p.body), body);
    // The foot ring and the shroud: open steel shells in the body's paint.
    const shell = paint(kit, gas.body, 0.5, 0.3, true);
    add(
      g,
      cylGeo(kit, r * 0.9, r * 0.93, p.foot, 24, true),
      shell,
      0,
      p.foot / 2,
      0,
    );
    const sr = r * 0.72;
    add(
      g,
      cylGeo(kit, sr, sr * 1.04, p.shroud, 24, true),
      shell,
      0,
      top - p.shroud / 2,
      0,
    );
    // Its hand-holds, and the tare stamped in the shroud's front.
    // (dark slots cut through either side, curved with it).
    for (const a of [Math.PI / 2, -Math.PI / 2])
      add(
        g,
        cylGeo(
          kit,
          sr + 0.002,
          sr * 1.01 + 0.002,
          p.shroud * 0.28,
          8,
          true,
          a - 0.4,
          0.8,
        ),
        dark,
        0,
        top - p.shroud * 0.3,
        0,
      );
    add(
      g,
      cylGeo(
        kit,
        sr * 1.03 + 0.002,
        sr * 1.03 + 0.002,
        p.shroud * 0.32,
        12,
        true,
        0.5,
        1.5,
      ),
      stampBand(kit, k, gas.body),
      0,
      top - p.shroud * 0.68,
      0,
    );
    // The label on the body's front.
    const lh = Math.min(0.22, (p.domeTop - p.foot) * 0.45);
    add(
      g,
      cylGeo(kit, r + 0.0015, r + 0.0015, lh, 16, true, -0.85, 1.7),
      shoulderLabel(kit, gas),
      0,
      (p.domeTop + p.foot) / 2 + lh * 0.1,
      0,
    );
    tagAt = [top - p.shroud * 0.55, sr * 1.04 + 0.006, 0];
    // The valve sits down inside the shroud.
    top = p.domeTop;
  }

  // ---- The valve ------------------------------------------------------------
  const vh = 0.075 * vs;
  const vr = 0.022 * vs;
  add(g, cylGeo(kit, vr, vr * 1.1, vh, 12), brass, 0, top + vh / 2, 0);
  // The outlet, to +x, its nut notched when its thread is left-hand.
  const oy = top + vh * 0.45;
  const ol = 0.045 * vs;
  add(
    g,
    cylGeo(kit, vr * 0.5, vr * 0.5, ol, 10),
    brass,
    vr + ol / 2 - 0.004,
    oy,
    0,
  ).rotation.z = Math.PI / 2;
  const nut = add(
    g,
    cylGeo(kit, vr * 0.75, vr * 0.75, ol * 0.35, 6),
    brass,
    vr + ol * 0.8,
    oy,
    0,
  );
  nut.rotation.z = Math.PI / 2;
  if (gas.thread.hand === 'left')
    add(
      g,
      cylGeo(kit, vr * 0.77, vr * 0.77, ol * 0.08, 6),
      dark,
      vr + ol * 0.8,
      oy,
      0,
    ).rotation.z = Math.PI / 2;
  // The residual pressure valve: a stepped body in the outlet.
  if (gas.rpv)
    add(
      g,
      cylGeo(kit, vr * 0.62, vr * 0.62, ol * 0.3, 10),
      paint(kit, '#c9a95a', 0.35, 0.8),
      vr + ol * 0.35,
      oy,
      0,
    ).rotation.z = Math.PI / 2;
  // The bursting disc's plug, opposite.
  add(
    g,
    cylGeo(kit, vr * 0.4, vr * 0.4, 0.012, 6),
    brass,
    -vr - 0.004,
    oy,
    0,
  ).rotation.z = Math.PI / 2;
  // The spindle: a handwheel, or a square for a key.
  const sy = top + vh + 0.012 * vs;
  if (gas.spindle === 'handwheel') {
    add(g, cylGeo(kit, 0.004, 0.004, 0.02 * vs, 6), brass, 0, sy - 0.006, 0);
    const wheel = add(
      g,
      shared(
        kit,
        `wheel:${vs}`,
        () => new TorusGeometry(0.03 * vs, 0.0045 * vs, 6, 16),
      ),
      paint(kit, '#202020', 0.6),
      0,
      sy,
      0,
    );
    wheel.rotation.x = Math.PI / 2;
    add(
      g,
      cylGeo(kit, 0.008 * vs, 0.008 * vs, 0.008, 8),
      paint(kit, '#202020', 0.6),
      0,
      sy,
      0,
    );
  } else
    add(
      g,
      shared(
        kit,
        `square:${vs}`,
        () => new CylinderGeometry(0.009 * vs, 0.009 * vs, 0.022 * vs, 4),
      ),
      steel,
      0,
      sy,
      0,
    );
  outlet = [vr + ol, oy, 0];

  // ---- Its guard ------------------------------------------------------------
  if (gas.guard === 'tulip' && size.dia >= 0.14) {
    // An open guard round the valve, screwed to the neck ring, its top open
    // for the hand to the wheel; a gap at the outlet's side.
    const gr = 0.06 * vs;
    const gh = vh + 0.04 * vs;
    add(
      g,
      cylGeo(kit, gr * 1.12, gr, gh, 20, true, 0.55, Math.PI * 2 - 1.1),
      steel,
      0,
      top + gh / 2,
      0,
    );
  } else if (gas.guard === 'cap') {
    // A screwed cap over the valve: a ventilated steel bell.
    const cr = 0.05 * vs;
    const ch = vh + 0.05 * vs;
    const capPaint = paint(kit, '#5d6164', 0.5, 0.5);
    add(g, cylGeo(kit, cr, cr, ch, 16), capPaint, 0, top + ch / 2, 0);
    add(
      g,
      shared(
        kit,
        `cap:${cr}`,
        () => new SphereGeometry(cr, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2),
      ),
      capPaint,
      0,
      top + ch,
      0,
    );
    outlet = [0, top + ch, 0];
  }

  // ---- Its tags, hung from its neck -------------------------------------
  let contents: Contents = spec.contents ?? 'full';
  const ts = Math.min(1, vs * 1.1);
  const tagMesh =
    spec.tags === false
      ? null
      : add(
          g,
          shared(
            kit,
            `tagPlane:${ts}`,
            () => new PlaneGeometry(0.045 * ts, 0.075 * ts),
          ),
          contentsTag(kit, contents),
          -0.018 * ts,
          tagAt[0],
          tagAt[1],
        );
  if (tagMesh) {
    tagMesh.rotation.x = -tagAt[2];
    const test = add(
      g,
      shared(
        kit,
        `testPlane:${ts}`,
        () => new PlaneGeometry(0.032 * ts, 0.032 * ts),
      ),
      testTag(kit, k),
      0.022 * ts,
      tagAt[0],
      tagAt[1] + 0.001,
    );
    test.rotation.x = -tagAt[2];
  }

  g.name = cylinderName(k);
  markComponent(g, { name: g.name, status: () => cylinderStatus(k, contents) });
  return {
    group: g,
    kind: k,
    radius: r,
    outlet,
    get contents() {
      return contents;
    },
    setContents(next) {
      if (next === contents) return;
      contents = next;
      if (tagMesh) tagMesh.material = contentsTag(kit, next);
    },
  };
}

/**
 * A cylinder trolley (after the twin-cylinder welding trolleys suppliers
 * sell): a tubular steel frame on two wheels and a nose wheel, a cradle
 * the cylinders lie in, its handle up at the back. Origin on the floor at
 * its middle; it is 1.5 m long along x.
 */
export function createCylinderTrolley(kit: PanelKit) {
  const g = new Group();
  g.name = 'Cylinder trolley';
  const frame = paint(kit, '#d64a1c', 0.5, 0.3);
  const rubber = paint(kit, '#1b1b1c', 0.8);
  const rod = (
    x0: number,
    y0: number,
    z0: number,
    x1: number,
    y1: number,
    z1: number,
  ) => {
    const len = Math.hypot(x1 - x0, y1 - y0, z1 - z0);
    const m = add(
      g,
      cylGeo(kit, 0.012, 0.012, 1, 8),
      frame,
      (x0 + x1) / 2,
      (y0 + y1) / 2,
      (z0 + z1) / 2,
    );
    m.scale.y = len;
    m.lookAt(m.position.clone().set(x1, y1, z1));
    m.rotateX(Math.PI / 2);
    return m;
  };
  for (const z of [-0.2, 0.2]) {
    rod(-0.75, 0.2, z, 0.65, 0.2, z);
    rod(0.65, 0.2, z, 0.85, 0.95, z);
    for (const x of [-0.55, -0.05, 0.45]) rod(x, 0.2, z, x, 0.3, z);
  }
  for (const x of [-0.75, -0.3, 0.2, 0.65]) rod(x, 0.2, -0.2, x, 0.2, 0.2);
  rod(0.85, 0.95, -0.2, 0.85, 0.95, 0.2);
  // Its wheels: two at the handle's end, one under the nose.
  for (const z of [-0.27, 0.27]) {
    const w = add(g, cylGeo(kit, 0.15, 0.15, 0.06, 18), rubber, 0.5, 0.15, z);
    w.rotation.x = Math.PI / 2;
  }
  add(g, cylGeo(kit, 0.05, 0.05, 0.05, 12), rubber, -0.7, 0.05, 0).rotation.x =
    Math.PI / 2;
  rod(-0.7, 0.05, 0, -0.7, 0.2, 0);
  return g;
}
