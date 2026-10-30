/**
 * The baked ambient occlusion cache (the owner, 2026-10-30): bakes kept in
 * IndexedDB by their geometry hash, so a room is never baked twice unless
 * its geometry changed; within `AO_CACHE_LIMIT`, least recently used
 * evicted first, hubs never (`ao-cache-policy.ts`). Every access is
 * guarded: without IndexedDB (a private window, blocked site data, a full
 * quota) bakes are kept in memory for the session instead. Used in the
 * baker's worker, which IndexedDB serves as well as the page.
 */
import { AO_MEMORY_ROOMS, planEviction } from './logic/ao-cache-policy';
import type { AoCacheEntryInfo } from './logic/ao-cache-policy';

export interface AoCacheEntry extends AoCacheEntryInfo {
  /** One byte a vertex, per receiving mesh. */
  ao: Uint8Array[];
  /** Per receiving mesh, which of its triangles were subdivided (null: none may be). */
  masks: (Uint8Array | null)[];
  /** Where each mesh stood when baked: its world matrix, 16 floats each. */
  placements: Float32Array;
}

// A new name for the new entries (masks): the old store's bakes are simply never read.
const DB = 'pool-plant-baked-ao-2';
const STORE = 'bakes';

const memory = new Map<string, AoCacheEntry>();
const remember = (entry: AoCacheEntry) => {
  memory.delete(entry.hash);
  memory.set(entry.hash, entry);
  while (memory.size > AO_MEMORY_ROOMS)
    memory.delete(memory.keys().next().value!);
};

let opening: Promise<IDBDatabase | null> | null = null;
function open(): Promise<IDBDatabase | null> {
  opening ??= new Promise<IDBDatabase | null>((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null);
      const request = indexedDB.open(DB, 1);
      request.onupgradeneeded = () => {
        const store = request.result.createObjectStore(STORE, {
          keyPath: 'hash',
        });
        store.createIndex('roomId', 'roomId');
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return opening;
}

const done = <T>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

/** A bake by its hash, from memory or the store, marked as used now; null if none. */
export async function loadBake(hash: string): Promise<AoCacheEntry | null> {
  const held = memory.get(hash);
  if (held) {
    held.lastUsed = Date.now();
    remember(held);
    return held;
  }
  try {
    const db = await open();
    if (!db) return null;
    const store = db.transaction(STORE, 'readwrite').objectStore(STORE);
    const entry = (await done(store.get(hash))) as AoCacheEntry | undefined;
    if (!entry) return null;
    entry.lastUsed = Date.now();
    store.put(entry);
    remember(entry);
    return entry;
  } catch {
    return null;
  }
}

/** Keep a bake, evicting what the policy says must go to make room. */
export async function storeBake(entry: AoCacheEntry) {
  remember(entry);
  try {
    const db = await open();
    if (!db) return;
    // What is there, without loading the bakes themselves.
    const infos: AoCacheEntryInfo[] = [];
    await new Promise<void>((resolve, reject) => {
      const cursor = db.transaction(STORE).objectStore(STORE).openCursor();
      cursor.onsuccess = () => {
        const c = cursor.result;
        if (!c) return resolve();
        const { hash, roomId, bytes, lastUsed } = c.value as AoCacheEntry;
        infos.push({ hash, roomId, bytes, lastUsed });
        c.continue();
      };
      cursor.onerror = () => reject(cursor.error);
    });
    const store = db.transaction(STORE, 'readwrite').objectStore(STORE);
    for (const hash of planEviction(infos, entry)) store.delete(hash);
    await done(store.put(entry));
  } catch {
    // Kept in memory only: a full or failing store only means a re-bake after a reload.
  }
}

/** Forget every bake (a dev tool, and for tests in a browser). */
export async function clearBakes() {
  memory.clear();
  try {
    const db = await open();
    if (db)
      await done(db.transaction(STORE, 'readwrite').objectStore(STORE).clear());
  } catch {
    // Nothing kept to clear.
  }
}
