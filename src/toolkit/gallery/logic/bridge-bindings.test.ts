import { describe, expect, it } from 'vite-plus/test';
import { applyAction, newWorld } from '../../../game/world';
import type { World } from '../../../game/world';
import { POOL_MOTORS } from '../../../game/plant/motor-starters';
import {
  BRIDGE_BINDINGS,
  CENTRAL_CONTROL,
  bridgeSpec,
  commandNow,
  lookup,
  refusal,
  unwired,
  viewscreenShows,
} from './bridge-bindings';
import type { BridgeContext, Command } from './bridge-bindings';
import { plantReadingOf } from './world-reading';
import { roomModel } from './world-in-model';

const ctx = (world: World): BridgeContext => ({
  world,
  reading: plantReadingOf(world, 'pool_02'),
});
const button = (code: string, label: string, c: BridgeContext): Command => {
  const b = lookup(BRIDGE_BINDINGS[code].buttons, '', 0, label);
  if (!b) throw new Error(`${code}: no ${label}`);
  return commandNow(b, c);
};
/** A press, as the bridge's panel does it: the world after it, or its refusal. */
const press = (code: string, label: string, world: World) => {
  const cmd = button(code, label, ctx(world));
  if (cmd.kind !== 'act') return { world, refused: refusal(cmd) };
  const action = cmd.act(ctx(world));
  return {
    world: action ? applyAction(world, action) : world,
    refused: null,
  };
};

describe('the bridge’s panels, wired to the world (mission 095)', () => {
  it('wires every lamp, read-out, button, selector and symbol of each panel it shows', () => {
    for (const [code, binding] of Object.entries(BRIDGE_BINDINGS))
      expect(unwired(bridgeSpec(code), binding), code).toEqual([]);
  });

  it('binds each to its original’s node in its room’s model', () => {
    for (const [code, b] of Object.entries(BRIDGE_BINDINGS))
      expect(roomModel(b.model.room)?.nodes.has(b.model.node), code).toBe(true);
  });

  it('reads every item from a new world without fault', () => {
    const c = ctx(newWorld());
    for (const b of Object.values(BRIDGE_BINDINGS)) {
      for (const f of Object.values(b.lamps ?? {})) f?.(c);
      for (const f of Object.values(b.readouts ?? {})) f(c);
      for (const f of Object.values(b.gauges ?? {}))
        expect(Number.isFinite(f(c)[0])).toBe(true);
      for (const f of Object.values(b.trends ?? {})) f(c);
      for (const f of Object.values(b.rows ?? {})) f(c);
      for (const s of Object.values(b.symbols ?? {})) s.state(c);
      b.windows?.(c);
      b.flow?.(c);
    }
  });

  it('starts and stops the Olympic’s pumps from PL2-CP1’s copy, as its mimic does', () => {
    const [p1] = POOL_MOTORS('pool_02');
    let w = newWorld();
    w = press('PL2-CP1', 'P1 STOP', w).world;
    expect(w.motors.starters[p1].command).toBe(false);
    w = press('PL2-CP1', 'P1 START', w).world;
    expect(w.motors.starters[p1].command).toBe(true);
  });

  it('refuses the local-only controls: mode selectors, trip resets, the changeover', () => {
    const c = ctx(newWorld());
    expect(refusal(button('PL2-CP1', 'P1 RESET', c))).toMatch(
      /^LOCAL CONTROL ONLY · AT P-101A/,
    );
    const mode = BRIDGE_BINDINGS['PL2-CP1'].selectors!['P1 MODE'];
    expect(refusal(commandNow(mode.choose(0), c))).toMatch(/LOCAL CONTROL/);
    const supply = BRIDGE_BINDINGS['SR-IS3'].selectors!.SUPPLY;
    expect(refusal(commandNow(supply.choose(1), c))).toMatch(
      /AT THE CHANGEOVER SWITCH/,
    );
  });

  it('strikes a pool’s circulation stop from Central Control, released only at its panel', () => {
    let w = newWorld();
    const first = press(CENTRAL_CONTROL.code, 'STOP CIRCULATION OLYMPIC', w);
    expect(first.refused).toBeNull();
    w = first.world;
    expect(w.motors.stopped.pool_02).toBe(true);
    const again = press(CENTRAL_CONTROL.code, 'STOP CIRCULATION OLYMPIC', w);
    expect(again.refused).toMatch(/LOCAL CONTROL ONLY · AT THE EMERGENCY STOP/);
    expect(again.world.motors.stopped.pool_02).toBe(true);
  });

  it('shows what the world does not model yet on Central Control, refused as such', () => {
    const w = newWorld();
    for (const label of [
      'POOL EMERGENCY ALARM',
      'STOP DOSING',
      'PA TO POOLSIDE',
    ])
      expect(press(CENTRAL_CONTROL.code, label, w).refused).toMatch(
        /^NOT YET MODELLED/,
      );
  });

  it('shows the time, the bathers against their limits and the stores on Central Control', () => {
    const c = ctx(newWorld());
    const cc = BRIDGE_BINDINGS[CENTRAL_CONTROL.code];
    expect(cc.readouts!.TIME(c)).toMatch(/^\d\d:\d\d$/);
    const [share, words] = cc.gauges!['OLYMPIC BATHERS'](c);
    expect(share).toBeGreaterThanOrEqual(0);
    expect(words).toMatch(/\/ 312$/);
    expect(cc.gauges!['HYPOCHLORITE STORE'](c)[0]).toBeCloseTo(1);
  });

  it('puts the alarms on the viewscreen while any is unaccepted, else the circuit', () => {
    expect(viewscreenShows(2)).toBe('ALARMS');
    expect(viewscreenShows(0)).toBe('SCHEMATIC');
  });

  it('warms the Olympic by half a degree from the bather welfare counsellor’s panel', () => {
    const w = newWorld();
    const after = press('BWC-01', 'OLYMPIC WARMER', w).world;
    expect(after.pools.pool_02.setpoint).toBeCloseTo(
      w.pools.pool_02.setpoint + 0.5,
    );
  });
});
