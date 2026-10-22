import { CylinderGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createEngravedPlate } from '../../core/views/plant-signs';
import { BS1710_BASIC, BS1710_CODE } from './plant-tools';

/**
 * Marking a run of pipework, as a plant room's is (BS 1710): bands of its
 * service's basic colour, with its code band between two of them, near
 * each end and every so often along it, and a printed label with an
 * arrow the way it flows on its longest length. Drawn round the pipe's
 * outside, its insulation included.
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
 * Bands and a label for a run through `points`: `radius` is its outside
 * radius, insulation included; `text` what its label says ("LTHW FLOW").
 */
export function markPipe(
  kit: PanelKit,
  points: readonly Vec3[],
  {
    radius,
    service,
    text,
  }: { radius: number; service: PipeService; text: string },
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
  // The label on the longest level length, hung from its side, an arrow
  // the way the run flows.
  if (longest.length > 0) {
    const { a, dir, length } = longest;
    const arrow = dir[0] > 0.5 || dir[2] < -0.5 ? '→' : '←';
    const plate = createEngravedPlate(kit, [`${text}  ${arrow}`], {
      colour: 'white',
      width: Math.min(0.6, Math.max(0.3, text.length * 0.035)),
      height: 0.07,
    });
    const s = length / 2;
    plate.position.set(a[0] + dir[0] * s, a[1] - r - 0.05, a[2] + dir[2] * s);
    // Face the side of the run, read along it.
    plate.rotation.y = Math.abs(dir[0]) > 0.5 ? 0 : Math.PI / 2;
    group.add(plate);
    // And the same on the far side.
    const back = plate.clone();
    back.rotation.y += Math.PI;
    group.add(back);
  }
  return group;
}
