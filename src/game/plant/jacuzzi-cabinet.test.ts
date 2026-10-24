import { describe, expect, it } from 'vite-plus/test';
import {
  DISCONNECTED_VESSEL,
  NO_FLOW_TRIP,
  actOnJacuzziCabinet,
  cabinetTanks,
  jacuzziCabinetDisplay,
  jacuzziPumpCalled,
  jacuzziWaterFlowing,
  newJacuzziCabinet,
  stepJacuzziCabinet,
} from './jacuzzi-cabinet';
import type {
  CabinetPlumbing,
  JacuzziCabinetInputs,
  JacuzziCabinetState,
  JacuzziDisplayInputs,
} from './jacuzzi-cabinet';
import { IDEAL_BALANCE_TANK, JACUZZI_BALANCE_TANK } from './spa-balance-tank';
import type { BalanceTankReading } from './spa-balance-tank';

/**
 * The cabinet alone, plumbed to an ideal external balance tank (always
 * at its working level, never low): every behaviour first with it, then
 * with a tank run low, then with its own surge vessel instead.
 */
const ideal: CabinetPlumbing = {
  tank: 'external',
  external: IDEAL_BALANCE_TANK,
};
const tank = cabinetTanks(ideal, DISCONNECTED_VESSEL).draws;
const ok: JacuzziCabinetInputs = { supplied: true, path: true, tank };
const blocked: JacuzziCabinetInputs = { supplied: true, path: false, tank };
const unsupplied: JacuzziCabinetInputs = { supplied: false, path: true, tank };
const lowTank: BalanceTankReading = { fill: 0.05, low: true, filling: true };
const run = (
  c: JacuzziCabinetState,
  inputs: JacuzziCabinetInputs,
  seconds: number,
  dt = 0.1,
) => {
  for (let t = 0; t < seconds - 1e-9; t += dt)
    c = stepJacuzziCabinet(c, inputs, dt);
  return c;
};

describe('the cabinet’s plumbing: its own surge vessel or an external tank, never both', () => {
  const vessel: BalanceTankReading = { fill: 0.6, low: false, filling: false };

  it('draws from the external tank, its own vessel disconnected and reading 0 %', () => {
    const t = cabinetTanks(ideal, vessel);
    expect(t.draws).toBe(IDEAL_BALANCE_TANK);
    expect(t.vessel).toEqual({ fill: 0, low: false, filling: false });
  });

  it('draws from its own vessel with no external tank', () => {
    const t = cabinetTanks({ tank: 'internal' }, vessel);
    expect(t.draws).toBe(vessel);
    expect(t.vessel).toBe(vessel);
  });

  it('cannot be given an external tank while plumbed to its own vessel', () => {
    // @ts-expect-error: an internal cabinet has no external tank.
    const both: CabinetPlumbing = { tank: 'internal', external: vessel };
    expect(both.tank).toBe('internal');
    // @ts-expect-error: an external cabinet needs its tank.
    const none: CabinetPlumbing = { tank: 'external' };
    expect(none.tank).toBe('external');
  });

  it('runs the same with either, and trips TANK LOW on whichever it draws from', () => {
    const c = newJacuzziCabinet();
    for (const draws of [
      cabinetTanks(ideal, vessel).draws,
      cabinetTanks({ tank: 'internal' }, vessel).draws,
    ])
      expect(jacuzziWaterFlowing(c, { ...ok, tank: draws })).toBe(true);
    // Its own vessel low, but plumbed externally: no matter.
    const external = cabinetTanks(ideal, lowTank).draws;
    expect(jacuzziWaterFlowing(c, { ...ok, tank: external })).toBe(true);
    // Plumbed to its own vessel, which is low: held off.
    const internal = cabinetTanks({ tank: 'internal' }, lowTank).draws;
    expect(jacuzziPumpCalled(c, { ...ok, tank: internal })).toBe(false);
  });
});

describe('the jacuzzi cabinet’s controller, with an ideal balance tank', () => {
  it('runs its pump while supplied and switched on, and stops it switched off or unsupplied', () => {
    const c = newJacuzziCabinet();
    expect(jacuzziPumpCalled(c, ok)).toBe(true);
    expect(jacuzziPumpCalled(c, unsupplied)).toBe(false);
    const off = actOnJacuzziCabinet(c, { act: 'power', on: false }, true);
    expect(jacuzziPumpCalled(off, ok)).toBe(false);
  });

  it('moves water only with a way through its valves', () => {
    const c = newJacuzziCabinet();
    expect(jacuzziWaterFlowing(c, ok)).toBe(true);
    expect(jacuzziWaterFlowing(c, blocked)).toBe(false);
    // Its motor still runs, dead-headed, until it trips.
    expect(jacuzziPumpCalled(c, blocked)).toBe(true);
  });

  it('trips on no flow after its delay, not on a valve passing through shut', () => {
    let c = run(newJacuzziCabinet(), blocked, NO_FLOW_TRIP - 2);
    c = run(c, ok, 1);
    c = run(c, blocked, NO_FLOW_TRIP - 2);
    expect(c.trip).toBe('');
    c = run(c, blocked, 2.5);
    expect(c.trip).toBe('no-flow');
    expect(jacuzziPumpCalled(c, ok)).toBe(false);
  });

  it('does not trip while switched off or unsupplied, whatever the valves', () => {
    const off = actOnJacuzziCabinet(
      newJacuzziCabinet(),
      { act: 'power', on: false },
      false,
    );
    expect(run(off, blocked, 60).trip).toBe('');
    expect(
      run(newJacuzziCabinet(), { ...unsupplied, path: false }, 60).trip,
    ).toBe('');
  });

  it('stays tripped until RESET with the fault cleared', () => {
    let c = run(newJacuzziCabinet(), blocked, NO_FLOW_TRIP + 1);
    expect(c.trip).toBe('no-flow');
    // Valves reopened: still tripped, until RESET.
    c = run(c, ok, 10);
    expect(c.trip).toBe('no-flow');
    // RESET with no way through does nothing.
    expect(actOnJacuzziCabinet(c, { act: 'reset' }, false).trip).toBe(
      'no-flow',
    );
    c = actOnJacuzziCabinet(c, { act: 'reset' }, true);
    expect(c.trip).toBe('');
    expect(jacuzziWaterFlowing(c, ok)).toBe(true);
  });

  it('keeps its trip through a power cut', () => {
    let c = run(newJacuzziCabinet(), blocked, NO_FLOW_TRIP + 1);
    c = run(c, unsupplied, 30);
    expect(c.trip).toBe('no-flow');
  });
});

describe('the jacuzzi cabinet’s controller, with its tank run low', () => {
  const low: JacuzziCabinetInputs = { ...ok, tank: lowTank };

  it('holds its pump off at low-low, and restarts by itself as the tank recovers', () => {
    let c = newJacuzziCabinet();
    expect(jacuzziPumpCalled(c, low)).toBe(false);
    expect(jacuzziWaterFlowing(c, low)).toBe(false);
    c = run(c, low, 60);
    // Not a latched trip: the valves are open.
    expect(c.trip).toBe('');
    expect(jacuzziWaterFlowing(c, ok)).toBe(true);
  });

  it('runs no no-flow timer while held off by its tank, even with a valve shut', () => {
    const c = run(newJacuzziCabinet(), { ...low, path: false }, 60);
    expect(c.trip).toBe('');
  });
});

describe('its 16 × 2 display', () => {
  const base: JacuzziDisplayInputs = {
    cabinet: newJacuzziCabinet(),
    supplied: true,
    flowing: true,
    waterC: 37,
    setC: 37,
    heatSupply: true,
    tank,
    draining: false,
    doorOpen: false,
    time: 0,
  };
  const show = (d: Partial<JacuzziDisplayInputs>) =>
    jacuzziCabinetDisplay({ ...base, ...d });
  const tankLine = `TANK ${Math.round(JACUZZI_BALANCE_TANK.float * 100)}%`;

  it('is dark without power', () => {
    expect(show({ supplied: false }).lines).toBeNull();
  });

  it('shows the water and its setting, that it is running, and its tank', () => {
    const { lines, messages } = show({});
    expect(lines).toEqual(['37.0C  SET 37.0 ', 'RUNNING  UV ON  ']);
    for (const l of lines!) expect(l).toHaveLength(16);
    expect(messages).toEqual(['RUNNING  UV ON', tankLine]);
    expect(show({ time: 2 }).lines![1].trim()).toBe(tankLine);
    expect(show({ doorOpen: true }).lines![1].trim()).toBe('RUNNING  UV OFF');
  });

  it('says STOPPED switched off', () => {
    const cabinet = { ...newJacuzziCabinet(), power: false };
    expect(show({ cabinet, flowing: false }).messages).toEqual([
      'STOPPED',
      tankLine,
    ]);
  });

  it('puts a trip first, and cycles its messages', () => {
    const cabinet: JacuzziCabinetState = {
      ...newJacuzziCabinet(),
      trip: 'no-flow',
    };
    const at = (time: number) =>
      show({ cabinet, flowing: false, waterC: 34, time }).lines![1].trim();
    expect(show({ cabinet, flowing: false, waterC: 34 }).messages).toEqual([
      'TRIP: NO FLOW',
      'CHECK VALVES+RST',
      'TEMP LOW',
      tankLine,
    ]);
    expect(at(0)).toBe('TRIP: NO FLOW');
    expect(at(2)).toBe('CHECK VALVES+RST');
    expect(at(4)).toBe('TEMP LOW');
    expect(at(6)).toBe(tankLine);
    expect(at(8)).toBe('TRIP: NO FLOW');
  });

  it('warns NO HEAT as soon as heat is wanted and not coming, and TEMP LOW past its band', () => {
    expect(show({ heatSupply: false }).messages).not.toContain('NO HEAT');
    expect(show({ heatSupply: false, waterC: 36.5 }).messages).toContain(
      'NO HEAT',
    );
    expect(show({ heatSupply: false, waterC: 36.5 }).messages).not.toContain(
      'TEMP LOW',
    );
    expect(show({ heatSupply: false, waterC: 34.9 }).messages).toEqual([
      'NO HEAT',
      'TEMP LOW',
      'RUNNING  UV ON',
      tankLine,
    ]);
  });

  it('says TRIP: TANK LOW with its tank run down, and FILLING while its make-up runs', () => {
    expect(show({ tank: lowTank, flowing: false }).messages).toEqual([
      'TRIP: TANK LOW',
      'TANK 5% FILLING',
    ]);
  });

  it('says DRAINING with its drain open', () => {
    expect(show({ draining: true }).messages).toEqual([
      'DRAINING',
      'RUNNING  UV ON',
      tankLine,
    ]);
  });
});
