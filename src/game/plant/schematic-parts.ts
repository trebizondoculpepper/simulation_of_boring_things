import type { PlumbEdge } from './plumbing-expansion';
import type { SchematicNode } from './schematics';

/** Parts every room's schematic is made of (prompt 064). Pure. */

/** A link, from a node's port to another's. */
export const link = (
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

/**
 * A room's electrics, the same in every room: its supply into its
 * switch-fuse (`<room> room supply`), the switch-fuse's feed to its
 * distribution conduit (`<room> room feed`), and a feed from the conduit
 * to each machine that takes power (`<name> power`).
 */
export function roomElectrics(
  room: string,
  powered: readonly SchematicNode[],
): { nodes: SchematicNode[]; links: PlumbEdge[] } {
  return {
    nodes: [
      { id: 'supply', kind: 'room-supply', name: 'Room supply' },
      {
        id: 'switch-fuse',
        kind: 'switch-fuse',
        name: 'Room supply switch-fuse',
      },
      {
        id: 'distribution',
        kind: 'distribution-conduit',
        name: `${room} distribution conduit`,
      },
      // Its panels' compartmented trunking (`control-bus.ts`), where it has one.
      { id: 'control-bus', kind: 'control-bus', name: 'Control bus' },
    ],
    links: [
      link(
        `${room} room supply`,
        ['supply', 'out'],
        ['switch-fuse', 'in'],
        'power',
      ),
      link(
        `${room} room feed`,
        ['switch-fuse', 'out'],
        ['distribution', 'in'],
        'power',
      ),
      ...powered.map((n) =>
        link(
          `${n.name} power`,
          ['distribution', 'out'],
          [n.id, 'power'],
          'power',
        ),
      ),
    ],
  };
}

const CHEMICAL_NAME = { hypochlorite: 'Hypochlorite', acid: 'Acid' } as const;

/**
 * A plant room's day tanks (plan 085): for each chemical, its branch from
 * the wet hall's transfer selector (a boundary), the day tank it fills,
 * and the day tank's draw-off to `to` (the room's dosing pump, or its
 * packaged cabinet's dosing).
 */
export function dayTanks(
  to: Record<'hypochlorite' | 'acid', [string, string]>,
): { nodes: SchematicNode[]; links: PlumbEdge[] } {
  const chemicals = ['hypochlorite', 'acid'] as const;
  return {
    nodes: chemicals.flatMap((c) => [
      {
        id: `${c}-branch`,
        kind: 'chemical-branch',
        name: `${CHEMICAL_NAME[c]} branch from the wet hall`,
      },
      {
        id: `${c}-day`,
        kind: 'chem-day',
        name: `${CHEMICAL_NAME[c]} day tank`,
      },
    ]),
    links: chemicals.flatMap((c) => [
      link(
        `${CHEMICAL_NAME[c]} branch to its day tank`,
        [`${c}-branch`, 'out'],
        [`${c}-day`, 'fill'],
        'chemical',
      ),
      link(
        `${CHEMICAL_NAME[c]} from its day tank`,
        [`${c}-day`, 'out'],
        to[c],
        'chemical',
      ),
    ]),
  };
}

/**
 * A chemical store's transfer (plan 085): its tanks' draw-offs into its
 * transfer pump, and the pump's discharge into its main to the wet hall
 * (a boundary).
 */
export function storeTransfer(
  chemical: 'hypochlorite' | 'acid',
  tanks: readonly string[],
): { nodes: SchematicNode[]; links: PlumbEdge[] } {
  const name = CHEMICAL_NAME[chemical];
  return {
    nodes: [
      { id: 'transfer', kind: 'chem-pump', name: `${name} transfer pump` },
      {
        id: 'main',
        kind: 'chemical-main',
        name: `${name} main to the wet hall`,
      },
    ],
    links: [
      ...tanks.map((t, i) =>
        link(
          `${name} bulk tank ${i + 1} to its transfer pump`,
          [t, 'out'],
          ['transfer', 'in'],
          'chemical',
        ),
      ),
      link(`${name} main`, ['transfer', 'out'], ['main', 'in'], 'chemical'),
    ],
  };
}

/**
 * The wet hall's transfer selectors (plan 085): for each chemical, its
 * main in from its store (a boundary), its selector, and its live outlets'
 * branches to the four plant rooms (boundaries); its spares blanked, so
 * not in the model.
 */
export function transferSelectors(): {
  nodes: SchematicNode[];
  links: PlumbEdge[];
} {
  const chemicals = ['hypochlorite', 'acid'] as const;
  const rooms = [1, 2, 3, 4];
  return {
    nodes: [
      {
        id: 'chem-panel',
        kind: 'chem-panel',
        name: 'Chemical distribution panel',
      },
      ...chemicals.flatMap((c) => [
        {
          id: `${c}-main`,
          kind: 'chemical-main',
          name: `${CHEMICAL_NAME[c]} main from its store`,
        },
        {
          id: `${c}-selector`,
          kind: 'chem-selector',
          name: `${CHEMICAL_NAME[c]} transfer selector`,
        },
        ...rooms.map((r) => ({
          id: `${c}-pl${r}`,
          kind: 'chemical-branch',
          name: `${CHEMICAL_NAME[c]} branch to PL${r}`,
        })),
      ]),
    ],
    links: chemicals.flatMap((c) => [
      link(
        `${CHEMICAL_NAME[c]} selector to the panel`,
        [`${c}-selector`, 'status'],
        ['chem-panel', c],
        'control',
      ),
      link(
        `${CHEMICAL_NAME[c]} main to its selector`,
        [`${c}-main`, 'out'],
        [`${c}-selector`, 'in'],
        'chemical',
      ),
      ...rooms.map((r) =>
        link(
          `${CHEMICAL_NAME[c]} branch to PL${r}`,
          [`${c}-selector`, `outlet-${r}`],
          [`${c}-pl${r}`, 'in'],
          'chemical',
        ),
      ),
    ]),
  };
}
