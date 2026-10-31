import type {
  MimicSpec,
  MimicState,
  Point,
} from '../../components/industrial-control/logic/mimic';
import { flowState } from '../../components/industrial-control/logic/mimic-chaser';
import {
  LOUNGE_VALVES,
  loungeFlowsOf,
} from '../../../game/plant/lounge-valves';
import type { MotorTag } from '../../../game/plant/motor-starters';
import { valveTagOf } from '../../../game/plant/part-inspection';
import type { PartDescription } from '../../../game/plant/part-inspection';
import type { World, WorldAction } from '../../../game/world';
import type { LoungeFlows } from '../../../game/plant/lounge-valves';

/**
 * The lounge pool's filter mimic (prompt 066): the filter battery drawn as
 * the plant runs, grouped by filter, with its flows. The balance tank and
 * its drain; pumps P-201A and P-201B with their START, STOP and lamps and
 * their discharge valves; the inlet header; the two filters side by side,
 * each with its inlet, backwash, outlet and drain valves round it (OPEN
 * and SHUT buttons beside each valve symbol, with a live indicator on the
 * symbol) and its flow readout
 * beside it; the filtered-water header, which also feeds a backwash, on to
 * the heat exchanger and the pool; and the waste. Every pipe chases its
 * flow. One spec and one state for both its boards, PL1-CP1's fascia in
 * the plant room and the control room's wall, so the two always agree;
 * the pumps' HAND · OFF · AUTO and RESET are not on it, but on PL1-CP1's
 * doors alone (some controls are only local). Pure.
 */

const BLUE = '#2a5f9e';
const WASTE = '#7a5a2a';

/** A lounge valve's asset id by its tag. */
const id = (tag: string) => LOUNGE_VALVES.find((v) => v.tag === tag)!.assetId;

/** A valve's position on a pipe, flanked by its OPEN and SHUT buttons. */
function valveUnit(tag: string, [x, y]: Point) {
  const v = id(tag);
  return {
    labels: [{ text: tag, at: [x, y - 0.07] as Point, size: 0.55 }],
    shape: {
      symbol: 'valve' as const,
      at: [x, y] as Point,
      size: 0.035,
      indicator: { open: `${v}-open`, shut: `${v}-shut` },
    },
    buttons: [
      {
        id: `${v}/open`,
        at: [x - 0.085, y] as Point,
        colour: 'green' as const,
        legend: 'OPEN',
      },
      {
        id: `${v}/shut`,
        at: [x + 0.085, y] as Point,
        colour: 'red' as const,
        legend: 'SHUT',
      },
    ],
  };
}

/** A pump's controls: RUN, TRIP and NOT IN AUTO lamps, START and STOP. */
function pumpUnit(n: 1 | 2, [x, y]: Point) {
  return {
    lamps: [
      {
        id: `p${n}-run`,
        at: [x - 0.12, y + 0.02] as Point,
        colour: 'green' as const,
        label: 'RUN',
      },
      {
        id: `p${n}-trip`,
        at: [x - 0.12, y - 0.04] as Point,
        colour: 'red' as const,
        label: 'TRIP',
      },
      {
        id: `p${n}-local`,
        at: [x - 0.12, y - 0.1] as Point,
        colour: 'amber' as const,
        label: 'NOT AUTO',
      },
    ],
    buttons: [
      {
        id: `p${n}-start`,
        at: [x, y - 0.06] as Point,
        colour: 'green' as const,
        legend: 'START',
      },
      {
        id: `p${n}-stop`,
        at: [x + 0.1, y - 0.06] as Point,
        colour: 'red' as const,
        legend: 'STOP',
      },
    ],
  };
}

/** Each filter's column: its symbol at `cx`. */
const F = { 1: -0.02, 2: 0.6 } as const;
const FILTER_Y = 0.02;
const INLET_HEADER = 0.4;
const WASTE_HEADER = 0.5;
const OUTLET_HEADER = -0.4;
const BW_TEE = 0.18;
const PUMP = { 1: 0.18, 2: -0.24 } as const;
const PUMP_X = -0.72;
const HEADER_X = -0.33;
const TANK: Point = [-1.02, -0.02];

const units = [
  valveUnit('PL1-P1-IV1', [-0.48, PUMP[1]]),
  valveUnit('PL1-P2-IV1', [-0.48, PUMP[2]]),
  valveUnit('PL1-T1-DV1', [TANK[0], -0.3]),
  ...([1, 2] as const).flatMap((n) => [
    valveUnit(`PL1-F${n}-IV1`, [F[n] - 0.08, 0.27]),
    valveUnit(`PL1-F${n}-BV1`, [F[n] + 0.22, 0.33]),
    valveUnit(`PL1-F${n}-IV2`, [F[n] - 0.08, -0.24]),
    valveUnit(`PL1-F${n}-DV1`, [F[n] + 0.26, -0.24]),
  ]),
];
const pumps = [
  pumpUnit(1, [-0.86, PUMP[1] + 0.21]),
  pumpUnit(2, [-0.6, -0.42]),
];

const line = (
  flow: string,
  points: Point[],
  colour = BLUE,
): MimicSpec['lines'][number] => ({ colour, points, flow: { id: flow } });

export const LOUNGE_FILTER_MIMIC: MimicSpec = {
  title: 'LOUNGE POOL — FILTERS',
  width: 2.4,
  height: 1.2,
  lines: [
    // Each pump's suction from the tank and discharge to the header.
    ...([1, 2] as const).map((n) =>
      line(`p${n}`, [
        [TANK[0] + 0.08, TANK[1]],
        [PUMP_X - 0.12, TANK[1]],
        [PUMP_X - 0.12, PUMP[n]],
        [HEADER_X, PUMP[n]],
        [HEADER_X, n === 1 ? INLET_HEADER : PUMP[1]],
      ]),
    ),
    // The inlet header, to filter 1's drop and on to filter 2's.
    line('inlet-header', [
      [HEADER_X, INLET_HEADER],
      [F[2] - 0.08, INLET_HEADER],
    ]),
    ...([1, 2] as const).flatMap((n) => [
      // The inlet drop: header to the backwash tee, tee to the filter.
      line(`f${n}-inlet`, [
        [F[n] - 0.08, INLET_HEADER],
        [F[n] - 0.08, BW_TEE],
      ]),
      line(`f${n}-bed`, [
        [F[n] - 0.08, BW_TEE],
        [F[n] - 0.08, FILTER_Y + 0.09],
      ]),
      // Backwash to waste: from the tee, round and up to the waste header.
      line(
        `f${n}-backwash`,
        [
          [F[n] - 0.08, BW_TEE],
          [F[n] + 0.22, BW_TEE],
          [F[n] + 0.22, WASTE_HEADER],
        ],
        WASTE,
      ),
      // The outlet, down to the filtered-water header.
      line(`f${n}-outlet`, [
        [F[n] - 0.08, FILTER_Y - 0.09],
        [F[n] - 0.08, OUTLET_HEADER],
      ]),
      // The drain, to waste.
      line(
        `f${n}-drain`,
        [
          [F[n] + 0.06, FILTER_Y - 0.09],
          [F[n] + 0.26, FILTER_Y - 0.09],
          [F[n] + 0.26, -0.33],
          [F[n] + 0.32, -0.33],
        ],
        WASTE,
      ),
    ]),
    // The filtered-water header: from filter 1 to filter 2, then on.
    line('outlet-12', [
      [F[1] - 0.08, OUTLET_HEADER],
      [F[2] - 0.08, OUTLET_HEADER],
    ]),
    line('to-pool', [
      [F[2] - 0.08, OUTLET_HEADER],
      [1.1, OUTLET_HEADER],
      [1.1, -0.03],
    ]),
    // The waste header.
    line(
      'waste-12',
      [
        [F[1] + 0.22, WASTE_HEADER],
        [F[2] + 0.22, WASTE_HEADER],
      ],
      WASTE,
    ),
    line(
      'to-waste',
      [
        [F[2] + 0.22, WASTE_HEADER],
        [1.1, WASTE_HEADER],
        [1.1, 0.25],
      ],
      WASTE,
    ),
    // The balance tank's drain.
    line(
      'tank-drain',
      [
        [TANK[0], TANK[1] - 0.08],
        [TANK[0], -0.43],
      ],
      WASTE,
    ),
  ],
  shapes: [
    { symbol: 'tank', at: TANK, size: 0.16, label: 'BALANCE TANK' },
    { symbol: 'pump', at: [PUMP_X, PUMP[1]], size: 0.09, label: 'P-201A' },
    { symbol: 'pump', at: [PUMP_X, PUMP[2]], size: 0.09, label: 'P-201B' },
    { symbol: 'filter', at: [F[1], FILTER_Y], size: 0.18, label: 'FILTER 1' },
    { symbol: 'filter', at: [F[2], FILTER_Y], size: 0.18, label: 'FILTER 2' },
    ...units.map((unit) => unit.shape),
  ],
  labels: [
    ...units.flatMap((u) => u.labels),
    { text: 'FILTERED WATER · BACKWASH SUPPLY', at: [0.3, -0.45], size: 0.6 },
    { text: 'TO HEAT EXCHANGER,', at: [1.1, 0.04], size: 0.5 },
    { text: 'UV AND POOL', at: [1.1, 0.0], size: 0.5 },
    { text: 'BACKWASH TO WASTE', at: [0.45, 0.54], size: 0.6 },
    { text: 'TO WASTE', at: [1.04, 0.21], size: 0.55 },
    { text: 'DRAIN', at: [F[1] + 0.32, -0.36], size: 0.5 },
    { text: 'DRAIN', at: [F[2] + 0.32, -0.36], size: 0.5 },
    { text: 'TO WASTE', at: [TANK[0], -0.465], size: 0.5 },
    { text: '+ SERVICE  − BACKWASH', at: [F[1] + 0.3, -0.12], size: 0.45 },
    { text: '+ SERVICE  − BACKWASH', at: [F[2] + 0.3, -0.12], size: 0.45 },
  ],
  lamps: pumps.flatMap((p) => p.lamps),
  readouts: [
    { id: 'f1-flow', at: [F[1] + 0.3, 0.04] },
    { id: 'f2-flow', at: [F[2] + 0.3, 0.04] },
  ],
  buttons: [
    ...units.flatMap((u) => u.buttons),
    ...pumps.flatMap((p) => p.buttons),
  ],
  modes: [{ id: 'flow', legend: 'FLOW' }],
};

/** A lounge pump as the boards show it: its starter's state. */
export interface LoungePumpShown {
  running: boolean;
  tripped: boolean;
  /** HAND, OFF or AUTO, on PL1-CP1's door. */
  mode: 'hand' | 'off' | 'auto';
}

/**
 * What the board shows, from the world alone (never from the board): each
 * valve's lamps by its position, each pump's lamps by its starter, each
 * filter's signed flow, and each line's flow by the world's flows.
 */
export function loungeFilterMimicState(
  positions: Readonly<Record<string, number>>,
  flows: LoungeFlows,
  pumps: { p1: LoungePumpShown; p2: LoungePumpShown },
): MimicState {
  const at = (v: (typeof LOUNGE_VALVES)[number]) =>
    positions[v.assetId] ?? (v.normal === 'open' ? 1 : 0);
  const delivered = flows.ports[0].inlet + flows.ports[1].inlet;
  // The pumps' share of what is delivered: running, their discharge open.
  const share = ([1, 2] as const).map(
    (n) =>
      Number(pumps[`p${n}`].running) *
      at(LOUNGE_VALVES.find((v) => v.tag === `PL1-P${n}-IV1`)!),
  );
  const shares = share[0] + share[1];
  const pumped = share.map((s) => (shares ? (delivered * s) / shares : 0));
  const filter = (i: 0 | 1) => ({
    inlet: flows.ports[i].inlet,
    // Down into the bed in service and rinse, up out of it in backwash.
    bed: flows.beds[i],
    backwash: flows.ports[i].backwashOut,
    outlet: flows.filters[i],
    drain: flows.drains[i],
  });
  const f = [filter(0), filter(1)];
  const numbers: Record<string, number> = {
    p1: pumped[0],
    p2: pumped[1],
    'inlet-header': f[0].inlet + f[1].inlet,
    'outlet-12': f[0].outlet,
    'to-pool': flows.toPool,
    'waste-12': f[0].backwash,
    'to-waste': f[0].backwash + f[1].backwash,
    'tank-drain': flows.tankDrain,
  };
  ([1, 2] as const).forEach((n, i) => {
    numbers[`f${n}-inlet`] = f[i].inlet;
    numbers[`f${n}-bed`] = f[i].bed;
    numbers[`f${n}-backwash`] = f[i].backwash;
    // Drawn down from the filter: a service flow runs along it.
    numbers[`f${n}-outlet`] = f[i].outlet;
    numbers[`f${n}-drain`] = f[i].drain;
  });
  return {
    lamps: {
      ...Object.fromEntries(
        LOUNGE_VALVES.flatMap((v) => [
          [`${v.assetId}-open`, at(v) >= 0.98],
          [`${v.assetId}-shut`, at(v) <= 0.02],
        ]),
      ),
      ...Object.fromEntries(
        ([1, 2] as const).flatMap((n) => {
          const p = pumps[`p${n}`];
          return [
            [`p${n}-run`, p.running],
            [`p${n}-trip`, p.tripped],
            [`p${n}-local`, p.mode !== 'auto'],
          ];
        }),
      ),
    },
    readouts: Object.fromEntries(
      ([1, 2] as const).map((n) => [
        `f${n}-flow`,
        {
          flow: {
            value: flows.filters[n - 1],
            unit: 'm3/h',
            name: `F${n} FLOW`,
            places: 1,
          },
        },
      ]),
    ),
    flows: Object.fromEntries(
      Object.entries(numbers).map(([k, v]) => [k, flowState(v)]),
    ),
  };
}

/** The lounge's pumps on the board, P-201A as P1 and P-201B as P2. */
export const LOUNGE_PUMP_TAGS = { p1: 'P-201A', p2: 'P-201B' } as const;

/**
 * Board states already worked out, by world: the world is immutable, so a
 * state holds until it steps, and the lounge's two boards (PL1-CP1 and the
 * control room's) and the overlay share one a step (mission 094).
 */
const states = new WeakMap<World, MimicState>();

/** The board's state for a world: its valves, its flows and its starters. */
export function loungeFilterMimicOf(world: World): MimicState {
  let state = states.get(world);
  if (!state) {
    state = loungeFilterMimicStateOf(world);
    states.set(world, state);
  }
  return state;
}

function loungeFilterMimicStateOf(world: World): MimicState {
  const shown = (tag: MotorTag): LoungePumpShown => {
    const s = world.motors.starters[tag];
    return { running: s.running, tripped: s.tripped, mode: s.mode };
  };
  return loungeFilterMimicState(
    world.loungeValvePositions,
    loungeFlowsOf(world),
    {
      p1: shown(LOUNGE_PUMP_TAGS.p1),
      p2: shown(LOUNGE_PUMP_TAGS.p2),
    },
  );
}

/**
 * What a press of one of the board's buttons asks of the world: a valve
 * opened or shut, or a pump's START or STOP. The board has nothing else:
 * HAND · OFF · AUTO and RESET are on PL1-CP1's doors only, so from the
 * control room a pump in HAND or OFF, or tripped, cannot be put right.
 */
export function loungeFilterMimicCommand(button: string): WorldAction | null {
  const [asset, verb] = button.split('/');
  if (
    LOUNGE_VALVES.some((v) => v.assetId === asset) &&
    (verb === 'open' || verb === 'shut')
  )
    return { type: 'plant/valve', id: asset, open: verb === 'open' };
  const pump = /^(p[12])-(start|stop)$/.exec(button);
  if (pump)
    return {
      type: 'motor/starter',
      tag: LOUNGE_PUMP_TAGS[pump[1] as 'p1' | 'p2'],
      action: { act: pump[2] as 'start' | 'stop' },
    };
  return null;
}

/**
 * What each of the board's parts is, for the information overlay (prompt
 * 068): a button by the action its press sends (`loungeFilterMimicCommand`,
 * the same one), a lamp by the condition that lights it, a readout by the
 * board's own state for the mode shown.
 */
export const LOUNGE_FILTER_MIMIC_PARTS = {
  button(button: string): PartDescription | undefined {
    const action = loungeFilterMimicCommand(button);
    const label = LOUNGE_FILTER_MIMIC.buttons?.find(
      (b) => b.id === button,
    )?.legend;
    return action && label ? { kind: 'command', label, action } : undefined;
  },
  lamp(lamp: string): PartDescription | undefined {
    const valve = /^(.*)-(open|shut)$/.exec(lamp);
    const pump = /^(p[12])-(run|trip|local)$/.exec(lamp);
    const condition = valve
      ? `${valveTagOf(valve[1])} fully ${valve[2]}`
      : pump
        ? {
            run: `${LOUNGE_PUMP_TAGS[pump[1] as 'p1' | 'p2']} running`,
            trip: `${LOUNGE_PUMP_TAGS[pump[1] as 'p1' | 'p2']} tripped`,
            local: `${LOUNGE_PUMP_TAGS[pump[1] as 'p1' | 'p2']}’s starter out of AUTO (in HAND or OFF, on PL1-CP1)`,
          }[pump[2] as 'run' | 'trip' | 'local']
        : undefined;
    if (!condition) return undefined;
    const label = valve
      ? valve[2].toUpperCase()
      : pump![2] === 'local'
        ? 'NOT AUTO'
        : pump![2].toUpperCase();
    return {
      kind: 'indicator',
      label,
      condition,
      lit: (w) => loungeFilterMimicOf(w).lamps[lamp] ?? false,
    };
  },
  readout(readout: string, mode: () => string): PartDescription | undefined {
    const n = /^f([12])-flow$/.exec(readout)?.[1];
    if (!n) return undefined;
    return {
      kind: 'reading',
      label: `F${n} FLOW readout`,
      read: (w) => loungeFilterMimicOf(w).readouts[readout]?.[mode()],
      // What it shows, a fixed fact: no more than its display (the owner).
      context: () =>
        `Filter ${n}’s flow as PL1-F${n}-FT1 measures it; negative in reverse.`,
    };
  },
};
