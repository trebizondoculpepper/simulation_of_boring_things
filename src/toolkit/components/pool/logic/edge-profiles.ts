/**
 * Pool edges through the decades, as cross-sections: how the water meets
 * the deck, and where the surface water (the top few millimetres, where
 * the dirt and grease float) is drawn off to the filters. Pure data.
 *
 * Each profile is drawn in metres across the edge: x from the pool's wall
 * face (0) out under the deck (+), the pool to the left (−); y from the
 * deck's level (0), up. `solid` is the structure (wall, gutter, deck and
 * pool floor) as one outline; `water` the water's outlines (the pool and
 * whatever lies in the gutter); `grating` where a grating spans a channel.
 *
 * - **1940s, roll-out gutter.** The edge itself is the gutter: a rounded
 *   lip at the water line, a trough behind it formed in the coping, and
 *   the deck rising gently beyond, so a swimmer can roll out over it. The
 *   water stands at the lip and spills into the trough.
 * - **1960s, recessed scum trough.** A glazed channel let into the wall a
 *   little below the deck, under an overhanging coping that makes a
 *   handhold: the water stands at the channel's lip, some 240 mm below the
 *   deck, and skims into it. The British public baths' edge for decades.
 * - **1980s, deck-level overflow.** The water is brought up to the deck:
 *   it spills over a tiled nosing, down a short overflow slope and into a
 *   channel under a white ceramic finger grating set just below the deck.
 * - **Contemporary, deck-level grated channel.** The water is flush with
 *   the deck and runs straight over a slim edge tile into a channel at the
 *   pool's edge, under a flush grey polypropylene grating; a contrasting
 *   tile line on the deck marks the edge.
 */

export type Point = readonly [number, number];

export type EdgeStyleId =
  | 'rollout'
  | 'scum-trough'
  | 'deck-overflow'
  | 'grated-channel';

export interface EdgeProfile {
  id: EdgeStyleId;
  era: string;
  name: string;
  /** The water's level, metres from the deck's (negative: below it). */
  waterLevel: number;
  solid: readonly Point[];
  water: readonly (readonly Point[])[];
  grating?: {
    /** Its span across the channel, x from and to. */
    from: number;
    to: number;
    /** Its top's level. */
    top: number;
    /** Bar depth, bar thickness and pitch along the edge, metres. */
    depth: number;
    bar: number;
    pitch: number;
    colour: string;
  };
  /** A strip of contrasting tile on the deck, x from and to. */
  marker?: { from: number; to: number; colour: string };
}

/** How deep the sections are cut, and how far back the deck runs. */
export const SECTION = { depth: 0.75, slab: 0.1, pool: 1.4, deck: 0.9 };

/** The structure below a profile's edge: down the wall, the floor, back. */
function withBody(edge: readonly Point[]): Point[] {
  const { depth, slab, pool, deck } = SECTION;
  return [
    [0, -depth],
    ...edge,
    [deck, 0],
    [deck, -depth - slab],
    [-pool, -depth - slab],
    [-pool, -depth],
  ];
}

/** The pool's water, from its far side to the wall, up to `level`. */
const poolWater = (level: number): Point[] => [
  [-SECTION.pool, -SECTION.depth],
  [0, -SECTION.depth],
  [0, level],
  [-SECTION.pool, level],
];

export const EDGE_PROFILES: readonly EdgeProfile[] = [
  {
    id: 'rollout',
    era: '1940s',
    name: 'Roll-out gutter',
    waterLevel: -0.075,
    solid: withBody([
      [0, -0.11],
      [0.005, -0.09],
      [0.02, -0.075],
      [0.04, -0.07],
      [0.07, -0.1],
      [0.1, -0.14],
      [0.14, -0.15],
      [0.18, -0.13],
      [0.21, -0.09],
      [0.23, -0.05],
      [0.26, -0.03],
      [0.6, 0],
    ]),
    water: [
      [
        [-SECTION.pool, -SECTION.depth],
        [0, -SECTION.depth],
        [0, -0.11],
        [0.005, -0.09],
        [0.02, -0.075],
        [-SECTION.pool, -0.075],
      ],
      [
        [0.08, -0.115],
        [0.1, -0.14],
        [0.14, -0.15],
        [0.18, -0.13],
        [0.19, -0.115],
      ],
    ],
  },
  {
    id: 'scum-trough',
    era: '1960s',
    name: 'Recessed scum trough',
    waterLevel: -0.24,
    solid: withBody([
      [0, -0.26],
      [0.01, -0.25],
      [0.03, -0.25],
      [0.05, -0.29],
      [0.09, -0.32],
      [0.14, -0.32],
      [0.18, -0.29],
      [0.2, -0.25],
      [0.2, -0.1],
      [-0.04, -0.1],
      [-0.05, -0.08],
      [-0.05, -0.02],
      [-0.03, 0],
    ]),
    water: [
      poolWater(-0.24),
      [
        [0.03, -0.262],
        [0.05, -0.29],
        [0.09, -0.32],
        [0.14, -0.32],
        [0.18, -0.29],
        [0.195, -0.262],
      ],
    ],
  },
  {
    id: 'deck-overflow',
    era: '1980s',
    name: 'Deck-level overflow',
    waterLevel: -0.012,
    solid: withBody([
      [0, -0.03],
      [0.01, -0.016],
      [0.03, -0.015],
      [0.1, -0.04],
      [0.12, -0.04],
      [0.12, -0.26],
      [0.14, -0.28],
      [0.38, -0.28],
      [0.4, -0.26],
      [0.4, -0.05],
      [0.42, -0.05],
      [0.42, 0],
    ]),
    water: [
      poolWater(-0.012),
      [
        [0, -0.012],
        [0.03, -0.009],
        [0.1, -0.034],
        [0.1, -0.04],
        [0.03, -0.015],
        [0.01, -0.016],
        [0, -0.03],
      ],
      [
        [0.13, -0.28],
        [0.39, -0.28],
        [0.39, -0.24],
        [0.13, -0.24],
      ],
    ],
    grating: {
      from: 0.1,
      to: 0.42,
      top: -0.02,
      depth: 0.03,
      bar: 0.012,
      pitch: 0.03,
      colour: '#f1f1ec',
    },
  },
  {
    id: 'grated-channel',
    era: 'Contemporary',
    name: 'Deck-level grated channel',
    waterLevel: 0,
    solid: withBody([
      [0, -0.004],
      [0.03, -0.004],
      [0.03, -0.03],
      [0.05, -0.03],
      [0.05, -0.3],
      [0.31, -0.3],
      [0.31, -0.03],
      [0.33, -0.03],
      [0.33, 0],
    ]),
    water: [
      poolWater(0),
      [
        [0, 0],
        [0.03, -0.001],
        [0.03, -0.004],
        [0, -0.004],
      ],
      [
        [0.05, -0.3],
        [0.31, -0.3],
        [0.31, -0.22],
        [0.05, -0.22],
      ],
    ],
    grating: {
      from: 0.03,
      to: 0.33,
      top: 0,
      depth: 0.03,
      bar: 0.008,
      pitch: 0.016,
      colour: '#8f989b',
    },
    marker: { from: 0.33, to: 0.45, colour: '#1f3f6e' },
  },
];

/** Whether an outline crosses itself (any two edges that are not neighbours meet). */
export function selfIntersects(points: readonly Point[]) {
  const n = points.length;
  const cross = (a: Point, b: Point, c: Point) =>
    (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      if (j === i + 1 || (i === 0 && j === n - 1)) continue;
      const [a, b] = [points[i], points[(i + 1) % n]];
      const [c, d] = [points[j], points[(j + 1) % n]];
      const d1 = cross(c, d, a),
        d2 = cross(c, d, b),
        d3 = cross(a, b, c),
        d4 = cross(a, b, d);
      if (d1 * d2 < 0 && d3 * d4 < 0) return true;
    }
  return false;
}
