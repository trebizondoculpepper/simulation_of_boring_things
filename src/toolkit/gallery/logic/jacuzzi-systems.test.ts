import { describe, expect, it } from 'vite-plus/test';
import {
  advance,
  applyAction,
  jacuzziCabinetPanel,
  jacuzziFlow,
  jacuzziPlate,
  jacuzziPlumbing,
  jacuzziRuns,
  jacuzziTankDraining,
  newWorld,
  pressJacuzziPlate,
} from '../../../game/world';
import type { World } from '../../../game/world';
import { JACUZZI_VALVES } from '../../../game/plant/jacuzzi';
import { NO_FLOW_TRIP } from '../../../game/plant/jacuzzi-cabinet';
import { dosedVolumes, poolVolume } from '../../../game/plant/pools';
import { JACUZZI_BALANCE_TANK } from '../../../game/plant/spa-balance-tank';
import { jacuzziMimicState } from './jacuzzi-mimic';

/**
 * The jacuzzi's cabinet with the systems coupled to it (the owner,
 * 2026-10-24): its valve panel, its plant room's water mimic, the
 * waterproof wall plate by the tub, its power, its balance tank and its
 * heating, all through the one world.
 */
const start = advance(newWorld(), 10, 1);
const valve = (w: World, k: keyof typeof JACUZZI_VALVES, open: boolean) =>
  applyAction(w, { type: 'plant/valve', id: JACUZZI_VALVES[k], open });
const reset = (w: World) =>
  applyAction(w, { type: 'jacuzzi/cabinet', action: { act: 'reset' } });
const dosed = (w: World) =>
  dosedVolumes(w.pools, w.plant, undefined, true, w.motors, jacuzziFlow(w))
    .hypochlorite;
const tripped = (w: World) =>
  advance(valve(w, 'return', false), NO_FLOW_TRIP + 1, 0.5);

describe('the jacuzzi cabinet, with its valve panel and its mimic', () => {
  it('runs as normal: PUMP RUN, UV, dosing, the mimic’s RUN and UV lit', () => {
    const panel = jacuzziCabinetPanel(start);
    expect(panel).toMatchObject({
      pumpRun: true,
      flowing: true,
      uv: true,
      dosing: true,
      noFlow: false,
    });
    expect(panel.messages).toEqual([
      'RUNNING  UV ON',
      `TANK ${Math.round(start.pools.pool_03.balance * 100)}%`,
    ]);
    expect(jacuzziMimicState(start).lamps).toEqual({ pump: true, uv: true });
  });

  it('runs dead-headed for a moment with its return valve shut, NO FLOW lit', () => {
    const w = valve(start, 'return', false);
    const panel = jacuzziCabinetPanel(w);
    expect(panel).toMatchObject({
      pumpRun: true,
      flowing: false,
      noFlow: true,
    });
    expect(panel.dosing).toBe(false);
    expect(jacuzziMimicState(w).lamps).toEqual({ pump: true, uv: false });
  });

  it('trips out with its return shut, and the mimic shows its pump stopped', () => {
    const w = tripped(start);
    expect(w.jacuzziCabinet.trip).toBe('no-flow');
    const panel = jacuzziCabinetPanel(w);
    expect(panel).toMatchObject({
      pumpRun: false,
      flowing: false,
      noFlow: true,
    });
    expect(panel.messages[0]).toBe('TRIP: NO FLOW');
    expect(jacuzziMimicState(w).lamps).toEqual({ pump: false, uv: false });
    expect(dosed(w)).toBeLessThan(dosed(start));
    // Its water slows to a stop, as the mimic's FLOW reads it.
    const later = advance(w, 120, 1);
    expect(later.pools.pool_03.flow).toBeLessThan(1);
  });

  it('trips out with its suction from the balance tank shut', () => {
    const w = advance(valve(start, 'suction', false), NO_FLOW_TRIP + 1, 0.5);
    expect(w.jacuzziCabinet.trip).toBe('no-flow');
  });

  it('with its overflow shut, spills the gutter over the deck and runs its tank down until TANK LOW', () => {
    let w = valve(start, 'overflow', false);
    w = applyAction(w, { type: 'pool/make-up', pool: 'pool_03', open: false });
    const spilt = (x: World) => x.pools.pool_03.level;
    let lowSeen = false;
    // It trips on TANK LOW, the spa's floor drains refill the tank by
    // gravity, it restarts, and round again: never the latched trip.
    for (let i = 0; i < 120; i++) {
      w = advance(w, 1, 1);
      if (w.pools.pool_03.tripped) {
        lowSeen = true;
        expect(jacuzziCabinetPanel(w).messages[0]).toBe('TRIP: TANK LOW');
      }
      expect(w.jacuzziCabinet.trip).toBe('');
    }
    expect(lowSeen).toBe(true);
    // The spa's water lost over the deck: its level below its lip.
    expect(spilt(w)).toBeLessThan(0);
  });

  it('stays tripped once the valve reopens, until RESET; RESET with it still shut does nothing', () => {
    let w = tripped(start);
    expect(reset(w).jacuzziCabinet.trip).toBe('no-flow');
    w = advance(valve(w, 'return', true), 10, 0.5);
    expect(jacuzziCabinetPanel(w).pumpRun).toBe(false);
    w = reset(w);
    expect(jacuzziCabinetPanel(w)).toMatchObject({
      pumpRun: true,
      flowing: true,
      noFlow: false,
    });
    expect(jacuzziMimicState(w).lamps).toEqual({ pump: true, uv: true });
  });

  it('trips out when its water supply fails and its balance tank runs down to low-low, and restarts itself as it refills', () => {
    const dry: World = {
      ...start,
      pools: {
        ...start.pools,
        pool_03: { ...start.pools.pool_03, balance: 0.02 },
      },
    };
    let w = advance(dry, 1, 0.5);
    const panel = jacuzziCabinetPanel(w);
    expect(panel).toMatchObject({
      pumpRun: false,
      flowing: false,
      noFlow: true,
    });
    expect(panel.messages).toEqual([
      'TRIP: TANK LOW',
      expect.stringMatching(/^TANK \d+% FILLING$/),
    ]);
    expect(jacuzziMimicState(w).lamps).toEqual({ pump: false, uv: false });
    expect(dosed(w)).toBeLessThan(dosed(start));
    // Not latched: its valves are open, so no no-flow trip.
    w = advance(w, NO_FLOW_TRIP + 2, 0.5);
    expect(w.jacuzziCabinet.trip).toBe('');
    // The water back and the tank refilled: it runs again by itself.
    w = {
      ...w,
      pools: {
        ...w.pools,
        pool_03: { ...w.pools.pool_03, balance: 0.68 },
      },
    };
    w = advance(w, 2, 0.5);
    expect(jacuzziCabinetPanel(w)).toMatchObject({
      pumpRun: true,
      flowing: true,
    });
  });

  it('stops, without tripping, switched off at its POWER switch, and starts again switched on', () => {
    let w = applyAction(start, {
      type: 'jacuzzi/cabinet',
      action: { act: 'power', on: false },
    });
    w = advance(valve(w, 'return', false), 30, 1);
    expect(w.jacuzziCabinet.trip).toBe('');
    expect(jacuzziCabinetPanel(w).messages).toContain('STOPPED');
    w = valve(w, 'return', true);
    w = applyAction(w, {
      type: 'jacuzzi/cabinet',
      action: { act: 'power', on: true },
    });
    expect(jacuzziCabinetPanel(w).flowing).toBe(true);
  });

  it('is dark with its isolator off: no lamps, no display, no trip', () => {
    let w = applyAction(start, {
      type: 'plant/isolator',
      name: 'Jacuzzi cabinet isolator',
      on: false,
    });
    w = advance(valve(w, 'return', false), 30, 1);
    const panel = jacuzziCabinetPanel(w);
    expect(panel).toMatchObject({
      supplied: false,
      pumpRun: false,
      noFlow: false,
      lines: null,
    });
    expect(w.jacuzziCabinet.trip).toBe('');
    expect(jacuzziMimicState(w).lamps).toEqual({ pump: false, uv: false });
  });

  it('warns NO HEAT with its heating valves shut, and TEMP LOW as the water cools', () => {
    let w = valve(start, 'heatingFlow', false);
    expect(jacuzziFlow(w).heat).toBe(false);
    w = advance(w, 4 * 3600, 5);
    expect(w.pools.pool_03.temperature).toBeLessThan(
      start.pools.pool_03.temperature,
    );
    const messages = jacuzziCabinetPanel(w).messages;
    expect(messages).toContain('NO HEAT');
    // Never a trip: the pump carries on.
    expect(w.jacuzziCabinet.trip).toBe('');
    expect(jacuzziCabinetPanel(w).flowing).toBe(true);
  });
});

describe('the jacuzzi cabinet, with the waterproof wall plate by the tub', () => {
  const full = (w: World): World => ({
    ...w,
    pools: { ...w.pools, pool_03: { ...w.pools.pool_03, level: 0.015 } },
  });

  it('starts the jets and air from START, its ring lit, and stops them from STOP', () => {
    let w = pressJacuzziPlate(full(start), 'start');
    expect(jacuzziRuns(w)).toEqual({ jets: true, air: true });
    expect(jacuzziPlate(w).startLit).toBe(true);
    w = pressJacuzziPlate(w, 'stop');
    expect(jacuzziPlate(w).startLit).toBe(false);
  });

  it('cannot run the jets while the cabinet is tripped, and they stop when it trips', () => {
    let w = pressJacuzziPlate(full(start), 'start');
    w = full(tripped(w));
    expect(jacuzziRuns(w)).toEqual({ jets: false, air: false });
    expect(jacuzziPlate(w).startLit).toBe(false);
    w = pressJacuzziPlate(w, 'start');
    expect(jacuzziRuns(w)).toEqual({ jets: false, air: false });
    // Reopened and reset, START works again.
    w = reset(valve(w, 'return', true));
    w = pressJacuzziPlate(w, 'start');
    expect(jacuzziRuns(w)).toEqual({ jets: true, air: true });
  });

  it('is dead with the cabinet’s isolator off: a press does nothing, no ring lit', () => {
    const off = applyAction(full(start), {
      type: 'plant/isolator',
      name: 'Jacuzzi cabinet isolator',
      on: false,
    });
    expect(jacuzziPlate(off).powered).toBe(false);
    const pressed = pressJacuzziPlate(off, 'start');
    expect(pressed.jacuzzi).toEqual(off.jacuzzi);
    expect(jacuzziPlate(pressed).startLit).toBe(false);
  });

  it('keeps the jets off with their own valves shut, the cabinet still running', () => {
    let w = valve(full(start), 'jetsSuction', false);
    w = pressJacuzziPlate(w, 'start');
    expect(jacuzziRuns(w)).toEqual({ jets: false, air: true });
    expect(jacuzziCabinetPanel(w).flowing).toBe(true);
  });
});

describe('the jacuzzi cabinet, with its external balance tank', () => {
  it('is plumbed to the external tank, not its own surge vessel', () => {
    const plumbing = jacuzziPlumbing(start);
    expect(plumbing.tank).toBe('external');
  });

  it('starts with the tank at its float, room above for every seat taken', () => {
    const t = JACUZZI_BALANCE_TANK;
    expect(start.pools.pool_03.balance).toBeCloseTo(t.float, 1);
    expect((1 - start.pools.pool_03.balance) * t.volume).toBeGreaterThan(
      t.allowances.bathers,
    );
    expect(t.volume / poolVolume('pool_03')).toBeGreaterThan(0.35);
  });

  it('holds its level through a day’s running, the make-up keeping it at its float', () => {
    const w = advance(start, 24 * 3600, 10);
    expect(w.pools.pool_03.tripped).toBe(false);
    expect(w.pools.pool_03.balance).toBeGreaterThan(
      JACUZZI_BALANCE_TANK.lowLow,
    );
    expect(jacuzziCabinetPanel(w).flowing).toBe(true);
  });

  it('takes the tub’s gutter water back when the pump stops, and gives it out again when it restarts', () => {
    const off = advance(
      applyAction(start, {
        type: 'jacuzzi/cabinet',
        action: { act: 'power', on: false },
      }),
      120,
      1,
    );
    expect(off.pools.pool_03.balance).toBeGreaterThan(
      start.pools.pool_03.balance,
    );
    const on = advance(
      applyAction(off, {
        type: 'jacuzzi/cabinet',
        action: { act: 'power', on: true },
      }),
      300,
      1,
    );
    expect(on.pools.pool_03.balance).toBeLessThan(off.pools.pool_03.balance);
    expect(on.pools.pool_03.tripped).toBe(false);
  });

  it('empties its balance tank to waste down its own drain, by hand, with no power and its make-up shut', () => {
    // The cabinet isolated, the room's power or none: gravity does it.
    let w = applyAction(start, {
      type: 'plant/isolator',
      name: 'Jacuzzi cabinet isolator',
      on: false,
    });
    w = applyAction(w, { type: 'pool/make-up', pool: 'pool_03', open: false });
    const shut = advance(w, 600, 1);
    expect(jacuzziTankDraining(shut)).toBe(false);
    expect(shut.pools.pool_03.balance).toBeGreaterThan(
      JACUZZI_BALANCE_TANK.float,
    );
    const opened = valve(w, 'tankDrain', true);
    expect(jacuzziTankDraining(opened)).toBe(true);
    // Down past its low-low in ten minutes, the tub's main drains still
    // running back into it by gravity, slower than it drains away.
    const ten = advance(opened, 600, 1);
    expect(ten.pools.pool_03.balance).toBeLessThan(JACUZZI_BALANCE_TANK.lowLow);
    expect(ten.pools.pool_03.level).toBeLessThan(shut.pools.pool_03.level);
    // And in an hour the tank is empty, and the tub with it.
    const hour = advance(ten, 3000, 1);
    expect(hour.pools.pool_03.balance).toBeLessThan(0.002);
    expect(jacuzziTankDraining(hour)).toBe(false);
  });

  it('trips the running pump on its tank’s low-low as the drain outruns the make-up', () => {
    const w = advance(valve(start, 'tankDrain', true), 5 * 60, 1);
    expect(w.pools.pool_03.tripped).toBe(true);
    expect(jacuzziCabinetPanel(w).flowing).toBe(false);
    expect(w.pools.pool_03.balance).toBeLessThan(JACUZZI_BALANCE_TANK.float);
  });
});
