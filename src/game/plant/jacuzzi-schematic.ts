import { expandForPlumbing } from './plumbing-expansion';
import { dayTanks } from './schematic-parts';
import type { RoomSchematic, SchematicNode } from './schematics';
import type { Expansion, GivenFitting, PlumbEdge } from './plumbing-expansion';

/**
 * The jacuzzi plant room's schematic (prompt 064): its machines, the links
 * between their ports, and every valve and isolator on them, each with what
 * it is for and its state in service. It is the room's model: the plumber
 * expands it (`expandForPlumbing`) and should add nothing; the world's
 * jacuzzi reads its valves by these ids (`jacuzzi.ts`); and everything the
 * room draws is bound to its nodes, fittings and links
 * (`world-in-model.ts`), in the plant room and in the jacuzzi's own room,
 * the pool hall (its tub, wall plate, speakers, display and fibre-optic
 * wall). The packaged cabinet is one machine: its
 * circulation pump, jet pump, blower, filter, heater, UV and dosing are
 * inside it. The spa's overflow to the balance tank is never valved (the
 * owner: a gravity overflow, shut, would flood the deck). Pure.
 */

export const JACUZZI_ROOM = 'plant_pool_03';
export const JACUZZI_ROOM_CODE = 'PL3';

/** Its day tanks (plan 085), drawn on by the cabinet's own dosing. */
const JACUZZI_DAY_TANKS = dayTanks(
  {
    hypochlorite: ['cabinet', 'hypochlorite'],
    acid: ['cabinet', 'acid'],
  },
  'pool_03',
  { dosingIsolation: true },
);

export const JACUZZI_NODES: readonly SchematicNode[] = [
  {
    id: 'cabinet',
    kind: 'jacuzzi-pack',
    code: 'CAB1',
    name: 'Packaged Jacuzzi plant cabinet',
  },
  // Its sand filter, outside the cabinet beside it (the owner, 2026-10-25).
  {
    id: 'filter',
    kind: 'sand-filter',
    code: 'F1',
    name: 'Jacuzzi sand filter',
  },
  {
    id: 'tank',
    kind: 'balance-tank',
    code: 'BT1',
    name: 'Jacuzzi balance tank',
  },
  { id: 'spa', kind: 'spa', name: 'Jacuzzi' },
  { id: 'heating', kind: 'heating-main', name: 'Heating main' },
  { id: 'water', kind: 'water-service', name: 'Water service' },
  { id: 'gully', kind: 'gully', name: 'Floor gully' },
  { id: 'busbar', kind: 'busbar', name: 'Busbar' },
  { id: 'switch-fuse', kind: 'switch-fuse', name: 'Room supply switch-fuse' },
  { id: 'valve-panel', kind: 'valve-panel', name: 'Valve panel' },
  { id: 'mimic', kind: 'mimic-board', name: 'Jacuzzi mimic' },
  {
    id: 'fibre-illuminator',
    kind: 'fibre-illuminator',
    name: 'Spa fibre illuminator',
  },
  // In the jacuzzi's own room, the pool hall.
  { id: 'plate', kind: 'control-plate', name: 'Jacuzzi control plate' },
  { id: 'music-rack', kind: 'music-rack', name: 'Jacuzzi music rack' },
  { id: 'speakers', kind: 'speaker-pair', name: 'Jacuzzi speakers' },
  {
    id: 'display',
    kind: 'water-quality-display',
    name: 'Jacuzzi water quality display',
  },
  { id: 'fibre-wall', kind: 'fibre-wall', name: 'Fibre-optic wall' },
  // The two rooms' lights, each its lighting zone's (`lighting.ts`), and
  // the hall's deck gullies, its deck's drainage.
  {
    id: 'plant-room-lights',
    kind: 'plant-room-lights',
    name: 'Plant room lights',
  },
  { id: 'hall-lights', kind: 'hall-lights', name: 'Jacuzzi hall lights' },
  { id: 'deck-gullies', kind: 'deck-gully', name: 'Deck gullies' },
  ...JACUZZI_DAY_TANKS.nodes,
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

/** The links, by the names the room's runs carry, in their direction of flow. */
export const JACUZZI_LINKS: readonly PlumbEdge[] = [
  link('Return to the spa', ['cabinet', 'return'], ['spa', 'return'], 'water'),
  link(
    'Jets suction from the spa',
    ['spa', 'jets'],
    ['cabinet', 'jets-suction'],
    'water',
  ),
  link(
    'Jets discharge to the spa',
    ['cabinet', 'jets-discharge'],
    ['spa', 'jets'],
    'water',
  ),
  link(
    'Air to the spa’s blower ring',
    ['cabinet', 'air'],
    ['spa', 'air-ring'],
    'air',
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
  // Its filter: the pump's water out to it and back for the UV; its wash
  // to the gully.
  link(
    'Cabinet to the filter',
    ['cabinet', 'to-filter'],
    ['filter', 'inlet'],
    'water',
  ),
  link(
    'Filter to the cabinet',
    ['filter', 'outlet'],
    ['cabinet', 'from-filter'],
    'water',
  ),
  link('Filter wash to waste', ['filter', 'waste'], ['gully', 'in'], 'water'),
  link(
    'Suction from the balance tank',
    ['tank', 'suction'],
    ['cabinet', 'suction'],
    'water',
  ),
  link(
    'Overflow from the spa',
    ['spa', 'overflow'],
    ['tank', 'overflow'],
    'water',
  ),
  link(
    'Make-up to the balance tank',
    ['water', 'out'],
    ['tank', 'make-up'],
    'water',
  ),
  link(
    'Balance tank overflow',
    ['tank', 'overflow-out'],
    ['gully', 'in'],
    'water',
  ),
  link(
    'Balance tank drain to waste',
    ['tank', 'drain'],
    ['gully', 'in'],
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
  // Signals, not drawn: the wall plate's START and STOP to the cabinet,
  // the music to the speakers, the cabinet's readings to the display.
  link(
    'Wall plate to the cabinet',
    ['plate', 'out'],
    ['cabinet', 'plate'],
    'control',
  ),
  link(
    'Music to the speakers',
    ['music-rack', 'out'],
    ['speakers', 'in'],
    'control',
  ),
  link(
    'Readings to the mimic',
    ['cabinet', 'mimic'],
    ['mimic', 'in'],
    'control',
  ),
  link(
    'Light to the fibre-optic wall',
    ['fibre-illuminator', 'out'],
    ['fibre-wall', 'in'],
    'control',
  ),
  link(
    'Readings to the display',
    ['cabinet', 'readings'],
    ['display', 'in'],
    'control',
  ),
  // Its day tanks, filled from the wet hall's selectors (plan 085), each
  // drawn on by the cabinet's own dosing.
  ...JACUZZI_DAY_TANKS.links,
];

/** What each of the room's valves is for, as the world's jacuzzi reads it. */
export type JacuzziValveRole =
  | 'return'
  | 'jetsSuction'
  | 'jetsDischarge'
  | 'air'
  | 'heatingFlow'
  | 'heatingReturn'
  | 'drain'
  | 'suction'
  | 'makeUp'
  | 'tankDrain'
  | 'filterIn'
  | 'filterOut';

const valve = (
  role: JacuzziValveRole,
  edge: string,
  end: 'source' | 'target',
  normally: 'open' | 'closed',
  /** The cabinet's valves are motorised, worked from its valve panel; the tank's by hand. */
  operator: 'lever' | 'motor',
): GivenFitting & { role: JacuzziValveRole } => ({
  id: `jacuzzi.${role}`,
  kind: 'isolating-valve',
  edge,
  end,
  normally,
  role,
  operator,
});

/** Every valve and isolator, each where it stands on its link, in service. */
export const JACUZZI_FITTINGS: readonly (GivenFitting & { role: string })[] = [
  valve('return', 'Return to the spa', 'source', 'open', 'motor'),
  valve('jetsSuction', 'Jets suction from the spa', 'target', 'open', 'motor'),
  valve(
    'jetsDischarge',
    'Jets discharge to the spa',
    'source',
    'open',
    'motor',
  ),
  valve('air', 'Air to the spa’s blower ring', 'source', 'open', 'motor'),
  valve('heatingFlow', 'Heating flow', 'target', 'open', 'motor'),
  valve('heatingReturn', 'Heating return', 'source', 'open', 'motor'),
  valve('drain', 'Drain to waste', 'source', 'closed', 'motor'),
  valve('suction', 'Suction from the balance tank', 'target', 'open', 'motor'),
  valve('makeUp', 'Make-up to the balance tank', 'target', 'open', 'lever'),
  valve('filterIn', 'Cabinet to the filter', 'source', 'open', 'lever'),
  valve('filterOut', 'Filter to the cabinet', 'target', 'open', 'lever'),
  valve(
    'tankDrain',
    'Balance tank drain to waste',
    'source',
    'closed',
    'lever',
  ),
  {
    id: 'jacuzzi.isolator',
    kind: 'power-isolator',
    edge: 'Switch-fuse to the cabinet',
    end: 'target',
    normally: 'closed',
    role: 'cabinetIsolator',
  },
];

/**
 * The plumber's rules for the room: the cabinet's water, air and heating
 * connections isolated at the cabinet, and its power feed from the room's
 * switch-fuse isolated by it. With the schematic's valves given, it should
 * add nothing (`added` is empty).
 */
const RULES: RoomSchematic['rules'] = {
  isolate: new Set(['jacuzzi-pack']),
  pumps: new Set(),
  isolateMedia: new Set(['water', 'air']),
  supplies: new Set(['switch-fuse']),
  switchgear: new Set(['switch-fuse']),
};
let expanded: Expansion | undefined;
export function jacuzziExpansion(): Expansion {
  expanded ??= expandForPlumbing(JACUZZI_NODES, JACUZZI_LINKS, {
    ...RULES,
    given: [...JACUZZI_FITTINGS, ...JACUZZI_DAY_TANKS.fittings],
  });
  return expanded;
}

export const JACUZZI_SCHEMATIC: RoomSchematic = {
  room: JACUZZI_ROOM,
  code: JACUZZI_ROOM_CODE,
  nodes: JACUZZI_NODES,
  links: JACUZZI_LINKS,
  fittings: [...JACUZZI_FITTINGS, ...JACUZZI_DAY_TANKS.fittings],
  rules: RULES,
};

/** Each valve's model id by what it is for. */
export const JACUZZI_VALVE_IDS = Object.fromEntries(
  JACUZZI_FITTINGS.filter((f) => f.kind === 'isolating-valve').map((f) => [
    f.role,
    f.id,
  ]),
) as Readonly<Record<JacuzziValveRole, string>>;
