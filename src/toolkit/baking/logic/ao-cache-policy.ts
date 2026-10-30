/**
 * Baked ambient occlusion, the cache's rules and the bake queue's order
 * (the owner, 2026-10-30): bakes are kept by the hash of their room's
 * static geometry, up to about 200 MB, the least recently used evicted
 * first but never a hub (the corridors and the rooms walked through again
 * and again); a room's older bakes go as soon as a new one replaces them.
 * Pure: the store itself is `ao-cache.ts`.
 */

/** The cache's size limit, bytes. */
export const AO_CACHE_LIMIT = 200 * 1024 * 1024;
/** Bakes kept in memory when there is no persistent store (rooms). */
export const AO_MEMORY_ROOMS = 30;

/** What the cache knows of a bake without loading it. */
export interface AoCacheEntryInfo {
  /** The geometry hash (`geometryHash`): the key. */
  hash: string;
  roomId: string;
  bytes: number;
  /** When last used, ms since the epoch. */
  lastUsed: number;
}

/**
 * The hubs, never evicted: corridors, the pool loop's corridors, lift
 * lobbies and cars, the control rooms.
 */
export function isPinnedRoom(roomId: string) {
  return (
    /corridor/i.test(roomId) ||
    roomId.startsWith('CR_') ||
    /lift/i.test(roomId) ||
    /control_room|^bridge$/i.test(roomId)
  );
}

/**
 * The bakes to delete when `incoming` is stored: the same room's bakes of
 * other geometry at once (it has changed, they will never match again),
 * then the least recently used of the rest, hubs spared, until everything
 * fits within `limit`.
 */
export function planEviction(
  entries: readonly AoCacheEntryInfo[],
  incoming: AoCacheEntryInfo,
  limit = AO_CACHE_LIMIT,
): string[] {
  const evict = new Set<string>();
  for (const e of entries)
    if (e.roomId === incoming.roomId && e.hash !== incoming.hash)
      evict.add(e.hash);
  const rest = entries.filter(
    (e) => !evict.has(e.hash) && e.hash !== incoming.hash,
  );
  let total = rest.reduce((sum, e) => sum + e.bytes, 0) + incoming.bytes;
  const byAge = rest
    .filter((e) => !isPinnedRoom(e.roomId))
    .sort((a, b) => a.lastUsed - b.lastUsed);
  for (const e of byAge) {
    if (total <= limit) break;
    evict.add(e.hash);
    total -= e.bytes;
  }
  return [...evict];
}

/** How urgently a room is wanted baked: lower first. */
export const BAKE_PRIORITY = {
  /** The room the walker is in. */
  current: 0,
  /** The room beyond the doorway the walker is facing or heading for. */
  facing: 1,
  /** The rooms beyond the current room's other doorways (a museum neighbour, the lift's destination). */
  neighbour: 2,
  /** Rooms two doorways away. */
  beyond: 3,
} as const;

export interface BakeQueueItem {
  hash: string;
  priority: number;
  /** Order of asking, to keep equal priorities first come first served. */
  order: number;
}

/**
 * A bake queue: jobs by hash, each at its most urgent asked priority.
 * Asking again for a job already queued only ever raises it.
 */
export function createBakeQueue() {
  const items = new Map<string, BakeQueueItem>();
  let order = 0;
  return {
    get size() {
      return items.size;
    },
    has: (hash: string) => items.has(hash),
    /** Queue `hash`, or raise it to `priority` if that is more urgent. */
    add(hash: string, priority: number) {
      const item = items.get(hash);
      if (!item) items.set(hash, { hash, priority, order: order++ });
      else if (priority < item.priority) item.priority = priority;
    },
    /** Set a queued job's priority, more or less urgent. */
    reprioritise(hash: string, priority: number) {
      const item = items.get(hash);
      if (item) item.priority = priority;
    },
    remove: (hash: string) => items.delete(hash),
    /** The most urgent job, without taking it. */
    peek(): BakeQueueItem | null {
      let best: BakeQueueItem | null = null;
      for (const item of items.values())
        if (
          !best ||
          item.priority < best.priority ||
          (item.priority === best.priority && item.order < best.order)
        )
          best = item;
      return best;
    },
    /** Take the most urgent job. */
    take(): BakeQueueItem | null {
      const best = this.peek();
      if (best) items.delete(best.hash);
      return best;
    },
  };
}

/**
 * Whether the background baker may work now: not during a hand-over or
 * the calm second after one (`pausedUntil`, ms), and not while recent
 * frames run over budget (mean of `frames`, ms, against `budget`).
 */
export function mayBake(
  now: number,
  pausedUntil: number,
  frames: readonly number[],
  budget = 1000 / 30,
) {
  if (now < pausedUntil) return false;
  if (!frames.length) return true;
  const mean = frames.reduce((s, f) => s + f, 0) / frames.length;
  return mean <= budget;
}

/**
 * Whether a room other than the walker's may be baked now (the owner,
 * 2026-10-30: only the room the walker is in really matters). Only when
 * the game is truly idle: the walker's own room has nothing left to bake,
 * no hand-over is settling (`pausedUntil`), and the last couple of
 * seconds of frames (`frames`, ms, at least `calm` of them) all had
 * plenty of headroom, under `share` of the budget. Any frame over that,
 * as when the walker moves and the view changes, stops it at once.
 */
export function mayBakeAhead(
  now: number,
  pausedUntil: number,
  frames: readonly number[],
  currentPending: boolean,
  budget = 1000 / 30,
  share = 0.6,
  calm = 60,
) {
  if (currentPending || now < pausedUntil) return false;
  if (frames.length < calm) return false;
  for (let i = frames.length - calm; i < frames.length; i++)
    if (frames[i] > budget * share) return false;
  return true;
}
