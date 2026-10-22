/**
 * The whole plant's network, as far as it is built
 * (`doc/prompts/012-plant-network.md`): the pools' water circuits, with
 * placeholder boundaries for the systems still to come. Pure.
 */
import {
  LARGE_POOLS,
  NetworkBuilder,
  PACKAGED_POOLS,
  largePoolCircuit,
  packagedCircuit,
  siteBoundaries,
} from './pool-water';
import { SERIALS } from './serials';
import type { PlantNetwork, PlantNode } from './types';

export function buildPlantNetwork(): PlantNetwork {
  const b = new NetworkBuilder();
  siteBoundaries(b);
  for (const spec of LARGE_POOLS) largePoolCircuit(b, spec);
  for (const spec of PACKAGED_POOLS) packagedCircuit(b, spec);
  return {
    nodes: b.nodes.map((n) =>
      SERIALS[n.id] === undefined ? n : { ...n, serial: SERIALS[n.id] },
    ),
    links: b.links,
  };
}

/** The plant's network, built once. */
export const PLANT_NETWORK: PlantNetwork = buildPlantNetwork();

const BY_ID = new Map(PLANT_NETWORK.nodes.map((n) => [n.id, n]));
const BY_SERIAL = new Map(PLANT_NETWORK.nodes.map((n) => [n.serial, n]));

export function plantNode(id: string): PlantNode {
  const node = BY_ID.get(id);
  if (!node) throw new Error(`No plant node ${id}`);
  return node;
}

/** A node by its serial number. */
export function plantNodeBySerial(serial: number): PlantNode {
  const node = BY_SERIAL.get(serial);
  if (!node) throw new Error(`No plant node with serial ${serial}`);
  return node;
}
