/**
 * The plumber: told what a line carries, how much and how far, chooses
 * the pipe (or conduit) a good engineer would, and says why. The pipe
 * helper's functional mode (`doc/prompts/obsolete/016-pipe-helper-two-ways.md`): the
 * room says what is needed, the plumber knows how it is done. Pure:
 * metres, m³/h, amperes, kilowatts.
 *
 * What it knows, by commodity:
 *
 * - **Water under pressure** (pool water, mains, LTHW, DHW): the material
 *   by service; the smallest bore that keeps the velocity within its
 *   limit, then wider until the friction loss over the line's length
 *   (Darcy–Weisbach, Swamee–Jain friction factor) is within its
 *   allowance.
 * - **Drainage**, by gravity: the smallest PVC-U drain that runs half full
 *   at 1:40 (Manning). Length does not matter to a falling drain.
 * - **Natural gas**: steel, sized so the drop from meter to appliance is at
 *   most 1 mbar (Pole's formula).
 * - **Power**: copper cable in steel conduit, the smallest that carries
 *   the current (BS 7671 Appendix 4, multicore PVC cable clipped direct),
 *   then larger until the voltage drop over the length is within 5 % (3 %
 *   for lighting); the conduit sized to the cable.
 * - **Busbar**: plug-in busbar trunking, where a room's supply is to be
 *   tapped off along a wall: the smallest rated for the current.
 * - **Control**: a 20 mm conduit.
 * - **Chemicals and samples**: dosing tube by the dose; positive
 *   displacement pumps, so length does not limit it.
 * - **Ozone**: stainless tube by the generator's output.
 * - **Flue gas**: a twin-wall flue by the boiler's output.
 *
 * Every figure here is a designer's first pass, from the sources named,
 * good enough to choose sensibly, not a design calculation.
 */
import type { Vec3 } from './pipe-route';

/** The kinds of pipe it may choose: the pipe helper's (`views/pipe-kinds.ts`). */
export type ChosenKind =
  | 'pvc-pressure'
  | 'pvc-drain'
  | 'copper'
  | 'steel-screwed'
  | 'stainless'
  | 'lagged-heating'
  | 'chemical-tube'
  | 'twin-wall-flue'
  | 'busbar-trunking';

/** The outside diameters each kind comes in, m: the pipe helper's (`PIPE_KINDS`). */
export const KIND_SIZES: Record<ChosenKind, readonly number[]> = {
  'pvc-pressure': [
    0.032, 0.04, 0.05, 0.063, 0.075, 0.09, 0.11, 0.16, 0.2, 0.25, 0.315, 0.355,
    0.4,
  ],
  'pvc-drain': [0.11, 0.16, 0.2, 0.25, 0.315],
  copper: [0.015, 0.022, 0.028, 0.035, 0.042, 0.054],
  'steel-screwed': [0.0213, 0.0269, 0.0337, 0.0424, 0.0483, 0.0603],
  stainless: [0.0213, 0.0337, 0.0483, 0.0603, 0.0889, 0.1143],
  'lagged-heating': [0.0337, 0.0483, 0.0603, 0.0889, 0.1143],
  'chemical-tube': [0.006, 0.008, 0.01, 0.012],
  'twin-wall-flue': [0.2, 0.25, 0.3, 0.35, 0.45, 0.55],
  'busbar-trunking': [0.1, 0.125, 0.15],
};

/** Plug-in busbar trunking's ratings, A, and each one's casing, m square. */
const BUSBARS = [
  { rating: 160, od: 0.1 },
  { rating: 400, od: 0.125 },
  { rating: 800, od: 0.15 },
] as const;

// ---- What may be asked ------------------------------------------------------------

interface Common {
  /** The line's whole length, m, where known; a longer line may need to be wider. */
  length?: number;
  /** For water: suction lines run slower. */
  role?: 'suction' | 'pressure';
}

/**
 * A request: the commodity and its capacity, each commodity with the one
 * kind of capacity that suits it, so a current on a water main does not
 * compile.
 */
export type PipeRequest = Common &
  (
    | {
        commodity: 'pool-water' | 'mains-water' | 'lthw' | 'dhw';
        /** m³/h. */
        flow: number;
        /** The friction loss allowed over the line, m of head; 1 m if not given. */
        allowance?: number;
      }
    | { commodity: 'drainage'; /** m³/h. */ flow: number }
    | {
        commodity: 'natural-gas';
        /** m³/h, at standard conditions. */ flow: number;
      }
    | {
        commodity: 'ac-400v-3ph' | 'ac-230v';
        /** A. */
        current: number;
        /** Lighting is allowed less drop (3 %) than other loads (5 %). */
        lighting?: boolean;
        /** Plug-in busbar trunking, to be tapped off along its length, not cable. */
        busbar?: boolean;
      }
    | { commodity: 'control' }
    | {
        commodity: 'hypochlorite' | 'acid' | 'sample';
        /** l/h. */
        dose: number;
      }
    | { commodity: 'ozone'; /** g/h. */ output: number }
    | { commodity: 'flue-gas'; /** The boiler's output, kW. */ power: number }
  );

export type Commodity = PipeRequest['commodity'];

export interface PipeChoice {
  kind: ChosenKind;
  /** Outside diameter, m. */
  od: number;
  /** For power: the cable in it. */
  cable?: { csa: number; cores: number; rating: number; mVperAm: number };
  /** What the line loses over its length, and what it is allowed, in the unit given. */
  loss?: { value: number; allowance: number; unit: 'm' | 'mbar' | '%' };
  /** For water: its velocity, m/s. */
  velocity?: number;
  /** Why this one, in a few words each. */
  reasons: string[];
  /** What could not be met: the largest made is too small, say. */
  problems: string[];
}

// ---- Water ------------------------------------------------------------------------

/** Each material's wall, from its outside diameter: its bore. */
function bore(kind: ChosenKind, od: number) {
  switch (kind) {
    case 'pvc-pressure':
      // PN10, SDR 21.
      return od * (1 - 2 / 21);
    case 'copper':
      // EN 1057 R250, about 1 mm to 1.2 mm.
      return od - 2 * (od <= 0.022 ? 0.0009 : 0.0012);
    default:
      // Medium-weight steel, about 3.2 mm to 4.5 mm.
      return od - 2 * Math.min(0.0045, Math.max(0.0026, od * 0.06));
  }
}

/** Absolute roughness, m. */
const ROUGHNESS: Partial<Record<ChosenKind, number>> = {
  'pvc-pressure': 0.0000015,
  copper: 0.0000015,
  'lagged-heating': 0.000045,
  'steel-screwed': 0.00015,
  stainless: 0.000015,
};

/** Friction loss, m of head, of `flow` m³/h through `length` m of bore `d` m (water, about 20 °C). */
export function frictionHead(
  flow: number,
  d: number,
  length: number,
  roughness: number,
) {
  const q = flow / 3600;
  const area = (Math.PI * d * d) / 4;
  const v = q / area;
  const nu = 1.0e-6;
  const re = (v * d) / nu;
  // Laminar below 2300; Swamee–Jain above.
  const f =
    re < 2300
      ? 64 / Math.max(re, 1e-9)
      : 0.25 / Math.log10(roughness / (3.7 * d) + 5.74 / re ** 0.9) ** 2;
  return { head: (f * (length / d) * v * v) / (2 * 9.81), velocity: v };
}

const WATER: Record<
  'pool-water' | 'mains-water' | 'lthw' | 'dhw',
  { kind: ChosenKind; velocity: number; name: string }
> = {
  'pool-water': {
    kind: 'pvc-pressure',
    velocity: 2.0,
    name: 'PVC-U pressure pipe',
  },
  'mains-water': { kind: 'copper', velocity: 1.5, name: 'copper' },
  dhw: { kind: 'copper', velocity: 1.0, name: 'copper' },
  lthw: { kind: 'lagged-heating', velocity: 1.5, name: 'lagged steel' },
};

function water(
  r: Extract<
    PipeRequest,
    { commodity: 'pool-water' | 'mains-water' | 'lthw' | 'dhw' }
  >,
): PipeChoice {
  const spec = WATER[r.commodity];
  // Mains water too big for copper goes in PVC-U.
  let kind = spec.kind;
  const limit =
    r.role === 'suction' ? Math.min(spec.velocity, 1.0) : spec.velocity;
  const fits = (k: ChosenKind, od: number) =>
    frictionHead(r.flow, bore(k, od), 1, ROUGHNESS[k] ?? 0.00005).velocity <=
    limit;
  if (kind === 'copper' && !KIND_SIZES.copper.some((od) => fits('copper', od)))
    kind = 'pvc-pressure';
  const sizes = KIND_SIZES[kind];
  const reasons = [`${spec.name} for ${r.commodity}`];
  const problems: string[] = [];
  let i = sizes.findIndex((od) => fits(kind, od));
  if (i < 0) {
    i = sizes.length - 1;
    problems.push(
      `${r.flow} m³/h is too much for the largest ${spec.name} (${sizes[i] * 1000} mm) within ${limit} m/s`,
    );
  } else reasons.push(`smallest within ${limit} m/s`);
  const allowance = r.allowance ?? 1;
  let at = frictionHead(
    r.flow,
    bore(kind, sizes[i]),
    r.length ?? 0,
    ROUGHNESS[kind] ?? 0.00005,
  );
  if (r.length !== undefined) {
    const first = i;
    while (at.head > allowance && i < sizes.length - 1) {
      i++;
      at = frictionHead(
        r.flow,
        bore(kind, sizes[i]),
        r.length,
        ROUGHNESS[kind] ?? 0.00005,
      );
    }
    if (i > first)
      reasons.push(`widened for ${r.length} m: loss within ${allowance} m`);
    if (at.head > allowance)
      problems.push(
        `loses ${at.head.toFixed(2)} m over ${r.length} m even at ${sizes[i] * 1000} mm`,
      );
  }
  return {
    kind,
    od: sizes[i],
    velocity: at.velocity,
    ...(r.length !== undefined
      ? { loss: { value: at.head, allowance, unit: 'm' as const } }
      : {}),
    reasons,
    problems,
  };
}

// ---- Drainage ---------------------------------------------------------------------

/** Half-full gravity flow, m³/h, in a PVC-U drain of bore `d` at a fall of 1 in 40 (Manning, n = 0.009). */
export function halfFullCapacity(d: number) {
  const area = (Math.PI * d * d) / 8;
  const radius = d / 4;
  const v = (1 / 0.009) * radius ** (2 / 3) * Math.sqrt(1 / 40);
  return v * area * 3600;
}

function drainage(
  r: Extract<PipeRequest, { commodity: 'drainage' }>,
): PipeChoice {
  const sizes = KIND_SIZES['pvc-drain'];
  const i = sizes.findIndex(
    (od) => halfFullCapacity(bore('pvc-pressure', od)) >= r.flow,
  );
  return {
    kind: 'pvc-drain',
    od: sizes[i < 0 ? sizes.length - 1 : i],
    reasons: ['PVC-U drain, by gravity, half full at 1:40'],
    problems:
      i < 0
        ? [`${r.flow} m³/h is more than the largest drain carries half full`]
        : [],
  };
}

// ---- Gas --------------------------------------------------------------------------

/** Pressure drop, mbar, of natural gas (relative density 0.6) through `length` m of bore `d` m: Pole's formula. */
export function gasDrop(flow: number, d: number, length: number) {
  const mm = d * 1000;
  return (0.6 * length * (flow / 0.0071) ** 2) / mm ** 5;
}

function gas(
  r: Extract<PipeRequest, { commodity: 'natural-gas' }>,
): PipeChoice {
  const sizes = KIND_SIZES['steel-screwed'];
  const length = r.length ?? 3;
  const allowance = 1;
  let i = sizes.findIndex(
    (od) => gasDrop(r.flow, bore('steel-screwed', od), length) <= allowance,
  );
  const problems: string[] = [];
  if (i < 0) {
    i = sizes.length - 1;
    problems.push(
      `${r.flow} m³/h over ${length} m drops more than 1 mbar even at ${sizes[i] * 1000} mm`,
    );
  }
  return {
    kind: 'steel-screwed',
    od: sizes[i],
    loss: {
      value: gasDrop(r.flow, bore('steel-screwed', sizes[i]), length),
      allowance,
      unit: 'mbar',
    },
    reasons: ['screwed steel for gas', `drop within 1 mbar over ${length} m`],
    problems,
  };
}

// ---- Power ------------------------------------------------------------------------

/**
 * Copper multicore PVC cable clipped direct (BS 7671 Appendix 4, Tables
 * 4D2A and 4D2B, reference method C): its cross-section, mm²; its rating,
 * A, three-phase (three or four cores) and single-phase (two); and its
 * voltage drop, mV/A/m, likewise. First-pass figures: check against the
 * tables before relying on them.
 */
export const CABLES = [
  { csa: 1.5, three: 17.5, single: 19.5, mv3: 25, mv1: 29 },
  { csa: 2.5, three: 24, single: 27, mv3: 15, mv1: 18 },
  { csa: 4, three: 32, single: 36, mv3: 9.5, mv1: 11 },
  { csa: 6, three: 41, single: 46, mv3: 6.4, mv1: 7.3 },
  { csa: 10, three: 57, single: 63, mv3: 3.8, mv1: 4.4 },
  { csa: 16, three: 76, single: 85, mv3: 2.4, mv1: 2.8 },
  { csa: 25, three: 101, single: 112, mv3: 1.5, mv1: 1.75 },
  { csa: 35, three: 125, single: 138, mv3: 1.1, mv1: 1.25 },
  { csa: 50, three: 151, single: 168, mv3: 0.81, mv1: 0.93 },
  { csa: 70, three: 192, single: 213, mv3: 0.57, mv1: 0.63 },
  { csa: 95, three: 232, single: 258, mv3: 0.43, mv1: 0.46 },
  { csa: 120, three: 269, single: 299, mv3: 0.36, mv1: 0.38 },
  { csa: 150, three: 309, single: 344, mv3: 0.3, mv1: 0.31 },
  { csa: 185, three: 353, single: 392, mv3: 0.25, mv1: 0.25 },
] as const;

/** The steel conduit for a cable of `csa` mm², by outside diameter. */
function conduitFor(csa: number) {
  const bands: [number, number][] = [
    [6, 0.0213],
    [16, 0.0269],
    [35, 0.0337],
    [70, 0.0424],
    [120, 0.0483],
    [185, 0.0603],
  ];
  return bands.find(([max]) => csa <= max)?.[1] ?? null;
}

function power(
  r: Extract<PipeRequest, { commodity: 'ac-400v-3ph' | 'ac-230v' }>,
): PipeChoice {
  const three = r.commodity === 'ac-400v-3ph';
  if (r.busbar) {
    const b =
      BUSBARS.find((x) => x.rating >= r.current) ?? BUSBARS[BUSBARS.length - 1];
    return {
      kind: 'busbar-trunking',
      od: b.od,
      reasons: [
        'plug-in busbar trunking, tapped off along its length',
        `the smallest rated for ${r.current} A: ${b.rating} A`,
      ],
      problems:
        b.rating < r.current
          ? [`${r.current} A is more than the largest busbar carries`]
          : [],
    };
  }
  const volts = three ? 400 : 230;
  const allowed = r.lighting ? 3 : 5;
  const rating = (c: (typeof CABLES)[number]) => (three ? c.three : c.single);
  const mv = (c: (typeof CABLES)[number]) => (three ? c.mv3 : c.mv1);
  const drop = (c: (typeof CABLES)[number]) =>
    ((mv(c) * r.current * (r.length ?? 0)) / 1000 / volts) * 100;
  const problems: string[] = [];
  const reasons = [
    `copper cable in steel conduit, ${three ? '400 V three-phase' : '230 V single-phase'}`,
  ];
  let i = CABLES.findIndex((c) => rating(c) >= r.current);
  if (i < 0) {
    i = CABLES.length - 1;
    problems.push(
      `${r.current} A is more than the largest cable carries: busbar or parallel cables`,
    );
  } else reasons.push(`smallest cable rated for ${r.current} A`);
  if (r.length !== undefined) {
    const first = i;
    while (drop(CABLES[i]) > allowed && i < CABLES.length - 1) i++;
    if (i > first)
      reasons.push(`larger for ${r.length} m: drop within ${allowed} %`);
    if (drop(CABLES[i]) > allowed)
      problems.push(
        `drops ${drop(CABLES[i]).toFixed(1)} % over ${r.length} m even at ${CABLES[i].csa} mm²`,
      );
  }
  const c = CABLES[i];
  const od = conduitFor(c.csa);
  if (od === null)
    problems.push(`a ${c.csa} mm² cable needs tray or trunking, not conduit`);
  return {
    kind: 'steel-screwed',
    od: od ?? KIND_SIZES['steel-screwed'].at(-1)!,
    cable: {
      csa: c.csa,
      cores: three ? 4 : 3,
      rating: rating(c),
      mVperAm: mv(c),
    },
    ...(r.length !== undefined
      ? { loss: { value: drop(c), allowance: allowed, unit: '%' as const } }
      : {}),
    reasons,
    problems,
  };
}

// ---- The rest ---------------------------------------------------------------------

/** Choose the pipe for a request. */
export function choosePipe(r: PipeRequest): PipeChoice {
  switch (r.commodity) {
    case 'pool-water':
    case 'mains-water':
    case 'lthw':
    case 'dhw':
      return water(r);
    case 'drainage':
      return drainage(r);
    case 'natural-gas':
      return gas(r);
    case 'ac-400v-3ph':
    case 'ac-230v':
      return power(r);
    case 'control':
      return {
        kind: 'steel-screwed',
        od: 0.0213,
        reasons: ['control cables in a 20 mm conduit to the control bus'],
        problems: [],
      };
    case 'hypochlorite':
    case 'acid':
    case 'sample': {
      const sizes = KIND_SIZES['chemical-tube'];
      // About 0.5 m/s in the tube is plenty for a dosing line.
      const i = sizes.findIndex(
        (od) => r.dose / 1000 / 3600 / ((Math.PI * (od * 0.7) ** 2) / 4) <= 0.5,
      );
      return {
        kind: 'chemical-tube',
        od: sizes[i < 0 ? sizes.length - 1 : i],
        reasons: [
          `dosing tube for ${r.commodity}, pumped, so its length does not limit it`,
        ],
        problems:
          i < 0 ? [`${r.dose} l/h is more than dosing tube carries`] : [],
      };
    }
    case 'ozone': {
      // Ozone at about 10 % in oxygen: 160 g/h is about 1.1 m³/h of gas.
      const gasFlow = r.output / 145;
      const sizes = KIND_SIZES.stainless;
      const i = sizes.findIndex(
        (od) =>
          gasFlow / 3600 / ((Math.PI * bore('stainless', od) ** 2) / 4) <= 5,
      );
      return {
        kind: 'stainless',
        od: sizes[i < 0 ? sizes.length - 1 : i],
        reasons: [
          'stainless steel for ozone, which attacks rubber and most plastics',
        ],
        problems: i < 0 ? ['more ozone than stainless tube carries'] : [],
      };
    }
    case 'flue-gas': {
      const bands: [number, number][] = [
        [70, 0.2],
        [150, 0.25],
        [300, 0.3],
        [600, 0.35],
        [1200, 0.45],
      ];
      const od = bands.find(([kw]) => r.power <= kw)?.[1] ?? 0.55;
      return {
        kind: 'twin-wall-flue',
        od,
        reasons: [`twin-wall flue for ${r.power} kW of boiler`],
        problems: r.power > 2400 ? ['more boiler than one flue serves'] : [],
      };
    }
  }
}

/** A run's length through its points, m. */
export function runLength(points: readonly Vec3[]) {
  let total = 0;
  for (let i = 1; i < points.length; i++)
    total += Math.hypot(
      points[i][0] - points[i - 1][0],
      points[i][1] - points[i - 1][1],
      points[i][2] - points[i - 1][2],
    );
  return total;
}
