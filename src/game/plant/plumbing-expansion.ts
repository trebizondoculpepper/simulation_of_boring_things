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
  | 'chemical'
  | 'oil'
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
  /** The state the plumber leaves it in: open, unless the rules say closed. */
  normally: 'open' | 'closed';
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
  /**
   * Fittings the plumber could not set anywhere reachable: not installed,
   * so not in the expanded graph.
   */
  omit?: ReadonlySet<string>;
  /**
   * Which media's links are isolated at each end that `isolate` names:
   * water only, by default. With power among them, each isolated end of a
   * power link takes a power isolator.
   */
  isolateMedia?: ReadonlySet<PlumbMedium>;
  /** The state every fitting is left in: open by default, or all closed (the owner, 2026-10-23). */
  normally?: 'open' | 'closed';
}

export interface Expansion {
  nodes: PlumbNode[];
  edges: PlumbEdge[];
  fittings: Fitting[];
  /** Each base link's fittings, in order from its source to its target (a shared port's on the first of its links only). */
  along: Map<string, Fitting[]>;
  /** Headers after (or before) ports several links share. */
  headers: {
    id: string;
    serves: string;
    port: string;
    end: 'source' | 'target';
    medium: PlumbMedium;
  }[];
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
    omit = new Set(),
    isolateMedia = new Set<PlumbMedium>(['water']),
    normally = 'open',
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
      normally,
    };
    fittings.push(f);
    return f;
  };
  for (const e of edges) {
    const atSource: Fitting[] = [];
    const atTarget: Fitting[] = [];
    if (e.medium !== 'power' && isolateMedia.has(e.medium)) {
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
    if (e.medium === 'power' && isolateMedia.has('power')) {
      // An isolator at each end the rules isolate.
      if (isolate.has(kindOf.get(e.sourceId) ?? ''))
        atSource.push(add(e, 'source', 'power-isolator'));
      if (isolate.has(kindOf.get(e.targetId) ?? ''))
        atTarget.push(add(e, 'target', 'power-isolator'));
    } else if (e.medium === 'power') {
      const source = kindOf.get(e.sourceId) ?? '';
      const target = kindOf.get(e.targetId) ?? '';
      // A feed from a supply to a device that is not itself switchgear.
      const fed = powerIsolators === 'every-device' || supplies.has(source);
      if (fed && !switchgear.has(target))
        atTarget.push(add(e, 'target', 'power-isolator'));
    }
    const list = [...atSource, ...atTarget.reverse()].filter(
      (f) => !omit.has(f.id),
    );
    if (list.length) along.set(e.id, list);
  }

  // Ports several links share (a pump's discharge feeding a battery of
  // filters): their fittings are installed once, on the common pipe, and a
  // header follows them that the links branch from (the owner,
  // 2026-10-23). Identities stay one per port.
  const shared = new Map<
    string,
    {
      header: string;
      chain: Fitting[];
      end: 'source' | 'target';
      at: { id: string; port: string };
    }
  >();
  const sharedOf = (e: PlumbEdge, end: 'source' | 'target') =>
    shared.get(
      end === 'source'
        ? `${e.sourceId}.${e.sourcePort}.source`
        : `${e.targetId}.${e.targetPort}.target`,
    );
  {
    const users = new Map<string, PlumbEdge[]>();
    for (const e of edges)
      for (const f of along.get(e.id) ?? []) {
        const key = `${f.id}|${f.end}`;
        if (!users.has(key)) users.set(key, []);
        if (!users.get(key)!.includes(e)) users.get(key)!.push(e);
      }
    for (const [key, list] of users) {
      if (list.length < 2) continue;
      const f = (along.get(list[0].id) ?? []).find(
        (x) => `${x.id}|${x.end}` === key,
      )!;
      const port = f.end === 'source' ? list[0].sourcePort : list[0].targetPort;
      const id = `${f.serves}.${port}.${f.end}`;
      const entry = shared.get(id) ?? {
        header: `${f.serves}.${port}.header`,
        chain: [],
        end: f.end,
        at: { id: f.serves, port },
      };
      if (!entry.chain.some((x) => x.id === f.id)) entry.chain.push(f);
      shared.set(id, entry);
    }
  }
  // Each fitting once.
  const unique = new Map<string, Fitting>();
  for (const f of fittings)
    if (!omit.has(f.id) && !unique.has(f.id)) unique.set(f.id, f);
  fittings.splice(0, fittings.length, ...unique.values());
  // For drawing: the shared fittings on the first of their links only.
  const drawn = new Set<string>();
  for (const e of edges) {
    const list = along.get(e.id);
    if (!list) continue;
    const kept = list.filter((f) => {
      const isShared = [...shared.values()].some((s) =>
        s.chain.some((x) => x.id === f.id),
      );
      if (!isShared) return true;
      if (drawn.has(f.id)) return false;
      drawn.add(f.id);
      return true;
    });
    if (kept.length) along.set(e.id, kept);
    else along.delete(e.id);
  }

  // The expanded graph: each link split at its own fittings, starting
  // from (or ending at) its shared port's header.
  const outNodes: PlumbNode[] = [
    ...nodes,
    ...fittings.map((f) => ({ id: f.id, kind: f.kind })),
    ...[...shared.values()].map((s) => ({ id: s.header, kind: 'header' })),
  ];
  const outEdges: PlumbEdge[] = [];
  for (const e of edges) {
    const fromShared = sharedOf(e, 'source');
    const toShared = sharedOf(e, 'target');
    const own = (along.get(e.id) ?? []).filter(
      (f) =>
        !fromShared?.chain.some((x) => x.id === f.id) &&
        !toShared?.chain.some((x) => x.id === f.id),
    );
    if (!own.length && !fromShared && !toShared) {
      outEdges.push(e);
      continue;
    }
    let from = fromShared
      ? { id: fromShared.header, port: FITTING_PORTS.out as string }
      : { id: e.sourceId, port: e.sourcePort };
    own.forEach((f, k) => {
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
    const to = toShared
      ? { id: toShared.header, port: FITTING_PORTS.in as string }
      : { id: e.targetId, port: e.targetPort };
    outEdges.push({
      id: `${e.id}#${own.length}`,
      sourceId: from.id,
      sourcePort: from.port,
      targetId: to.id,
      targetPort: to.port,
      medium: e.medium,
    });
  }
  // Each shared port's common pipe: port, its fittings, header (or the
  // other way, into a shared target).
  for (const s of shared.values()) {
    const medium = s.chain[0].medium;
    const stops =
      s.end === 'source'
        ? [
            s.at,
            ...s.chain.map((f) => ({ id: f.id, port: '' })),
            { id: s.header, port: '' },
          ]
        : [
            { id: s.header, port: '' },
            ...s.chain.map((f) => ({ id: f.id, port: '' })),
            s.at,
          ];
    for (let k = 1; k < stops.length; k++) {
      const a = stops[k - 1];
      const b = stops[k];
      outEdges.push({
        id: `${s.header}#${k - 1}`,
        sourceId: a.id,
        sourcePort: a.port || FITTING_PORTS.out,
        targetId: b.id,
        targetPort: b.port || FITTING_PORTS.in,
        medium,
      });
    }
  }
  return {
    nodes: outNodes,
    edges: outEdges,
    fittings,
    along,
    headers: [...shared.values()].map((s) => ({
      id: s.header,
      serves: s.at.id,
      port: s.at.port,
      end: s.end,
      medium: s.chain[0].medium,
    })),
  };
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
