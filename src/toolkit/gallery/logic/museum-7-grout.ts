/**
 * Hall 7, "Grout: The Unsung Hero of the Aquatics World" (107k): the
 * hall's words and its plan, pure. Every claim on a plaque is from
 * `doc/research/grout-history.md` (its sources S1 to S11); dates the
 * research marks indicative are hedged ("about", "by the"). The hall has
 * no state and no plant: it is set decoration, reverently lit.
 *
 * The hall's frame (metres, its middle at the origin): the visitor comes
 * in through the north wall's archway (z = −6.7) walking south and leaves
 * by the west wall's (x = −7.7). The row runs east to west across the
 * hall's south half, in date order from the visitor's left to right as
 * they face it (rule 5), so walking on towards the way out walks forward
 * in time.
 */

export interface GroutPlinth {
  /** 1 to 10, in date order. */
  readonly n: number;
  readonly name: string;
  /** The years on the plaque, hedged where the research is indicative. */
  readonly years: string;
  /** Where its years start. */
  readonly from: number;
  readonly what: string;
  readonly benefits: readonly [string, string];
  readonly drawbacks: readonly [string, string];
  /** One grave sentence. */
  readonly reverence: string;
  /** Its specimen's grout: every one grey but the 1970s'. */
  readonly grout: 'grey' | 'avocado';
}

export const PLINTHS: readonly GroutPlinth[] = [
  {
    n: 1,
    name: 'Lime mortar and lime putty',
    years: 'From about 1840 to about 1900',
    from: 1840,
    what: 'Lime and sand, setting slowly as it takes up carbon dioxide from the air. Victorian glazed tiling was generally set close, with fine joints.',
    benefits: ['Workable and to hand.', 'Forgiving of movement.'],
    drawbacks: [
      'Soft, and slow to harden.',
      'Dissolved by soft or acid water, so it needed renewing.',
    ],
    reverence: 'It was there first.',
    grout: 'grey',
  },
  {
    n: 2,
    name: 'Early Portland cement grout',
    years: 'From about 1850 to about 1950',
    from: 1850,
    what: 'Joseph Aspdin patented “Portland cement” in 1824; the hotter-burned cement that resembles today’s dates from the 1840s. Used neat, or with fine sand.',
    benefits: ['Hard and durable.', 'Cheap.'],
    drawbacks: [
      'Porous and brittle.',
      'Leached by water low in calcium, or with a negative saturation index.',
    ],
    reverence: 'It set the standard, and then it set.',
    grout: 'grey',
  },
  {
    n: 3,
    name: 'Sanded cement grout',
    years: 'The twentieth century to today',
    from: 1900,
    what: 'Cement with graded sand, for the wider joints: by a rule of the trade, about 3 mm and up.',
    benefits: ['Strong in wide joints.', 'Resists shrinkage cracking.'],
    drawbacks: ['Coarse and porous.', 'Takes up water and dirt.'],
    reverence: 'It filled the gaps others could not.',
    grout: 'grey',
  },
  {
    n: 4,
    name: 'Unsanded cement grout',
    years: 'The twentieth century to today',
    from: 1900,
    what: 'Cement without sand, for the fine joints of glazed tiles and mosaic: BS 5385 guidance is about 2 mm on walls.',
    benefits: ['Fills fine joints smoothly.', 'A neat, close finish.'],
    drawbacks: ['Shrinks and cracks if used too wide.', 'Porous.'],
    reverence: 'It asked for nothing.',
    grout: 'grey',
  },
  {
    n: 5,
    name: 'Coloured cement grout',
    years: 'The 1970s',
    from: 1970,
    what: 'Cement grout, pigmented to match the coloured bathroom suites of the decade. Avocado was among the defining colours of the British suite.',
    benefits: ['It matched the suite.', 'In every other way, a cement grout.'],
    drawbacks: [
      'In every way, a cement grout.',
      'Pigment can set patchy or fade.',
    ],
    reverence: 'The museum presents this specimen without comment.',
    grout: 'avocado',
  },
  {
    n: 6,
    name: 'Latex- and polymer-modified cement grout',
    years: 'From about the 1960s to today',
    from: 1960,
    what: 'Installers mixed cement grout with a latex admixture in place of water; it later came premixed from the factory, and is now the most popular kind.',
    benefits: ['Denser and less absorbent.', 'A better bond.'],
    drawbacks: [
      'Still cement.',
      'Still attacked by aggressive water and acid cleaners.',
    ],
    reverence: 'It made cement better, and did not pretend otherwise.',
    grout: 'grey',
  },
  {
    n: 7,
    name: 'Furan resin grout',
    years: 'From the 1940s',
    from: 1940,
    what: 'A reaction-resin grout of great chemical resistance, laid in dairies, chemical plants and some pools.',
    benefits: ['Resists acids and solvents.', 'Hard-wearing.'],
    drawbacks: ['Difficult to apply.', 'Generally black.'],
    reverence:
      'Furan grouts are generally black. The museum regrets that its specimen is not.',
    grout: 'grey',
  },
  {
    n: 8,
    name: 'Epoxy grout',
    years: 'From the 1940s; in pools from about the 1960s',
    from: 1940,
    what: 'Epoxy emulsion grouts came in the 1940s, true epoxy grouts into general use by about the 1960s and 70s. Class RG under BS EN 13888: the pool’s choice where the water is soft or aggressive; some are rated for seawater.',
    benefits: [
      'Impervious, hygienic and easy to clean.',
      'Resists pool chemicals and acid cleaners.',
    ],
    drawbacks: [
      'Costly; two parts, a short pot life, unforgiving to lay.',
      'The pool waits at least 21 days to be filled.',
    ],
    reverence: 'It is what the water deserves.',
    grout: 'grey',
  },
  {
    n: 9,
    name: 'Improved cement grout, CG2WA',
    years: 'Today',
    from: 2000,
    what: 'BS EN 13888’s class CG2, improved, with reduced water absorption (W) and high abrasion resistance (A); often with mould inhibitors, some rapid-setting.',
    benefits: [
      'Takes up less water.',
      'Suits pools with balanced, hard water, and their surrounds.',
    ],
    drawbacks: [
      'Still cement where the water is aggressive.',
      'The pool waits three weeks to fill (BS 5385-4).',
    ],
    reverence: 'The old way, made as good as it can be.',
    grout: 'grey',
  },
  {
    n: 10,
    name: 'Coda: the movement joint',
    years: 'Wherever a pool must move',
    from: 2026,
    what: 'A flexible sealant (silicone, polysulphide or polyurethane) at perimeters, changes of plane and over the structure’s joints, to BS 5385-4. In this specimen, one joint is sealant.',
    benefits: ['Lets the tiling move.', 'Keeps the grout from cracking.'],
    drawbacks: ['Not grout.', 'Must be renewed in its time.'],
    reverence: 'Not grout. But grout could not do its work without it.',
    grout: 'grey',
  },
];

export const TITLE_WALL = {
  line: 'Perhaps no substance is more important to a swimming pool than grout.',
  title: 'Grout: The Unsung Hero of the Aquatics World',
} as const;

/** The research's computed fact: a 25 × 12.5 × 1.5 m tank in 150 mm tiles. */
export function jointLength(
  pool = { l: 25, w: 12.5, d: 1.5 },
  tile = 0.15,
): number {
  const area = pool.l * pool.w + 2 * (pool.l + pool.w) * pool.d;
  return (area * 2) / tile;
}

export const INTRODUCTION = {
  heading: 'Grout',
  body: [
    'A swimming pool is held together by its grout. Every tile is set in it; every joint is filled with it; every day it is soaked, scrubbed, chlorinated and stood on. Here, for the first time, grout takes its rightful place in the history of aquatics.',
    'The tiles get the credit; the grout does the work. It keeps the water out of the bed and the structure behind, takes the swimmers’ feet and the cleaners’ brushes, resists the pool’s chemistry and must harbour no germs. Over a century and a half it went from lime to cement to polymer and resin, because pool water, chlorine and acid cleaners attack the simpler kinds.',
    `A 25-metre pool, 12.5 metres wide and 1.5 metres deep, has about 425 square metres of tile. In 150 mm tiles that is nearly six kilometres of grout joint (about ${(jointLength() / 1000).toFixed(1)} km), in the tank alone.`,
    'Grouts today are classed by BS EN 13888; tiling for swimming pools is guided by BS 5385-4.',
    'Walk slowly. Look closely. Can you tell them apart?',
  ],
} as const;

export const CLOSING_CARD =
  'Next time you swim, look down. The grout is looking after you.';

/** The specimen: 450 mm square, nine 150 mm tiles (as laid, less the joint), 3 mm joints. */
export const SPECIMEN = {
  size: 0.45,
  tiles: 3,
  joint: 0.003,
  tileThick: 0.008,
  /** The grout's face, tooled slightly back from the tiles' faces. */
  recess: 0.0015,
} as const;

/** The plinths' size, metres. */
export const PLINTH = { w: 0.55, h: 1.15 } as const;

/** Which way a plinth's specimen and plaque face, towards its visitor: a wall's way, or (in a corner) the middle of the hall. */
export type Facing = 'north' | 'south' | 'east' | 'west' | 'middle';

/** A facing as a unit step in the hall's frame, x and z, for a plinth at `x`, `z`. */
export const facingStep = (f: Facing, x = 0, z = 0): [number, number] => {
  if (f === 'middle') {
    const d = Math.hypot(x, z) || 1;
    return [-x / d, -z / d];
  }
  return f === 'north'
    ? [0, -1]
    : f === 'south'
      ? [0, 1]
      : f === 'east'
        ? [1, 0]
        : [-1, 0];
};

/** The turn about y that faces a model built facing +z this way, at `x`, `z`. */
export const facingYaw = (f: Facing, x = 0, z = 0) => {
  const [dx, dz] = facingStep(f, x, z);
  return Math.atan2(dx, dz);
};

/** Plinth `n`'s facing as a unit step. */
export const stepOf = (n: number) => {
  const p = PLACES[n];
  return facingStep(p.facing, p.x, p.z);
};

/** Plinth `n`'s turn about y. */
export const yawOf = (n: number) => {
  const p = PLACES[n];
  return facingYaw(p.facing, p.x, p.z);
};

/**
 * Where each plinth stands, all round the edge of the hall (the owner,
 * 2026-10-30; it had a few in the middle, 2026-10-28), one in each corner
 * facing the middle of the hall, in date order round it from the way in
 * (north): 1 on the north wall east of the way in, its lectern where the
 * owner stood for it; 2 in the north-east corner; 3 and 4 on the east
 * wall, either side of the introduction; 5, the 1970s', in the south-east
 * corner under the oil-wheel projector; 6 and 7 on the south wall, under
 * the title; 8 in the south-west corner; 9 on the west wall south of the
 * way out; 10, the coda, in the north-west corner, past the way out and
 * the bench.
 */
export const PLACES: Readonly<
  Record<number, { x: number; z: number; facing: Facing }>
> = {
  1: { x: 2.45, z: -5.75, facing: 'south' },
  2: { x: 6.8, z: -5.8, facing: 'middle' },
  3: { x: 6.8, z: -2.4, facing: 'west' },
  4: { x: 6.8, z: 2.4, facing: 'west' },
  5: { x: 6.8, z: 5.8, facing: 'middle' },
  6: { x: 2.2, z: 5.8, facing: 'north' },
  7: { x: -2.2, z: 5.8, facing: 'north' },
  8: { x: -6.8, z: 5.8, facing: 'middle' },
  9: { x: -6.8, z: 3.2, facing: 'east' },
  10: { x: -6.8, z: -5.8, facing: 'middle' },
};

/** Plinth `n`'s place. */
export const plinthPlace = (n: number) => PLACES[n];

/** How far before its plinth a plaque's lectern stands. */
export const LECTERN_OUT = 1.15;
/** Half a plinth's footprint, its foot included (no rope round it: the owner, 2026-10-30). */
export const PLINTH_HALF = (PLINTH.w + 0.08) / 2;

/** Where plinth `n`'s plaque stands: before it, on its visitor's side. */
export function lecternAt(n: number) {
  const p = PLACES[n];
  const [dx, dz] = stepOf(n);
  return { x: p.x + dx * LECTERN_OUT, z: p.z + dz * LECTERN_OUT };
}

/** The hall's inside half-sizes (16 × 14 m cell less its walls). */
export const HALL7 = { halfX: 7.7, halfZ: 6.7, h: 9.5 } as const;

/** The bench against the west wall, between the way out and the coda's corner, facing east into the hall. */
export const BENCH = { x: -6.9, z: -3.4, length: 1.6, depth: 0.45 } as const;

/** The oil-wheel projector, hung high before the 1970s' plinth (5), on its visitor's side, aimed down at its specimen. */
export const PROJECTOR = (() => {
  const p = PLACES[5];
  const [dx, dz] = stepOf(5);
  return { x: p.x + dx * 1.9, y: 4.4, z: p.z + dz * 1.9, ceiling: HALL7.h };
})();

/** Places where the walker may not go, metres in the hall's frame. */
export function hall7Solids() {
  return [
    // Each plinth, turned with it: the box round its footprint.
    ...PLINTHS.map((p) => {
      const { x, z } = PLACES[p.n];
      const yaw = yawOf(p.n);
      const r =
        (PLINTH_HALF + 0.05) *
        (Math.abs(Math.cos(yaw)) + Math.abs(Math.sin(yaw)));
      return { minX: x - r, maxX: x + r, minZ: z - r, maxZ: z + r };
    }),
    // Its plaque's lectern.
    ...PLINTHS.map((p) => {
      const { x, z } = lecternAt(p.n);
      return { minX: x - 0.22, maxX: x + 0.22, minZ: z - 0.22, maxZ: z + 0.22 };
    }),
    // The bench.
    {
      minX: BENCH.x - BENCH.depth / 2,
      maxX: BENCH.x + BENCH.depth / 2,
      minZ: BENCH.z - BENCH.length / 2,
      maxZ: BENCH.z + BENCH.length / 2,
    },
  ];
}

/**
 * The approach (the owner, 2026-10-29): coming near a plinth brightens
 * its spotlight, over its specimen and its plaque's lectern (each plinth
 * has its own, always on: 2026-10-30). Within `APPROACH_NEAR` m
 * of a plinth's lectern it is that plinth's; it lets go only past
 * `APPROACH_FAR`, so it does not flicker at the edge.
 */
export const APPROACH_NEAR = 2.2;
export const APPROACH_FAR = 2.8;

/** The plinth whose light is on for a visitor at `x`, `z`, given the one lit before; null for none. */
export function approachedPlinth(
  x: number,
  z: number,
  lit: number | null,
): number | null {
  const away = (n: number) => {
    const at = lecternAt(n);
    return Math.hypot(x - at.x, z - at.z);
  };
  if (lit !== null && away(lit) < APPROACH_FAR) return lit;
  let best: number | null = null;
  for (const p of PLINTHS) {
    const d = away(p.n);
    if (d < APPROACH_NEAR && (best === null || d < away(best))) best = p.n;
  }
  return best;
}

/**
 * Each plinth's era loop, by its number (`doc/prompts/art/grout-music.md`):
 * the file it plays from `resources/sound/music/grout/`, while its lectern
 * is the one approached.
 */
export const MUSIC_FILES: Readonly<Record<number, string>> = {
  1: '1-lime.ogg',
  2: '2-portland.ogg',
  3: '3-sanded.ogg',
  4: '4-unsanded.ogg',
  5: '5-coloured.ogg',
  6: '6-polymer.ogg',
  7: '7-furan.ogg',
  8: '8-epoxy.ogg',
  9: '9-cg2wa.ogg',
  10: '10-movement-joint.ogg',
};

/** How loud the era loops play: quiet, beneath the reading of a plaque. */
export const MUSIC_LEVEL = 0.22;

/** The loop to play for the plinth shown (null for none), among the files that exist; null where its file is missing. */
export function musicFor(
  shown: number | null,
  present: ReadonlySet<string>,
): string | null {
  if (shown === null) return null;
  const file = MUSIC_FILES[shown];
  return file && present.has(file) ? file : null;
}
