/**
 * The plant as one connected network: every machine and every valve a
 * node, every pipe a link between two nodes' ports. It is the model the
 * rooms are drawn from (`doc/prompts/012-plant-network.md`): one node for
 * each drawn machine and valve, and nothing drawn that is not here.
 *
 * Each node and link says, aspect by aspect, whether it is modelled or a
 * placeholder for a model still to come, so the gaps in the model can be
 * listed rather than remembered (`gaps.ts`). A placeholder still passes
 * its flow, so the network around it works. Pure.
 */

/** What a port, and the pipe joined to it, carries. */
export type Service =
  | 'pool-water'
  | 'make-up'
  | 'drainage'
  | 'heating'
  | 'gas'
  | 'chemical'
  | 'sample'
  | 'ozone'
  | 'power';

/** The services the water network solves for flow and pressure. */
export const WATER_SERVICES: readonly Service[] = [
  'pool-water',
  'make-up',
  'drainage',
];

/** One side of what the model simulates. */
export type Aspect =
  | 'hydraulics'
  | 'levels'
  | 'heat'
  | 'chemistry'
  | 'ozone'
  | 'treatment'
  | 'electrics'
  | 'internals';

/** Modelled, or a placeholder with what is missing. */
export type Status = 'modelled' | { placeholder: string };

export type NodeKind =
  | 'pool'
  | 'balance-tank'
  | 'pump'
  | 'strainer'
  | 'non-return-valve'
  | 'valve'
  | 'float-valve'
  | 'sand-filter'
  | 'contact-tank'
  | 'heat-exchanger'
  | 'uv-unit'
  | 'ozone-generator'
  | 'dosing-controller'
  | 'dosing-pump'
  | 'packaged-set'
  | 'header'
  | 'injection-point'
  | 'sample-tapping'
  | 'boundary';

/**
 * What a node is to the rooms: equipment and valves are drawn, one for one;
 * pipework (headers, tappings, injection points) is drawn as part of the
 * pipes; water and boundaries are where the network begins and ends.
 */
export type NodeClass =
  | 'equipment'
  | 'valve'
  | 'pipework'
  | 'water'
  | 'boundary';

/** A design loss: so many metres of head at so many m³/h. */
export type Loss = readonly [metres: number, flow: number];

/** What a node puts into the water network between its ports. */
export type Hydraulic =
  /** A body of water at a level, metres above the pool deck: every port at its head. */
  | { kind: 'reservoir'; level: number }
  /** Every port the same point: a header, a tapping, an injection point. */
  | { kind: 'junction' }
  /** A fixed resistance from one port to another, either way. */
  | { kind: 'resistance'; from: string; to: string; loss: Loss }
  /** An isolating valve: its resistance grows as it closes; shut, nothing. */
  | { kind: 'valve'; from: string; to: string; loss: Loss }
  /** A non-return valve: passing one way only. */
  | { kind: 'check'; from: string; to: string; loss: Loss }
  /** A pump: its curve through its design point, one way; stopped, nothing. */
  | {
      kind: 'pump';
      from: string;
      to: string;
      /** Its design point (head, metres; flow, m³/h) and its shut-off head. */
      head: number;
      flow: number;
      shutoff: number;
    };

export interface PlantNode {
  /** Its permanent asset ID: names its function, never changes (`doc/plans/part-naming.md`). */
  id: string;
  /** The tag on its plate: room, parent, part. Pipework, water and boundaries have none. */
  tag?: string;
  name: string;
  kind: NodeKind;
  class: NodeClass;
  /** The system it belongs to: a pool's ("olympic"), or the site's. */
  system: string;
  /** The game room it stands in. */
  room?: string;
  /** Its ports and what each carries. */
  ports: Readonly<Record<string, Service>>;
  hydraulic?: Hydraulic;
  /** Its state in normal running: a valve open or shut, a pump running or not. */
  normal?: { open?: boolean; running?: boolean };
  aspects: Readonly<Partial<Record<Aspect, Status>>>;
}

/** A pipe: from one node's port to another's, written "node.port". */
export interface PlantLink {
  id: string;
  from: string;
  to: string;
  service: Service;
  /** Its design loss; a short connection loses next to nothing. */
  loss?: Loss;
  aspects?: Readonly<Partial<Record<Aspect, Status>>>;
}

export interface PlantNetwork {
  nodes: readonly PlantNode[];
  links: readonly PlantLink[];
}

/** "node.port" split at its last dot: node IDs contain dots, ports do not. */
export function splitEnd(end: string): { node: string; port: string } {
  const i = end.lastIndexOf('.');
  return { node: end.slice(0, i), port: end.slice(i + 1) };
}

export const isPlaceholder = (
  s: Status | undefined,
): s is { placeholder: string } => typeof s === 'object';
