/**
 * The plumber's expansion (`doc/prompts/017-room-sizer-gantries-placement.md`):
 * the fittings a designer adds to every line as a matter of course, which
 * the base plan leaves out, inserted into the port graph as nodes of their
 * own, each link they sit on split in two:
 *
 * - an isolating valve at each water connection of a pump, filter, heat
 *   exchanger or strainer, so it can be taken out without draining the
 *   system;
 * - a non-return valve on each pump's discharge, between the pump and its
 *   isolator;
 * - a power isolator in each powered device's feed, where its drop leaves
 *   the power bus (the owner: power isolators are almost never part of the
 *   main plan; they interrupt the trunking up to the bus).
 *
 * The expanded graph is derived, never edited: built fresh from the base
 * graph each time, so expanding twice adds nothing twice, and each added
 * fitting's identity comes from the network (the node and port it serves,
 * and what it is), not from where it ends up, so a relayout keeps it.
 *
 * How each valve is worked follows the plumber's option, decided once its
 * place on the route says whether a person can reach it. Pure.
 */

export type PlumbMedium =
  | 'gas'
  | 'water'
  | 'power'
  | 'flue'
  | 'heat'
  | 'control';

export interface PlumbNode {
  id: string;
  kind: string;
}

export interface PlumbEdge {
  id: string;
  sourceId: string;
  sourcePort: string;
  targetId: string;
  targetPort: string;
  medium: PlumbMedium;
}

export type FittingKind =
  | 'isolating-valve'
  | 'non-return-valve'
  | 'power-isolator';

export interface Fitting {
  /** From the network: `<node>.<port>.<what>`. */
  id: string;
  kind: FittingKind;
  /** The base link it sits on. */
  edge: string;
  /** The node it serves, at which end of the link. */
  serves: string;
  end: 'source' | 'target';
  medium: PlumbMedium;
}

export interface ExpandOptions {
  /** Kinds of node whose water connections are isolated. */
  isolate: ReadonlySet<string>;
  /** Kinds of node that are pumps: a non-return valve on the discharge. */
  pumps: ReadonlySet<string>;
  /** Each pump kind's discharge port. */
  discharge?: string;
  /** Kinds of node that are switchgear already, whose feeds take no isolator. */
  switchgear?: ReadonlySet<string>;
  /** Kinds of node that are supplies: their own feeds take no isolator. */
  supplies?: ReadonlySet<string>;
  /**
   * Which pump kinds take a non-return valve on the discharge; by default
   * all of `pumps`. A single pump with a flooded suction may need none.
   */
  nonReturn?: ReadonlySet<string>;
  /**
   * Where power isolators go: in each feed straight from a supply, or in
   * the last feed to every powered device that is not switchgear, wherever
   * that feed comes from (beyond a breaker too).
   */
  powerIsolators?: 'supply-feeds' | 'every-device';
}

export interface Expansion {
  nodes: PlumbNode[];
  edges: PlumbEdge[];
  fittings: Fitting[];
  /** Each base link's fittings, in order from its source to its target. */
  along: Map<string, Fitting[]>;
}

const FITTING_SUFFIX: Record<FittingKind, string> = {
  'isolating-valve': 'iso',
  'non-return-valve': 'nrv',
  'power-isolator': 'isolator',
};

/** Each fitting's two ports: in from the source's side, out toward the target's. */
export const FITTING_PORTS = { in: 'in', out: 'out' } as const;

export function expandForPlumbing(
  nodes: readonly PlumbNode[],
  edges: readonly PlumbEdge[],
  {
    isolate,
    pumps,
    discharge = 'discharge',
    switchgear = new Set(),
    supplies = new Set(),
    nonReturn = pumps,
    powerIsolators = 'supply-feeds',
  }: ExpandOptions,
): Expansion {
  const kindOf = new Map(nodes.map((n) => [n.id, n.kind]));
  const fittings: Fitting[] = [];
  const along = new Map<string, Fitting[]>();
  const add = (
    e: PlumbEdge,
    end: 'source' | 'target',
    kind: FittingKind,
  ): Fitting => {
    const serves = end === 'source' ? e.sourceId : e.targetId;
    const port = end === 'source' ? e.sourcePort : e.targetPort;
    const f: Fitting = {
      id: `${serves}.${port}.${FITTING_SUFFIX[kind]}`,
      kind,
      edge: e.id,
      serves,
      end,
      medium: e.medium,
    };
    fittings.push(f);
    return f;
  };
  for (const e of edges) {
    const atSource: Fitting[] = [];
    const atTarget: Fitting[] = [];
    if (e.medium === 'water') {
      const source = kindOf.get(e.sourceId) ?? '';
      const target = kindOf.get(e.targetId) ?? '';
      if (isolate.has(source)) {
        // Leaving a pump: its non-return valve first, then its isolator.
        if (
          pumps.has(source) &&
          nonReturn.has(source) &&
          e.sourcePort === discharge
        )
          atSource.push(add(e, 'source', 'non-return-valve'));
        atSource.push(add(e, 'source', 'isolating-valve'));
      }
      if (isolate.has(target))
        atTarget.push(add(e, 'target', 'isolating-valve'));
    }
    if (e.medium === 'power') {
      const source = kindOf.get(e.sourceId) ?? '';
      const target = kindOf.get(e.targetId) ?? '';
      // A feed from a supply to a device that is not itself switchgear.
      const fed = powerIsolators === 'every-device' || supplies.has(source);
      if (fed && !switchgear.has(target))
        atTarget.push(add(e, 'target', 'power-isolator'));
    }
    const list = [...atSource, ...atTarget.reverse()];
    if (list.length) along.set(e.id, list);
  }

  // The expanded graph: each link with fittings split at each of them.
  const outNodes: PlumbNode[] = [
    ...nodes,
    ...fittings.map((f) => ({ id: f.id, kind: f.kind })),
  ];
  const outEdges: PlumbEdge[] = [];
  for (const e of edges) {
    const list = along.get(e.id);
    if (!list) {
      outEdges.push(e);
      continue;
    }
    let from = { id: e.sourceId, port: e.sourcePort };
    list.forEach((f, k) => {
      outEdges.push({
        id: `${e.id}#${k}`,
        sourceId: from.id,
        sourcePort: from.port,
        targetId: f.id,
        targetPort: FITTING_PORTS.in,
        medium: e.medium,
      });
      from = { id: f.id, port: FITTING_PORTS.out };
    });
    outEdges.push({
      id: `${e.id}#${list.length}`,
      sourceId: from.id,
      sourcePort: from.port,
      targetId: e.targetId,
      targetPort: e.targetPort,
      medium: e.medium,
    });
  }
  return { nodes: outNodes, edges: outEdges, fittings, along };
}

// ---- How a valve is worked ----------------------------------------------------------

/** The plumber's option for how valves are worked (the owner, 2026-10-23). */
export type Actuation =
  | 'prefer-manual'
  | 'automatic-where-hard-to-reach'
  | 'all-automatic';

export type Operator = 'hand' | 'chain' | 'motor' | 'self' | 'solenoid';

/**
 * How a fitting is worked, by the option and whether a person can reach it
 * where it ended up. Some are fixed by their purpose: a non-return valve
 * works itself, a gas safety shut-off is a solenoid, and a power isolator
 * is a switch worked by hand.
 */
export function operatorFor(
  f: Pick<Fitting, 'kind' | 'medium'>,
  reachable: boolean,
  option: Actuation,
  { safetyShutOff = false }: { safetyShutOff?: boolean } = {},
): Operator {
  if (f.kind === 'non-return-valve') return 'self';
  if (f.kind === 'power-isolator') return 'hand';
  if (f.medium === 'gas' && safetyShutOff) return 'solenoid';
  switch (option) {
    case 'all-automatic':
      return 'motor';
    case 'automatic-where-hard-to-reach':
      return reachable ? 'hand' : 'motor';
    case 'prefer-manual':
      // Out of reach, a chain wheel lets it be worked from the floor.
      return reachable ? 'hand' : 'chain';
  }
}
