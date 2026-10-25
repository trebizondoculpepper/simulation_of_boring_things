/**
 * The pools' water circuits, as nodes and links of the plant network
 * (`types.ts`), built from the inventory the plant rooms already hold
 * (`doc/prompts/012-plant-network.md`, step zero).
 *
 * A large pool's circuit, in order (`doc/plant-model.md`): balance tank;
 * suction header; duty and standby pump sets (suction valve, strainer,
 * pump, non-return valve, discharge valve); discharge header, with the
 * sample tapping; the sand filters in parallel; filtered header; ozone
 * contact tank; heat exchanger; UV unit; hypochlorite and acid injection;
 * the pool's inlets. The pool comes back to its tank over its overflow and
 * through its main drain.
 *
 * Each filter is the classic five-valve nest: in service, water enters at
 * the top through its inlet valve (IV1) and leaves the bottom through its
 * outlet valve (IV2); to backwash, both are shut and the backwash supply
 * (BV1) sends pumped water up through the bed from the bottom, out of the
 * top through the backwash waste (BV2); the rinse valve (RNV1) runs the
 * settling bed to waste from the bottom, and the drain valve (WV1) empties
 * the vessel.
 *
 * Each plant room has its own make-up branch, by an isolating valve off
 * the wet hall's make-up main, and its own drainage header, falling to the
 * wet hall's drainage main (`wet-hall.ts`).
 *
 * Heights are metres above the wet hall's floor (`common.ts`); flows m³/h.
 * Pure.
 */
import { POOL_TARGET } from '../pools';
import type { PoolId } from '../pools';
import {
  BACKWASH_TANK_LEVEL,
  BREAK_TANK_LEVEL,
  GAP,
  NetworkBuilder,
  SITE,
  WET_HALL,
  deckOn,
  ph,
} from './common';
import type { Loss, Service } from './types';
import { BOOSTER } from './wet-hall';

// ---- A large pool's circuit -----------------------------------------------------

export interface CircuitSpec {
  /** The system's name in asset IDs: "olympic". */
  system: string;
  pool: PoolId;
  name: string;
  /** Its plant room, and the room's tag code. */
  room: string;
  code: string;
  filters: number;
  /** The plant room's level in the building, from 0, the wet hall's. */
  level: number;
  /** How fast the pool drains down to waste, m³/h. */
  drainDown: number;
}

export const LARGE_POOLS: readonly CircuitSpec[] = [
  {
    system: 'lounge',
    pool: 'pool_01',
    name: 'Lounge pool',
    room: 'plant_pool_01',
    code: 'PL1',
    filters: 2,
    level: 0,
    drainDown: 12,
  },
  {
    system: 'olympic',
    pool: 'pool_02',
    name: 'Olympic pool',
    room: 'plant_pool_02',
    code: 'PL2',
    filters: 5,
    level: 1,
    drainDown: 60,
  },
];

/**
 * Each part's loss, metres at the flow it is designed to carry (`q` is the
 * circuit's design flow, `n` its filters): typical of a pool circuit.
 */
const losses = (q: number, n: number) =>
  ({
    pipe: [0.02, q],
    suctionMain: [0.3, q],
    pumpValve: [0.05, q],
    strainer: [0.4, q],
    nonReturn: [0.3, q],
    toHeader: [0.15, q],
    filterValve: [0.05, q / n],
    filter: [2.5, q / n],
    filteredMain: [0.3, q],
    contactTank: [0.5, q],
    heatExchanger: [1.5, q],
    uv: [0.4, q],
    returnMain: [2.0, q],
    // The main drains carry about a third of the return, by gravity.
    mainDrain: [1.5, 0.3 * q],
  }) satisfies Record<string, Loss>;

/**
 * The pump's design head: what the circuit loses at its design flow along
 * the duty path, plus the lift from the tank to the pool.
 */
function designHead(spec: CircuitSpec) {
  const L = losses(1, spec.filters);
  const path = [
    L.suctionMain,
    L.pumpValve,
    L.strainer,
    L.nonReturn,
    L.pumpValve,
    L.toHeader,
    L.filterValve,
    L.filter,
    L.filterValve,
    L.filteredMain,
    L.contactTank,
    L.pipe,
    L.heatExchanger,
    L.pipe,
    L.uv,
    L.returnMain,
  ];
  return path.reduce((s, [m]) => s + m, 0) + TANK_BELOW_DECK;
}

/** A balance tank's working level below its pool's deck, metres. */
export const TANK_BELOW_DECK = 1.5;

/**
 * A plant room's own make-up branch, by its isolating valve off the wet
 * hall's make-up main, and its drainage header, falling to the wet hall's
 * drainage main.
 */
function roomServices(
  b: NetworkBuilder,
  at: string,
  system: string,
  room: string,
  name: string,
) {
  const makeUp = b.node({
    id: `${at}.mu.iv1`,
    name: `${name} make-up isolating valve`,
    kind: 'valve',
    class: 'valve',
    system,
    room,
    ports: { a: 'make-up', b: 'make-up' },
    hydraulic: {
      kind: 'valve',
      from: 'a',
      to: 'b',
      loss: [0.05, BOOSTER.flow],
    },
    normal: { open: true },
    aspects: { hydraulics: 'modelled' },
  });
  b.link(`${WET_HALL.makeUpMain}.main`, `${makeUp}.a`, 'make-up', [
    1,
    BOOSTER.flow,
  ]);
  const drains = b.node({
    id: `${at}.dr.header`,
    name: `${name} plant room drainage header`,
    kind: 'header',
    class: 'pipework',
    system,
    room,
    ports: { main: 'drainage' },
    hydraulic: { kind: 'junction' },
    aspects: { hydraulics: 'modelled' },
  });
  b.link(
    `${drains}.main`,
    `${WET_HALL.drainageMain}.main`,
    'drainage',
    [0.3, 100],
  );
  return { makeUp, drains };
}

export function largePoolCircuit(b: NetworkBuilder, spec: CircuitSpec) {
  const { system, room, code, name } = spec;
  const q = POOL_TARGET[spec.pool].flow;
  const L = losses(q, spec.filters);
  const at = code.toLowerCase();
  const id = (s: string) => `${at}.${s}`;
  const deck = deckOn(spec.level);
  const tankLevel = deck - TANK_BELOW_DECK;
  const { makeUp, drains } = roomServices(b, at, system, room, name);
  const pipe = (from: string, to: string, loss: Loss = L.pipe) =>
    b.link(from, to, 'pool-water', loss);

  // The pool and its tank.
  const pool = b.node({
    id: `${at.replace('pl', 'ph')}.pool`,
    name,
    kind: 'pool',
    class: 'water',
    system,
    ports: {
      inlets: 'pool-water',
      overflow: 'pool-water',
      mainDrain: 'pool-water',
    },
    hydraulic: { kind: 'reservoir', level: deck },
    aspects: {
      hydraulics: 'modelled',
      levels: ph(GAP.levels),
      chemistry: ph(GAP.chemistry),
    },
  });
  const tank = b.node({
    id: id('t1'),
    name: `${name} balance tank`,
    kind: 'balance-tank',
    class: 'equipment',
    system,
    room,
    ports: {
      overflow: 'pool-water',
      mainDrain: 'pool-water',
      suction: 'pool-water',
      makeUp: 'make-up',
      drain: 'drainage',
      sampleReturn: 'sample',
    },
    hydraulic: { kind: 'reservoir', level: tankLevel },
    aspects: { hydraulics: 'modelled', levels: ph(GAP.levels) },
  });
  b.link(`${pool}.overflow`, `${tank}.overflow`, 'pool-water', undefined, {
    hydraulics: ph(GAP.weir),
  });

  const valve = (
    key: string,
    label: string,
    ports: { a: Service; b: Service },
    open: boolean,
    loss: Loss,
    kind: 'valve' | 'float-valve' = 'valve',
  ) =>
    b.node({
      id: id(key),
      name: label,
      kind,
      class: 'valve',
      system,
      room,
      ports,
      hydraulic: { kind: 'valve', from: 'a', to: 'b', loss },
      normal: { open },
      aspects: {
        hydraulics: 'modelled',
        ...(kind === 'float-valve' ? { levels: ph(GAP.float) } : {}),
      },
    });

  // The main drain, to the tank or, for drain-down, to waste.
  const mdv = valve(
    'pw.iv1',
    `${name} main drain valve`,
    { a: 'pool-water', b: 'pool-water' },
    true,
    L.mainDrain,
  );
  pipe(`${pool}.mainDrain`, `${mdv}.a`);
  pipe(`${mdv}.b`, `${tank}.mainDrain`);
  const ddv = valve(
    'pw.wv1',
    `${name} drain-down valve, to waste`,
    { a: 'pool-water', b: 'drainage' },
    false,
    [deck - BACKWASH_TANK_LEVEL, spec.drainDown],
  );
  pipe(`${pool}.mainDrain`, `${ddv}.a`);
  b.link(`${ddv}.b`, `${drains}.main`, 'drainage');

  // The tank's make-up and drain.
  const lcv = valve(
    't1.lcv1',
    `${name} balance tank float valve`,
    { a: 'make-up', b: 'make-up' },
    false,
    [BREAK_TANK_LEVEL + BOOSTER.head - tankLevel - 4, BOOSTER.flow / 2],
    'float-valve',
  );
  b.link(`${makeUp}.b`, `${lcv}.a`, 'make-up');
  b.link(`${lcv}.b`, `${tank}.makeUp`, 'make-up');
  const tdv = valve(
    't1.wv1',
    `${name} balance tank drain valve`,
    { a: 'drainage', b: 'drainage' },
    false,
    [tankLevel - BACKWASH_TANK_LEVEL, q / 4],
  );
  b.link(`${tank}.drain`, `${tdv}.a`, 'drainage');
  b.link(`${tdv}.b`, `${drains}.main`, 'drainage');

  // Headers.
  const header = (key: string, label: string) =>
    b.node({
      id: id(`pw.${key}`),
      name: `${name} ${label}`,
      kind: 'header',
      class: 'pipework',
      system,
      room,
      ports: { main: 'pool-water' },
      hydraulic: { kind: 'junction' },
      aspects: { hydraulics: 'modelled' },
    });
  const suction = header('suction-header', 'pump suction header');
  const discharge = header('discharge-header', 'pump discharge header');
  const filtered = header('filtered-header', 'filtered water header');
  pipe(`${tank}.suction`, `${suction}.main`, L.suctionMain);

  // Duty and standby pump sets.
  const head = designHead(spec);
  for (const n of [1, 2]) {
    const set = `p${n}`;
    const duty = n === 1;
    const sv = valve(
      `${set}.sv1`,
      `${name} pump ${n} suction valve`,
      { a: 'pool-water', b: 'pool-water' },
      true,
      L.pumpValve,
    );
    const strainer = b.node({
      id: id(`${set}.str1`),
      name: `${name} pump ${n} strainer`,
      kind: 'strainer',
      class: 'equipment',
      system,
      room,
      ports: { in: 'pool-water', out: 'pool-water' },
      hydraulic: {
        kind: 'resistance',
        from: 'in',
        to: 'out',
        loss: L.strainer,
      },
      aspects: { hydraulics: 'modelled' },
    });
    const pump = b.node({
      id: id(set),
      name: `${name} circulation pump ${n} (${duty ? 'duty' : 'standby'})`,
      kind: 'pump',
      class: 'equipment',
      system,
      room,
      ports: { suction: 'pool-water', discharge: 'pool-water', power: 'power' },
      hydraulic: {
        kind: 'pump',
        from: 'suction',
        to: 'discharge',
        head,
        flow: q,
        shutoff: head * 1.45,
      },
      normal: { running: duty },
      aspects: { hydraulics: 'modelled', electrics: ph(GAP.electrics) },
    });
    const nrv = b.node({
      id: id(`${set}.nrv1`),
      name: `${name} pump ${n} non-return valve`,
      kind: 'non-return-valve',
      class: 'valve',
      system,
      room,
      ports: { in: 'pool-water', out: 'pool-water' },
      hydraulic: { kind: 'check', from: 'in', to: 'out', loss: L.nonReturn },
      aspects: { hydraulics: 'modelled' },
    });
    const dv = valve(
      `${set}.dv1`,
      `${name} pump ${n} discharge valve`,
      { a: 'pool-water', b: 'pool-water' },
      true,
      L.pumpValve,
    );
    pipe(`${suction}.main`, `${sv}.a`);
    pipe(`${sv}.b`, `${strainer}.in`);
    pipe(`${strainer}.out`, `${pump}.suction`);
    pipe(`${pump}.discharge`, `${nrv}.in`);
    pipe(`${nrv}.out`, `${dv}.a`);
    pipe(`${dv}.b`, `${discharge}.main`, L.toHeader);
    b.link(`${SITE.power}.out`, `${pump}.power`, 'power');
  }

  // The sample tapping on the discharge header, to the dosing controller
  // and back to the tank.
  const tapping = b.node({
    id: id('pw.sample-tapping'),
    name: `${name} sample tapping`,
    kind: 'sample-tapping',
    class: 'pipework',
    system,
    room,
    ports: { main: 'pool-water', sample: 'sample' },
    aspects: { chemistry: ph(GAP.chemistry) },
  });
  pipe(`${discharge}.main`, `${tapping}.main`);

  // The filters.
  for (let n = 1; n <= spec.filters; n++) {
    const f = `f${n}`;
    const filter = b.node({
      id: id(f),
      name: `${name} sand filter ${n}`,
      kind: 'sand-filter',
      class: 'equipment',
      system,
      room,
      ports: { top: 'pool-water', bottom: 'pool-water' },
      hydraulic: {
        kind: 'resistance',
        from: 'top',
        to: 'bottom',
        loss: L.filter,
      },
      aspects: { hydraulics: 'modelled', treatment: ph(GAP.chemistry) },
    });
    const fv = (
      key: string,
      label: string,
      ports: { a: Service; b: Service },
      open: boolean,
    ) =>
      valve(
        `${f}.${key}`,
        `${name} filter ${n} ${label}`,
        ports,
        open,
        L.filterValve,
      );
    const pw = { a: 'pool-water', b: 'pool-water' } as const;
    const toWaste = { a: 'pool-water', b: 'drainage' } as const;
    const inlet = fv('iv1', 'inlet valve', pw, true);
    const outlet = fv('iv2', 'outlet valve', pw, true);
    const bwIn = fv('bv1', 'backwash supply valve', pw, false);
    const bwOut = fv('bv2', 'backwash waste valve', toWaste, false);
    const rinse = fv('rnv1', 'rinse valve, to waste', toWaste, false);
    const drain = fv('wv1', 'drain valve, to waste', toWaste, false);
    pipe(`${discharge}.main`, `${inlet}.a`);
    pipe(`${inlet}.b`, `${filter}.top`);
    pipe(`${filter}.bottom`, `${outlet}.a`);
    pipe(`${outlet}.b`, `${filtered}.main`);
    pipe(`${discharge}.main`, `${bwIn}.a`);
    pipe(`${bwIn}.b`, `${filter}.bottom`);
    pipe(`${filter}.top`, `${bwOut}.a`);
    pipe(`${filter}.bottom`, `${rinse}.a`);
    pipe(`${filter}.bottom`, `${drain}.a`);
    for (const v of [bwOut, rinse, drain])
      b.link(`${v}.b`, `${drains}.main`, 'drainage');
  }

  // Ozone: the generator and its contact tank.
  const generator = b.node({
    id: id('oz1'),
    name: `${name} ozone generator`,
    kind: 'ozone-generator',
    class: 'equipment',
    system,
    room,
    ports: { ozone: 'ozone', power: 'power' },
    aspects: { ozone: ph(GAP.ozone), electrics: ph(GAP.electrics) },
  });
  b.link(`${SITE.power}.out`, `${generator}.power`, 'power');
  const contact = b.node({
    id: id('t2'),
    name: `${name} ozone contact tank`,
    kind: 'contact-tank',
    class: 'equipment',
    system,
    room,
    ports: { inlet: 'pool-water', outlet: 'pool-water', ozone: 'ozone' },
    hydraulic: {
      kind: 'resistance',
      from: 'inlet',
      to: 'outlet',
      loss: L.contactTank,
    },
    aspects: { hydraulics: 'modelled', ozone: ph(GAP.ozone) },
  });
  b.link(`${generator}.ozone`, `${contact}.ozone`, 'ozone');
  pipe(`${filtered}.main`, `${contact}.inlet`, L.filteredMain);

  // Heat exchanger, from the LTHW ring.
  const hx = b.node({
    id: id('hx1'),
    name: `${name} plate heat exchanger`,
    kind: 'heat-exchanger',
    class: 'equipment',
    system,
    room,
    ports: {
      poolIn: 'pool-water',
      poolOut: 'pool-water',
      primaryFlow: 'heating',
      primaryReturn: 'heating',
    },
    hydraulic: {
      kind: 'resistance',
      from: 'poolIn',
      to: 'poolOut',
      loss: L.heatExchanger,
    },
    aspects: { hydraulics: 'modelled', heat: ph(GAP.heating) },
  });
  pipe(`${contact}.outlet`, `${hx}.poolIn`);
  b.link(`${SITE.lthw}.flow`, `${hx}.primaryFlow`, 'heating');
  b.link(`${hx}.primaryReturn`, `${SITE.lthw}.return`, 'heating');

  // UV.
  const uv = b.node({
    id: id('uv1'),
    name: `${name} UV unit`,
    kind: 'uv-unit',
    class: 'equipment',
    system,
    room,
    ports: { inlet: 'pool-water', outlet: 'pool-water', power: 'power' },
    hydraulic: { kind: 'resistance', from: 'inlet', to: 'outlet', loss: L.uv },
    aspects: {
      hydraulics: 'modelled',
      treatment: ph(GAP.uv),
      electrics: ph(GAP.electrics),
    },
  });
  pipe(`${hx}.poolOut`, `${uv}.inlet`);
  b.link(`${SITE.power}.out`, `${uv}.power`, 'power');

  // Dosing: the controller reads the sample and drives the two pumps,
  // which inject on the return after the UV.
  const controller = b.node({
    id: id('ds1'),
    name: `${name} dosing controller and sample cells`,
    kind: 'dosing-controller',
    class: 'equipment',
    system,
    room,
    ports: { sample: 'sample', sampleReturn: 'sample' },
    aspects: { chemistry: ph(GAP.chemistry) },
  });
  b.link(`${tapping}.sample`, `${controller}.sample`, 'sample');
  b.link(`${controller}.sampleReturn`, `${tank}.sampleReturn`, 'sample');
  let upstream = `${uv}.outlet`;
  for (const [key, chem, store, part] of [
    ['hypo', 'hypochlorite', SITE.hypochlorite, 'p1'],
    ['acid', 'acid', SITE.acid, 'p2'],
  ] as const) {
    const pump = b.node({
      id: id(`ds1.${part}`),
      name: `${name} ${chem} dosing pump`,
      kind: 'dosing-pump',
      class: 'equipment',
      system,
      room,
      ports: { supply: 'chemical', dose: 'chemical' },
      aspects: { chemistry: ph(GAP.chemicals) },
    });
    const point = b.node({
      id: id(`pw.${key}-injection`),
      name: `${name} ${chem} injection point`,
      kind: 'injection-point',
      class: 'pipework',
      system,
      room,
      ports: { main: 'pool-water', dose: 'chemical' },
      hydraulic: { kind: 'junction' },
      aspects: { hydraulics: 'modelled', chemistry: ph(GAP.chemistry) },
    });
    b.link(`${store}.out`, `${pump}.supply`, 'chemical');
    b.link(`${pump}.dose`, `${point}.dose`, 'chemical');
    pipe(upstream, `${point}.main`);
    upstream = `${point}.main`;
  }
  pipe(upstream, `${pool}.inlets`, L.returnMain);
}

// ---- The packaged sets: the jacuzzi and the footbath ------------------------

export const PACKAGED_POOLS = [
  {
    system: 'jacuzzi',
    pool: 'pool_03' as PoolId,
    name: 'Jacuzzi',
    room: 'plant_pool_03',
    code: 'PL3',
    level: 2,
    label: 'Packaged Jacuzzi plant cabinet',
  },
  {
    system: 'footbath',
    pool: 'pool_04' as PoolId,
    name: 'Footbath',
    room: 'plant_pool_04',
    code: 'PL4',
    level: 0,
    label: 'Packaged spa set, footbath',
  },
] as const;

/** The packaged set's head at its design flow, and its shut-off head, metres. */
const SET_HEAD = 8;

export function packagedCircuit(
  b: NetworkBuilder,
  spec: (typeof PACKAGED_POOLS)[number],
) {
  const { system, room, code, name } = spec;
  const at = code.toLowerCase();
  const deck = deckOn(spec.level);
  const { makeUp, drains } = roomServices(b, at, system, room, name);
  const q = POOL_TARGET[spec.pool].flow;
  const pool = b.node({
    id: `${code.toLowerCase().replace('pl', 'ph')}.pool`,
    name,
    kind: 'pool',
    class: 'water',
    system,
    ports: { outlet: 'pool-water', inlets: 'pool-water' },
    hydraulic: { kind: 'reservoir', level: deck },
    aspects: {
      hydraulics: 'modelled',
      levels: ph(GAP.levels),
      chemistry: ph(GAP.chemistry),
    },
  });
  const set = b.node({
    id: `${code.toLowerCase()}.cab1`,
    name: spec.label,
    kind: 'packaged-set',
    class: 'equipment',
    system,
    room,
    ports: {
      suction: 'pool-water',
      return: 'pool-water',
      makeUp: 'make-up',
      drain: 'drainage',
      power: 'power',
    },
    hydraulic: {
      kind: 'pump',
      from: 'suction',
      to: 'return',
      head: SET_HEAD,
      flow: q,
      shutoff: SET_HEAD * 1.45,
    },
    normal: { running: true },
    aspects: {
      hydraulics: 'modelled',
      internals: ph(GAP.packaged),
      electrics: ph(GAP.electrics),
    },
  });
  b.link(`${pool}.outlet`, `${set}.suction`, 'pool-water', [SET_HEAD / 2, q]);
  b.link(`${set}.return`, `${pool}.inlets`, 'pool-water', [SET_HEAD / 2, q]);
  b.link(`${makeUp}.b`, `${set}.makeUp`, 'make-up');
  b.link(`${set}.drain`, `${drains}.main`, 'drainage');
  b.link(`${SITE.power}.out`, `${set}.power`, 'power');
}
