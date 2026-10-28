import { expandForPlumbing } from './plumbing-expansion';
import type {
  Expansion,
  GivenFitting,
  PlumbEdge,
} from './plumbing-expansion';
import type { SchematicNode } from './schematics';
import { DIAPHRAGM_PUMPS } from '../../toolkit/components/plant/logic/diaphragm-pump';
import { DMH } from '../../toolkit/components/plant/logic/motor-dosing-pump';
import { PERI_30 } from '../../toolkit/components/plant/logic/metering-pump';
import { PUMP_CURVE } from './circulation';

/**
 * Hall 6 of the museum, "Grundflow's Amazing World of Pumps" (107j; the
 * owner, 2026-10-28: "Pumps for every occasion"). Eleven of the game's
 * pumps, from a 2 l/h solenoid dosing pump to a 45 kW split-case pump,
 * each draw from an ideal clean-water reservoir (CW1) and fill one
 * 1,000-litre test tank (TK1) through their own fill lines and a shared
 * inlet header (HD1). The visitor runs any of them; the tank's level is
 * shared and cumulative; at full, the high-level float switch LSH1 trips
 * every pump, and a press then only bleeps; RESET opens the drain valve
 * and empties the tank to the ideal drain (DR1).
 *
 * The positive-displacement pumps deliver their stroke volume, a little
 * less against pressure; the centrifugal pumps run on their curves
 * against the lift to the header, their fill lines and the shared
 * header, solved together, each line's commissioning valve set so that,
 * alone, the pump runs at its rated duty (107j's research: on their
 * curves alone against a 1.7 m lift they would run off the end of them).
 *
 * Every fitting is given, so the plumber adds nothing; tags derived (room
 * code M6). Pure; litres, m³/h, metres of head, bar, seconds.
 */

// ---- The pumps -----------------------------------------------------------------

/** The hall's room code: its number (107-0). */
export const ROOM_CODE = 'M6';

export type PumpNo = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;
export const PUMP_NOS: readonly PumpNo[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

export type PumpFamily = 'displacement' | 'centrifugal';

interface PumpBase {
  no: PumpNo;
  /** Its model, as its plate gives it. */
  model: string;
  /** What kind of pump it is, in words. */
  kind: string;
  /** Its node's kind in the schematic. */
  node: string;
  /** In a pool, what it is for. */
  job: string;
  /** Its motor's power, kW, and where that figure comes from. */
  kW: number;
  /** Where its figures come from. */
  source: string;
  /** Its fill line's bore, DN (mm). */
  dn: number;
}

export interface DisplacementPump extends PumpBase {
  family: 'displacement';
  /** Its most, l/h, and the pressure it is rated against, bar. */
  ratedLh: number;
  maxBar: number;
}

export interface CentrifugalPump extends PumpBase {
  family: 'centrifugal';
  /** Its curve: H = shutoff − k·Q², metres and m³/h; its duty point. */
  shutoff: number;
  dutyFlow: number;
  dutyHead: number;
  /** Its discharge valve throttles (a butterfly on a notch plate). */
  throttle: boolean;
  /** Stands in the reservoir, drawing through its own strainer (no suction line). */
  submersible?: boolean;
}

export type HallPump = DisplacementPump | CentrifugalPump;

const curve = (
  shutoff: number,
  dutyFlow: number,
  dutyHead: number,
): Pick<CentrifugalPump, 'shutoff' | 'dutyFlow' | 'dutyHead'> => ({
  shutoff,
  dutyFlow,
  dutyHead,
});

/**
 * The eleven, smallest to largest (107j's table, its research's figures;
 * where the brief and the game's own models disagree, the game's win).
 */
export const PUMPS: readonly HallPump[] = [
  {
    no: 1,
    family: 'displacement',
    model: `Grundflow ${DIAPHRAGM_PUMPS.solenoid.model}`,
    kind: 'solenoid diaphragm dosing pump',
    node: 'diaphragm-pump',
    job: 'dosing hypochlorite',
    kW: 0.02,
    ratedLh: DIAPHRAGM_PUMPS.solenoid.maxLh,
    maxBar: 16,
    source: 'the game’s DMX 1602 (after ProMinent gamma/ X GMXa 1602)',
    dn: 6,
  },
  {
    no: 2,
    family: 'displacement',
    model: `Grundflow ${DIAPHRAGM_PUMPS.stepper.model}`,
    kind: 'stepper diaphragm dosing pump',
    node: 'diaphragm-pump',
    job: 'dosing acid',
    kW: 0.025,
    ratedLh: DIAPHRAGM_PUMPS.stepper.maxLh,
    maxBar: 16,
    source: 'the game’s DDS 7.5-16 (after Grundfos SMART Digital DDA 7.5-16)',
    dn: 6,
  },
  {
    no: 3,
    family: 'displacement',
    model: `Grundflow ${DMH.model}`,
    kind: 'motor-driven diaphragm dosing pump',
    node: 'diaphragm-pump',
    job: 'a big pool’s hypochlorite',
    kW: 0.11,
    ratedLh: DMH.maxLh,
    maxBar: DMH.maxBar,
    source: 'the game’s DMH 21-10 (after ProMinent Sigma/ 1), 110 W motor',
    dn: 6,
  },
  {
    no: 4,
    family: 'displacement',
    model: `Grundflow ${PERI_30.model}`,
    kind: 'peristaltic dosing pump',
    node: 'peristaltic-pump',
    job: 'dosing flocculant',
    kW: 0.1,
    ratedLh: PERI_30.maxLh,
    maxBar: PERI_30.maxBar,
    source: 'the game’s PERI 30 (after Watson-Marlow Qdos 30)',
    dn: 6,
  },
  {
    no: 5,
    family: 'centrifugal',
    model: 'Grundflow MX 6',
    kind: 'magnetic-drive centrifugal pump',
    node: 'mag-drive-pump',
    job: 'transferring hypochlorite to a day tank',
    kW: 0.4,
    ...curve(11, 6, 8),
    throttle: false,
    source: 'Iwaki MX class, indicative',
    dn: 25,
  },
  {
    no: 6,
    family: 'centrifugal',
    model: 'Grundflow Unilift 12',
    kind: 'submersible sump pump',
    node: 'submersible-pump',
    job: 'emptying a plant room’s sump',
    kW: 1.5,
    ...curve(9, 10.8, 5),
    throttle: false,
    submersible: true,
    source:
      'Grundfos Unilift AP12 class, indicative; its power the game’s pit pump’s (site-intake.ts)',
    dn: 40,
  },
  {
    no: 7,
    family: 'centrifugal',
    model: 'Grundflow SPA 7',
    kind: 'self-priming spa pump',
    node: 'spa-pump',
    job: 'a spa’s circulation',
    kW: 0.3,
    ...curve(11, 7, 8),
    throttle: false,
    source: 'the game’s spa pump (after Speck BADU Prime 7: 7 m³/h, 0.3 kW)',
    dn: 40,
  },
  {
    no: 8,
    family: 'centrifugal',
    model: 'Grundflow MAGNA D 65-120',
    kind: 'twin-head in-line circulator',
    node: 'twin-head-pump',
    job: 'a boiler’s heating circuit',
    kW: 1.1,
    ...curve(12.5, 30, 10),
    throttle: false,
    source:
      'the game’s twin-head circulator (after Grundfos MAGNA3 D 65-120 F), one head, indicative',
    dn: 65,
  },
  {
    no: 9,
    family: 'centrifugal',
    model: 'Grundflow NKC 125-250',
    kind: 'end-suction centrifugal pump',
    node: 'end-suction-pump',
    job: 'a 25 m pool’s circulation',
    kW: 7.5,
    ...curve(PUMP_CURVE.shutoff, 160, 9.6),
    throttle: true,
    source: 'the game’s lounge pool pump (PUMP_CURVE, circulation.ts)',
    dn: 150,
  },
  {
    no: 10,
    family: 'centrifugal',
    model: 'Grundflow NKC 150-315',
    kind: 'end-suction centrifugal pump',
    node: 'end-suction-pump',
    job: 'a big pool’s circulation',
    kW: 22,
    ...curve(22, 300, 18),
    throttle: true,
    source: 'the game’s NKC 150-315 (dev51’s and Hall 1’s curve)',
    dn: 200,
  },
  {
    no: 11,
    family: 'centrifugal',
    model: 'Grundflow HSC 250-500',
    kind: 'horizontal split-case pump',
    node: 'split-case-pump',
    job: 'an Olympic pool’s circulation',
    kW: 45,
    ...curve(26, 625, 20),
    throttle: true,
    source:
      'Grundfos HS range, 4-pole 45 kW, indicative: 2,500 m³ turned over in four hours',
    dn: 250,
  },
];

export const pumpOf = (no: PumpNo) => PUMPS[no - 1];

// ---- The schematic ---------------------------------------------------------------

export type MachineId = 'source' | 'drain' | 'tank' | 'header' | `p${PumpNo}`;

export const pumpId = (no: PumpNo) => `p${no}` as const;

export const NODES: readonly (SchematicNode & { id: MachineId })[] = [
  {
    id: 'source',
    kind: 'ideal-water-source',
    code: 'CW1',
    name: 'Ideal clean-water reservoir',
  },
  ...PUMPS.map((p) => ({
    id: pumpId(p.no),
    kind: p.node,
    code: `P${p.no}`,
    name: `${p.model} ${p.kind}`,
  })),
  { id: 'header', kind: 'manifold', code: 'HD1', name: 'Tank inlet header' },
  { id: 'tank', kind: 'test-tank', code: 'TK1', name: '1,000-litre test tank' },
  { id: 'drain', kind: 'ideal-drain', code: 'DR1', name: 'Ideal drain' },
];

export type LinkId =
  | `suction${PumpNo}`
  | `delivery${PumpNo}`
  | 'fill'
  | 'overflow'
  | 'drainLine';

const link = (
  id: LinkId,
  from: [MachineId, string],
  to: [MachineId, string],
): PlumbEdge & { id: LinkId } => ({
  id,
  sourceId: from[0],
  sourcePort: from[1],
  targetId: to[0],
  targetPort: to[1],
  medium: 'water',
});

/** Whether a pump has a suction line (the submersible stands in the water). */
export const hasSuction = (p: HallPump) =>
  !(p.family === 'centrifugal' && p.submersible);

/** The links, each the way its water flows. */
export const LINKS: readonly (PlumbEdge & { id: LinkId })[] = [
  ...PUMPS.filter(hasSuction).map((p) =>
    link(
      `suction${p.no}`,
      ['source', `out-${p.no}`],
      [pumpId(p.no), 'suction'],
    ),
  ),
  ...PUMPS.map((p) =>
    link(
      `delivery${p.no}`,
      [pumpId(p.no), 'discharge'],
      ['header', `in-${p.no}`],
    ),
  ),
  link('fill', ['header', 'out'], ['tank', 'inlet']),
  link('overflow', ['tank', 'overflow'], ['drain', 'in-1']),
  link('drainLine', ['tank', 'drain'], ['drain', 'in-2']),
];

export const LINK_NAMES: Record<string, string> = Object.fromEntries([
  ...PUMPS.map((p) => [`suction${p.no}`, `P${p.no} suction`]),
  ...PUMPS.map((p) => [`delivery${p.no}`, `P${p.no} fill line`]),
  ['fill', 'Tank fill'],
  ['overflow', 'Tank overflow'],
  ['drainLine', 'Tank drain'],
]);

/** Each link's bore, DN. */
export const LINK_DN: Record<string, number> = Object.fromEntries([
  ...PUMPS.map((p) => [`suction${p.no}`, p.dn === 6 ? 6 : p.dn]),
  ...PUMPS.map((p) => [`delivery${p.no}`, p.dn]),
  ['fill', 300],
  ['overflow', 150],
  ['drainLine', 300],
]);

export interface HallFitting extends GivenFitting {
  of: MachineId;
  /** A valve's body. */
  body?: 'ball' | 'butterfly' | 'commissioning' | 'motorised';
  /** A flowmeter's kind, as suits its size. */
  meter?: 'pump-display' | 'rotameter' | 'electromagnetic';
}

/** A pump's flowmeter: the dosing pumps' own displays, rotameters on the small lines, mag meters on the big. */
const meterOf = (p: HallPump): HallFitting['meter'] =>
  p.family === 'displacement'
    ? 'rotameter'
    : p.dn <= 65
      ? 'rotameter'
      : 'electromagnetic';

/**
 * Every fitting, in the order each machine's are numbered: each pump's
 * suction isolator (V1), its non-return valve, its discharge isolator
 * (V2, a throttling butterfly on the big three), its fill line's
 * commissioning valve (V3, the centrifugal pumps', set to duty), and its
 * flowmeter; the tank's motorised drain valve.
 */
export const FITTINGS: readonly HallFitting[] = [
  ...PUMPS.flatMap((p): HallFitting[] => {
    const id = pumpId(p.no);
    const big = p.dn >= 150;
    const out: HallFitting[] = [];
    if (hasSuction(p))
      out.push({
        id: `${id}.suction.iso`,
        kind: 'isolating-valve',
        edge: `suction${p.no}`,
        end: 'target',
        normally: 'open',
        role: 'suction isolating',
        operator: 'lever',
        body: big ? 'butterfly' : 'ball',
        of: id,
      });
    out.push(
      {
        id: `${id}.nrv`,
        kind: 'non-return-valve',
        edge: `delivery${p.no}`,
        end: 'source',
        normally: 'open',
        role: 'non-return',
        of: id,
      },
      {
        id: `${id}.discharge.iso`,
        kind: 'isolating-valve',
        edge: `delivery${p.no}`,
        end: 'source',
        normally: 'open',
        role: p.family === 'centrifugal' && p.throttle ? 'discharge throttling' : 'discharge isolating',
        operator: 'lever',
        body: big ? 'butterfly' : 'ball',
        of: id,
      },
      {
        id: `${id}.fi`,
        kind: 'flowmeter',
        edge: `delivery${p.no}`,
        end: 'source',
        normally: 'open',
        role: `P${p.no} delivery`,
        meter: meterOf(p),
        of: id,
      },
    );
    if (p.family === 'centrifugal')
      out.push({
        id: `${id}.cv`,
        kind: 'isolating-valve',
        edge: `delivery${p.no}`,
        end: 'target',
        normally: 'open',
        role: 'commissioning (set to duty)',
        operator: 'lever',
        body: 'commissioning',
        of: id,
      });
    return out;
  }),
  {
    id: 'tank.drain.mv',
    kind: 'isolating-valve',
    edge: 'drainLine',
    end: 'source',
    normally: 'closed',
    role: 'tank drain',
    operator: 'motor',
    body: 'motorised',
    of: 'tank',
  },
];

export const fittingById = (id: string) => FITTINGS.find((f) => f.id === id);

/** The throttling butterflies: the big three pumps' discharge valves. */
export const THROTTLES: readonly string[] = FITTINGS.filter(
  (f) => f.role === 'discharge throttling',
).map((f) => f.id);

export type InstrumentKind = 'pressure' | 'level-gauge' | 'level' | 'level-switch';

export interface Instrument {
  id: string;
  kind: InstrumentKind;
  role: string;
  on: MachineId;
  unit: string;
}

/** The instruments: the big pumps' suction and discharge gauges, and the tank's level gauge, transmitter and float switch. */
export const INSTRUMENTS: readonly Instrument[] = [
  ...PUMPS.filter((p) => p.dn >= 150).flatMap((p): Instrument[] => [
    {
      id: `${pumpId(p.no)}.suction.pi`,
      kind: 'pressure',
      role: `P${p.no} suction`,
      on: pumpId(p.no),
      unit: 'bar',
    },
    {
      id: `${pumpId(p.no)}.discharge.pi`,
      kind: 'pressure',
      role: `P${p.no} discharge`,
      on: pumpId(p.no),
      unit: 'bar',
    },
  ]),
  { id: 'tank.li', kind: 'level-gauge', role: 'tank sight tube', on: 'tank', unit: 'L' },
  { id: 'tank.lt', kind: 'level', role: 'tank level', on: 'tank', unit: 'L' },
  { id: 'tank.lsh', kind: 'level-switch', role: 'tank high level', on: 'tank', unit: '' },
];

// ---- Tags, derived -------------------------------------------------------------

const nodeById = new Map(NODES.map((n) => [n.id, n]));
export const machineTag = (id: MachineId) =>
  `${ROOM_CODE}-${nodeById.get(id)!.code}`;

const LETTERS: Record<InstrumentKind, string> = {
  pressure: 'PI',
  'level-gauge': 'LI',
  level: 'LT',
  'level-switch': 'LSH',
};

/**
 * Every tag, derived: a valve its machine's tag and its number among that
 * machine's valves (M6-P9-V2; a non-return valve NRV); a flowmeter FI and
 * its pump's number (each pump's own readout, FI1 to FI11); an instrument
 * its ISA letters and its number among those of its kind.
 */
export const TAGS: Readonly<Record<string, string>> = (() => {
  const tags: Record<string, string> = {};
  const count = new Map<string, number>();
  const next = (key: string) => {
    const n = (count.get(key) ?? 0) + 1;
    count.set(key, n);
    return n;
  };
  for (const f of FITTINGS) {
    if (f.kind === 'flowmeter') tags[f.id] = `${ROOM_CODE}-FI${next('FI')}`;
    else {
      const letter = f.kind === 'non-return-valve' ? 'NRV' : 'V';
      tags[f.id] = `${machineTag(f.of)}-${letter}${next(`${f.of}.${letter}`)}`;
    }
  }
  for (const i of INSTRUMENTS) {
    const letters = LETTERS[i.kind];
    tags[i.id] = `${ROOM_CODE}-${letters}${next(letters)}`;
  }
  for (const n of NODES) tags[n.id] = machineTag(n.id);
  return tags;
})();

/** A tag without its room code: P9-V2. */
export const shortTag = (id: string) => TAGS[id].slice(ROOM_CODE.length + 1);

/** What a fitting is, in words, from the model. */
export function fittingName(f: HallFitting): string {
  const role = f.role ?? '';
  const words = role.charAt(0).toUpperCase() + role.slice(1);
  if (f.kind === 'flowmeter')
    return f.meter === 'electromagnetic'
      ? `${words} flowmeter (electromagnetic)`
      : `${words} flowmeter (variable area)`;
  if (f.kind === 'non-return-valve') return 'Non-return valve';
  if (f.body === 'motorised') return `${words} motorised valve`;
  if (f.body === 'commissioning') return 'Commissioning valve (set to duty)';
  if (f.body === 'butterfly') return `${words} butterfly valve`;
  return `${words} ball valve`;
}

/** The plumber's rules: none asked; every fitting is the schematic's. */
export const RULES = {
  isolate: new Set<string>(),
  pumps: new Set(PUMPS.map((p) => p.node)),
  discharge: 'discharge',
} as const;

/** The enhanced network. */
export function hall6Expansion(): Expansion {
  return expandForPlumbing(NODES, LINKS, { ...RULES, given: FITTINGS });
}

// ---- The physics -------------------------------------------------------------

/** The tank: 1.1 m across; full (LSH1) at 1,000 litres; its overflow weir at 1.15 m. */
export const TANK = {
  diameter: 1.1,
  fullL: 1000,
  overflowM: 1.15,
  /** Its stand's height, m, and the header's inlet above the floor, m. */
  stand: 0.3,
} as const;
export const TANK_AREA = Math.PI * (TANK.diameter / 2) ** 2;
export const levelOf = (litres: number) => litres / 1000 / TANK_AREA;
export const OVERFLOW_L = TANK.overflowM * TANK_AREA * 1000;

/** The lift every pump pumps against: from the reservoir's surface (the floor) to the header over the tank, m. */
export const LIFT = 1.7;
/** Metres of water to bar. */
export const BAR_PER_M = 0.0981;
/** A displacement pump's slip: its delivery falls this share at its rated pressure (indicative). */
export const SLIP = 0.1;
/** The shared header, fill pipe and diffuser: 1 m lost at the showpiece's duty. */
export const HEADER_R = 1 / 625 ** 2;
/** An open butterfly's share of a big pump's fill line loss at duty, m. */
export const VALVE_OPEN_M = 0.15;
/** The drain: DN300 through the tank's floor, its coefficient of discharge. */
export const DRAIN = { area: Math.PI * 0.15 ** 2, cd: 0.6 } as const;

/** The notches a butterfly's plate holds, and its characteristic (Hall 1's). */
export const NOTCHES: readonly number[] = [0, 0.2, 0.4, 0.6, 0.8, 1];
export const valveCharacteristic = (opening: number) =>
  Math.max(0, Math.min(1, opening)) ** 3;

const k = (p: CentrifugalPump) => (p.shutoff - p.dutyHead) / p.dutyFlow ** 2;

/**
 * Each centrifugal pump's fill line, its commissioning valve set so that,
 * alone, it delivers its duty: m per (m³/h)², the whole line from the
 * reservoir to the header (its suction, valves, meter and the set valve).
 */
export const lineResistance = (p: CentrifugalPump) =>
  (p.dutyHead - LIFT - HEADER_R * p.dutyFlow ** 2) / p.dutyFlow ** 2;

/** A displacement pump's delivery against `bar`, l/h. */
export const displacementLh = (p: DisplacementPump, bar: number) =>
  p.ratedLh * (1 - SLIP * Math.min(1, Math.max(0, bar) / p.maxBar));

export interface Hall6State {
  /** Each pump's RUN: pressed on (and not tripped). */
  running: Record<PumpNo, boolean>;
  /** Each throttling butterfly's opening, 0 to 1. */
  opening: Record<string, number>;
  /** The tank's contents, litres. */
  litres: number;
  /** LSH1 has tripped every pump; cleared by RESET. */
  tripped: boolean;
  /** The drain valve open (RESET), until the tank is empty. */
  draining: boolean;
  /** Presses refused while tripped: the view bleeps on each new one. */
  refused: number;
  /** For the tests: LSH1 failed (the overflow is the backstop). */
  switchFailed: boolean;
  /** Litres gone over the weir to the drain. */
  overflowedL: number;
  /** Real seconds since the last reset, for the RESET lamp. */
  sinceReset: number;
}

const allStopped = () =>
  Object.fromEntries(PUMP_NOS.map((n) => [n, false])) as Record<
    PumpNo,
    boolean
  >;

/** The hall's reset state: the tank empty, every pump stopped, every trip clear (RESET's end, and every entry). */
export function newHall6(): Hall6State {
  return {
    running: allStopped(),
    opening: Object.fromEntries(THROTTLES.map((id) => [id, 1])),
    litres: 0,
    tripped: false,
    draining: false,
    refused: 0,
    switchFailed: false,
    overflowedL: 0,
    sinceReset: 0,
  };
}

export type Hall6Action =
  | { type: 'run'; no: PumpNo }
  | { type: 'notch'; id: string; by: number }
  | { type: 'reset' }
  | { type: 'fail-switch' };

/** What an action does to the hall. */
export function actOnHall6(s: Hall6State, a: Hall6Action): Hall6State {
  switch (a.type) {
    case 'run':
      // Locked out at full: a press is refused (the bleep), nothing else.
      if (s.tripped) return { ...s, refused: s.refused + 1 };
      return { ...s, running: { ...s.running, [a.no]: !s.running[a.no] } };
    case 'notch': {
      const at = NOTCHES.findIndex((n) => Math.abs(n - s.opening[a.id]) < 1e-6);
      const to = Math.max(
        0,
        Math.min(NOTCHES.length - 1, (at < 0 ? 5 : at) + a.by),
      );
      return { ...s, opening: { ...s.opening, [a.id]: NOTCHES[to] } };
    }
    case 'reset':
      return {
        ...newHall6(),
        litres: s.litres,
        draining: s.litres > 0,
        refused: s.refused,
      };
    case 'fail-switch':
      return { ...s, switchFailed: true };
  }
}

/** A centrifugal pump's line now, with its butterfly at `opening`. */
function resistanceNow(p: CentrifugalPump, opening: number) {
  const r = lineResistance(p);
  if (!p.throttle) return r;
  const c = valveCharacteristic(opening);
  if (c <= 0) return Infinity;
  const valve = VALVE_OPEN_M / p.dutyFlow ** 2;
  return r - valve + valve / c;
}

/**
 * Every pump's delivery, m³/h, with `running` those running: the
 * centrifugal ones solved together on the shared header (the header's
 * loss found by bisection), the displacement ones against the lift.
 */
export function deliveries(
  running: (no: PumpNo) => boolean,
  opening: (id: string) => number = () => 1,
): Record<PumpNo, number> {
  const out = Object.fromEntries(PUMP_NOS.map((n) => [n, 0])) as Record<
    PumpNo,
    number
  >;
  const pdBar = LIFT * BAR_PER_M;
  for (const p of PUMPS)
    if (p.family === 'displacement' && running(p.no))
      out[p.no] = displacementLh(p, pdBar) / 1000;
  const live = PUMPS.filter(
    (p): p is CentrifugalPump => p.family === 'centrifugal' && running(p.no),
  ).map((p) => ({
    p,
    r: resistanceNow(p, opening(`${pumpId(p.no)}.discharge.iso`)),
  }));
  const pd = PUMP_NOS.reduce((s, n) => s + out[n], 0);
  const flowsAt = (hh: number) =>
    live.map(({ p, r }) =>
      Number.isFinite(r)
        ? Math.sqrt(Math.max(0, (p.shutoff - LIFT - hh) / (k(p) + r)))
        : 0,
    );
  if (live.length) {
    let lo = 0;
    let hi = Math.max(...live.map(({ p }) => p.shutoff));
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2;
      const q = flowsAt(mid).reduce((s, v) => s + v, 0) + pd;
      if (HEADER_R * q * q > mid) lo = mid;
      else hi = mid;
    }
    flowsAt((lo + hi) / 2).forEach((q, i) => (out[live[i].p.no] = q));
  }
  return out;
}

/** A pump's delivery alone, m³/h: what its sign's time is worked from. */
export const deliveryAlone = (no: PumpNo) =>
  deliveries((n) => n === no)[no];

/** How long a pump alone takes to fill the tank from empty, seconds. */
export const fillSeconds = (no: PumpNo) =>
  (TANK.fullL / 1000 / deliveryAlone(no)) * 3600;

/** Two significant figures. */
const twoFigures = (v: number) => {
  if (v >= 10) return Math.round(v);
  return Math.round(v * 10) / 10;
};

/**
 * A duration in friendly units, to two figures: "17 seconds", "10
 * minutes", "33 hours", "5.5 days", "2.8 weeks".
 */
export function friendlyDuration(seconds: number): string {
  const units: [number, string][] = [
    [1, 'second'],
    [60, 'minute'],
    [3600, 'hour'],
    [86400, 'day'],
    [7 * 86400, 'week'],
  ];
  const limits = [90, 90 * 60, 48 * 3600, 30 * 86400, Infinity];
  const k = limits.findIndex((l) => seconds < l);
  const [size, name] = units[k];
  const v = twoFigures(seconds / size);
  return `${v.toLocaleString('en-GB')} ${name}${v === 1 ? '' : 's'}`;
}

/** The sign's sentence for a pump, from the model. */
export const fillSentence = (no: PumpNo) =>
  `At this rate it would take ${friendlyDuration(fillSeconds(no))} to fill the tank.`;

/** Whether a pump is running now: pressed on and not tripped. */
export const isRunning = (s: Hall6State, no: PumpNo) =>
  s.running[no] && !s.tripped;

/** The drain's flow now, l/s: Torricelli, through the open valve. */
export const drainLps = (litres: number) =>
  litres > 0
    ? DRAIN.cd * DRAIN.area * Math.sqrt(2 * 9.81 * levelOf(litres)) * 1000
    : 0;

/** Everything the hall's instruments read. */
export function hall6Readings(s: Hall6State) {
  const q = deliveries(
    (n) => isRunning(s, n),
    (id) => s.opening[id] ?? 1,
  );
  const total = PUMP_NOS.reduce((t, n) => t + q[n], 0);
  const headerLoss = HEADER_R * total * total;
  // The big pumps' gauges: suction, the reservoir's level less the suction's loss; discharge, plus the pump's head.
  const gauges = Object.fromEntries(
    PUMPS.filter(
      (p): p is CentrifugalPump => p.family === 'centrifugal' && p.dn >= 150,
    ).map((p) => {
      const flow = q[p.no];
      const head = isRunning(s, p.no) ? p.shutoff - k(p) * flow * flow : 0;
      const suction = -0.3 - 0.05 * lineResistance(p) * flow * flow;
      return [
        p.no,
        {
          suctionBar: suction * BAR_PER_M,
          dischargeBar: (suction + head) * BAR_PER_M,
        },
      ];
    }),
  ) as Record<number, { suctionBar: number; dischargeBar: number }>;
  return {
    /** Each pump's delivery, m³/h. */
    flow: q,
    total,
    headerLoss,
    litres: s.litres,
    level: levelOf(s.litres),
    high: s.litres >= TANK.fullL - 1e-6,
    draining: s.draining,
    drainLps: s.draining ? drainLps(s.litres) : 0,
    gauges,
  };
}

/** One slice of time, `h` seconds (no more than half a second). */
export function stepHall6(state: Hall6State, h: number): Hall6State {
  if (!(h > 0)) return state;
  const s: Hall6State = { ...state, sinceReset: state.sinceReset + h };
  const r = hall6Readings(s);
  s.litres += (r.total / 3.6) * h;
  if (s.draining) {
    s.litres = Math.max(0, s.litres - drainLps(s.litres) * h);
    if (s.litres <= 0.5) {
      s.litres = 0;
      s.draining = false;
    }
  }
  // LSH1: at full, every pump trips at once.
  if (!s.switchFailed && !s.tripped && s.litres >= TANK.fullL) {
    s.litres = TANK.fullL;
    s.tripped = true;
    s.running = allStopped();
  }
  // The overflow weir, the backstop.
  if (s.litres > OVERFLOW_L) {
    s.overflowedL += s.litres - OVERFLOW_L;
    s.litres = OVERFLOW_L;
  }
  return s;
}

/** Step `seconds`, in half-second slices. */
export function runHall6(state: Hall6State, seconds: number): Hall6State {
  let s = state;
  let left = seconds;
  while (left > 1e-9) {
    const h = Math.min(0.5, left);
    s = stepHall6(s, h);
    left -= h;
  }
  return s;
}

/** The hall's model, as the museum's clock drives it (real time only). */
export const HALL6_MODEL = {
  reset: (_now: number) => newHall6(),
  step: stepHall6,
};
