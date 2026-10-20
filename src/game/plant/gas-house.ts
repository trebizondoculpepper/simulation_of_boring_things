import type { BlockKind } from '../sim/block-kind';
import { compose } from '../sim/composite';

/**
 * The boiler house's gas, as blocks, and the gas house as one block made
 * of them (`sim/composite.ts`). Pure. Units: gas flow m³/h, pressure mbar,
 * gas in the air as % of its lower explosive limit (LEL).
 *
 * From the street: the emergency control valve (ECV); the meter, whose
 * pressure falls with the flow through it and its pipework; the safety
 * shut-off valve (SSOV), held open only while its permits are made (the
 * ECV open, no gas detected, the emergency stop out) and, once tripped,
 * shut until someone resets it with all of them made again; the gas
 * detector, which alarms at 20% LEL and holds its alarm until reset; the
 * emergency stop, a mushroom that stays in until pulled out.
 *
 * Outside, the gas house is one block: it takes the boilers' gas flows
 * and the switches, and gives the pressure at the boilers, whether gas is
 * there at all, the meter's flow and reading, and the alarm. Inside, its
 * parts do the work.
 */

/** The emergency control valve: open or shut, by hand. */
export const ECV: BlockKind<object, null> = {
  kind: 'emergency-control-valve',
  inputs: [{ name: 'open' }],
  outputs: [{ name: 'open' }],
  params: {},
  init: () => null,
  read: (_p, _s, i) => ({ open: i.open !== false }),
  step: (_p, s, i) => ({
    state: s,
    outputs: { open: i.open !== false },
    sleep: { until: Infinity, hold: { open: 0 } },
  }),
};

/** A gas detector head and its controller: alarm at its level, held until reset. */
export const GAS_DETECTOR: BlockKind<{ alarmAt: number }, { alarm: boolean }> =
  {
    kind: 'gas-detector',
    inputs: [{ name: 'leak', unit: '% LEL' }, { name: 'reset' }],
    outputs: [{ name: 'alarm' }],
    params: { alarmAt: 20 },
    init: () => ({ alarm: false }),
    step(p, s, i) {
      const level = (i.leak as number) ?? 0;
      const alarm =
        level >= p.alarmAt ||
        (s.alarm && !(i.reset === true && level < p.alarmAt));
      return {
        state: { alarm },
        outputs: { alarm },
        sleep: {
          until: Infinity,
          hold: { reset: 0 },
          within: {
            leak: alarm ? [-Infinity, Infinity] : [-Infinity, p.alarmAt],
          },
        },
      };
    },
  };

/** The safety shut-off valve: open while permitted, latched shut once tripped. */
export const SSOV: BlockKind<object, { open: boolean }> = {
  kind: 'safety-shut-off-valve',
  inputs: [
    { name: 'ecvOpen' },
    { name: 'alarm' },
    { name: 'stop' },
    { name: 'reset' },
  ],
  outputs: [{ name: 'open' }],
  params: {},
  init: () => ({ open: true }),
  step(_p, s, i) {
    const permitted = i.ecvOpen === true && i.alarm !== true && i.stop !== true;
    const open = permitted && (s.open || i.reset === true);
    return {
      state: { open },
      outputs: { open },
      sleep: {
        until: Infinity,
        hold: { ecvOpen: 0, alarm: 0, stop: 0, reset: 0 },
      },
    };
  },
};

export interface MeterParams {
  /** The governed supply pressure at the meter's outlet, mbar. */
  supply: number;
  /** What the meter and pipework lose: mbar at `atFlow` m³/h. */
  loss: number;
  atFlow: number;
}

/**
 * The meter, its governor and the pipework to the boilers: it registers
 * the gas that flows (the boilers' demand, when gas is there), and the
 * pressure it delivers falls as the square of that flow.
 */
export interface MeterState {
  /** Its register at `at`, m³, and the flow it was passing then, m³/h. */
  reading: number;
  at: number;
  flow: number;
}

export const GAS_METER: BlockKind<MeterParams, MeterState> = {
  kind: 'gas-meter',
  inputs: [
    { name: 'flowA', unit: 'm³/h' },
    { name: 'flowB', unit: 'm³/h' },
    { name: 'ecvOpen' },
    { name: 'ssovOpen' },
    { name: 'supply', unit: 'mbar' },
  ],
  outputs: [
    { name: 'flow', unit: 'm³/h' },
    { name: 'pressure', unit: 'mbar' },
    { name: 'reading', unit: 'm³' },
  ],
  // 2 mbar lost when both 300 kW boilers fire fully (about 60 m³/h).
  params: { supply: 21, loss: 2, atFlow: 60 },
  init: () => ({ reading: 0, at: 0, flow: 0 }),
  // Its flow and pressure follow the boilers' demand at once; its register
  // counts on at the flow it was passing, asleep or not.
  read(p, s, i, t) {
    const through = i.ecvOpen === true && i.ssovOpen === true;
    const flow = through
      ? ((i.flowA as number) ?? 0) + ((i.flowB as number) ?? 0)
      : 0;
    const supply = typeof i.supply === 'number' ? i.supply : p.supply;
    return {
      flow,
      pressure: through ? supply - p.loss * (flow / p.atFlow) ** 2 : 0,
      reading: s.reading + (s.flow * (t - s.at)) / 3600,
    };
  },
  step(p, s, i, dt, t) {
    const reading = s.reading + (s.flow * dt) / 3600;
    const outputs = GAS_METER.read!(p, { reading, at: t, flow: s.flow }, i, t);
    return {
      state: { reading, at: t, flow: outputs.flow as number },
      outputs,
      // Asleep while the gas it passes holds within a twentieth of a m³/h.
      sleep: {
        until: Infinity,
        hold: { flowA: 0.05, flowB: 0.05, ecvOpen: 0, ssovOpen: 0, supply: 0 },
      },
    };
  },
};

/** The emergency stop: a mushroom, in (stopped) until pulled out. */
export const EMERGENCY_STOP: BlockKind<object, null> = {
  kind: 'emergency-stop',
  inputs: [{ name: 'pressed' }],
  outputs: [{ name: 'stopped' }],
  params: {},
  init: () => null,
  read: (_p, _s, i) => ({ stopped: i.pressed === true }),
  step: (_p, s, i) => ({
    state: s,
    outputs: { stopped: i.pressed === true },
    sleep: { until: Infinity, hold: { pressed: 0 } },
  }),
};

/** The gas house as one block, made of its parts. */
export const GAS_HOUSE = compose({
  kind: 'gas-house',
  blocks: {
    ecv: { kind: ECV },
    detector: { kind: GAS_DETECTOR },
    stop: { kind: EMERGENCY_STOP },
    ssov: { kind: SSOV },
    meter: { kind: GAS_METER },
  },
  wires: {
    'ssov.ecvOpen': 'ecv.open',
    'ssov.alarm': 'detector.alarm',
    'ssov.stop': 'stop.stopped',
    'meter.ecvOpen': 'ecv.open',
    'meter.ssovOpen': 'ssov.open',
  },
  inputs: {
    ecv: ['ecv.open'],
    leak: ['detector.leak'],
    stop: ['stop.pressed'],
    reset: ['detector.reset', 'ssov.reset'],
    supply: ['meter.supply'],
    flowA: ['meter.flowA'],
    flowB: ['meter.flowB'],
  },
  outputs: {
    available: 'ssov.open',
    pressure: 'meter.pressure',
    flow: 'meter.flow',
    reading: 'meter.reading',
    alarm: 'detector.alarm',
  },
});
