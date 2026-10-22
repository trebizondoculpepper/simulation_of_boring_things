/**
 * The plant network's own rules, checked: what types cannot prove. Each
 * check returns the problems it finds, as sentences; none means it holds.
 * Pure.
 */
import { splitEnd } from './types';
import type { PlantNetwork, Service } from './types';

const TAG = /^[A-Z]+\d*(-[A-Z]+\d*)*-[A-Z]+\d+$/;
const ID = /^[a-z][a-z0-9-]*(\.[a-z0-9][a-z0-9-]*)+$/;

/** Every ID and tag unique and well formed; every pipe between declared ports of one service; every port joined. */
export function networkProblems(net: PlantNetwork): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  const tags = new Set<string>();
  for (const n of net.nodes) {
    if (ids.has(n.id)) problems.push(`Duplicate asset ID ${n.id}`);
    ids.add(n.id);
    if (!ID.test(n.id)) problems.push(`Malformed asset ID ${n.id}`);
    if (n.tag) {
      if (tags.has(n.tag)) problems.push(`Duplicate tag ${n.tag}`);
      tags.add(n.tag);
      if (!TAG.test(n.tag)) problems.push(`Malformed tag ${n.tag} on ${n.id}`);
    } else if (n.class === 'equipment' || n.class === 'valve')
      problems.push(`${n.id} is ${n.class} with no tag`);
    if (
      (n.kind === 'valve' || n.kind === 'float-valve') &&
      n.normal?.open === undefined
    )
      problems.push(`Valve ${n.id} has no normal position`);
    if (n.kind === 'pump' && n.normal?.running === undefined)
      problems.push(`Pump ${n.id} has no normal state`);
    if (!Object.keys(n.aspects).length)
      problems.push(`${n.id} declares no aspect`);
  }
  const byId = new Map(net.nodes.map((n) => [n.id, n]));
  const joined = new Set<string>();
  const linkIds = new Set<string>();
  const service = (end: string): Service | undefined => {
    const { node, port } = splitEnd(end);
    return byId.get(node)?.ports[port];
  };
  for (const l of net.links) {
    if (linkIds.has(l.id)) problems.push(`Duplicate pipe ${l.id}`);
    linkIds.add(l.id);
    for (const end of [l.from, l.to]) {
      const s = service(end);
      if (!s)
        problems.push(
          `Pipe ${l.id} ends at ${end}, which is not a declared port`,
        );
      else if (s !== l.service)
        problems.push(`Pipe ${l.id} carries ${l.service} but ${end} is ${s}`);
      joined.add(end);
    }
  }
  for (const n of net.nodes)
    for (const port of Object.keys(n.ports))
      if (!joined.has(`${n.id}.${port}`))
        problems.push(`Port ${n.id}.${port} is joined to nothing`);
  return problems;
}

/**
 * Whether `to` can be reached from `from` along pipes of the given
 * services, passing through nodes (any port to any other) but never
 * through a pool, tank or boundary, which end a path.
 */
export function reaches(
  net: PlantNetwork,
  from: string,
  to: string,
  services: readonly Service[],
): boolean {
  const byId = new Map(net.nodes.map((n) => [n.id, n]));
  const terminal = (id: string) => {
    const k = byId.get(id)?.hydraulic?.kind;
    return k === 'reservoir' || byId.get(id)?.class === 'boundary';
  };
  const target = splitEnd(to).node;
  const seen = new Set<string>([from]);
  const queue = [from];
  while (queue.length) {
    const end = queue.shift()!;
    const { node } = splitEnd(end);
    if (node === target) return true;
    const next: string[] = [];
    for (const l of net.links)
      if (services.includes(l.service)) {
        if (l.from === end) next.push(l.to);
        if (l.to === end) next.push(l.from);
      }
    if (!terminal(node))
      for (const port of Object.keys(byId.get(node)?.ports ?? {}))
        next.push(`${node}.${port}`);
    for (const e of next)
      if (!seen.has(e)) {
        seen.add(e);
        queue.push(e);
      }
  }
  return false;
}
