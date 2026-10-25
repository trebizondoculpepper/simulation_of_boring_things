import { expandForPlumbing } from './plumbing-expansion';
import type {
  Expansion,
  GivenFitting,
  PlumbEdge,
  PlumbNode,
} from './plumbing-expansion';

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

/** A machine of the room, with the code its tag is built from (PL3-CAB1). */
export interface SchematicNode extends PlumbNode {
  /** Its tag's code within the room: CAB1, BT1; none for a boundary. */
  code?: string;
  name: string;
}

export const JACUZZI_ROOM = 'plant_pool_03';
export const JACUZZI_ROOM_CODE = 'PL3';

export const JACUZZI_NODES: readonly SchematicNode[] = [
  {
    id: 'cabinet',
    kind: 'jacuzzi-pack',
    code: 'CAB1',
    name: 'Packaged Jacuzzi plant cabinet',
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
    'Readings to the display',
    ['cabinet', 'readings'],
    ['display', 'in'],
    'control',
  ),
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
  | 'tankDrain';

const valve = (
  role: JacuzziValveRole,
  edge: string,
  end: 'source' | 'target',
  normally: 'open' | 'closed',
): GivenFitting & { role: JacuzziValveRole } => ({
  id: `jacuzzi.${role}`,
  kind: 'isolating-valve',
  edge,
  end,
  normally,
  role,
});

/** Every valve and isolator, each where it stands on its link, in service. */
export const JACUZZI_FITTINGS: readonly (GivenFitting & { role: string })[] = [
  valve('return', 'Return to the spa', 'source', 'open'),
  valve('jetsSuction', 'Jets suction from the spa', 'target', 'open'),
  valve('jetsDischarge', 'Jets discharge to the spa', 'source', 'open'),
  valve('air', 'Air to the spa’s blower ring', 'source', 'open'),
  valve('heatingFlow', 'Heating flow', 'target', 'open'),
  valve('heatingReturn', 'Heating return', 'source', 'open'),
  valve('drain', 'Drain to waste', 'source', 'closed'),
  valve('suction', 'Suction from the balance tank', 'target', 'open'),
  valve('makeUp', 'Make-up to the balance tank', 'target', 'open'),
  valve('tankDrain', 'Balance tank drain to waste', 'source', 'closed'),
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
let expanded: Expansion | undefined;
export function jacuzziExpansion(): Expansion {
  expanded ??= expandForPlumbing(JACUZZI_NODES, JACUZZI_LINKS, {
    isolate: new Set(['jacuzzi-pack']),
    pumps: new Set(),
    isolateMedia: new Set(['water', 'air']),
    supplies: new Set(['switch-fuse']),
    switchgear: new Set(['switch-fuse']),
    given: JACUZZI_FITTINGS,
  });
  return expanded;
}

/** Each valve's model id by what it is for. */
export const JACUZZI_VALVE_IDS = Object.fromEntries(
  JACUZZI_FITTINGS.filter((f) => f.kind === 'isolating-valve').map((f) => [
    f.role,
    f.id,
  ]),
) as Readonly<Record<JacuzziValveRole, string>>;
