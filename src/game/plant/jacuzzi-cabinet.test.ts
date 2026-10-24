import { describe, expect, it } from 'vite-plus/test';
import {
  NO_FLOW_TRIP,
  actOnJacuzziCabinet,
  jacuzziCabinetDisplay,
  jacuzziPumpCalled,
  jacuzziWaterFlowing,
  newJacuzziCabinet,
  stepJacuzziCabinet,
} from './jacuzzi-cabinet';
import type {
  JacuzziCabinetState,
  JacuzziDisplayInputs,
} from './jacuzzi-cabinet';

const ok = { supplied: true, path: true };
const blocked = { supplied: true, path: false };
const run = (
  c: JacuzziCabinetState,
  inputs: typeof ok,
  seconds: number,
  dt = 0.1,
) => {
  for (let t = 0; t < seconds - 1e-9; t += dt)
    c = stepJacuzziCabinet(c, inputs, dt);
  return c;
};

describe('the jacuzzi cabinet’s controller', () => {
  it('runs its pump while supplied and switched on, and stops it switched off or unsupplied', () => {
    const c = newJacuzziCabinet();
    expect(jacuzziPumpCalled(c, true)).toBe(true);
    expect(jacuzziPumpCalled(c, false)).toBe(false);
    const off = actOnJacuzziCabinet(c, { act: 'power', on: false }, true);
    expect(jacuzziPumpCalled(off, true)).toBe(false);
  });

  it('moves water only with a way through its valves', () => {
    const c = newJacuzziCabinet();
    expect(jacuzziWaterFlowing(c, ok)).toBe(true);
    expect(jacuzziWaterFlowing(c, blocked)).toBe(false);
    // Its motor still runs, dead-headed, until it trips.
    expect(jacuzziPumpCalled(c, true)).toBe(true);
  });

  it('trips on no flow after its delay, not on a valve passing through shut', () => {
    let c = run(newJacuzziCabinet(), blocked, NO_FLOW_TRIP - 2);
    c = run(c, ok, 1);
    c = run(c, blocked, NO_FLOW_TRIP - 2);
    expect(c.trip).toBe('');
    c = run(c, blocked, 2.5);
    expect(c.trip).toBe('no-flow');
    expect(jacuzziPumpCalled(c, true)).toBe(false);
  });

  it('does not trip while switched off or unsupplied, whatever the valves', () => {
    const off = actOnJacuzziCabinet(
      newJacuzziCabinet(),
      { act: 'power', on: false },
      false,
    );
    expect(run(off, blocked, 60).trip).toBe('');
    expect(
      run(newJacuzziCabinet(), { supplied: false, path: false }, 60).trip,
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
    c = run(c, { supplied: false, path: true }, 30);
    expect(c.trip).toBe('no-flow');
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
    tankLow: false,
    draining: false,
    doorOpen: false,
    time: 0,
  };
  const show = (d: Partial<JacuzziDisplayInputs>) =>
    jacuzziCabinetDisplay({ ...base, ...d });

  it('is dark without power', () => {
    expect(show({ supplied: false }).lines).toBeNull();
  });

  it('shows the water and its setting, and that it is running', () => {
    const { lines } = show({});
    expect(lines).toEqual(['37.0C  SET 37.0 ', 'RUNNING  UV ON  ']);
    for (const l of lines!) expect(l).toHaveLength(16);
    expect(show({ doorOpen: true }).lines![1].trim()).toBe('RUNNING  UV OFF');
  });

  it('says STOPPED switched off', () => {
    const cabinet = { ...newJacuzziCabinet(), power: false };
    expect(show({ cabinet, flowing: false }).messages).toEqual(['STOPPED']);
  });

  it('puts a trip first, and cycles its messages', () => {
    const cabinet: JacuzziCabinetState = {
      ...newJacuzziCabinet(),
      trip: 'no-flow',
    };
    const d = show({ cabinet, flowing: false, waterC: 34 });
    expect(d.messages).toEqual([
      'TRIP: NO FLOW',
      'CHECK VALVES+RST',
      'TEMP LOW',
    ]);
    expect(
      show({ cabinet, flowing: false, waterC: 34, time: 0 }).lines![1].trim(),
    ).toBe('TRIP: NO FLOW');
    expect(
      show({ cabinet, flowing: false, waterC: 34, time: 2 }).lines![1].trim(),
    ).toBe('CHECK VALVES+RST');
    expect(
      show({ cabinet, flowing: false, waterC: 34, time: 4 }).lines![1].trim(),
    ).toBe('TEMP LOW');
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
    ]);
  });

  it('says TRIP: TANK LOW with its tank run down, not RUNNING', () => {
    expect(show({ tankLow: true, flowing: false }).messages).toEqual([
      'TRIP: TANK LOW',
    ]);
  });

  it('says DRAINING with its drain open', () => {
    expect(show({ draining: true }).messages).toEqual([
      'DRAINING',
      'RUNNING  UV ON',
    ]);
  });
});
