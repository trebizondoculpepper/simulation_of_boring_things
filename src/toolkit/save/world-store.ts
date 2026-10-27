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
import { clockStopped, paused } from '../controls/logic/paused';
import { appendEvents } from '../../game/events/game-event';
import type { GameEvent } from '../../game/events/game-event';
import { describeAction } from '../../game/events/describe-action';
import { diffWorld } from '../../game/events/watchers';

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
  /** Do `action` to the world, logged as done by `by` (the player's hand unless said). */
  dispatch(action: WorldAction, by?: 'you' | 'console'): void;
  /**
   * The event log (`doc/prompts/done/058-developer-console.md`): a line for each
   * action and for each thing the plant did by itself, the newest last,
   * for this page only, never saved.
   */
  readonly events: ReadonlySignal<readonly GameEvent[]>;
  /** Add lines of one's own to the log (the console's commands). */
  log(...events: GameEvent[]): void;
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

/**
 * The world a room reads and works: the player's (the dev rooms' save
 * slot), or, while one is set (`setRoomWorld`), another, such as the
 * title's attract sequence's scenario (`doc/prompts/done/054-title-attract-sequence.md`).
 * Rooms take their world from here, never from a save slot by name, so a
 * room built for the attract sequence reads and acts on the attract
 * sequence's world, and the player's never sees it.
 */
let roomOverride: WorldStore | null = null;
export function roomWorld(): WorldStore {
  return roomOverride ?? worldStore(devSlot() ?? 'dev');
}

/**
 * In development only, a save slot of its own named by the URL (`?slot=itest`):
 * a test's world, kept apart from the player's and from any other tab
 * holding theirs.
 */
function devSlot(): string | null {
  if (typeof window === 'undefined' || !import.meta.env?.DEV) return null;
  const slot = new URLSearchParams(window.location.search).get('slot');
  return slot && /^[a-z0-9-]{1,24}$/.test(slot) ? slot : null;
}
// For trying the world from the console in development only:
// `poolWorld.store().dispatch({ type: 'jacuzzi/cabinet', action: { act: 'power', on: false } })`.
if (typeof window !== 'undefined' && import.meta.env?.DEV)
  (window as unknown as { poolWorld?: unknown }).poolWorld = {
    store: roomWorld,
  };
/** Rooms' world from now on: `store`, or, with null, the player's again. */
export function setRoomWorld(store: WorldStore | null) {
  roomOverride = store;
}

/**
 * A world held in memory only, from `start`: never loaded, never saved,
 * held by no tab, its clock its own (run while `running` is set), so it
 * runs while the game is paused behind the title. The attract sequence's.
 */
export function createScenarioStore(start: World) {
  const world = signal(start);
  const holding = signal(false);
  const notice = signal<string | null>(null);
  let timer: ReturnType<typeof setInterval> | null = null;
  let last = 0;
  const events = signal<readonly GameEvent[]>([]);
  const store: WorldStore & { run(on: boolean): void; stop(): void } = {
    world,
    // Its own log, which nothing shows: never the player's.
    dispatch(action, by) {
      const before = world.value;
      world.value = applyAction(before, action);
      events.value = appendEvents(events.value, [
        describeAction(before, action, world.value, by),
      ]);
    },
    events,
    log(...more) {
      events.value = appendEvents(events.value, more);
    },
    read: (pick) => computed(() => pick(world.value)),
    save: () => false,
    holding,
    reset() {
      world.value = start;
    },
    notice,
    run(on) {
      if (on && !timer) {
        last = Date.now();
        timer = setInterval(() => {
          const now = Date.now();
          const elapsed = Math.min(1, Math.max(0, (now - last) / 1000));
          last = now;
          if (elapsed > 0) world.value = advance(world.value, elapsed);
        }, STEP * 1000);
      } else if (!on && timer) {
        clearInterval(timer);
        timer = null;
      }
    },
    stop() {
      store.run(false);
    },
  };
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
  const events = signal<readonly GameEvent[]>([]);
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
    // Paused behind the menu, or by the console: the clock stands still (`paused.ts`).
    if (paused.value || clockStopped.value) return;
    if (elapsed > 0) {
      const found: GameEvent[] = [];
      world.value = advance(world.value, elapsed, STEP, (before, after) =>
        found.push(...diffWorld(before, after)),
      );
      events.value = appendEvents(events.value, found);
    }
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
    if (!loaded.ok) return;
    world.value = loaded.world;
    // Said in the log, since it can undo what was done here.
    events.value = appendEvents(events.value, [
      {
        time: loaded.world.time,
        kind: 'system',
        severity: 'notice',
        subject: 'SAVE',
        text: 'world taken up from the game open in another tab (it holds the save; changes made here are lost)',
      },
    ]);
  });
  return {
    world,
    dispatch(action, by) {
      const before = world.value;
      world.value = applyAction(before, action);
      events.value = appendEvents(events.value, [
        describeAction(before, action, world.value, by),
        ...diffWorld(before, world.value),
      ]);
      // Saved at once: an action is what a player would mind losing.
      save();
    },
    events,
    log(...more) {
      events.value = appendEvents(events.value, more);
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
