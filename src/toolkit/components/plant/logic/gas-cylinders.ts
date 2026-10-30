/**
 * Industrial gas cylinders (the owner, 2026-10-30): what each kind is, for
 * the shared cylinder builder (`views/gas-cylinder.ts`). Pure.
 *
 * Colours follow BS EN 1089-3:2011 (gas cylinders, identification, colour
 * coding): the shoulder's colour by the gas's hazard or, for the common
 * gases, by the gas itself (oxygen white RAL 9010, nitrogen black RAL 9005,
 * argon dark green RAL 6001, carbon dioxide grey RAL 7037, helium brown
 * RAL 8008, acetylene maroon RAL 3009, flammable red RAL 3000, toxic or
 * corrosive yellow RAL 1018, inert bright green RAL 6018, oxidising light
 * blue RAL 5012); the body's colour is the supplier's, here as UK
 * industrial suppliers paint theirs. LPG cylinders are outside BS EN 1089-3:
 * UK propane is red, butane blue, by the suppliers' custom.
 *
 * Labels follow BS EN ISO 7225 (gas cylinder precautionary labels): a
 * shoulder label with the gas's name, its UN number, its ADR class labels
 * (2.1 flammable gas, 2.2 non-flammable non-toxic gas, 2.3 toxic gas, 5.1
 * oxidiser, 8 corrosive), its CLP hazard statements and the supplier.
 * Valve outlets after BS 341-3: right-hand threads for non-flammable gases,
 * left-hand for flammable (so a fuel gas regulator cannot be fitted to
 * oxygen). Sizes after UK suppliers' water capacities and LPG weights;
 * the letter codes are our supplier's own.
 */

export type GasId =
  | 'oxygen'
  | 'nitrogen'
  | 'argon'
  | 'co2'
  | 'air'
  | 'helium'
  | 'hydrogen'
  | 'acetylene'
  | 'propane'
  | 'butane'
  | 'chlorine'
  | 'refrigerant';

export const GAS_IDS: readonly GasId[] = [
  'oxygen',
  'nitrogen',
  'argon',
  'co2',
  'air',
  'helium',
  'hydrogen',
  'acetylene',
  'propane',
  'butane',
  'chlorine',
  'refrigerant',
];

/** An ADR danger label, as ISO 7225 puts them on the shoulder label. */
export type AdrLabel = '2.1' | '2.2' | '2.3' | '5.1' | '8';

/** How the gas is held: compressed, liquefied under its own vapour, or dissolved (acetylene, in acetone in a porous mass). */
export type GasState = 'compressed' | 'liquefied' | 'dissolved';

/** What guards the valve. */
export type ValveGuard = 'tulip' | 'cap' | 'shroud' | 'none';

export type SizeId =
  | 'X2'
  | 'Z10'
  | 'V20'
  | 'L50'
  | 'A40'
  | 'C33'
  | 'R13'
  | 'P47'
  | 'P19'
  | 'P13'
  | 'F18'
  | 'B15'
  | 'B7';

/** A cylinder size: its water capacity, outside diameter and height to the valve's seat, empty weight. */
export interface CylinderSize {
  id: SizeId;
  /** Water capacity, litres. */
  litres: number;
  /** Outside diameter, metres. */
  dia: number;
  /** Height from the floor to the top of the neck (or, for a shrouded cylinder, the shroud's top), metres. */
  h: number;
  /** Tare: the empty cylinder with its valve, kg. */
  tare: number;
  /** The body's shape: a tall seamless cylinder, or a squat welded LPG-style one with a foot ring and shroud. */
  build: 'seamless' | 'welded';
}

export const CYLINDER_SIZES: Record<SizeId, CylinderSize> = {
  X2: { id: 'X2', litres: 2, dia: 0.1, h: 0.4, tare: 3.5, build: 'seamless' },
  Z10: {
    id: 'Z10',
    litres: 10,
    dia: 0.14,
    h: 0.88,
    tare: 13,
    build: 'seamless',
  },
  V20: {
    id: 'V20',
    litres: 20,
    dia: 0.204,
    h: 0.9,
    tare: 27,
    build: 'seamless',
  },
  L50: {
    id: 'L50',
    litres: 50,
    dia: 0.23,
    h: 1.46,
    tare: 62,
    build: 'seamless',
  },
  A40: {
    id: 'A40',
    litres: 40,
    dia: 0.25,
    h: 1.18,
    tare: 55,
    build: 'seamless',
  },
  C33: {
    id: 'C33',
    litres: 27,
    dia: 0.23,
    h: 0.86,
    tare: 38,
    build: 'seamless',
  },
  R13: { id: 'R13', litres: 13, dia: 0.25, h: 0.5, tare: 9, build: 'welded' },
  P47: {
    id: 'P47',
    litres: 112,
    dia: 0.375,
    h: 1.27,
    tare: 37,
    build: 'welded',
  },
  P19: {
    id: 'P19',
    litres: 45,
    dia: 0.318,
    h: 0.75,
    tare: 18,
    build: 'welded',
  },
  P13: {
    id: 'P13',
    litres: 31,
    dia: 0.318,
    h: 0.56,
    tare: 14,
    build: 'welded',
  },
  F18: {
    id: 'F18',
    litres: 43,
    dia: 0.305,
    h: 0.84,
    tare: 16,
    build: 'welded',
  },
  B15: {
    id: 'B15',
    litres: 30,
    dia: 0.318,
    h: 0.59,
    tare: 14,
    build: 'welded',
  },
  B7: { id: 'B7', litres: 14, dia: 0.255, h: 0.47, tare: 7.5, build: 'welded' },
};

/** What a full cylinder of a gas holds in one size. */
export interface GasFill {
  size: SizeId;
  /** Its contents: kg for a liquefied or dissolved gas, m³ (at 15 °C, 1 bar) for a compressed one. */
  contents: number;
}

export interface GasKind {
  id: GasId;
  /** The name on its labels. */
  name: string;
  formula: string;
  un: string;
  state: GasState;
  /** ADR labels, most severe first. */
  adr: readonly AdrLabel[];
  /** CLP hazard statements, kept short. */
  hazards: readonly string[];
  /** BS EN 1089-3 shoulder colour (hex) and its RAL. */
  shoulder: { hex: string; ral: string };
  /** The supplier's body colour. */
  body: string;
  /** The valve outlet's thread: its hand, and its name. */
  thread: { hand: 'left' | 'right'; name: string };
  /** A residual pressure valve in the outlet, as an industrial supplier fits to keep air and moisture out. */
  rpv: boolean;
  /** A handwheel, or a square spindle worked with a key (acetylene's). */
  spindle: 'handwheel' | 'key';
  guard: ValveGuard;
  /** Working pressure (or, for a liquefied gas, its pressure at 15 °C), bar; and test pressure, bar. */
  wp: number;
  tp: number;
  /** Years between periodic inspections and tests. */
  testYears: number;
  /** Its sizes, as the supplier fills them. */
  fills: readonly GasFill[];
}

const FLAMMABLE = 'H220 Extremely flammable gas.';
const UNDER_PRESSURE =
  'H280 Contains gas under pressure; may explode if heated.';
const ASPHYXIANT = 'May displace oxygen and cause rapid suffocation.';
const OXIDISER = 'H270 May cause or intensify fire; oxidiser.';

/** The BS EN 1089-3 shoulder colours. */
export const RAL = {
  white: { hex: '#ecece7', ral: 'RAL 9010' },
  black: { hex: '#1c1c1c', ral: 'RAL 9005' },
  darkGreen: { hex: '#2f4a32', ral: 'RAL 6001' },
  grey: { hex: '#8e9396', ral: 'RAL 7037' },
  brown: { hex: '#6b4a35', ral: 'RAL 8008' },
  maroon: { hex: '#6d2230', ral: 'RAL 3009' },
  red: { hex: '#b02420', ral: 'RAL 3000' },
  yellow: { hex: '#e9b628', ral: 'RAL 1018' },
  brightGreen: { hex: '#4aa040', ral: 'RAL 6018' },
} as const;

const BODY_BLACK = '#1a1b1c';
const BODY_GREY = '#7c8286';

export const GASES: Record<GasId, GasKind> = {
  oxygen: {
    id: 'oxygen',
    name: 'OXYGEN',
    formula: 'O₂',
    un: '1072',
    state: 'compressed',
    adr: ['5.1', '2.2'],
    hazards: [OXIDISER, UNDER_PRESSURE],
    shoulder: RAL.white,
    body: BODY_BLACK,
    thread: { hand: 'right', name: 'BS 341 No. 3, ⅝" BSP RH' },
    rpv: true,
    spindle: 'handwheel',
    guard: 'tulip',
    wp: 230,
    tp: 345,
    testYears: 10,
    fills: [
      { size: 'L50', contents: 10.6 },
      { size: 'V20', contents: 4.3 },
      { size: 'Z10', contents: 2.1 },
      { size: 'X2', contents: 0.4 },
    ],
  },
  nitrogen: {
    id: 'nitrogen',
    name: 'NITROGEN',
    formula: 'N₂',
    un: '1066',
    state: 'compressed',
    adr: ['2.2'],
    hazards: [UNDER_PRESSURE, ASPHYXIANT],
    shoulder: RAL.black,
    body: BODY_GREY,
    thread: { hand: 'right', name: 'BS 341 No. 3, ⅝" BSP RH' },
    rpv: true,
    spindle: 'handwheel',
    guard: 'tulip',
    wp: 230,
    tp: 345,
    testYears: 10,
    fills: [
      { size: 'L50', contents: 9.4 },
      { size: 'V20', contents: 3.8 },
      { size: 'Z10', contents: 1.9 },
    ],
  },
  argon: {
    id: 'argon',
    name: 'ARGON',
    formula: 'Ar',
    un: '1006',
    state: 'compressed',
    adr: ['2.2'],
    hazards: [UNDER_PRESSURE, ASPHYXIANT],
    shoulder: RAL.darkGreen,
    body: BODY_GREY,
    thread: { hand: 'right', name: 'BS 341 No. 3, ⅝" BSP RH' },
    rpv: true,
    spindle: 'handwheel',
    guard: 'tulip',
    wp: 230,
    tp: 345,
    testYears: 10,
    fills: [
      { size: 'L50', contents: 11.1 },
      { size: 'Z10', contents: 2.2 },
    ],
  },
  co2: {
    id: 'co2',
    name: 'CARBON DIOXIDE',
    formula: 'CO₂',
    un: '1013',
    state: 'liquefied',
    adr: ['2.2'],
    hazards: [UNDER_PRESSURE, ASPHYXIANT],
    shoulder: RAL.grey,
    body: BODY_BLACK,
    thread: { hand: 'right', name: 'BS 341 No. 8, 0.860" RH' },
    rpv: true,
    spindle: 'handwheel',
    guard: 'tulip',
    wp: 50,
    tp: 250,
    testYears: 10,
    fills: [
      { size: 'L50', contents: 34 },
      { size: 'Z10', contents: 6.35 },
      { size: 'X2', contents: 1.3 },
    ],
  },
  air: {
    id: 'air',
    name: 'AIR, COMPRESSED',
    formula: 'Air',
    un: '1002',
    state: 'compressed',
    adr: ['2.2'],
    hazards: [UNDER_PRESSURE],
    shoulder: RAL.brightGreen,
    body: BODY_GREY,
    thread: { hand: 'right', name: 'BS 341 No. 3, ⅝" BSP RH' },
    rpv: true,
    spindle: 'handwheel',
    guard: 'tulip',
    wp: 230,
    tp: 345,
    testYears: 10,
    fills: [
      { size: 'L50', contents: 10.2 },
      { size: 'Z10', contents: 2.0 },
    ],
  },
  helium: {
    id: 'helium',
    name: 'HELIUM',
    formula: 'He',
    un: '1046',
    state: 'compressed',
    adr: ['2.2'],
    hazards: [UNDER_PRESSURE, ASPHYXIANT],
    shoulder: RAL.brown,
    body: BODY_GREY,
    thread: { hand: 'right', name: 'BS 341 No. 3, ⅝" BSP RH' },
    rpv: true,
    spindle: 'handwheel',
    guard: 'tulip',
    wp: 230,
    tp: 345,
    testYears: 10,
    fills: [
      { size: 'L50', contents: 9.0 },
      { size: 'Z10', contents: 1.8 },
    ],
  },
  hydrogen: {
    id: 'hydrogen',
    name: 'HYDROGEN',
    formula: 'H₂',
    un: '1049',
    state: 'compressed',
    adr: ['2.1'],
    hazards: [FLAMMABLE, UNDER_PRESSURE],
    shoulder: RAL.red,
    body: RAL.red.hex,
    thread: { hand: 'left', name: 'BS 341 No. 4, ⅝" BSP LH' },
    rpv: true,
    spindle: 'handwheel',
    guard: 'tulip',
    wp: 200,
    tp: 300,
    testYears: 10,
    fills: [
      { size: 'L50', contents: 8.5 },
      { size: 'Z10', contents: 1.7 },
    ],
  },
  acetylene: {
    id: 'acetylene',
    name: 'ACETYLENE, DISSOLVED',
    formula: 'C₂H₂',
    un: '1001',
    state: 'dissolved',
    adr: ['2.1'],
    hazards: [
      FLAMMABLE,
      'H230 May react explosively even in the absence of air.',
      UNDER_PRESSURE,
    ],
    shoulder: RAL.maroon,
    body: RAL.maroon.hex,
    thread: { hand: 'left', name: 'BS 341 No. 4, ⅝" BSP LH' },
    rpv: false,
    spindle: 'key',
    guard: 'none',
    wp: 15,
    tp: 60,
    testYears: 10,
    fills: [
      { size: 'A40', contents: 7.6 },
      { size: 'Z10', contents: 1.6 },
    ],
  },
  propane: {
    id: 'propane',
    name: 'PROPANE',
    formula: 'C₃H₈',
    un: '1978',
    state: 'liquefied',
    adr: ['2.1'],
    hazards: [FLAMMABLE, UNDER_PRESSURE],
    shoulder: { hex: '#b82e22', ral: 'none (LPG)' },
    body: '#b82e22',
    thread: { hand: 'left', name: 'POL, 0.885" LH' },
    rpv: false,
    spindle: 'handwheel',
    guard: 'shroud',
    wp: 7,
    tp: 30,
    testYears: 10,
    fills: [
      { size: 'P47', contents: 47 },
      { size: 'P19', contents: 19 },
      { size: 'P13', contents: 13 },
      { size: 'F18', contents: 18 },
    ],
  },
  butane: {
    id: 'butane',
    name: 'BUTANE',
    formula: 'C₄H₁₀',
    un: '1011',
    state: 'liquefied',
    adr: ['2.1'],
    hazards: [FLAMMABLE, UNDER_PRESSURE],
    shoulder: { hex: '#2456a4', ral: 'none (LPG)' },
    body: '#2456a4',
    thread: { hand: 'left', name: 'W20 × 1/14" LH' },
    rpv: false,
    spindle: 'handwheel',
    guard: 'shroud',
    wp: 2,
    tp: 30,
    testYears: 10,
    fills: [
      { size: 'B15', contents: 15 },
      { size: 'B7', contents: 7 },
    ],
  },
  chlorine: {
    id: 'chlorine',
    name: 'CHLORINE',
    formula: 'Cl₂',
    un: '1017',
    state: 'liquefied',
    adr: ['2.3', '5.1', '8'],
    hazards: [
      OXIDISER,
      UNDER_PRESSURE,
      'H331 Toxic if inhaled.',
      'H315 H319 H335 Irritates skin, eyes and lungs.',
      'H400 Very toxic to aquatic life.',
    ],
    shoulder: RAL.yellow,
    body: BODY_GREY,
    thread: { hand: 'right', name: 'BS 341 No. 11, 0.885" RH' },
    rpv: false,
    spindle: 'key',
    guard: 'cap',
    wp: 6,
    tp: 22,
    testYears: 5,
    fills: [{ size: 'C33', contents: 33 }],
  },
  refrigerant: {
    id: 'refrigerant',
    name: 'REFRIGERANT R134a',
    formula: 'CH₂FCF₃',
    un: '3159',
    state: 'liquefied',
    adr: ['2.2'],
    hazards: [UNDER_PRESSURE, ASPHYXIANT],
    shoulder: RAL.brightGreen,
    body: '#7fa7c9',
    thread: { hand: 'right', name: '¼" SAE flare RH' },
    rpv: false,
    spindle: 'handwheel',
    guard: 'shroud',
    wp: 5,
    tp: 22,
    testYears: 10,
    fills: [{ size: 'R13', contents: 12 }],
  },
};

/** The flammable gases: red flame labels, left-hand threads. */
export const isFlammable = (gas: GasId) => GASES[gas].adr.includes('2.1');

/** What a cylinder's contents tag says. */
export type Contents = 'full' | 'in-use' | 'empty';

/** One kind of cylinder: a gas in a size. */
export interface CylinderKind {
  gas: GasKind;
  size: CylinderSize;
  fill: GasFill;
  /** Its key: one shared set of labels and shapes per kind. */
  key: string;
}

/** A gas in one of its sizes; it throws for a size the supplier does not fill. */
export function cylinderKind(gas: GasId, size?: SizeId): CylinderKind {
  const g = GASES[gas];
  const fill = size ? g.fills.find((f) => f.size === size) : g.fills[0];
  if (!fill) throw new Error(`${gas} is not filled in size ${size}`);
  return {
    gas: g,
    size: CYLINDER_SIZES[fill.size],
    fill,
    key: `${gas}:${fill.size}`,
  };
}

/** Its contents as a supplier writes them: "34 kg" or "10.6 m³". */
export const contentsText = (k: CylinderKind) =>
  `${k.fill.contents} ${k.gas.state === 'compressed' ? 'm³' : 'kg'}`;

/** A cylinder's name, as the overlay gives it: "Carbon dioxide cylinder, 50 l (34 kg)". */
export function cylinderName(k: CylinderKind) {
  const name = k.gas.name
    .toLowerCase()
    .replace(/^./, (c) => c.toUpperCase())
    .replace(/r134a/, 'R134a');
  return `${name} cylinder, ${k.size.litres} l (${contentsText(k)})`;
}

/** What its tag shows, as the overlay reads it. */
export const CONTENTS_WORDS: Record<Contents, string> = {
  full: 'FULL',
  'in-use': 'IN USE',
  empty: 'EMPTY',
};

/** Its tag's ground: full green, in use yellow, empty red (the colours our supplier prints its perforated tags in). */
export const CONTENTS_COLOURS: Record<
  Contents,
  { ground: string; ink: string }
> = {
  full: { ground: '#3f9b3a', ink: '#111111' },
  'in-use': { ground: '#e5c43a', ink: '#111111' },
  empty: { ground: '#c42b23', ink: '#f2f2ee' },
};

/** A small stable hash of a kind's key, for its serial and its test date. */
const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++)
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

/** Its last periodic test and when the next is due, month and year. */
export function testDates(k: CylinderKind) {
  const h = hash(k.key);
  const month = (h % 12) + 1;
  // Tested within the last interval, so never yet due in 2026.
  const year = 2026 - ((h >>> 4) % (k.gas.testYears - 1)) - 1;
  const mm = String(month).padStart(2, '0');
  return {
    tested: `${mm}/${year}`,
    due: `${mm}/${year + k.gas.testYears}`,
  };
}

/**
 * The marks stamped into its shoulder (BS EN ISO 13769): its serial, the
 * test pressure and working pressure, tare, water capacity, and its last
 * test's date.
 */
export function stampLines(k: CylinderKind): string[] {
  const serial = `AG${String(hash(k.key) % 1000000).padStart(6, '0')}`;
  const { tested } = testDates(k);
  return [
    `${serial}  WC ${k.size.litres} L  TARE ${k.size.tare} kg`,
    `PH ${k.gas.tp} BAR  PW ${k.gas.wp} BAR  ${tested}`,
  ];
}

/** The overlay's status (its name says the gas): its contents when full, and only what its tag says. */
export function cylinderStatus(k: CylinderKind, contents: Contents) {
  return `${contentsText(k)} when full; tag ${CONTENTS_WORDS[contents]}`;
}

/** A cylinder's contents tag from its contents and how full it was: full when untouched, empty when spent, otherwise in use. */
export function contentsFrom(kg: number, full: number, spent = 0): Contents {
  if (kg >= full - 1e-6) return 'full';
  if (kg <= spent + 1e-6) return 'empty';
  return 'in-use';
}

/**
 * The lathe profile of a seamless cylinder, (radius, height) pairs, metres:
 * a domed foot inside a foot ring, straight sides, a hemispherical shoulder
 * up to the neck. `shoulderFrom` is where the shoulder colour starts.
 */
export function seamlessProfile(size: CylinderSize) {
  const r = size.dia / 2;
  const neck = Math.max(0.018, r * 0.25);
  const top = size.h;
  const dome = Math.min(r * 0.9, top * 0.25);
  const shoulderFrom = top - dome;
  const body: [number, number][] = [
    [0, 0.02],
    [r * 0.7, 0.02],
    [r * 0.97, 0.05],
    [r, 0.08],
    [r, shoulderFrom],
    [0, shoulderFrom],
  ];
  const shoulder: [number, number][] = [];
  const steps = 8;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * (Math.PI / 2);
    shoulder.push([
      Math.max(neck, r * Math.cos(a)),
      shoulderFrom + dome * Math.sin(a),
    ]);
  }
  shoulder.push([0, top]);
  return { body, shoulder, shoulderFrom, neck, top };
}

/**
 * A welded (LPG-style) cylinder's profile: two pressed domes on a short
 * body, standing on a foot ring, its shroud above; `domeTop` is where the
 * shroud starts.
 */
export function weldedProfile(size: CylinderSize) {
  const r = size.dia / 2;
  const foot = Math.min(0.06, size.h * 0.08);
  const shroud = Math.min(0.14, size.h * 0.18);
  const domeTop = size.h - shroud + 0.03;
  const d = r * 0.35;
  const body: [number, number][] = [
    [0, foot],
    [r * 0.6, foot],
    [r * 0.9, foot + d * 0.4],
    [r, foot + d],
    [r, domeTop - d],
    [r * 0.9, domeTop - d * 0.4],
    [r * 0.6, domeTop - d * 0.1],
    [0, domeTop],
  ];
  return { body, foot, domeTop, shroud };
}
