import type { BlockKind } from '../sim/block-kind';

/**
 * A test bench's blocks: an endless supply of water, an endless drain,
 * and the water path between them through a machine's own resistance, so
 * that the flow is set by the pressure across it. Pure. Units: pressure
 * bar, temperature °C, flow m³/h.
 */

/** An endless supply: water at a set temperature and pressure, for ever. */
export const SUPPLY: BlockKind<
  { temperature: number; pressure: number },
  null
> = {
  kind: 'water-supply',
  inputs: [
    { name: 'temperature', unit: '°C' },
    { name: 'pressure', unit: 'bar' },
  ],
  outputs: [
    { name: 'temperature', unit: '°C' },
    { name: 'pressure', unit: 'bar' },
  ],
  params: { temperature: 60, pressure: 1.25 },
  init: () => null,
  read: (p, _s, i) => ({
    temperature:
      typeof i.temperature === 'number' ? i.temperature : p.temperature,
    pressure: typeof i.pressure === 'number' ? i.pressure : p.pressure,
  }),
  step(p, s, i) {
    return {
      state: s,
      outputs: SUPPLY.read!(p, s, i, 0),
      sleep: { until: Infinity, hold: { temperature: 0, pressure: 0 } },
    };
  },
};

/** An endless drain: takes whatever comes, at a set pressure. */
export const DRAIN: BlockKind<{ pressure: number }, null> = {
  kind: 'water-drain',
  inputs: [{ name: 'temperature', unit: '°C' }],
  outputs: [
    { name: 'pressure', unit: 'bar' },
    { name: 'temperature', unit: '°C', about: 'what arrives' },
  ],
  params: { pressure: 1 },
  init: () => null,
  read: (p, _s, i) => ({
    pressure: p.pressure,
    temperature: i.temperature ?? null,
  }),
  step(p, s, i) {
    return {
      state: s,
      outputs: DRAIN.read!(p, s, i, 0),
      sleep: { until: Infinity, hold: {} },
    };
  },
};

/**
 * A water path through a machine and its valve: the flow the pressure
 * across it drives through its resistance (Δp = r·Q²), and a valve that
 * throttles it (fully shut, nothing).
 */
export const WATER_PATH: BlockKind<{ r: number }, null> = {
  kind: 'water-path',
  inputs: [
    { name: 'pressureIn', unit: 'bar' },
    { name: 'pressureOut', unit: 'bar' },
    { name: 'open', about: 'its valve, 0 to 1' },
  ],
  outputs: [{ name: 'flow', unit: 'm³/h' }],
  // A boiler's heat exchanger: 0.25 bar at 10 m³/h.
  params: { r: 0.25 / 100 },
  init: () => null,
  read(p, _s, i) {
    const open =
      typeof i.open === 'number' ? Math.max(0, Math.min(1, i.open)) : 1;
    const dp =
      ((i.pressureIn as number) ?? 0) - ((i.pressureOut as number) ?? 0);
    return { flow: dp > 0 && open > 0 ? open * Math.sqrt(dp / p.r) : 0 };
  },
  step(p, s, i) {
    return {
      state: s,
      outputs: WATER_PATH.read!(p, s, i, 0),
      sleep: { until: Infinity, hold: { open: 0 } },
    };
  },
};
