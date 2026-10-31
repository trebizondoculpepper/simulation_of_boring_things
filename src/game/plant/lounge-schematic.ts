import type { PlumbEdge } from './plumbing-expansion';
import { dayTanks } from './schematic-parts';
import { LOUNGE_TRIO } from './aqualis-schematic';
import type {
  RoomSchematic,
  SchematicFitting,
  SchematicNode,
} from './schematics';

/**
 * The lounge pool plant room's schematic (`plant_pool_01`; prompt 064, the
 * owner, 2026-10-25: every room's design kept, every component in the
 * model). Its machines (each by its layout's label), its headers and the
 * boundaries it meets; a link for each of its drawn runs, by the run's
 * name; and every valve and isolator, each the one the world already
 * keeps (its installed valves by their asset ids and plates; its motors'
 * isolators by name). Pure.
 */

const machine = (id: string, kind: string, name: string): SchematicNode => ({
  id,
  kind,
  name,
});

const DAY_TANKS = dayTanks(
  {
    hypochlorite: ['hypo-pumps', 'in'],
    acid: ['acid-pump', 'in'],
  },
  'pool_01',
);

const nodes: SchematicNode[] = [
  machine('pool', 'pool', 'Lounge pool'),
  machine('tank', 'balance-tank', 'Lounge pool balance tank'),
  machine(
    'pumps',
    'pump-pair',
    'Lounge pool circulation pumps, duty and standby, with strainers',
  ),
  machine('filter-1', 'sand-filter', 'Lounge pool sand filter 1'),
  machine('filter-2', 'sand-filter', 'Lounge pool sand filter 2'),
  machine('exchanger', 'heat-exchanger', 'Lounge pool plate heat exchanger'),
  machine('contact', 'contact-tank', 'Lounge pool ozone contact tank'),
  machine('generator', 'ozone-generator', 'Lounge pool ozone generator'),
  machine('uv', 'uv-unit', 'Lounge pool UV unit'),
  machine('hypo-pumps', 'hypo-pumps', 'Lounge pool hypochlorite dosing pumps'),
  machine('acid-pump', 'acid-pump', 'Lounge pool acid dosing pump'),
  // Its Dr Aqualis Trio (mission 114), in the old controller's node and
  // tag: CP2, the code its sample valves' tags are built from.
  {
    ...machine(
      'dosing',
      'dosing-controller',
      'Lounge pool dosing controller and sample cells',
    ),
    code: 'CP2',
  },
  // Its sample point on the pump discharge main (mission 114).
  ...LOUNGE_TRIO.nodes,
  machine('panel', 'pump-panel', 'Lounge pool local control panel'),
  // Its annunciator (the owner, 2026-10-28; `lounge-annunciator.ts`).
  machine('annunciator', 'annunciator', 'Lounge pool annunciator'),
  machine('ozone-monitor', 'ozone-monitor', 'Ozone monitor'),
  machine('suction-header', 'header', 'Pump suction header'),
  machine('discharge-header', 'header', 'Pump discharge header'),
  machine('inlet-header', 'header', 'Filter inlet header'),
  machine('outlet-header', 'header', 'Filter outlet header'),
  machine('heated-main', 'header', 'Heated main'),
  // Where the chemicals go in (prompt 089, item 4; the owner, 2026-10-27,
  // the Olympic's way): the acid into the heated main after the heat
  // exchanger, the hypochlorite into the return main after the UV unit,
  // last, each through its injection quill.
  machine('return-main', 'header', 'Return main'),
  {
    ...machine('acid-quill', 'injection-quill', 'Acid injection quill'),
    code: 'IQ1',
  },
  {
    ...machine('hypo-quill', 'injection-quill', 'Hypochlorite injection quill'),
    code: 'IQ2',
  },
  machine('heating', 'heating-main', 'Heating main'),
  machine('water', 'water-service', 'Water service'),
  machine('waste', 'gully', 'Drain to waste'),
  // Its day tanks, filled from the wet hall's selectors (plan 085).
  ...DAY_TANKS.nodes,
  machine('switch-fuse', 'switch-fuse', 'Room supply switch-fuse'),
  machine('supply', 'room-supply', 'Room supply'),
];

const link = (
  id: string,
  from: [string, string],
  to: [string, string],
  medium: PlumbEdge['medium'],
): PlumbEdge => ({
  id,
  sourceId: from[0],
  sourcePort: from[1],
  targetId: to[0],
  targetPort: to[1],
  medium,
});

const links: PlumbEdge[] = [
  link(
    'Overflow channel to the balance tank',
    ['pool', 'overflow'],
    ['tank', 'overflow'],
    'water',
  ),
  link(
    'Main drains to the balance tank',
    ['pool', 'main-drain'],
    ['tank', 'main-drain'],
    'water',
  ),
  link(
    'Suction main, balance tank to the pumps',
    ['tank', 'suction'],
    ['suction-header', 'in'],
    'water',
  ),
  link(
    'Pump suction header',
    ['suction-header', 'out'],
    ['pumps', 'suction'],
    'water',
  ),
  link(
    'Pump 1 discharge',
    ['pumps', 'discharge-1'],
    ['discharge-header', 'in'],
    'water',
  ),
  link(
    'Pump 2 discharge',
    ['pumps', 'discharge-2'],
    ['discharge-header', 'in'],
    'water',
  ),
  link(
    'Pump discharge main',
    ['discharge-header', 'out'],
    ['inlet-header', 'in'],
    'water',
  ),
  ...[1, 2].flatMap((n) => [
    link(
      `Filter ${n} inlet`,
      ['inlet-header', `out-${n}`],
      [`filter-${n}`, 'inlet'],
      'water',
    ),
    link(
      `Filter ${n} backwash waste`,
      [`filter-${n}`, 'inlet'],
      ['waste', 'in'],
      'water',
    ),
    link(
      `Filter ${n} outlet`,
      [`filter-${n}`, 'outlet'],
      ['outlet-header', `in-${n}`],
      'water',
    ),
    link(
      `Filter ${n} drain`,
      [`filter-${n}`, 'drain'],
      ['waste', 'in'],
      'water',
    ),
  ]),
  link(
    'Filtered main to the heat exchanger',
    ['outlet-header', 'out'],
    ['exchanger', 'pool-in'],
    'water',
  ),
  link(
    'Heat exchanger to the ozone contact tank',
    ['exchanger', 'pool-out'],
    ['contact', 'inlet'],
    'water',
  ),
  link(
    'Contact tank to the UV unit',
    ['contact', 'outlet'],
    ['uv', 'inlet'],
    'water',
  ),
  link(
    'Return main to the pool’s inlets',
    ['uv', 'outlet'],
    ['pool', 'inlets'],
    'water',
  ),
  link(
    'Ozone to the contact tank',
    ['generator', 'ozone'],
    ['contact', 'ozone'],
    'gas',
  ),
  link(
    'Heating flow to the heat exchanger',
    ['heating', 'flow'],
    ['exchanger', 'primary-flow'],
    'water',
  ),
  link(
    'Heating return from the heat exchanger',
    ['exchanger', 'primary-return'],
    ['heating', 'return'],
    'water',
  ),
  link(
    'Make-up water to the balance tank',
    ['water', 'out'],
    ['tank', 'make-up'],
    'water',
  ),
  link(
    'Balance tank drain to waste',
    ['tank', 'drain'],
    ['waste', 'in'],
    'water',
  ),
  ...DAY_TANKS.links,
  // Each dosing pump's discharge to its quill, the quill into its main.
  link(
    'Acid to its injection quill',
    ['acid-pump', 'out'],
    ['acid-quill', 'in'],
    'chemical',
  ),
  link(
    'Acid injection into the heated main',
    ['acid-quill', 'out'],
    ['heated-main', 'acid'],
    'chemical',
  ),
  link(
    'Hypochlorite to its injection quill',
    ['hypo-pumps', 'out'],
    ['hypo-quill', 'in'],
    'chemical',
  ),
  link(
    'Hypochlorite injection into the return main',
    ['hypo-quill', 'out'],
    ['return-main', 'hypochlorite'],
    'chemical',
  ),
  // The Trio's (mission 114): its sample off the pump discharge main,
  // before the filters and any dosing, and back to the balance tank; its
  // control of each dosing pump, its alarms to the annunciator, its supply.
  ...LOUNGE_TRIO.links,
  link(
    'Control panel supply',
    ['switch-fuse', 'panel'],
    ['panel', 'supply'],
    'power',
  ),
  link(
    'P-201A power',
    ['switch-fuse', 'pump-a'],
    ['pumps', 'power-a'],
    'power',
  ),
  link(
    'P-201B power',
    ['switch-fuse', 'pump-b'],
    ['pumps', 'power-b'],
    'power',
  ),
  link('UV unit power', ['switch-fuse', 'uv'], ['uv', 'power'], 'power'),
  link(
    'Ozone generator power',
    ['switch-fuse', 'generator'],
    ['generator', 'power'],
    'power',
  ),
  link(
    'plant_pool_01 room supply',
    ['supply', 'out'],
    ['switch-fuse', 'in'],
    'power',
  ),
  link(
    'plant_pool_01 room feed',
    ['switch-fuse', 'out'],
    ['panel', 'feed'],
    'power',
  ),
];

/** An installed valve, kept by the register under its asset id and plate. */
const valve = (
  id: string,
  edge: string,
  end: 'source' | 'target',
  normally: 'open' | 'closed',
  role: string,
): SchematicFitting => ({
  id,
  kind: 'isolating-valve',
  edge,
  end,
  normally,
  role,
  operator: 'solenoid',
  keptBy: 'register',
});

const isolator = (id: string, edge: string): SchematicFitting => ({
  id,
  kind: 'power-isolator',
  edge,
  end: 'target',
  normally: 'closed',
  role: 'motorIsolator',
});

export const LOUNGE_SCHEMATIC: RoomSchematic = {
  room: 'plant_pool_01',
  code: 'PL1',
  nodes,
  links,
  fittings: [
    valve('valve-0097', 'Pump 1 discharge', 'source', 'open', 'pump1Discharge'),
    valve('valve-0098', 'Pump 2 discharge', 'source', 'open', 'pump2Discharge'),
    valve('valve-0001', 'Filter 1 inlet', 'target', 'open', 'f1Inlet'),
    valve(
      'valve-0002',
      'Filter 1 backwash waste',
      'source',
      'closed',
      'f1Backwash',
    ),
    valve('valve-0003', 'Filter 1 outlet', 'source', 'open', 'f1Outlet'),
    valve('valve-0004', 'Filter 1 drain', 'source', 'closed', 'f1Drain'),
    valve('valve-0005', 'Filter 2 inlet', 'target', 'open', 'f2Inlet'),
    valve(
      'valve-0006',
      'Filter 2 backwash waste',
      'source',
      'closed',
      'f2Backwash',
    ),
    valve('valve-0007', 'Filter 2 outlet', 'source', 'open', 'f2Outlet'),
    valve('valve-0008', 'Filter 2 drain', 'source', 'closed', 'f2Drain'),
    // Each filter's outlet flowmeter (prompt 066).
    ...([1, 2] as const).map((n): SchematicFitting => ({
      id: `PL1-F${n}-FT1`,
      kind: 'flowmeter',
      edge: `Filter ${n} outlet`,
      end: 'source',
      normally: 'open',
      role: `f${n}Flow`,
      keptBy: 'identified',
    })),
    valve(
      'valve-0009',
      'Balance tank drain to waste',
      'source',
      'closed',
      'tankDrain',
    ),
    // Each quill's isolating valve and non-return valve, on its dosing
    // line at the quill (prompt 089, item 4).
    ...(['acid', 'hypo'] as const).flatMap((k): SchematicFitting[] => {
      const edge =
        k === 'acid'
          ? 'Acid to its injection quill'
          : 'Hypochlorite to its injection quill';
      return [
        {
          id: `${k}-quill.in.iso`,
          kind: 'isolating-valve',
          edge,
          end: 'target',
          normally: 'open',
          role: `${k === 'acid' ? 'acid' : 'hypochlorite'} injection isolation`,
          operator: 'lever',
        },
        {
          id: `${k}-quill.in.nrv`,
          kind: 'non-return-valve',
          edge,
          end: 'target',
          normally: 'open',
          role: `${k === 'acid' ? 'acid' : 'hypochlorite'} injection non-return`,
        },
      ];
    }),
    // Its day tanks' inlet and outlet valves (plan 085).
    ...DAY_TANKS.fittings,
    // The Trio's sample valves and its isolator (mission 114).
    ...LOUNGE_TRIO.fittings,
    isolator('P-201A isolator', 'P-201A power'),
    isolator('P-201B isolator', 'P-201B power'),
    isolator('Lounge UV unit isolator', 'UV unit power'),
    isolator('Lounge ozone generator isolator', 'Ozone generator power'),
  ],
  // Every valve and isolator given: the rules add nothing.
  rules: { isolate: new Set(), pumps: new Set() },
};
