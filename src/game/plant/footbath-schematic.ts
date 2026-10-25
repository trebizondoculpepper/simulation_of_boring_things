import type { PlumbEdge } from './plumbing-expansion';
import type { RoomSchematic, SchematicNode } from './schematics';

/**
 * The footbath plant room's schematic (`plant_pool_04`; prompt 064, the
 * owner, 2026-10-25: every room's design kept, every component in the
 * model): its packaged cabinet and what it meets, the links its runs are
 * drawn for, and every valve, each the one the world already keeps by its
 * id (the return, drain and make-up are the identified model's parts,
 * `identification.ts`; the heating's installed valves). Its overflow from
 * the footbath is never valved (the owner, as the jacuzzi's: a gravity
 * overflow, shut, would flood the deck). Pure.
 */

const nodes: SchematicNode[] = [
  {
    id: 'cabinet',
    kind: 'spa-pack',
    code: 'CAB1',
    name: 'Footbath packaged cabinet',
  },
  { id: 'spa', kind: 'footbath', name: 'Footbath' },
  { id: 'heating', kind: 'heating-main', name: 'Heating main' },
  { id: 'water', kind: 'water-service', name: 'Water service' },
  { id: 'gully', kind: 'gully', name: 'Floor gully' },
  { id: 'busbar', kind: 'busbar', name: 'Busbar' },
  { id: 'switch-fuse', kind: 'switch-fuse', name: 'Room supply switch-fuse' },
  { id: 'valve-panel', kind: 'valve-panel', name: 'Valve panel' },
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
  link('Return to the spa', ['cabinet', 'return'], ['spa', 'return'], 'water'),
  link(
    'Overflow from the spa',
    ['spa', 'overflow'],
    ['cabinet', 'overflow'],
    'water',
  ),
  link(
    'Heating flow',
    ['heating', 'flow'],
    ['cabinet', 'heating-flow'],
    'water',
  ),
  link(
    'Heating return',
    ['cabinet', 'heating-return'],
    ['heating', 'return'],
    'water',
  ),
  link('Drain to waste', ['cabinet', 'drain'], ['gully', 'in'], 'water'),
  link(
    'Footbath make-up main',
    ['water', 'out'],
    ['cabinet', 'make-up'],
    'water',
  ),
  link(
    'Busbar to the switch-fuse',
    ['busbar', 'tap'],
    ['switch-fuse', 'in'],
    'power',
  ),
  link(
    'Switch-fuse to the cabinet',
    ['switch-fuse', 'out'],
    ['cabinet', 'power'],
    'power',
  ),
  link(
    'Valve panel to the cabinet',
    ['valve-panel', 'control'],
    ['cabinet', 'valves'],
    'control',
  ),
];

export const FOOTBATH_SCHEMATIC: RoomSchematic = {
  room: 'plant_pool_04',
  code: 'PL4',
  nodes,
  links,
  fittings: [
    {
      id: 'PL4-PW1-RV1',
      kind: 'isolating-valve',
      edge: 'Return to the spa',
      end: 'source',
      normally: 'open',
      role: 'return',
      operator: 'motor',
      keptBy: 'identified',
    },
    {
      id: 'valve-0095',
      kind: 'isolating-valve',
      edge: 'Heating flow',
      end: 'target',
      normally: 'open',
      role: 'heatingFlow',
      operator: 'motor',
    },
    {
      id: 'valve-0096',
      kind: 'isolating-valve',
      edge: 'Heating return',
      end: 'source',
      normally: 'open',
      role: 'heatingReturn',
      operator: 'motor',
    },
    {
      id: 'PL4-PW1-DV1',
      kind: 'isolating-valve',
      edge: 'Drain to waste',
      end: 'source',
      normally: 'closed',
      role: 'drain',
      operator: 'motor',
      keptBy: 'identified',
    },
    {
      id: 'PL4-MU1-LCV1',
      kind: 'isolating-valve',
      edge: 'Footbath make-up main',
      end: 'target',
      normally: 'open',
      role: 'makeUp',
      operator: 'motor',
      keptBy: 'identified',
    },
    {
      id: 'footbath.isolator',
      kind: 'power-isolator',
      edge: 'Switch-fuse to the cabinet',
      end: 'target',
      normally: 'closed',
      role: 'cabinetIsolator',
    },
  ],
  rules: {
    isolate: new Set(['spa-pack']),
    pumps: new Set(),
    supplies: new Set(['switch-fuse']),
    switchgear: new Set(['switch-fuse']),
    // Its overflow is never valved.
    omit: new Set(['cabinet.overflow.iso']),
  },
};
