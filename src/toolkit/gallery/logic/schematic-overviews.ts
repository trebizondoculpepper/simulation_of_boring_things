import type { GlyphKind, GlyphState } from '../../../ui2d';
import type { World } from '../../../game/world';
import type { PoolId } from '../../../game/plant/pools';
import { POOL_TARGET } from '../../../game/plant/pools';
import type { MotorTag } from '../../../game/plant/motor-starters';
import { serviceAvailable } from '../../../game/plant/services';
import {
  withIntake,
  siteGasM3h,
  siteLoadKw,
} from '../../../game/plant/site-intake';
import { boilerGasOn } from '../../../game/plant/boiler-gas';
import {
  mainsAvailable,
  switchboardLive,
} from '../../../game/plant/changeover';
import { lightingWaysLive } from '../../../game/plant/lighting';
import { STORE_CAPACITY } from '../../../game/plant/chemicals';
import type { Chemical } from '../../../game/plant/chemicals';
import {
  DAY_TANKS,
  dayLevel,
  transferRunning,
} from '../../../game/plant/chemical-distribution';
import { WET_HALL_PLANT } from '../../../game/plant/wet-hall';
import {
  AIR_UNITS,
  HALL_POOL,
  hallHandling,
} from '../../../game/plant/air-handling';
import type { AirHall } from '../../../game/plant/air-handling';
import { olympicFlowsOf } from '../../../game/plant/olympic-battery';
import { loungeFlowsOf } from '../../../game/plant/lounge-valves';
import { loungeFilterDp } from '../../../game/plant/lounge-filters';
import type { PlantReading } from './control-room-demo';

/**
 * The plant's hydrodynamic overviews (the owner, 2026-10-27, of dev48's
 * OLYMPIC HYDRODYNAMIC OVERVIEW: "I'd love to see schematics for all of
 * them in that similar style that we could bring up on the individual
 * consoles"): each pool's circulation and each of the plant's other
 * circuits (heating, gas, chemical distribution, air, power, backwash and
 * drainage, make-up) as that panel draws its circuit: its machines in
 * order round a loop (or along a line), the water (gas, air, power)
 * moving while it flows, a column of read-outs beside it.
 *
 * Each overview's stages are its room's model's machines, by their node
 * ids in the room's schematic (`game/plant/schematics.ts`, the Olympic's
 * in `olympic-plumbing.ts`), in the order its links join them: the tests
 * trace each step through the model, so the drawing is the model's
 * topology, never one made up. Labels are derived from the node ids (or
 * the motors' tags for a pump pair), never written by hand. What each
 * shows is read from the world, as the room's own machines read it. Pure.
 */

/** What an overview reads: the world, and the control room's plant reading (the Olympic's). */
export interface SchematicContext {
  world: World;
  reading: PlantReading;
}

/** One stage of a circuit: one machine, or a bank of them side by side (filters in parallel). */
export interface OverviewStage {
  /** The room whose model holds it (default the overview's). */
  room?: string;
  /** Its machines, by their node ids in the room's model. */
  ids: readonly string[];
  /** How each is drawn. */
  kind: GlyphKind;
  /** A pump pair's node shown as its two pumps, by their motors' tags. */
  split?: readonly MotorTag[];
  /** A prefix its ids share, left off their labels (HYPOCHLORITE-PL1 shown as PL1). */
  strip?: string;
  colour?: string;
}

/** A machine as the world has it now. */
export interface MemberView {
  state: GlyphState;
  /** A vessel's fill, a fan's speed, 0 to 1. */
  level?: number;
  /** A value under its label. */
  sub?: string;
}

/** An overview as the world has it now. */
export interface OverviewView {
  /** Each stage's members' states, in order. */
  members: MemberView[][];
  /** What moves along the circuit, 0 to 1 (by segment, for a line: from each stage to the next). */
  rates: number | readonly number[];
  /** Its read-outs' values, in order: the words, and whether in alarm. */
  readouts: readonly (readonly [string, boolean?])[];
}

export interface OverviewSpec {
  id: string;
  title: string;
  /** The code in its frame's corner: its room's. */
  code: string;
  /** The room whose model it draws. */
  room: string;
  /** Round a loop (a circulation), or along a line (a supply). */
  layout: 'loop' | 'line';
  stages: readonly OverviewStage[];
  /** The medium its links carry, for the tests' trace. */
  media: readonly string[];
  /** Kinds a link may pass through between two stages (headers, manifolds). */
  through?: readonly string[];
  /** Why a loop's return from its last stage to its first is not in the room's model (the pool hall's overflow channels). */
  returnOutside?: string;
  /** What moves in it, for its pipe colour. */
  colour: string;
  /** The pipe's style: water and gas dashed, air and power chevroned. */
  style?: 'dash' | 'chevron';
  readouts: readonly { label: string; unit: string; colour?: string }[];
  read(c: SchematicContext): OverviewView;
}

/**
 * A machine's label from its node id: capitals, a word-and-number tag
 * kept as it is (B-501, AHU-802), other hyphens spaced (BALANCE TANK).
 */
export function modelLabel(id: string): string {
  const up = id.toUpperCase();
  if (/^[A-Z]+-\d+[A-Z]?$/.test(up)) return up;
  return up.replace(/-/g, ' ');
}

/** Each displayed member of a stage: its label (the node's, or the motor's tag). */
export const stageLabels = (s: OverviewStage): string[] =>
  s.split
    ? [...s.split]
    : s.ids.map((id) =>
        modelLabel(
          s.strip && id.startsWith(s.strip) ? id.slice(s.strip.length) : id,
        ),
      );

// ---------------------------------------------------------------------------
// Reading the world.

const fixed = (v: number, places = 1) =>
  Number.isFinite(v) ? v.toFixed(places) : '----';
const on = (b: boolean): GlyphState => (b ? 'on' : 'off');

/** A pump's starter as its glyph: running, stopped, or tripped. */
function starterView(w: World, tag: MotorTag): MemberView {
  const s = w.motors.starters[tag];
  return {
    state: s.tripped ? 'fault' : on(s.running),
    sub: `${fixed(s.current, 0)} A`,
  };
}

/** A pool's water as its glyph: its level a share of its overflow. */
function poolView(w: World, pool: PoolId): MemberView {
  const p = w.pools[pool];
  return {
    state: p.tripped ? 'fault' : 'on',
    level: Math.max(0.1, Math.min(1, 0.85 + p.level * 4)),
    sub: `${fixed(p.temperature)} °C`,
  };
}

/** A pool's circulation: its flow against its design, 0 to 1. */
const flowShare = (w: World, pool: PoolId) =>
  Math.max(0, Math.min(1, w.pools[pool].flow / POOL_TARGET[pool].flow));

const waterReadouts = [
  { label: 'CIRCULATION', unit: 'm³/h', colour: 'anakiwa' },
  { label: 'FREE CHLORINE', unit: 'mg/l', colour: 'golden-tanoi' },
  { label: 'PH', unit: '', colour: 'lilac' },
  { label: 'POOL', unit: '°C', colour: 'orange-peel' },
] as const;

function waterValues(w: World, pool: PoolId): [string, boolean][] {
  const p = w.pools[pool];
  return [
    [fixed(p.flow, p.flow < 20 ? 1 : 0), flowShare(w, pool) < 0.5],
    [fixed(p.freeChlorine, 2), p.freeChlorine < 1 || p.freeChlorine > 3],
    [fixed(p.ph, 2), p.ph < 7 || p.ph > 7.8],
    [fixed(p.temperature), p.temperature < POOL_TARGET[pool].temp - 2],
  ];
}

const plantOf = (w: World) => withIntake(w.plant, w.intake);

/** A spa cabinet's filter as its glyph: in service, or washing. */
function spaFilterView(w: World, pool: 'pool_03' | 'pool_04'): MemberView {
  const f = w.spaFilters[pool];
  return {
    state: f.phase === 'filter' ? 'on' : 'warn',
    sub:
      f.phase === 'filter'
        ? `${fixed(f.sinceWash / 3600, 0)} H`
        : f.phase.toUpperCase(),
  };
}

/** The heat the boilers give, kW: what the pools' and halls' heaters take. */
export const heatDemand = (w: World) =>
  Object.values(w.pools).reduce((t, p) => t + Math.max(0, p.heating), 0);

/**
 * Each boiler's output, kW, for staging the cascade on the screens: the
 * world gives the heat the pools take, not which boiler gives it, so the
 * screens stage the six boilers on that demand at this much each.
 */
export const BOILER_STAGE_KW = 250;

/** How many of the six boilers fire, staged on the heat demand, with gas to the boilers. */
export function boilersFiring(w: World): number {
  if (!boilerGasOn(w.boilerGas) || !w.plant.sources.heat) return 0;
  return Math.min(6, Math.ceil(heatDemand(w) / BOILER_STAGE_KW));
}

/** A day tank's level as its glyph: calling while it calls for a transfer. */
function dayTankView(w: World, chemical: Chemical, i: number): MemberView {
  const line = w.distribution[chemical];
  const level = dayLevel(chemical, i, line);
  return {
    state: line.tanks[i].calling ? 'warn' : 'on',
    level,
    sub: `${fixed(line.tanks[i].litres, 0)} L`,
  };
}

// ---------------------------------------------------------------------------
// The overviews.

const BOILERS = ['B-501', 'B-502', 'B-503', 'B-504', 'B-505', 'B-506'];
const AHU_STACKS = [
  'ahu-801',
  'ahu-802',
  'ahu-805',
  'ahu-808',
  'ahu-811',
  'ahu-812',
];
const HALLS = ['hall-lounge', 'hall-olympic', 'hall-jacuzzi', 'hall-footbath'];
const HALL_OF: Record<string, AirHall> = {
  'hall-lounge': 'lounge',
  'hall-olympic': 'olympic',
  'hall-jacuzzi': 'jacuzzi',
  'hall-footbath': 'footbath',
};
/** The units of a stack in the air plant's model (each holds its tag's unit and those after it, to the next stack). */
const stackUnits = (stack: string) => {
  const i = AHU_STACKS.indexOf(stack);
  const from = Number(stack.slice(4));
  const to =
    i + 1 < AHU_STACKS.length ? Number(AHU_STACKS[i + 1].slice(4)) : 813;
  return AIR_UNITS.filter((u) => {
    const n = Number(u.tag.slice(4));
    return n >= from && n < to;
  });
};

function chemicalOverview(chemical: Chemical): OverviewSpec {
  const store = chemical === 'hypochlorite' ? 'hypo_store' : 'acid_store';
  const tanks =
    chemical === 'hypochlorite' ? ['tank-1', 'tank-2', 'tank-3'] : ['tank-1'];
  const name = chemical === 'hypochlorite' ? 'HYPOCHLORITE' : 'ACID';
  return {
    id: `${chemical}-distribution`,
    title: `${name} DISTRIBUTION · MOLECULAR TRANSIT NETWORK`,
    code: chemical === 'hypochlorite' ? 'HS' : 'AS',
    room: store,
    layout: 'line',
    media: ['chemical'],
    through: ['chemical-main'],
    colour: chemical === 'hypochlorite' ? 'golden-tanoi' : 'hopbush',
    stages: [
      { room: store, ids: tanks, kind: 'tank' },
      { room: store, ids: ['transfer'], kind: 'pump' },
      {
        room: 'wet_hall',
        ids: [`${chemical}-selector`],
        kind: 'valve',
        strip: `${chemical}-`,
      },
      {
        room: 'wet_hall',
        ids: [1, 2, 3, 4].map((n) => `${chemical}-pl${n}`),
        kind: 'valve',
        strip: `${chemical}-`,
      },
      // The day tanks, one in each pool's plant room, in the selector's outlet order.
      {
        room: 'day-tanks',
        ids: DAY_TANKS[chemical].map((t) => `${t.site}-day`),
        kind: 'tank',
        strip: 'pool_',
      },
    ],
    readouts: [
      { label: 'STORE', unit: 'L', colour: 'golden-tanoi' },
      { label: 'SERVING', unit: '', colour: 'lilac' },
      { label: 'TRANSFER', unit: 'L/MIN', colour: 'anakiwa' },
      { label: 'SELECTOR', unit: '', colour: 'orange-peel' },
    ],
    read: ({ world: w }) => {
      const line = w.distribution[chemical];
      const stock = w.chemicals[chemical];
      const powered = serviceAvailable(plantOf(w), store, 'power');
      const running = transferRunning(
        line,
        stock,
        STORE_CAPACITY[chemical],
        powered,
      );
      const perTank =
        stock / tanks.length / (STORE_CAPACITY[chemical] / tanks.length);
      const serving = line.serving;
      return {
        members: [
          tanks.map(() => ({
            state: 'on' as GlyphState,
            level: perTank,
            sub: `${fixed(perTank * 100, 0)} %`,
          })),
          [
            {
              state: line.tripped ? 'fault' : on(running),
              sub: line.hoa.toUpperCase(),
            },
          ],
          [
            {
              state: line.tripped ? 'fault' : serving === null ? 'off' : 'on',
              sub: line.mode.toUpperCase(),
            },
          ],
          [0, 1, 2, 3].map((i) => ({ state: on(serving === i) })),
          DAY_TANKS[chemical].map((_, i) => dayTankView(w, chemical, i)),
        ],
        rates: [
          running ? 0.6 : 0,
          running ? 0.6 : 0,
          running ? 0.6 : 0,
          running ? 0.6 : 0,
        ],
        readouts: [
          [fixed(stock, 0), stock < STORE_CAPACITY[chemical] * 0.2],
          [serving === null ? 'NONE' : `OUTLET ${serving + 1}`],
          [running ? '20' : '0'],
          [
            line.tripped
              ? 'TRIPPED'
              : line.mode === 'auto'
                ? 'AUTO'
                : `HAND ${line.pick + 1}`,
            line.tripped,
          ],
        ],
      };
    },
  };
}

export const OVERVIEWS: readonly OverviewSpec[] = [
  {
    id: 'olympic',
    title: 'OLYMPIC HYDRODYNAMIC OVERVIEW',
    code: 'PL2',
    room: 'plant_pool_02',
    layout: 'loop',
    media: ['water'],
    returnOutside:
      'the pool’s overflow channels and main drains, in the pool hall',
    colour: 'anakiwa',
    stages: [
      { ids: ['tank'], kind: 'tank' },
      { ids: ['pumps'], kind: 'pump', split: ['P-101A', 'P-101B'] },
      {
        ids: ['filter-1', 'filter-2', 'filter-3', 'filter-4', 'filter-5'],
        kind: 'filter',
      },
      { ids: ['contact', 'exchanger'], kind: 'hx' },
      { ids: ['uv'], kind: 'uv' },
      { ids: ['pool'], kind: 'pool' },
    ],
    readouts: [
      ...waterReadouts,
      { label: 'WORST FILTER DP', unit: 'bar', colour: 'periwinkle' },
    ],
    read: ({ world: w, reading }) => {
      const beds = olympicFlowsOf(w).filters;
      const heating = w.pools.pool_02.heating > 1;
      return {
        members: [
          [
            {
              state: 'on',
              level: w.pools.pool_02.balance,
              sub: `${fixed(w.pools.pool_02.balance * 100, 0)} %`,
            },
          ],
          (['P-101A', 'P-101B'] as const).map((t) => starterView(w, t)),
          beds.map((b, i) => {
            const f = w.washOTron.filters[i];
            const mode = f?.mode ?? 'filter';
            return {
              state:
                mode === 'filter' ? 'on' : mode === 'isolate' ? 'off' : 'warn',
              sub:
                mode === 'filter'
                  ? `${fixed(b.bedBar, 2)} BAR`
                  : String(mode).toUpperCase(),
            } as MemberView;
          }),
          [
            { state: 'on' },
            {
              state: on(heating),
              sub: heating ? `${fixed(w.pools.pool_02.heating, 0)} KW` : '',
            },
          ],
          [{ state: on(reading.uvOn) }],
          [poolView(w, 'pool_02')],
        ],
        rates: flowShare(w, 'pool_02'),
        readouts: [
          ...waterValues(w, 'pool_02'),
          [
            fixed(Math.max(...reading.filterDp), 2),
            Math.max(...reading.filterDp) > 0.7,
          ],
        ],
      };
    },
  },
  {
    id: 'lounge',
    title: 'LOUNGE HYDRODYNAMIC OVERVIEW',
    code: 'PL1',
    room: 'plant_pool_01',
    layout: 'loop',
    media: ['water'],
    through: ['header'],
    colour: 'anakiwa',
    stages: [
      { ids: ['pool'], kind: 'pool' },
      { ids: ['tank'], kind: 'tank' },
      { ids: ['pumps'], kind: 'pump', split: ['P-201A', 'P-201B'] },
      { ids: ['filter-1', 'filter-2'], kind: 'filter' },
      { ids: ['exchanger'], kind: 'hx', colour: 'orange-peel' },
      { ids: ['contact'], kind: 'tank' },
      { ids: ['uv'], kind: 'uv' },
    ],
    readouts: [
      ...waterReadouts,
      { label: 'WORST FILTER DP', unit: 'bar', colour: 'periwinkle' },
    ],
    read: ({ world: w }) => {
      const flows = loungeFlowsOf(w);
      const dp = loungeFilterDp(w.loungeFilters, flows);
      const heating = w.pools.pool_01.heating > 1;
      const uv =
        plantOf(w).isolators['Lounge UV unit isolator'] &&
        w.pools.pool_01.flow > 0.5;
      return {
        members: [
          [poolView(w, 'pool_01')],
          [
            {
              state: 'on',
              level: w.pools.pool_01.balance,
              sub: `${fixed(w.pools.pool_01.balance * 100, 0)} %`,
            },
          ],
          (['P-201A', 'P-201B'] as const).map((t) => starterView(w, t)),
          [0, 1].map((i) => ({
            state:
              flows.filters[i] > 0.5
                ? 'on'
                : flows.filters[i] < -0.5
                  ? 'warn'
                  : 'off',
            sub:
              flows.filters[i] < -0.5
                ? 'BACKWASH'
                : `${fixed(dp[i] ?? 0, 2)} BAR`,
          })),
          [
            {
              state: on(heating),
              sub: heating ? `${fixed(w.pools.pool_01.heating, 0)} KW` : '',
            },
          ],
          [{ state: 'on' }],
          [{ state: on(uv) }],
        ],
        rates: flowShare(w, 'pool_01'),
        readouts: [
          ...waterValues(w, 'pool_01'),
          [fixed(Math.max(0, ...dp), 2), Math.max(0, ...dp) > 0.7],
        ],
      };
    },
  },
  {
    id: 'jacuzzi',
    title: 'JACUZZI HYDRODYNAMIC OVERVIEW',
    code: 'PL3',
    room: 'plant_pool_03',
    layout: 'loop',
    media: ['water'],
    colour: 'anakiwa',
    stages: [
      { ids: ['spa'], kind: 'pool' },
      { ids: ['tank'], kind: 'tank' },
      { ids: ['cabinet'], kind: 'pump' },
      { ids: ['filter'], kind: 'filter' },
      { ids: ['cabinet'], kind: 'hx', colour: 'orange-peel' },
    ],
    readouts: [
      ...waterReadouts,
      { label: 'CABINET', unit: '', colour: 'periwinkle' },
    ],
    read: ({ world: w }) => {
      const cab = w.jacuzziCabinet;
      const boot = w.cabinets.pool_03;
      const flowing = w.pools.pool_03.flow > 0.2;
      const tripped = cab.trip !== '';
      return {
        members: [
          [poolView(w, 'pool_03')],
          [
            {
              state: 'on',
              level: w.pools.pool_03.balance,
              sub: `${fixed(w.pools.pool_03.balance * 100, 0)} %`,
            },
          ],
          [
            {
              state: tripped ? 'fault' : on(flowing),
              sub: w.jacuzzi.jets ? 'JETS' : '',
            },
          ],
          [spaFilterView(w, 'pool_03')],
          [
            {
              state: on(w.pools.pool_03.heating > 0.2),
              sub: `${fixed(w.pools.pool_03.heating, 1)} KW`,
            },
          ],
        ],
        rates: flowShare(w, 'pool_03'),
        readouts: [
          ...waterValues(w, 'pool_03'),
          [
            tripped ? 'TRIPPED' : cab.power ? boot.phase.toUpperCase() : 'OFF',
            tripped,
          ],
        ],
      };
    },
  },
  {
    id: 'footbath',
    title: 'FOOTBATH HYDRODYNAMIC OVERVIEW',
    code: 'PL4',
    room: 'plant_pool_04',
    layout: 'loop',
    media: ['water'],
    colour: 'anakiwa',
    stages: [
      { ids: ['spa'], kind: 'pool' },
      { ids: ['cabinet'], kind: 'pump' },
      { ids: ['filter'], kind: 'filter' },
      { ids: ['cabinet'], kind: 'hx', colour: 'orange-peel' },
    ],
    readouts: [
      ...waterReadouts,
      { label: 'CABINET', unit: '', colour: 'periwinkle' },
    ],
    read: ({ world: w }) => {
      const boot = w.cabinets.pool_04;
      const flowing = w.pools.pool_04.flow > 0.2;
      return {
        members: [
          [poolView(w, 'pool_04')],
          [{ state: on(flowing) }],
          [spaFilterView(w, 'pool_04')],
          [
            {
              state: on(w.pools.pool_04.heating > 0.2),
              sub: `${fixed(w.pools.pool_04.heating, 1)} KW`,
            },
          ],
        ],
        rates: flowShare(w, 'pool_04'),
        readouts: [...waterValues(w, 'pool_04'), [boot.phase.toUpperCase()]],
      };
    },
  },
  {
    id: 'heating',
    title: 'HEATING RING · THERMAL WARP CORE CIRCULATION',
    code: 'BH',
    room: 'boiler_house',
    layout: 'loop',
    media: ['water'],
    through: ['header', 'low-loss-header'],
    colour: 'orange-peel',
    stages: [
      { ids: BOILERS, kind: 'boiler', colour: 'orange-peel' },
      { ids: ['low-loss'], kind: 'tank' },
      { ids: ['circulator'], kind: 'pump' },
      { ids: ['building', 'calorifier'], kind: 'hx', colour: 'orange-peel' },
    ],
    readouts: [
      { label: 'HEAT DEMAND', unit: 'kW', colour: 'orange-peel' },
      { label: 'FLOW', unit: '°C', colour: 'chestnut-rose' },
      { label: 'RETURN', unit: '°C', colour: 'lilac' },
      { label: 'STAGES FIRING', unit: '/ 6', colour: 'golden-tanoi' },
    ],
    read: ({ world: w, reading }) => {
      const firing = boilersFiring(w);
      const pumped = serviceAvailable(plantOf(w), 'boiler_house', 'power');
      const heat = heatDemand(w);
      return {
        members: [
          BOILERS.map((_, i) => ({ state: on(i < firing) })),
          [{ state: 'on', level: firing ? 0.85 : 0.55 }],
          [{ state: pumped ? 'on' : 'fault' }],
          [{ state: on(heat > 1) }, { state: on(pumped) }],
        ],
        rates: pumped ? 0.35 + 0.65 * (firing / 6) : 0,
        readouts: [
          [fixed(heat, 0)],
          [fixed(reading.lthw, 1), reading.lthw < 60],
          [fixed(reading.lthw - 11, 1)],
          [String(firing), !boilerGasOn(w.boilerGas)],
        ],
      };
    },
  },
  {
    id: 'gas',
    title: 'NATURAL GAS TRAIN · PLASMA CONDUIT',
    code: 'BH',
    room: 'boiler_house',
    layout: 'line',
    media: ['gas', 'flue'],
    through: ['header'],
    colour: 'golden-tanoi',
    stages: [
      { ids: ['gas-supply'], kind: 'source' },
      { ids: ['gas-train'], kind: 'valve' },
      { ids: BOILERS, kind: 'boiler', colour: 'orange-peel' },
      {
        ids: ['stack-1', 'stack-2', 'stack-3'],
        kind: 'box',
        colour: 'tertiary',
      },
    ],
    readouts: [
      { label: 'GAS', unit: 'm³/h', colour: 'golden-tanoi' },
      { label: 'ECV', unit: '', colour: 'lilac' },
      { label: 'SSOV', unit: '', colour: 'orange-peel' },
      { label: 'DETECTION', unit: '', colour: 'periwinkle' },
    ],
    read: ({ world: w }) => {
      const g = w.boilerGas;
      const street = w.intake.open.gas;
      const gasOn = boilerGasOn(g) && street;
      const firing = boilersFiring(w);
      const m3h = siteGasM3h(w.pools, gasOn);
      return {
        members: [
          [{ state: on(street) }],
          [
            {
              state: g.stopPressed
                ? 'fault'
                : g.ssovOpen && g.ecvOpen
                  ? 'on'
                  : 'off',
            },
          ],
          BOILERS.map((_, i) => ({ state: on(gasOn && i < firing) })),
          [0, 1, 2].map((i) => ({ state: on(gasOn && firing > i * 2) })),
        ],
        rates: [
          street ? 0.5 : 0,
          gasOn && firing ? 0.5 : 0,
          gasOn && firing ? 0.4 : 0,
        ],
        readouts: [
          [fixed(m3h, 1)],
          [g.ecvOpen ? 'OPEN' : 'SHUT', !g.ecvOpen],
          [g.ssovOpen ? 'OPEN' : 'TRIPPED', !g.ssovOpen],
          [
            g.gasDetected ? 'GAS' : g.stopPressed ? 'STOP' : 'CLEAR',
            g.gasDetected || g.stopPressed,
          ],
        ],
      };
    },
  },
  chemicalOverview('hypochlorite'),
  chemicalOverview('acid'),
  {
    id: 'air',
    title: 'AIR HANDLING · ATMOSPHERIC PROCESSING',
    code: 'AP',
    room: 'air_plant',
    layout: 'loop',
    media: ['air'],
    returnOutside:
      'the halls’ extract, back through the units to their exhausts',
    colour: 'periwinkle',
    style: 'chevron',
    stages: [
      { ids: ['outside'], kind: 'source' },
      { ids: AHU_STACKS, kind: 'fan' },
      { ids: HALLS, kind: 'box', colour: 'anakiwa' },
    ],
    readouts: [
      { label: 'OLYMPIC RH', unit: '%', colour: 'anakiwa' },
      { label: 'LOUNGE RH', unit: '%', colour: 'lilac' },
      {
        label: 'UNITS RUNNING',
        unit: `/ ${AIR_UNITS.length}`,
        colour: 'golden-tanoi',
      },
      { label: 'AIRFLOW', unit: '%', colour: 'periwinkle' },
    ],
    read: ({ world: w }) => {
      const handled = hallHandling(w.airHandling);
      const powered = serviceAvailable(plantOf(w), 'air_plant', 'power');
      const running = AIR_UNITS.filter((u) => {
        const s = w.airHandling.units[u.tag];
        return powered && s.isolator && !s.tripped && s.speed > 0.05;
      }).length;
      const share = Object.values(handled).reduce((t, h) => t + h.share, 0) / 4;
      return {
        members: [
          [{ state: 'on' }],
          AHU_STACKS.map((stack) => {
            const units = stackUnits(stack).map(
              (u) => w.airHandling.units[u.tag],
            );
            const speed =
              units.reduce(
                (t, s) => t + (s.isolator && !s.tripped ? s.speed : 0),
                0,
              ) / Math.max(1, units.length);
            return {
              state: units.some((s) => s.tripped)
                ? 'fault'
                : on(powered && speed > 0.05),
              level: speed,
              sub: `${fixed(speed * 100, 0)} %`,
            };
          }),
          HALLS.map((h) => {
            const pool = HALL_POOL[HALL_OF[h]];
            const rh = w.pools[pool].hallRh;
            return { state: rh > 65 ? 'warn' : 'on', sub: `${fixed(rh, 0)} %` };
          }),
        ],
        rates: powered ? share : 0,
        readouts: [
          [fixed(w.pools.pool_02.hallRh, 0), w.pools.pool_02.hallRh > 65],
          [fixed(w.pools.pool_01.hallRh, 0), w.pools.pool_01.hallRh > 65],
          [String(running), running < AIR_UNITS.length],
          [fixed(share * 100, 0)],
        ],
      };
    },
  },
  {
    id: 'power',
    title: 'POWER DISTRIBUTION · PRIMARY ENERGY CONDUITS',
    code: 'SR',
    room: 'switch_room',
    layout: 'line',
    media: ['power'],
    colour: 'golden-tanoi',
    style: 'chevron',
    stages: [
      { ids: ['incoming'], kind: 'source' },
      { ids: ['main-switch', 'generator-cable'], kind: 'breaker' },
      { ids: ['changeover'], kind: 'breaker' },
      { ids: ['switchboard'], kind: 'box', colour: 'golden-tanoi' },
      { ids: ['rooms', 'lighting-board', 'central-battery'], kind: 'breaker' },
      { ids: ['lighting-zones'], kind: 'box', colour: 'pale-canary' },
    ],
    readouts: [
      { label: 'SITE LOAD', unit: 'kW', colour: 'golden-tanoi' },
      { label: 'CHANGEOVER', unit: '', colour: 'lilac' },
      { label: 'FEEDERS LIVE', unit: '', colour: 'anakiwa' },
      { label: 'BATTERY', unit: '%', colour: 'periwinkle' },
    ],
    read: ({ world: w }) => {
      const plant = plantOf(w);
      const mains = mainsAvailable(plant);
      const live = switchboardLive(plant);
      const ways = lightingWaysLive(plant, w.lighting);
      const feeders = Object.values(plant.feeders);
      const feedersLive = feeders.filter(Boolean).length;
      const battery = w.centralBattery.charge;
      return {
        members: [
          [{ state: on(w.intake.open.power) }],
          [{ state: on(mains) }, { state: 'off', sub: 'NO SET' }],
          [
            {
              state: plant.changeover === '0' ? 'between' : on(live),
              sub: plant.changeover,
            },
          ],
          [{ state: live ? 'on' : 'fault' }],
          [
            {
              state: on(live && feedersLive > 0),
              sub: `${feedersLive}/${feeders.length}`,
            },
            { state: on(ways) },
            {
              state: battery < 0.3 ? 'warn' : 'on',
              sub: `${fixed(battery * 100, 0)} %`,
            },
          ],
          [{ state: on(ways) }],
        ],
        rates: [
          w.intake.open.power ? 0.6 : 0,
          mains && plant.changeover === 'I' ? 0.6 : 0,
          live ? 0.6 : 0,
          live ? 0.6 : 0,
          ways ? 0.6 : 0,
        ],
        readouts: [
          [fixed(siteLoadKw(w), 0)],
          [
            plant.changeover === 'I'
              ? 'MAINS'
              : plant.changeover === 'II'
                ? 'GENERATOR'
                : 'OFF',
            !live,
          ],
          [`${feedersLive} / ${feeders.length}`, feedersLive < feeders.length],
          [fixed(battery * 100, 0), battery < 0.3],
        ],
      };
    },
  },
  {
    id: 'backwash',
    title: 'BACKWASH AND DRAINAGE · WASTE EVACUATION',
    code: 'WH',
    room: 'wet_hall',
    layout: 'line',
    media: ['water'],
    colour: 'sandy-brown',
    stages: [
      {
        room: 'plant_pool_02',
        ids: ['filter-1', 'filter-2', 'filter-3', 'filter-4', 'filter-5'],
        kind: 'filter',
      },
      { room: 'plant_pool_02', ids: ['main-plant'], kind: 'junction' },
      { ids: ['plant-rooms'], kind: 'junction' },
      { ids: ['holding'], kind: 'tank' },
      { ids: ['sewer'], kind: 'source', colour: 'sandy-brown' },
    ],
    readouts: [
      { label: 'INTO THE PIT', unit: 'm³/h', colour: 'sandy-brown' },
      { label: 'PIT', unit: 'm³', colour: 'anakiwa' },
      { label: 'TO SEWER', unit: 'm³/h', colour: 'lilac' },
      { label: 'WASHING', unit: '', colour: 'golden-tanoi' },
    ],
    read: ({ world: w }) => {
      const wh = w.wetHall;
      const share = wh.backwashTank / WET_HALL_PLANT.backwashTank;
      const washing = w.washOTron.washing;
      return {
        members: [
          w.washOTron.filters.map((f) => ({
            state: (f.mode === 'backwash' || f.mode === 'rinse'
              ? 'warn'
              : f.mode === 'isolate'
                ? 'off'
                : 'on') as GlyphState,
            sub:
              f.mode === 'backwash' || f.mode === 'rinse'
                ? f.mode.toUpperCase()
                : '',
          })),
          [{ state: on(wh.pitInflow > 0.5) }],
          [{ state: on(wh.pitInflow > 0.5) }],
          [
            {
              state: wh.inhibit
                ? 'fault'
                : share > WET_HALL_PLANT.backwashHigh
                  ? 'warn'
                  : 'on',
              level: share,
              sub: `${fixed(share * 100, 0)} %`,
            },
          ],
          [{ state: on(wh.discharging) }],
        ],
        rates: [
          wh.pitInflow > 0.5 ? 0.8 : 0,
          wh.pitInflow > 0.5 ? 0.8 : 0,
          wh.pitInflow > 0.5 ? 0.8 : 0,
          w.sewer.flow > 0.1 ? 0.4 : 0,
        ],
        readouts: [
          [fixed(wh.pitInflow, 0)],
          [fixed(wh.backwashTank, 1), share > WET_HALL_PLANT.backwashHigh],
          [fixed(w.sewer.flow, 1)],
          [washing === null ? 'NONE' : `FILTER ${washing + 1}`],
        ],
      };
    },
  },
  {
    id: 'make-up',
    title: 'MAKE-UP WATER · MUNICIPAL INTAKE',
    code: 'WH',
    room: 'wet_hall',
    layout: 'line',
    media: ['water'],
    colour: 'anakiwa',
    stages: [
      { ids: ['town-main'], kind: 'source' },
      { ids: ['meter', 'flowmeter'], kind: 'meter' },
      { ids: ['break-tank'], kind: 'tank' },
      { ids: ['booster'], kind: 'pump' },
      { ids: ['plant-rooms'], kind: 'junction' },
      { room: 'plant_pool_02', ids: ['main-plant'], kind: 'junction' },
      { room: 'plant_pool_02', ids: ['tank'], kind: 'tank' },
    ],
    readouts: [
      { label: 'MAKE-UP', unit: 'm³/h', colour: 'anakiwa' },
      { label: 'BREAK TANK', unit: '%', colour: 'lilac' },
      { label: 'METER', unit: 'm³', colour: 'golden-tanoi' },
      { label: 'POOLS CALLING', unit: '', colour: 'periwinkle' },
    ],
    read: ({ world: w }) => {
      const wh = w.wetHall;
      const share = wh.breakTank / WET_HALL_PLANT.breakTank;
      const street = w.intake.open.water;
      const calling = Object.values(w.pools).filter((p) => p.makeUp).length;
      const flowing = wh.flow > 0.1;
      return {
        members: [
          [{ state: on(street) }],
          [
            { state: on(street) },
            { state: on(flowing), sub: `${fixed(wh.flow, 1)}` },
          ],
          [
            {
              state: share < WET_HALL_PLANT.lowLevel ? 'warn' : 'on',
              level: share,
              sub: `${fixed(share * 100, 0)} %`,
            },
          ],
          [{ state: wh.boosterTripped ? 'fault' : on(wh.boosterRunning) }],
          [{ state: on(flowing) }],
          [{ state: on(w.pools.pool_02.makeUp) }],
          [{ state: 'on', level: w.pools.pool_02.balance }],
        ],
        rates: [
          street && share < 0.95 ? 0.5 : 0,
          street && share < 0.95 ? 0.5 : 0,
          flowing ? 0.6 : 0,
          flowing ? 0.6 : 0,
          w.pools.pool_02.makeUp && flowing ? 0.6 : 0,
          w.pools.pool_02.makeUp && flowing ? 0.6 : 0,
        ],
        readouts: [
          [fixed(wh.flow, 1)],
          [fixed(share * 100, 0), share < WET_HALL_PLANT.lowLevel],
          [fixed(wh.meter, 0)],
          [String(calling)],
        ],
      };
    },
  },
];

export const overviewById = (id: string) => OVERVIEWS.find((o) => o.id === id);

// ---------------------------------------------------------------------------
// Laying an overview out.

export type Pt = readonly [number, number];

/** Where an overview's stages and members go, in its own units, and its pipes. */
export interface OverviewLayout {
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  /** Each stage's members: middle and size. */
  members: { at: Pt; size: number }[][];
  /** Its pipes: for a loop, the loop then each bank's manifold; for a line, a segment from each stage to the next, then the manifolds. */
  pipes: { points: Pt[]; segment: number }[];
  /** Where each member's label goes. */
  labelAt: ('below' | 'above' | 'left' | 'right')[][];
}

/**
 * An overview laid out as dev48's OLYMPIC HYDRODYNAMIC OVERVIEW draws its
 * circuit: a loop round a 2 × 1 rectangle, its stages evenly along the
 * top (left to right) and back along the bottom; or a line left to right.
 * A bank of machines stands across the pipe on a manifold, its members
 * smaller the more there are.
 */
export function overviewLayout(spec: OverviewSpec): OverviewLayout {
  const counts = spec.stages.map((s) => stageLabels(s).length);
  const members: { at: Pt; size: number }[][] = [];
  const labelAt: ('below' | 'above' | 'left' | 'right')[][] = [];
  const pipes: { points: Pt[]; segment: number }[] = [];
  const branches: { points: Pt[]; segment: number }[] = [];
  const bank = (x: number, y: number, k: number, span: number) => {
    const step = k > 1 ? Math.min(0.24, span / (k - 1)) : 0;
    const size = k > 1 ? Math.min(0.17, step * 0.62) : 0.17;
    return Array.from({ length: k }, (_, j) => ({
      // The first at the top.
      at: [x, y + ((k - 1) / 2 - j) * step] as Pt,
      size,
    }));
  };
  if (spec.layout === 'loop') {
    const n = counts.length;
    const top = Math.ceil(n / 2);
    const Y = 0.42;
    spec.stages.forEach((_, i) => {
      const upper = i < top;
      const x = upper
        ? -1.3 + (2.6 * (i + 0.5)) / top
        : 1.3 - (2.6 * (i - top + 0.5)) / (n - top || 1);
      const y = upper ? Y : -Y;
      const k = counts[i];
      if (k > 3) {
        // A big bank stands along the row, outside the loop, each machine
        // on its own branch off the pipe, so it does not crowd the middle.
        const width = (2.6 / (upper ? top : n - top || 1)) * 0.92;
        const step = Math.min(0.26, width / k);
        const size = Math.min(0.16, step * 0.72);
        const off = upper ? Y + 0.2 : -Y - 0.2;
        const row = Array.from({ length: k }, (_, j) => ({
          at: [x + (j - (k - 1) / 2) * step, off] as Pt,
          size,
        }));
        members.push(row);
        // Their labels alternately outside and inside, so neighbours' do not run together.
        labelAt.push(
          row.map((_, j) => ((j % 2 === 0) === upper ? 'above' : 'below')),
        );
        for (const m of row)
          branches.push({ points: [m.at, [m.at[0], y]], segment: 0 });
        return;
      }
      const at = bank(x, y, k, 0.4);
      members.push(at);
      labelAt.push(at.map(() => (k > 1 ? 'right' : upper ? 'above' : 'below')));
    });
    pipes.push({
      points: [
        [-1.5, Y],
        [1.5, Y],
        [1.5, -Y],
        [-1.5, -Y],
        [-1.5, Y],
      ],
      segment: 0,
    });
  } else {
    const n = counts.length;
    spec.stages.forEach((_, i) => {
      const x = -1.42 + (2.84 * i) / Math.max(1, n - 1);
      const k = counts[i];
      const at = bank(x, 0, k, 0.9);
      members.push(at);
      labelAt.push(
        at.map(() =>
          k > 1 ? (i === n - 1 ? 'left' : 'right') : i % 2 ? 'above' : 'below',
        ),
      );
    });
    for (let i = 0; i + 1 < n; i++)
      pipes.push({
        points: [
          [members[i][0].at[0], 0],
          [members[i + 1][0].at[0], 0],
        ],
        segment: i,
      });
  }
  pipes.push(...branches);
  // Each bank's manifold, across the pipe through its members.
  members.forEach((m, i) => {
    if (m.length < 2 || m[0].at[1] === m[1].at[1]) return;
    pipes.push({
      points: [m[0].at, m[m.length - 1].at],
      segment: spec.layout === 'loop' ? 0 : Math.max(0, i - 1),
    });
  });
  return {
    bounds: { minX: -1.62, minY: -0.92, maxX: 1.62, maxY: 0.92 },
    members,
    pipes,
    labelAt,
  };
}

/** A pipe's rate in `view`, for its segment. */
export const segmentRate = (view: OverviewView, segment: number) =>
  typeof view.rates === 'number' ? view.rates : (view.rates[segment] ?? 0);
