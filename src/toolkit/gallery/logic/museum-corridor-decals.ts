import {
  CORRIDOR,
  LAYOUT_CORRIDORS,
  WINDOW_SILL,
  innerLegs,
} from './museum-layout';

/**
 * The artwork on the museum's corridor walls (the owner, 2026-10-31;
 * `resources/images/museum_decals/PROMPTS.md`): two pieces in each of the
 * ten corridors, themed on the halls it joins (corridor n joins Hall n to
 * Hall n + 1, the tenth Hall 9 to Hall 0). The rectangular pictures hang
 * framed, each at least A0 (its shorter side 841 mm at least); the
 * irregular cut-outs are PVC vinyl stuck flat to the wall, about 0.5 to
 * 1.0 m. All at eye level, well below the windows' sills, clear of the
 * archways at the corridor's mouths and of its corner.
 *
 * Each piece is placed on one leg of its corridor's L (leg 0 from Hall n's
 * doorway to the corner, leg 1 from Hall n + 1's), on the wall on the
 * turn's outside or its inside, its middle `at` metres from that leg's
 * mouth; within the leg's inside run (`innerLegs`), the length both its
 * walls share. Pure.
 */

/** A0's shorter side, m: a framed picture's least. */
export const A0_SHORT = 0.841;
/** A framed picture's image, its shorter side, m (above A0's). */
export const FRAMED_SHORT = 0.86;
/** Round a framed image: the mount's margin and the frame's moulding, m. */
export const FRAME = { mount: 0.08, moulding: 0.045, depth: 0.035 } as const;
/** A vinyl's longest side, m, unless it says otherwise. */
export const VINYL_LONG = 0.9;
/** Eye level: a piece's middle, m. */
export const EYE_LEVEL = 1.55;
/** Clear of the archway at a leg's mouth and of the corner at its end, m. */
export const MOUTH_CLEAR = 0.6;
export const CORNER_CLEAR = 0.3;

export type DecalKind = 'framed' | 'vinyl';
export type WallSide = 'outer' | 'inner';

/** A piece of artwork and where it hangs. */
export interface CorridorDecal {
  /** Its file in `resources/images/museum_decals/game/`, without `.webp`. */
  file: string;
  kind: DecalKind;
  /** The corridor: n joins Hall n to Hall n + 1 (mod 10). */
  corridor: number;
  leg: 0 | 1;
  side: WallSide;
  /** Its middle from the leg's mouth, along the wall, m. */
  at: number;
  /** Its middle's height, m. */
  y: number;
  /** Its image's size on the wall, m (a framed one's frame is larger: `outerSize`). */
  width: number;
  height: number;
}

/** Each image's pixel size (the game copies'), for its aspect. */
const PIXELS: Record<string, readonly [number, number]> = {
  'c01-1-victorian-baths': [1536, 1024],
  'c01-2-boiler-cutaway': [1024, 571],
  'c12-1-plate-heat-exchanger': [1024, 549],
  'c12-2-sand-filter': [655, 1024],
  'c23-1-uv-reactor': [1024, 459],
  'c23-2-balance-tank': [1024, 580],
  'c34-1-test-kit': [1024, 776],
  'c34-2-dosing-pump': [689, 1024],
  'c45-1-secchi-disc': [665, 1024],
  'c45-2-exploded-skimmer': [426, 1024],
  'c56-1-below-the-waterline': [1536, 1024],
  'c56-2-centrifugal-pump': [1024, 668],
  'c67-1-split-case-pump': [1024, 560],
  'c67-2-waterproofing-layers': [1024, 837],
  'c78-1-tiling-tools': [1024, 632],
  'c78-2-overflow-grating': [1024, 692],
  'c89-1-pipe-colour-chart': [1024, 1536],
  'c89-2-valve-specimens': [1024, 1536],
  'c90-1-pool-architectural': [1536, 1024],
  'c90-2a-pump': [1024, 757],
  'c90-2b-filter': [512, 1024],
  'c90-2c-strainer': [961, 1024],
  'c90-2d-valve': [762, 1024],
};

/** A leg's inside run, m: the stretch of wall both its sides share, mouth to corner. */
export function legRun(corridor: number, leg: 0 | 1): number {
  return innerLegs(LAYOUT_CORRIDORS[corridor].path)[leg];
}

function sized(file: string, kind: DecalKind, long = VINYL_LONG) {
  const [w, h] = PIXELS[file];
  if (kind === 'framed') {
    const k = FRAMED_SHORT / Math.min(w, h);
    return { width: w * k, height: h * k };
  }
  const k = long / Math.max(w, h);
  return { width: w * k, height: h * k };
}

/** A piece: its file, kind, leg, wall, its place in a row of `ROW` along the leg (alone, the middle), and a vinyl's longest side. */
type Spec = [
  file: string,
  kind: DecalKind,
  leg: 0 | 1,
  side: WallSide,
  slot?: number,
  long?: number,
];
/** A row's places, evenly over the leg's run clear of its ends. */
const ROW = 4;

/** Per corridor, its pieces: the first by Hall n's end, the second by Hall n + 1's. */
const SPECS: Spec[][] = [
  [
    ['c01-1-victorian-baths', 'framed', 0, 'outer'],
    ['c01-2-boiler-cutaway', 'vinyl', 1, 'outer', undefined, 1.0],
  ],
  [
    ['c12-1-plate-heat-exchanger', 'vinyl', 0, 'outer', undefined, 1.0],
    ['c12-2-sand-filter', 'vinyl', 1, 'outer'],
  ],
  [
    ['c23-1-uv-reactor', 'vinyl', 0, 'outer', undefined, 1.0],
    ['c23-2-balance-tank', 'vinyl', 1, 'outer', undefined, 1.0],
  ],
  [
    ['c34-1-test-kit', 'vinyl', 0, 'outer', undefined, 0.8],
    ['c34-2-dosing-pump', 'vinyl', 1, 'outer'],
  ],
  [
    ['c45-1-secchi-disc', 'vinyl', 0, 'outer', undefined, 0.8],
    ['c45-2-exploded-skimmer', 'vinyl', 1, 'outer', undefined, 1.0],
  ],
  [
    ['c56-1-below-the-waterline', 'framed', 0, 'outer'],
    ['c56-2-centrifugal-pump', 'vinyl', 1, 'outer', undefined, 1.0],
  ],
  [
    ['c67-1-split-case-pump', 'vinyl', 0, 'outer', undefined, 1.0],
    ['c67-2-waterproofing-layers', 'vinyl', 1, 'outer'],
  ],
  [
    ['c78-1-tiling-tools', 'vinyl', 0, 'outer', undefined, 0.9],
    ['c78-2-overflow-grating', 'vinyl', 1, 'outer', undefined, 1.0],
  ],
  [
    ['c89-1-pipe-colour-chart', 'framed', 0, 'outer'],
    ['c89-2-valve-specimens', 'framed', 1, 'outer'],
  ],
  [
    ['c90-1-pool-architectural', 'framed', 0, 'outer'],
    // The four parts of a pool, a row of stickers along the other leg.
    ['c90-2a-pump', 'vinyl', 1, 'outer', 0, 0.7],
    ['c90-2b-filter', 'vinyl', 1, 'outer', 1, 0.7],
    ['c90-2c-strainer', 'vinyl', 1, 'outer', 2, 0.65],
    ['c90-2d-valve', 'vinyl', 1, 'outer', 3, 0.7],
  ],
];

function rowAt(run: number, slot: number | undefined): number {
  if (slot === undefined) return run / 2;
  const from = MOUTH_CLEAR + 0.1;
  const span = run - CORNER_CLEAR - 0.1 - from;
  return from + ((slot + 0.5) * span) / ROW;
}

/** Every piece, as it hangs. */
export const CORRIDOR_DECALS: readonly CorridorDecal[] = SPECS.flatMap(
  (specs, corridor) =>
    specs.map(([file, kind, leg, side, slot, long]) => ({
      file,
      kind,
      corridor,
      leg,
      side,
      at: rowAt(legRun(corridor, leg), slot),
      y: EYE_LEVEL + (kind === 'framed' ? 0.05 : 0),
      ...sized(file, kind, long),
    })),
);

/** What a piece covers on the wall, m: a framed one's frame, a vinyl's image. */
export function outerSize(d: CorridorDecal): { width: number; height: number } {
  const e = d.kind === 'framed' ? 2 * (FRAME.mount + FRAME.moulding) : 0;
  return { width: d.width + e, height: d.height + e };
}

type P = { x: number; z: number };

/**
 * A piece's place in whatever plan its corridor's path is given in, the
 * path from Hall n's doorway to the corner and on to Hall n + 1's: its
 * middle on the wall's face, and the way into the corridor from it.
 */
export function decalPose(
  path: readonly [P, P, P],
  d: CorridorDecal,
): { x: number; y: number; z: number; into: readonly [number, number] } {
  const [a, c, b] = path;
  const unit = (p: P, q: P) => {
    const dx = q.x - p.x;
    const dz = q.z - p.z;
    const l = Math.hypot(dx, dz);
    return [dx / l, dz / l] as const;
  };
  const u1 = unit(a, c);
  const u2 = unit(c, b);
  // Leg 0 from a towards the corner, its turn's inside towards u2; leg 1
  // from b back towards the corner, its turn's inside back towards a.
  const [mouth, dir, inward] =
    d.leg === 0
      ? [a, u1, u2]
      : [b, [-u2[0], -u2[1]] as const, [-u1[0], -u1[1]] as const];
  const s = d.side === 'inner' ? 1 : -1;
  const half = CORRIDOR.width / 2;
  return {
    x: mouth.x + dir[0] * d.at + inward[0] * s * half,
    y: d.y,
    z: mouth.z + dir[1] * d.at + inward[1] * s * half,
    into: [-inward[0] * s + 0, -inward[1] * s + 0],
  };
}

/** The checks the tests make, for any list: inside its wall, at eye level, apart, frames at least A0. */
export function decalProblems(list: readonly CorridorDecal[]): string[] {
  const out: string[] = [];
  for (const d of list) {
    const { width, height } = outerSize(d);
    const run = legRun(d.corridor, d.leg);
    if (d.at - width / 2 < MOUTH_CLEAR)
      out.push(`${d.file}: too near the archway`);
    if (d.at + width / 2 > run - CORNER_CLEAR)
      out.push(`${d.file}: past the corner`);
    if (d.y < 1.5 || d.y > 1.6) out.push(`${d.file}: not at eye level`);
    if (d.y - height / 2 < 0.3) out.push(`${d.file}: too low`);
    if (d.y + height / 2 > WINDOW_SILL - 0.3) out.push(`${d.file}: too high`);
    if (d.kind === 'framed' && Math.min(d.width, d.height) < A0_SHORT)
      out.push(`${d.file}: smaller than A0`);
    if (
      d.kind === 'vinyl' &&
      (Math.max(d.width, d.height) < 0.5 || Math.max(d.width, d.height) > 1.0)
    )
      out.push(`${d.file}: not 0.5 to 1.0 m`);
  }
  list.forEach((p, i) =>
    list.slice(i + 1).forEach((q) => {
      if (p.corridor !== q.corridor || p.leg !== q.leg || p.side !== q.side)
        return;
      const a = outerSize(p);
      const b = outerSize(q);
      if (
        Math.abs(p.at - q.at) < (a.width + b.width) / 2 + 0.1 &&
        Math.abs(p.y - q.y) < (a.height + b.height) / 2 + 0.1
      )
        out.push(`${p.file} overlaps ${q.file}`);
    }),
  );
  return out;
}
