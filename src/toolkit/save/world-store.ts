import { computed, signal } from '@preact/signals-core';
import type { ReadonlySignal } from '@preact/signals-core';
import { STEP, advance, applyAction, newWorld } from '../../game/world';
import type { World, WorldAction } from '../../game/world';
import {
  CATCH_UP_LIMIT,
  catchUpSeconds,
  deserialiseWorld,
  serialiseWorld,
} from '../../game/save';
import { paused } from '../controls/logic/paused';

/**
 * The world, kept and saved in the browser: one per save slot, shared by
 * every room on the page. It runs on its own clock whichever room is
 * showing, saves itself to localStorage every ten seconds, when the tab
 * is hidden and when the page goes, and on opening loads the slot's save
 * and catches up the time it was away (up to an hour).
 *
 * - **Two slots in storage**: each save first moves the last one to
 *   `…:previous`, so a write cut off halfway loses nothing.
 * - **An unreadable save** is kept aside under `…:unreadable` and a new
 *   world started, with a notice.
 * - **No storage** (some private windows): it runs unsaved, and says so.
 * - **Two tabs**: the first to open a slot holds it (the Web Locks API)
 *   and saves; another tab follows what the first saves and does not save
 *   itself. Its own actions still apply, until the next save arrives.
 *
 * localStorage, not IndexedDB, because a save is small and its write is
 * synchronous: one made as the page goes is not cut off.
 */

export interface WorldStore {
  readonly world: ReadonlySignal<World>;
  dispatch(action: WorldAction): void;
  /** A part's view of something in the world, tracked. */
  read<T>(pick: (world: World) => T): ReadonlySignal<T>;
  /** Save now, if this tab holds the slot: whether it was saved. */
  save(): boolean;
  /**
   * Whether this tab holds the slot and saves it. Another tab with the
   * game open may hold it instead; this one then follows it, and does not
   * save.
   */
  readonly holding: ReadonlySignal<boolean>;
  /** Start again from a new world, discarding the save. */
  reset(): void;
  /** Anything the player should know: unsaved, or another tab has it. */
  readonly notice: ReadonlySignal<string | null>;
}

const SAVE_EVERY = 10_000;
const key = (slot: string) => `pool-plant:${slot}`;

/** localStorage, or nothing if it is blocked. */
function storage(): Storage | null {
  try {
    const s = window.localStorage;
    const probe = 'pool-plant:probe';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

const stores = new Map<string, WorldStore>();

/** The world kept in save slot `slot` ("game", or "dev" for the dev rooms). */
export function worldStore(slot: string): WorldStore {
  let store = stores.get(slot);
  if (!store) {
    store = openWorldStore(slot);
    stores.set(slot, store);
  }
  return store;
}

function openWorldStore(slot: string): WorldStore {
  const s = storage();
  const notice = signal<string | null>(
    s ? null : 'Storage is blocked here: this game will not be saved.',
  );
  const load = (): World => {
    const text = s?.getItem(key(slot));
    if (!text) return newWorld();
    const loaded = deserialiseWorld(text);
    if (!loaded.ok) {
      try {
        s?.setItem(`${key(slot)}:unreadable`, text);
      } catch {
        // No room to keep it aside: it is lost.
      }
      notice.value = `The saved game could not be loaded (${loaded.reason}): starting afresh.`;
      return newWorld();
    }
    return advance(loaded.world, catchUpSeconds(loaded.savedAt, Date.now()));
  };
  const world = signal(load());
  // Whether this tab holds the slot. Without Web Locks, assume so.
  const holding = signal(!('locks' in navigator));
  let release: () => void = () => {};
  if ('locks' in navigator)
    void navigator.locks.request(key(slot), { ifAvailable: true }, (lock) => {
      if (!lock) {
        notice.value =
          'Pool Plant is open in another tab: this one follows it and does not save.';
        return;
      }
      holding.value = true;
      return new Promise<void>((resolve) => (release = resolve));
    });
  const save = () => {
    if (!s || !holding.value) return false;
    try {
      const last = s.getItem(key(slot));
      if (last) s.setItem(`${key(slot)}:previous`, last);
      s.setItem(key(slot), serialiseWorld(world.value, Date.now()));
      return true;
    } catch {
      notice.value = 'The game could not be saved (storage is full).';
      return false;
    }
  };
  // The clock: real time, in fixed steps. A hidden tab's timers slow to
  // once a second or less; whatever time passed is caught up when it ticks.
  let last = Date.now();
  let lastSave = last;
  const tick = () => {
    const now = Date.now();
    const elapsed = Math.min(CATCH_UP_LIMIT, Math.max(0, (now - last) / 1000));
    last = now;
    // Paused behind the menu: the clock stands still (`paused.ts`).
    if (paused.value) return;
    if (elapsed > 0) world.value = advance(world.value, elapsed);
    if (now - lastSave >= SAVE_EVERY) {
      lastSave = now;
      save();
    }
  };
  setInterval(tick, STEP * 1000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') save();
    else tick();
  });
  window.addEventListener('pagehide', () => {
    save();
    release();
  });
  // A follower tab takes up what the holder saves.
  window.addEventListener('storage', (event) => {
    if (holding.value || event.key !== key(slot) || !event.newValue) return;
    const loaded = deserialiseWorld(event.newValue);
    if (loaded.ok) world.value = loaded.world;
  });
  return {
    world,
    dispatch(action) {
      world.value = applyAction(world.value, action);
      // Saved at once: an action is what a player would mind losing.
      save();
    },
    read: (pick) => computed(() => pick(world.value)),
    save,
    holding,
    reset() {
      world.value = newWorld();
      last = Date.now();
      lastSave = last;
      save();
    },
    notice,
  };
}
