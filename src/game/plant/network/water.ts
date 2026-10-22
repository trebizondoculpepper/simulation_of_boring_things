/**
 * The plant network's water, solved: each node's hydraulics and each pipe
 * become links of the water network (`src/game/sim/hydraulics.ts`), its
 * reservoirs fixed heads, and the solver gives every flow and head. Each
 * circuit is solved on its own (the reservoirs part them), so a change in
 * one pool's plant costs nothing in another's. Pure.
 */
import { resistanceFor, solveNetwork } from '../../sim/hydraulics';
import type { NetLink, NetNode } from '../../sim/hydraulics';
import type { NetworkState } from './state';
import { WATER_SERVICES, isPlaceholder } from './types';
import type { Loss, PlantNetwork } from './types';

/** A short connection's loss, where a pipe declares none. */
const JOINT: Loss = [0.01, 100];
const rOf = ([m, q]: Loss) => resistanceFor(m, q);

/**
 * How a valve's resistance grows as it closes: an equal-percentage
 * characteristic, its flow coefficient falling by the same fraction for
 * each step closed, from fully open down to a fiftieth. So a valve half
 * shut barely throttles, and the last turns do most of it, as with a real
 * gate or butterfly valve.
 */
const RANGEABILITY = 50;
export const valveFactor = (open: number) =>
  1 / RANGEABILITY ** (2 * (open - 1));

export interface WaterSolution {
  /** Flow through each node (from its first port to its second), m³/h, by asset ID. */
  through: Readonly<Record<string, number>>;
  /** Flow along each pipe, from → to, m³/h, by link ID. */
  pipe: Readonly<Record<string, number>>;
  /** Head at a node's port, metres above the deck: `head('olympic.pump1', 'discharge')`. */
  head: (node: string, port: string) => number;
  converged: boolean;
}

/** The water network's nodes and links for the plant in this state. */
export function waterNetwork(net: PlantNetwork, state: NetworkState) {
  const water = new Set(WATER_SERVICES);
  const nodeOf = new Map<string, string>();
  const fixed = new Map<string, number>();
  const links: NetLink[] = [];
  for (const n of net.nodes) {
    const h = n.hydraulic;
    const shared =
      h?.kind === 'reservoir' || h?.kind === 'junction' ? n.id : undefined;
    for (const [port, service] of Object.entries(n.ports))
      if (water.has(service))
        nodeOf.set(`${n.id}.${port}`, shared ?? `${n.id}.${port}`);
    if (!h) continue;
    const at = (port: string) => `${n.id}.${port}`;
    switch (h.kind) {
      case 'reservoir':
        fixed.set(n.id, state.level[n.id] ?? h.level);
        break;
      case 'junction':
        break;
      case 'resistance':
        links.push({
          id: n.id,
          kind: 'resistance',
          from: at(h.from),
          to: at(h.to),
          r: rOf(h.loss),
        });
        break;
      case 'check':
        links.push({
          id: n.id,
          kind: 'check',
          from: at(h.from),
          to: at(h.to),
          r: rOf(h.loss),
        });
        break;
      case 'valve': {
        const open = state.open[n.id] ?? 1;
        links.push(
          open < 0.02
            ? { id: n.id, kind: 'closed', from: at(h.from), to: at(h.to) }
            : {
                id: n.id,
                kind: 'resistance',
                from: at(h.from),
                to: at(h.to),
                r: rOf(h.loss) * valveFactor(open),
              },
        );
        break;
      }
      case 'pump':
        links.push(
          state.running[n.id]
            ? {
                id: n.id,
                kind: 'pump',
                from: at(h.from),
                to: at(h.to),
                shutoff: h.shutoff,
                k: (h.shutoff - h.head) / (h.flow * h.flow),
              }
            : { id: n.id, kind: 'closed', from: at(h.from), to: at(h.to) },
        );
        break;
    }
  }
  for (const p of net.links) {
    if (!water.has(p.service) || isPlaceholder(p.aspects?.hydraulics)) continue;
    links.push({
      id: p.id,
      kind: 'resistance',
      from: p.from,
      to: p.to,
      r: rOf(p.loss ?? JOINT),
    });
  }
  // Each link's ends, as the solver's nodes.
  const resolve = (end: string) => {
    const id = nodeOf.get(end);
    if (!id) throw new Error(`Water link to ${end}, not a water port`);
    return id;
  };
  const solverLinks = links.map((l) => ({
    ...l,
    from: resolve(l.from),
    to: resolve(l.to),
  }));
  const ids = new Set(nodeOf.values());
  const nodes: NetNode[] = [...ids].map((id) =>
    fixed.has(id) ? { id, head: fixed.get(id) } : { id },
  );
  return { nodes, links: solverLinks, nodeOf };
}

/** Group the links into circuits joined only through free nodes; reservoirs part them. */
export function circuits(nodes: readonly NetNode[], links: readonly NetLink[]) {
  const free = new Set(
    nodes.filter((n) => n.head === undefined).map((n) => n.id),
  );
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let r = x;
    while (parent.has(r)) r = parent.get(r)!;
    return r;
  };
  for (const l of links)
    if (free.has(l.from) && free.has(l.to)) {
      const a = find(l.from);
      const b = find(l.to);
      if (a !== b) parent.set(a, b);
    }
  const groups = new Map<string, NetLink[]>();
  for (const l of links) {
    const key = free.has(l.from)
      ? find(l.from)
      : free.has(l.to)
        ? find(l.to)
        : `fixed:${l.id}`;
    const g = groups.get(key) ?? [];
    g.push(l);
    groups.set(key, g);
  }
  return [...groups.values()];
}

/**
 * Prune what carries no flow: shut links, then dead ends (a junction with
 * one link left), over and over. Newton's method struggles on a dead end,
 * whose square-law flow is zero at its root, and a dead end's head is its
 * neighbour's in any case. Returns what is left to solve, and the pruned
 * nodes with the neighbour each takes its head from, last pruned first.
 */
function prune(nodes: readonly NetNode[], links: readonly NetLink[]) {
  const fixed = new Set(
    nodes.filter((n) => n.head !== undefined).map((n) => n.id),
  );
  let live = links.filter((l) => l.kind !== 'closed');
  const pruned: { id: string; from: string }[] = [];
  for (;;) {
    const degree = new Map<string, NetLink[]>();
    for (const l of live)
      for (const id of [l.from, l.to])
        degree.set(id, [...(degree.get(id) ?? []), l]);
    const leaves = [...degree.entries()].filter(
      ([id, ls]) => !fixed.has(id) && ls.length === 1,
    );
    if (!leaves.length) break;
    const gone = new Set<NetLink>();
    for (const [id, [l]] of leaves) {
      if (gone.has(l)) continue;
      gone.add(l);
      pruned.push({ id, from: l.from === id ? l.to : l.from });
    }
    live = live.filter((l) => !gone.has(l));
  }
  return { live, pruned: pruned.reverse() };
}

export function solveWater(
  net: PlantNetwork,
  state: NetworkState,
): WaterSolution {
  const { nodes, links, nodeOf } = waterNetwork(net, state);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const { live, pruned } = prune(nodes, links);
  const heads: Record<string, number> = {};
  const flows: Record<string, number> = {};
  let converged = true;
  for (const n of nodes) if (n.head !== undefined) heads[n.id] = n.head;
  for (const group of circuits(nodes, live)) {
    const ids = new Set(group.flatMap((l) => [l.from, l.to]));
    const s = solveNetwork(
      [...ids].map((id) => byId.get(id)!),
      group,
    );
    Object.assign(heads, s.heads);
    Object.assign(flows, s.flows);
    converged &&= s.converged;
  }
  // A dead end stands at its neighbour's head; a section shut in on every
  // side keeps the head of whatever shut it in.
  for (const { id, from } of pruned) heads[id] ??= heads[from];
  for (let pass = 0; pass < 3; pass++)
    for (const l of links)
      if (heads[l.from] === undefined && heads[l.to] !== undefined)
        heads[l.from] = heads[l.to];
      else if (heads[l.to] === undefined && heads[l.from] !== undefined)
        heads[l.to] = heads[l.from];
  for (const l of links) flows[l.id] ??= 0;
  const through: Record<string, number> = {};
  const pipe: Record<string, number> = {};
  for (const n of net.nodes) if (n.id in flows) through[n.id] = flows[n.id];
  for (const p of net.links) if (p.id in flows) pipe[p.id] = flows[p.id];
  return {
    through,
    pipe,
    head: (node, port) => {
      const id = nodeOf.get(`${node}.${port}`);
      if (id === undefined) throw new Error(`No water port ${node}.${port}`);
      return heads[id] ?? 0;
    },
    converged,
  };
}
