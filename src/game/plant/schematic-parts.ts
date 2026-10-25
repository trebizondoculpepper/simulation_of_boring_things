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
