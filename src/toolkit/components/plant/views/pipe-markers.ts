import {
  CanvasTexture,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshStandardMaterial,
  SRGBColorSpace,
} from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createEngravedPlate } from '../../core/views/plant-signs';
import { BS1710_BASIC, BS1710_CODE } from './plant-tools';

/**
 * Marking a run of pipework, as a plant room's is (BS 1710): bands of its
 * service's basic colour, with its code band between two of them, near
 * each end and every so often along it, and a printed label with an
 * arrow the way it flows on its longest length: hung beneath it on an
 * engraved plate, or stencilled onto the pipe itself, where runs are
 * packed too close for plates. Drawn round the pipe's outside, its
 * insulation included.
 */

export type Vec3 = readonly [number, number, number];

export type PipeService =
  | 'pool water'
  | 'heating flow'
  | 'heating return'
  | 'drainage'
  | 'air'
  | 'electrical'
  | 'hypochlorite'
  | 'acid'
  | 'gas';

/** Each service's basic colour and code band. */
const COLOURS: Record<PipeService, { basic: string; code: string | null }> = {
  'pool water': { basic: BS1710_BASIC.water, code: null },
  'heating flow': { basic: BS1710_BASIC.water, code: BS1710_CODE.crimson },
  'heating return': { basic: BS1710_BASIC.water, code: BS1710_CODE.crimson },
  drainage: { basic: BS1710_BASIC.otherFluids, code: null },
  air: { basic: BS1710_BASIC.air, code: null },
  electrical: { basic: BS1710_BASIC.electrical, code: null },
  hypochlorite: { basic: BS1710_BASIC.acidsAlkalis, code: null },
  acid: { basic: BS1710_BASIC.acidsAlkalis, code: BS1710_CODE.yellow },
  gas: { basic: BS1710_BASIC.gases, code: null },
};

/** Bands this far in from each end, and at most this far apart, metres. */
const FROM_END = 0.4;
const EVERY = 4;

/**
 * Lettering sprayed through a stencil onto a pipe: its service's name and
 * an arrow the way it flows, twice round, so it reads from either side.
 * Its axis is y, as a cylinder's; `direction` is the flow's along +y.
 */
export function createPipeStencil(
  kit: PanelKit,
  text: string,
  {
    radius,
    direction,
    ink = '#1b1d1e',
  }: { radius: number; direction: 1 | -1; ink?: string },
) {
  const r = radius + 0.0015;
  const around = 2 * Math.PI * r;
  // Letters about a sixth of the way round, at most 40 mm high; the canvas
  // at one scale both ways, round the pipe (across) and along it (down).
  const tall = Math.min(0.04, around * 0.16);
  const px = 512;
  const size = (tall / around) * px;
  const font = `bold ${size}px "Arial Narrow", "Helvetica Neue", Arial, sans-serif`;
  const canvas = document.createElement('canvas');
  const c = canvas.getContext('2d');
  if (!c) throw new Error('No 2D canvas context.');
  c.font = font;
  const textW = c.measureText(text).width;
  const gap = size * 0.5;
  const arrowL = size * 1.6;
  const whole = textW + gap + arrowL;
  const ph = Math.ceil(whole + size * 2);
  const length = (ph / px) * around;
  canvas.width = px;
  canvas.height = ph;
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  kit.textures.push(texture);
  const material = new MeshStandardMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.4,
    roughness: 0.85,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    side: DoubleSide,
  });
  kit.materials.push(material);
  c.clearRect(0, 0, px, ph);
  // Twice round, each copy upright from its own side: the second turned
  // half a turn from the first, so it reads the other way along the pipe.
  // The arrow after the name where the flow goes the way it reads, before
  // it where it goes the other way.
  for (const [half, turn] of [
    [0, Math.PI / 2],
    [0.5, -Math.PI / 2],
  ] as const) {
    const reads: 1 | -1 = turn < 0 ? 1 : -1;
    const ahead = reads === direction;
    c.save();
    c.translate(px * (half + 0.25), ph / 2);
    c.rotate(turn);
    c.font = font;
    c.fillStyle = ink;
    c.strokeStyle = ink;
    // A sprayed edge, a little soft.
    c.shadowColor = ink;
    c.shadowBlur = size * 0.04;
    c.textBaseline = 'middle';
    c.textAlign = 'left';
    const start = -whole / 2;
    c.fillText(text, ahead ? start : start + arrowL + gap, 0);
    const [from, to] = ahead
      ? [start + textW + gap, start + whole]
      : [start + arrowL, start];
    const sign = Math.sign(to - from);
    c.lineWidth = size * 0.18;
    c.beginPath();
    c.moveTo(from, 0);
    c.lineTo(to - sign * size * 0.3, 0);
    c.stroke();
    c.beginPath();
    c.moveTo(to - sign * size * 0.55, -size * 0.38);
    c.lineTo(to, 0);
    c.lineTo(to - sign * size * 0.55, size * 0.38);
    c.closePath();
    c.fill();
    c.restore();
  }
  texture.needsUpdate = true;
  const mesh = new Mesh(
    new CylinderGeometry(r, r, length, 48, 1, true),
    material,
  );
  mesh.name = `Stencil: ${text}`;
  mesh.raycast = () => {};
  return { mesh, length };
}

/**
 * Bands and a label for a run through `points`: `radius` is its outside
 * radius, insulation included; `text` what its label says ("LTHW FLOW");
 * `flow` whether it flows the way its points go (1) or against them
 * (-1); `lettering` its label on a plate hung beneath it, or stencilled
 * onto it, in `ink`.
 */
export function markPipe(
  kit: PanelKit,
  points: readonly Vec3[],
  {
    radius,
    service,
    text,
    flow = 1,
    lettering = 'plate',
    ink,
  }: {
    radius: number;
    service: PipeService;
    text: string;
    flow?: 1 | -1;
    lettering?: 'plate' | 'stencil';
    ink?: string;
  },
) {
  const group = new Group();
  group.name = `${text} markings`;
  const { basic, code } = COLOURS[service];
  const paint = (color: string) => {
    const m = new MeshStandardMaterial({ color, roughness: 0.6 });
    kit.materials.push(m);
    return m;
  };
  const basicPaint = paint(basic);
  const codePaint = code ? paint(code) : null;
  const r = radius + 0.003;
  /** A set of bands round the pipe at `at`, along `dir`. */
  const bands = (at: Vec3, dir: Vec3) => {
    const set = codePaint
      ? [
          { m: basicPaint, w: 0.1, off: -0.1 },
          { m: codePaint, w: 0.05, off: 0 },
          { m: basicPaint, w: 0.1, off: 0.1 },
        ]
      : [{ m: basicPaint, w: 0.15, off: 0 }];
    for (const b of set) {
      const mesh = new Mesh(new CylinderGeometry(r, r, b.w, 20), b.m);
      mesh.position.set(
        at[0] + dir[0] * b.off,
        at[1] + dir[1] * b.off,
        at[2] + dir[2] * b.off,
      );
      if (Math.abs(dir[0]) > 0.5) mesh.rotation.z = Math.PI / 2;
      if (Math.abs(dir[2]) > 0.5) mesh.rotation.x = Math.PI / 2;
      group.add(mesh);
    }
  };
  let longest = { length: 0, a: points[0], dir: [1, 0, 0] as Vec3 };
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const length = Math.hypot(d[0], d[1], d[2]);
    if (length < 2 * FROM_END + 0.3) continue;
    const dir = d.map((v) => v / length) as unknown as Vec3;
    const n = Math.max(1, Math.ceil((length - 2 * FROM_END) / EVERY));
    for (let k = 0; k <= n; k++) {
      const s = FROM_END + ((length - 2 * FROM_END) * k) / n;
      bands([a[0] + dir[0] * s, a[1] + dir[1] * s, a[2] + dir[2] * s], dir);
    }
    if (dir[1] === 0 && length > longest.length) longest = { length, a, dir };
  }
  // The label on the longest level length, an arrow the way the run
  // flows: stencilled on, between its first bands, or hung from its side.
  if (longest.length > 0 && lettering === 'stencil') {
    const { length } = longest;
    const dir = longest.dir.map((v) => v * flow) as unknown as Vec3;
    const alongX = Math.abs(dir[0]) > 0.5;
    // A cylinder's +y, laid along x by a quarter turn about z, points -x;
    // about x, +z.
    const direction: 1 | -1 = alongX
      ? dir[0] > 0
        ? -1
        : 1
      : dir[2] > 0
        ? 1
        : -1;
    const { mesh } = createPipeStencil(kit, text, {
      radius: r,
      direction,
      ink,
    });
    const n = Math.max(1, Math.ceil((length - 2 * FROM_END) / EVERY));
    const s =
      length < 2 * FROM_END + 0.3
        ? length / 2
        : FROM_END + (length - 2 * FROM_END) * (0.5 / n);
    const at = longest.a;
    mesh.position.set(
      at[0] + longest.dir[0] * s,
      at[1],
      at[2] + longest.dir[2] * s,
    );
    if (alongX) mesh.rotation.z = Math.PI / 2;
    else mesh.rotation.x = Math.PI / 2;
    group.add(mesh);
  } else if (longest.length > 0) {
    const { a, length } = longest;
    const dir = longest.dir.map((v) => v * flow) as unknown as Vec3;
    const arrow = dir[0] > 0.5 || dir[2] < -0.5 ? '→' : '←';
    const plate = createEngravedPlate(kit, [`${text}  ${arrow}`], {
      colour: 'white',
      width: Math.min(0.6, Math.max(0.3, text.length * 0.035)),
      height: 0.07,
    });
    const s = length / 2;
    plate.position.set(
      a[0] + longest.dir[0] * s,
      a[1] - r - 0.05,
      a[2] + longest.dir[2] * s,
    );
    // Face the side of the run, read along it.
    plate.rotation.y = Math.abs(dir[0]) > 0.5 ? 0 : Math.PI / 2;
    group.add(plate);
    // The far side is read in the opposite direction along the pipe.
    const back = createEngravedPlate(
      kit,
      [`${text}  ${arrow === '→' ? '←' : '→'}`],
      {
        colour: 'white',
        width: Math.min(0.6, Math.max(0.3, text.length * 0.035)),
        height: 0.07,
      },
    );
    back.position.copy(plate.position);
    back.rotation.y = plate.rotation.y + Math.PI;
    group.add(back);
  }
  return group;
}
