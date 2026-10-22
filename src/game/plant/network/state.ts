/**
 * The network's changing state: how far each valve is open, which pumps
 * run, the level in each tank and pool. Kept apart from the network, which
 * never changes, so the world can hold it and save it. Pure.
 */
import type { PlantNetwork } from './types';

export interface NetworkState {
  /** Each valve's opening, 0 (shut) to 1 (fully open), by asset ID. */
  open: Readonly<Record<string, number>>;
  /** Whether each pump runs, by asset ID. */
  running: Readonly<Record<string, boolean>>;
  /** Each reservoir's level, metres above the deck, by asset ID. */
  level: Readonly<Record<string, number>>;
}

/** Every valve, pump and level as in normal running. */
export function normalState(net: PlantNetwork): NetworkState {
  const open: Record<string, number> = {};
  const running: Record<string, boolean> = {};
  const level: Record<string, number> = {};
  for (const n of net.nodes) {
    if (n.normal?.open !== undefined) open[n.id] = n.normal.open ? 1 : 0;
    if (n.normal?.running !== undefined) running[n.id] = n.normal.running;
    if (n.hydraulic?.kind === 'reservoir') level[n.id] = n.hydraulic.level;
  }
  return { open, running, level };
}

/** Change some valves and pumps: `{ 'olympic.pump1': false, 'olympic.filter1.iv1': 0 }`. */
export function withChanges(
  state: NetworkState,
  changes: Readonly<Record<string, number | boolean>>,
): NetworkState {
  const open = { ...state.open };
  const running = { ...state.running };
  for (const [id, v] of Object.entries(changes)) {
    if (typeof v === 'boolean') {
      if (!(id in running)) throw new Error(`${id} is not a pump`);
      running[id] = v;
    } else {
      if (!(id in open)) throw new Error(`${id} is not a valve`);
      open[id] = Math.min(1, Math.max(0, v));
    }
  }
  return { ...state, open, running };
}
