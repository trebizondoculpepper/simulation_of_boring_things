import type { Block } from '../sim/blocks';
import { blockAt, read } from '../sim/blocks';
import { gaugeBar, resistanceFor, solveNetwork } from '../sim/hydraulics';
import type { NetLink, NetNode, NetSolution } from '../sim/hydraulics';

/**
 * The main pool's circulation, as executable model: the skeleton the
 * plant rooms' machines will be bound to. Pure.
 *
 * Water leaves the balance tank, is drawn by the duty pump through its
 * strainer, pushed through the filters in parallel, the heat exchanger
 * and the UV unit, and returned to the pool's inlets; the pool overflows
 * back to the tank (by gravity, outside the pressurised circuit).
 *
 * Each machine is a block (`sim/blocks.ts`) of a reusable kind; a pump set
 * and a filter set are blocks made of blocks (pump, motor, strainer,
 * valves; filter and its valves). A block shows the circuit only its
 * ports, each a node of the water network named "<address>.<port>"; what
 * it does between them (its links, and any nodes of its own) is its own
 * business, decided by its state: a stopped motor's pump passes nothing, a
 * shut valve is closed, a clogged filter resists more. The schematic's
 * pipes join ports. Solving the network gives every block's flow and
 * every port's pressure: what gauges, mimics and the game read.
 *
 * Design: one pump on duty gives 160 m³/h (a 3-hour turnover of a pool of
 * about 480 m³) against the circuit's losses and a 1.4 m lift from the
 * tank; the second pump stands by. Heads are metres of water above the
 * deck.
 */

/** The design flow, m³/h, and the levels, metres above the deck. */
export const DESIGN_FLOW = 160;
export const TANK_LEVEL = -1.4;
export const POOL_LEVEL = 0;
/** Where the plant's pipes and pumps sit, metres above the deck (for gauges). */
export const PLANT_ELEVATION = -2.5;

/** Each kind's design losses: metres at the flow it is sized for. */
const LOSS = {
  isolatingValve: [0.05, DESIGN_FLOW],
  strainer: [0.4, DESIGN_FLOW],
  nonReturn: [0.3, DESIGN_FLOW],
  filter: [2.5, DESIGN_FLOW / 4],
  filterValve: [0.05, DESIGN_FLOW / 4],
  heatExchanger: [1.5, DESIGN_FLOW],
  uv: [0.4, DESIGN_FLOW],
} as const;
const rFor = ([dh, q]: readonly [number, number]) => resistanceFor(dh, q);

/** The duty pump's curve: shut-off head and its fall, H = shutoff − k·Q². */
export const PUMP_CURVE = { shutoff: 15, k: (15 - 9.6) / DESIGN_FLOW ** 2 };

// ---- Kinds of block ----------------------------------------------------------

const valve = (
  open = 1,
  loss: readonly [number, number] = LOSS.isolatingValve,
): Block => ({
  kind: 'valve',
  state: { open, r: rFor(loss) },
});
const nonReturn = (): Block => ({
  kind: 'non-return-valve',
  state: { r: rFor(LOSS.nonReturn) },
});
const strainer = (): Block => ({
  kind: 'strainer',
  state: { fouling: 0, r: rFor(LOSS.strainer) },
});

/** A pump set: isolating valves, strainer, pump and its motor, non-return valve. */
export const pumpSet = (running = false): Block => ({
  kind: 'pump-set',
  state: {},
  children: {
    suctionValve: valve(),
    strainer: strainer(),
    pump: { kind: 'pump', state: { ...PUMP_CURVE } },
    motor: { kind: 'motor', state: { running, tripped: false } },
    nonReturn: nonReturn(),
    dischargeValve: valve(),
  },
});

/** A filter set: the pressure sand filter and its inlet and outlet valves. */
export const filterSet = (): Block => ({
  kind: 'filter-set',
  state: {},
  children: {
    inletValve: valve(1, LOSS.filterValve),
    filter: { kind: 'filter', state: { clog: 0, r: rFor(LOSS.filter) } },
    outletValve: valve(1, LOSS.filterValve),
  },
});

/** The circulation as built: its blocks, in their starting state. */
export function newCirculation(): Block {
  return {
    kind: 'circulation',
    state: {},
    children: {
      'BT-1': { kind: 'balance-tank', state: { level: TANK_LEVEL } },
      'P-101': pumpSet(true),
      'P-102': pumpSet(false),
      ...Object.fromEntries([1, 2, 3, 4].map((i) => [`F-${i}`, filterSet()])),
      'HX-1': {
        kind: 'heat-exchanger',
        state: { r: rFor(LOSS.heatExchanger) },
      },
      'UV-1': { kind: 'uv-unit', state: { r: rFor(LOSS.uv) } },
      POOL: { kind: 'pool', state: { level: POOL_LEVEL } },
    },
  };
}

/**
 * The schematic's pipes: which port joins which, and each run's design
 * loss. Headers are junctions of their own.
 */
export const PIPES: readonly {
  from: string;
  to: string;
  loss: readonly [number, number];
}[] = [
  { from: 'BT-1.out', to: 'suction-header', loss: [0.3, DESIGN_FLOW] },
  { from: 'suction-header', to: 'P-101.in', loss: [0.02, DESIGN_FLOW] },
  { from: 'suction-header', to: 'P-102.in', loss: [0.02, DESIGN_FLOW] },
  { from: 'P-101.out', to: 'discharge-header', loss: [0.15, DESIGN_FLOW] },
  { from: 'P-102.out', to: 'discharge-header', loss: [0.15, DESIGN_FLOW] },
  ...[1, 2, 3, 4].flatMap((i) => [
    {
      from: 'discharge-header',
      to: `F-${i}.in`,
      loss: [0.03, DESIGN_FLOW / 4] as const,
    },
    {
      from: `F-${i}.out`,
      to: 'filtered-header',
      loss: [0.03, DESIGN_FLOW / 4] as const,
    },
  ]),
  { from: 'filtered-header', to: 'HX-1.in', loss: [0.3, DESIGN_FLOW] },
  { from: 'HX-1.out', to: 'UV-1.in', loss: [0.1, DESIGN_FLOW] },
  { from: 'UV-1.out', to: 'POOL.inlets', loss: [2.0, DESIGN_FLOW] },
];

// ---- From blocks to network ----------------------------------------------------

type Piece = { nodes: NetNode[]; links: NetLink[] };

/** A link that is closed, or a resistance, as a valve's opening says. */
function valveLink(
  id: string,
  from: string,
  to: string,
  block: Block,
): NetLink {
  const open = (block.state.open as number) ?? 1;
  if (open < 0.02) return { id, kind: 'closed', from, to };
  return {
    id,
    kind: 'resistance',
    from,
    to,
    r: (block.state.r as number) / (open * open),
  };
}

/** A chain of a composite's children, port `in` to port `out`. */
function chain(
  path: string,
  links: ((from: string, to: string) => NetLink)[],
): Piece {
  const nodes: NetNode[] = [{ id: `${path}.in` }, { id: `${path}.out` }];
  const ids = [`${path}.in`];
  for (let i = 1; i < links.length; i++) {
    const id = `${path}#${i}`;
    nodes.push({ id });
    ids.push(id);
  }
  ids.push(`${path}.out`);
  return { nodes, links: links.map((make, i) => make(ids[i], ids[i + 1])) };
}

/** What a block of each kind puts into the network, between its ports. */
function piece(path: string, block: Block): Piece {
  const c = block.children ?? {};
  const r = (b: Block) => b.state.r as number;
  switch (block.kind) {
    case 'balance-tank':
      return {
        nodes: [{ id: `${path}.out`, head: block.state.level as number }],
        links: [],
      };
    case 'pool':
      return {
        nodes: [{ id: `${path}.inlets`, head: block.state.level as number }],
        links: [],
      };
    case 'pump-set': {
      const motor = c.motor.state;
      const driven = motor.running === true && motor.tripped !== true;
      const pump = c.pump.state as { shutoff: number; k: number };
      const fouling = c.strainer.state.fouling as number;
      return chain(path, [
        (a, b) => valveLink(`${path}/suctionValve`, a, b, c.suctionValve),
        (a, b) => ({
          id: `${path}/strainer`,
          kind: 'resistance',
          from: a,
          to: b,
          r: r(c.strainer) * (1 + 6 * fouling),
        }),
        (a, b) =>
          driven
            ? {
                id: `${path}/pump`,
                kind: 'pump',
                from: a,
                to: b,
                shutoff: pump.shutoff,
                k: pump.k,
              }
            : { id: `${path}/pump`, kind: 'closed', from: a, to: b },
        (a, b) => ({
          id: `${path}/nonReturn`,
          kind: 'check',
          from: a,
          to: b,
          r: r(c.nonReturn),
        }),
        (a, b) => valveLink(`${path}/dischargeValve`, a, b, c.dischargeValve),
      ]);
    }
    case 'filter-set': {
      const clog = c.filter.state.clog as number;
      return chain(path, [
        (a, b) => valveLink(`${path}/inletValve`, a, b, c.inletValve),
        (a, b) => ({
          id: `${path}/filter`,
          kind: 'resistance',
          from: a,
          to: b,
          r: r(c.filter) * (1 + 3 * clog),
        }),
        (a, b) => valveLink(`${path}/outletValve`, a, b, c.outletValve),
      ]);
    }
    case 'heat-exchanger':
    case 'uv-unit':
      return chain(path, [
        (a, b) => ({
          id: path,
          kind: 'resistance',
          from: a,
          to: b,
          r: r(block),
        }),
      ]);
    default:
      return { nodes: [], links: [] };
  }
}

/** The whole circulation's network, from its blocks' state and its pipes. */
export function circulationNetwork(root: Block) {
  const nodes = new Map<string, NetNode>();
  const links: NetLink[] = [];
  for (const [name, block] of Object.entries(root.children ?? {})) {
    const p = piece(name, block);
    for (const n of p.nodes) nodes.set(n.id, n);
    links.push(...p.links);
  }
  for (const pipe of PIPES)
    for (const id of [pipe.from, pipe.to])
      if (!nodes.has(id)) nodes.set(id, { id });
  PIPES.forEach((pipe, i) =>
    links.push({
      id: `pipe-${i}:${pipe.from}>${pipe.to}`,
      kind: 'resistance',
      from: pipe.from,
      to: pipe.to,
      r: rFor(pipe.loss),
    }),
  );
  return { nodes: [...nodes.values()], links };
}

export interface CirculationReading {
  solution: NetSolution;
  /** Flow through the circuit to the pool, m³/h. */
  flow: number;
  /** Flow through each pump set and filter set, m³/h. */
  through: Record<string, number>;
  /** Gauge pressure at a port ("P-101#3", "F-1.in"), bar. */
  pressure: (node: string) => number;
  /** Pressure across each filter, bar: its gauges' difference. */
  filterDp: Record<string, number>;
}

/** Solve the circulation as its blocks now stand. */
export function solveCirculation(root: Block): CirculationReading {
  const { nodes, links } = circulationNetwork(root);
  const solution = solveNetwork(nodes, links);
  const through: Record<string, number> = {};
  const filterDp: Record<string, number> = {};
  for (const [name, block] of Object.entries(root.children ?? {})) {
    if (block.kind === 'pump-set')
      through[name] = solution.flows[`${name}/nonReturn`];
    if (block.kind === 'filter-set') {
      through[name] = solution.flows[`${name}/filter`];
      filterDp[name] =
        gaugeBar(solution.heads[`${name}#1`], 0) -
        gaugeBar(solution.heads[`${name}#2`], 0);
    }
  }
  return {
    solution,
    flow: solution.flows[`pipe-${PIPES.length - 1}:UV-1.out>POOL.inlets`],
    through,
    pressure: (node) => gaugeBar(solution.heads[node], PLANT_ELEVATION),
    filterDp,
  };
}

/** A pump set's gauges: suction (after its strainer) and discharge (after its pump). */
export const pumpGauges = (reading: CirculationReading, pumpSet: string) => ({
  suction: reading.pressure(`${pumpSet}#2`),
  discharge: reading.pressure(`${pumpSet}#3`),
});

/** Whether the block at `path` exists, for bindings to check against. */
export const hasBlock = (root: Block, path: string) =>
  blockAt(root, path) !== undefined;
export { read };
