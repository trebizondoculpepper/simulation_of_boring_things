import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { effect } from '@preact/signals-core';
import { applyAction, newWorld } from '../../game/world';
import type { World } from '../../game/world';
import { serialiseWorld } from '../../game/save';
import { serviceAvailable } from '../../game/plant/services';
import { BootGroup, BootScreen, Label } from '../../ui2d';
import type { WorldStore } from './world-store';

/**
 * The game open in two tabs on one save slot (the owner, 2026-10-27): the
 * bridge's RESET, pressed in the tab that does not hold the slot, was
 * undone by the holding tab's next save, so the bridge's displays came
 * back on, seen from the corridor.
 */

type Listener = (event: { key: string; newValue: string | null }) => void;

/** One browser: shared storage, Web Locks and broadcast channels; tabs opened in it. */
function browser() {
  const data = new Map<string, string>();
  const tabs: { storage: Listener[]; pagehide: (() => void)[] }[] = [];
  // Web Locks: one holder per name, the rest queued (or refused, ifAvailable).
  const held = new Set<string>();
  const queued = new Map<string, (() => void)[]>();
  const grant = (name: string, cb: (lock: object | null) => unknown) => {
    held.add(name);
    void Promise.resolve(cb({ name })).then(() => {
      held.delete(name);
      queued.get(name)?.shift()?.();
    });
  };
  const locks = {
    request(
      name: string,
      a: { ifAvailable?: boolean } | ((lock: object | null) => unknown),
      b?: (lock: object | null) => unknown,
    ) {
      const cb = (typeof a === 'function' ? a : b)!;
      const ifAvailable = typeof a === 'object' && a.ifAvailable;
      if (!held.has(name)) grant(name, cb);
      else if (ifAvailable) cb(null);
      else
        queued.set(name, [...(queued.get(name) ?? []), () => grant(name, cb)]);
      return Promise.resolve();
    },
  };
  const channels: FakeChannel[] = [];
  class FakeChannel {
    private listeners: ((event: { data: unknown }) => void)[] = [];
    constructor(readonly name: string) {
      channels.push(this);
    }
    addEventListener(_: string, fn: (event: { data: unknown }) => void) {
      this.listeners.push(fn);
    }
    postMessage(data: unknown) {
      const copy = structuredClone(data);
      for (const c of channels)
        if (c !== this && c.name === this.name)
          for (const fn of c.listeners) fn({ data: copy });
    }
  }
  /** A tab: its own copy of the module, so its own world store. */
  const open = async (slot: string) => {
    const tab = { storage: [] as Listener[], pagehide: [] as (() => void)[] };
    tabs.push(tab);
    const localStorage = {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => {
        data.set(key, value);
        for (const other of tabs)
          if (other !== tab)
            for (const fn of other.storage) fn({ key, newValue: value });
      },
      removeItem: (key: string) => data.delete(key),
    };
    vi.stubGlobal('window', {
      localStorage,
      addEventListener: (type: string, fn: Listener & (() => void)) => {
        if (type === 'storage') tab.storage.push(fn);
        if (type === 'pagehide') tab.pagehide.push(fn);
      },
    });
    vi.stubGlobal('document', { addEventListener: () => {} });
    vi.stubGlobal('navigator', { locks });
    vi.stubGlobal('BroadcastChannel', FakeChannel);
    vi.resetModules();
    const { worldStore } = await import('./world-store');
    const store = worldStore(slot);
    await settle();
    /** The tab closed: its pagehide (a save, its lock let go). */
    const close = async () => {
      for (const fn of tab.pagehide) fn();
      tabs.splice(tabs.indexOf(tab), 1);
      await settle();
    };
    return Object.assign(store, { close });
  };
  return { data, open };
}

/** The bridge's displays, following a tab's world as its room's effect does. */
function displaysIn(store: WorldStore) {
  const group = new BootGroup(() => 0.5);
  const screens = Array.from({ length: 4 }, (_, i) =>
    group.add(new BootScreen(new Label(`${i}`))),
  );
  const power = (w: World) =>
    serviceAvailable(w.plant, 'control_room', 'power') && w.bridgeDisplaysOn;
  const dispose = effect(() => {
    const on = power(store.world.value);
    if (on !== group.powered) group.setPower(on, 'instant');
  });
  return {
    dispose,
    states: () => new Set(screens.map((s) => s.displayState)),
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('one world across tabs (the owner, 2026-10-27)', () => {
  it('a RESET in the tab that does not hold the save is kept, and the bridge stays dark', async () => {
    vi.useFakeTimers();
    const b = browser();
    // The bridge visited: its theme heard, its displays on.
    let visited = applyAction(newWorld(), {
      type: 'control-room/mode',
      mode: 'new',
    });
    visited = applyAction(visited, { type: 'bridge/theme-heard' });
    visited = applyAction(visited, { type: 'bridge/displays', on: true });
    b.data.set('pool-plant:tabs', serialiseWorld(visited, Date.now()));
    // One tab left on the bridge holds the slot; the player's follows it.
    const holder = await b.open('tabs');
    const player = await b.open('tabs');
    expect(holder.holding.value).toBe(true);
    expect(player.holding.value).toBe(false);
    const seen = displaysIn(player);
    expect(seen.states()).toEqual(new Set(['running']));
    // RESET at the corridor's plate, in the player's tab.
    player.dispatch({ type: 'bridge/first-visit-reset' });
    expect(seen.states()).toEqual(new Set(['unpowered']));
    // The holder has it, and has saved it.
    expect(holder.world.value.bridgeDisplaysOn).toBe(false);
    expect(holder.world.value.bridgeThemeHeard).toBe(false);
    // The holder's saves go on arriving: the doors opened a minute later,
    // the bridge is still dark, its first view still to come.
    vi.advanceTimersByTime(60_000);
    expect(player.world.value.bridgeDisplaysOn).toBe(false);
    expect(player.world.value.bridgeThemeHeard).toBe(false);
    expect(seen.states()).toEqual(new Set(['unpowered']));
    seen.dispose();
  });

  it('a follower takes the slot up when the holder lets it go', async () => {
    const b = browser();
    const first = await b.open('handover');
    const second = await b.open('handover');
    expect(second.holding.value).toBe(false);
    expect(second.notice.value).not.toBeNull();
    await first.close();
    expect(second.holding.value).toBe(true);
    expect(second.notice.value).toBeNull();
  });
});

/** Promise callbacks (lock grants and releases) run. */
async function settle() {
  for (let i = 0; i < 5; i++) await Promise.resolve();
}
