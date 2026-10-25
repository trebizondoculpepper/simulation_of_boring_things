import { ENDPOINTS } from '../valve-endpoints';
import type { Medium, ValveEnds } from '../valve-endpoints';
import type { PlantNetwork, Service } from './types';
import { splitEnd } from './types';

/**
 * The valve register's ends against the plant network (prompt 060): for a
 * valve the network also holds, by its plate's tag, its recorded ends must
 * be the nodes the network joins to the ports its flow runs from and to,
 * and its medium what those ports carry. Identities, not words: two
 * valves with one tag but different routes are a mismatch, however they
 * are described. Pure.
 */

const MEDIUM_OF: Readonly<Partial<Record<Service, Medium>>> = {
  'pool-water': 'water',
  'make-up': 'water',
  drainage: 'water',
  heating: 'heating water',
  gas: 'gas',
};

/** The nodes joined to one of a node's ports. */
export function neighbours(
  network: PlantNetwork,
  node: string,
  port: string,
): string[] {
  return network.links.flatMap((link) => {
    const from = splitEnd(link.from);
    const to = splitEnd(link.to);
    if (from.node === node && from.port === port) return [to.node];
    if (to.node === node && to.port === port) return [from.node];
    return [];
  });
}

/** What is wrong with a valve's recorded ends, by the network; none when they agree. */
export function valveEndsProblems(
  network: PlantNetwork,
  tag: string,
  ends: ValveEnds,
): string[] {
  const node = network.nodes.find((n) => n.tag === tag);
  if (!node) return [`${tag}: not in the network`];
  const h = node.hydraulic;
  if (!h || !('from' in h))
    return [`${tag}: the network gives it no direction`];
  const problems: string[] = [];
  for (const [side, port, key] of [
    ['from', h.from, ends.from],
    ['to', h.to, ends.to],
  ] as const) {
    const joined = neighbours(network, node.id, port);
    const endpoint = ENDPOINTS[key] as { network?: true };
    if (!endpoint.network)
      problems.push(`${tag}: its ${side} end ${key} is not a network node`);
    else if (!joined.includes(key))
      problems.push(
        `${tag}: its ${side} end is ${key}, the network's ${joined.join(', ') || 'nothing'}`,
      );
    const medium = MEDIUM_OF[node.ports[port]];
    if (medium !== ends.medium)
      problems.push(
        `${tag}: carries ${ends.medium}, the network's ${port} port ${node.ports[port]}`,
      );
  }
  return problems;
}
