import { describe, expect, it } from 'vite-plus/test';
import { BootGroup, BootScreen, Label } from '../../../ui2d';
import { applyAction, newWorld, WORLD_VERSION } from '../../../game/world';
import type { World } from '../../../game/world';
import { deserialiseWorld } from '../../../game/save';
import { serviceAvailable } from '../../../game/plant/services';
import {
  DISPLAYS_ON_AT,
  ENTRANCE_BOOT,
  displaysOnLeaving,
  revealWaiting,
  stepReveal,
} from './bridge-lights-up';

/** The bridge's display power, as `startTheBridge` computes it. */
const displayPower = (w: World) =>
  serviceAvailable(w.plant, 'control_room', 'power') && w.bridgeDisplaysOn;

/** A seeded source of uniform numbers in [0, 1). */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The bridge's displays, following the world's display power as its effect does. */
function bridge(world: World) {
  const group = new BootGroup(seeded(9));
  const screens = Array.from({ length: 8 }, (_, i) =>
    group.add(new BootScreen(new Label(`${i}`))),
  );
  let w = world;
  let ready = 0;
  const follow = () => {
    const on = displayPower(w);
    if (on !== group.powered) ready = group.setPower(on, ENTRANCE_BOOT);
  };
  follow();
  return {
    screens,
    get ready() {
      return ready;
    },
    dispatch(action: Parameters<typeof applyAction>[1]) {
      w = applyAction(w, action);
      follow();
    },
    get world() {
      return w;
    },
  };
}

const states = (screens: BootScreen[]) =>
  new Set(screens.map((s) => s.displayState));

describe('the bridge’s display power (the owner, 2026-10-27)', () => {
  it('is off in a new world, switched by its action, and off again after RESET', () => {
    let w = newWorld();
    expect(w.bridgeDisplaysOn).toBe(false);
    w = applyAction(w, { type: 'bridge/displays', on: true });
    expect(w.bridgeDisplaysOn).toBe(true);
    w = applyAction(w, { type: 'bridge/theme-heard' });
    w = applyAction(w, { type: 'bridge/first-visit-reset' });
    expect(w.bridgeDisplaysOn).toBe(false);
    expect(w.bridgeThemeHeard).toBe(false);
  });

  it('migrates an older save: on where the theme was heard, off otherwise', () => {
    expect(WORLD_VERSION).toBeGreaterThanOrEqual(51);
    for (const heard of [true, false]) {
      const old = { ...newWorld(), bridgeThemeHeard: heard } as Record<
        string,
        unknown
      >;
      delete old.bridgeDisplaysOn;
      const loaded = deserialiseWorld(
        JSON.stringify({
          format: 'pool-plant-save',
          version: 50,
          savedAt: 0,
          world: old,
        }),
      );
      expect(loaded.ok).toBe(true);
      if (loaded.ok) expect(loaded.world.bridgeDisplaysOn).toBe(heard);
    }
  });

  it('RESET → seen from outside → the doors shut → booting → running', () => {
    // Visited before: displays on and running.
    let start = applyAction(newWorld(), { type: 'bridge/theme-heard' });
    start = applyAction(start, { type: 'bridge/displays', on: true });
    const b = bridge(start);
    expect(states(b.screens)).toEqual(new Set(['running']));
    // RESET at the corridor's plate: every display unpowered at once.
    b.dispatch({ type: 'bridge/first-visit-reset' });
    expect(states(b.screens)).toEqual(new Set(['unpowered']));
    // Seen from outside: the bridge suspended without being entered keeps
    // them off; ticking (drawn) changes nothing.
    expect(displaysOnLeaving(false, false)).toBe(false);
    for (const t of [0, 5, 50]) for (const s of b.screens) s.tick(t);
    for (const s of b.screens) expect(s.phase).toBe('black');
    // The walker in; the doors shut behind them: t = 0. Still off.
    let reveal = revealWaiting();
    reveal = stepReveal(reveal, 0.1, false);
    reveal = stepReveal(reveal, 0.1, true);
    expect(reveal.started).toBe(true);
    expect(states(b.screens)).toEqual(new Set(['unpowered']));
    // At DISPLAYS_ON_AT, switched on: every display booting.
    b.dispatch({ type: 'bridge/displays', on: true });
    for (const s of b.screens) s.tick(DISPLAYS_ON_AT);
    expect(states(b.screens)).toEqual(new Set(['booting']));
    expect(b.ready).toBeGreaterThan(5);
    // All running by their last one's ready time.
    for (const s of b.screens) s.tick(DISPLAYS_ON_AT + b.ready + 0.001);
    expect(states(b.screens)).toEqual(new Set(['running']));
  });

  it('blacks every display at once when the power goes, and boots them when it returns', () => {
    const group = new BootGroup(seeded(2));
    const screens = Array.from({ length: 4 }, (_, i) =>
      group.add(new BootScreen(new Label(`${i}`))),
    );
    expect(states(screens)).toEqual(new Set(['running']));
    group.setPower(false);
    expect(states(screens)).toEqual(new Set(['unpowered']));
    for (const s of screens) expect(s.hit(1, 1)).toBeNull();
    // A screen joining an unpowered room is unpowered with it.
    const late = group.add(new BootScreen(new Label('late')));
    expect(late.displayState).toBe('unpowered');
    group.setPower(true, ENTRANCE_BOOT);
    expect(states([...screens, late])).toEqual(new Set(['booting']));
    // Straight on, when asked (a reload onto the bridge).
    group.setPower(false);
    group.setPower(true, 'instant');
    expect(states(screens)).toEqual(new Set(['running']));
    expect(displayPower(newWorld())).toBe(false);
  });
});
