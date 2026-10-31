import {
  type Additions,
  type PoolChemistry,
  type WaterSpec,
  stepChemistry,
  waterFrom,
} from '../water/pool-chemistry';
import {
  CHANNEL_IDS,
  CHANNELS,
  type ChannelFeedback,
  type ChannelId,
  type ChannelPorts,
  type SampleInput,
} from './aqualis-types';
import { MAINS, STRENGTH } from './water-treatment';

/**
 * The Aqualis test rig (mission 114, `doc/plans/114/`): the simplified world
 * the dosing dev room (dev58) runs on, where the cabinet is proved before
 * it meets the real plant. Pure.
 *
 * - **An ideal pool**: one well-mixed body of water (`PoolChemistry`), pool
 *   and balance tank together, stepped on a 10 s chemistry tick as
 *   `water-treatment.ts` steps its zones, with an adjustable bather load
 *   that gives AUTO work to do (chlorine demand, and pH drifting up as CO₂
 *   leaves the agitated water).
 * - **A very simple loop**: a circulation pump, a filter, one injection
 *   point where the doses go in, and the cabinet's sample tapping and
 *   return. With nothing circulating the sample stops, and what the
 *   devices deliver waits in the injection line until the water moves.
 * - **Ideal sources** of 14 % hypochlorite, 10 % hydrochloric acid and CO₂
 *   that never run dry (what each has given is counted).
 * - **Ideal devices**: a hypochlorite pump, an acid pump and a CO₂ valve
 *   controller, each with its own selector (remote, manual, off), its own
 *   manual rate, power, an injectable fault and its control-port
 *   connection; each delivers demand × its most while remote, as
 *   `idealPump` does, and reports a `ChannelFeedback`.
 */

/** The chemistry's tick, s: as `water-treatment.ts` steps, so a fast rig stays cheap and stable. */
export const RIG_TICK = 10;

/** The rig's pool, sized for a small pool: 150 m³ in circulation at 28 °C, a four-hour turnover. */
export const RIG_POOL = {
  volumeM3: 150,
  /** Water surface, m² (a 20 × 6.25 m pool, 1.2 m deep, and its tank). */
  surfaceM2: 125,
  temperature: 28,
  flowM3h: 37.5,
  /** The sample's flow through the cabinet's cell, l/h. */
  sampleFlowLh: 30,
  /** A visit's length, h. */
  visitHours: 1,
  /** Bathers that make the surface fully rough. */
  busyBathers: 60,
  /** The hall's air's CO₂, ppm (as `water-treatment.ts`'s busy hall). */
  airCo2: 800,
} as const;

/** Each device's most, in its channel's unit (`CHANNELS`): l/h for the pumps, g/h for the CO₂ valve. */
export const RIG_DEVICE_MOST: Record<ChannelId, number> = {
  hypochlorite: 2,
  acid: 3,
  co2: 300,
};

export type DeviceMode = ChannelFeedback['mode'];

/** One ideal dosing device: a pump, or the CO₂ valve controller. */
export interface RigDevice {
  mode: DeviceMode;
  /** What it runs at in manual, in its channel's unit (clamped to its most). */
  manualRate: number;
  powered: boolean;
  /** An injected fault: it stops, and its error relay names it. */
  fault: string | null;
  /** Its control cable to the cabinet's port: unplugged, it hears no demand and reports nothing. */
  connected: boolean;
  /** What it is delivering now, in its unit. */
  delivering: number;
  most: number;
}

export type RigScenarioId =
  | 'good'
  | 'chlorine-low'
  | 'chlorine-high'
  | 'ph-high'
  | 'ph-low'
  | 'alkalinity-low'
  | 'combined-high'
  | 'hardness-low'
  | 'scaling'
  | 'tds-high'
  | 'busy';

export interface RigScenario {
  id: RigScenarioId;
  name: string;
  /** One line, for the dev room's picker. */
  description: string;
  water: WaterSpec;
  /** Combined chlorine to start with, mg/l as Cl₂: inorganic and organic. */
  chloramine?: number;
  organicChloramine?: number;
  bathers: number;
}

const T = RIG_POOL.temperature;
const GOOD: WaterSpec = {
  ph: 7.3,
  alkalinity: 120,
  hardness: 250,
  tds: 800,
  temperature: T,
  freeChlorine: 1.3,
  sulphate: 80,
};

export const RIG_SCENARIOS: Record<RigScenarioId, RigScenario> = {
  good: {
    id: 'good',
    name: 'Good water',
    description: 'Everything in its band, a light load of bathers.',
    water: GOOD,
    bathers: 10,
  },
  'chlorine-low': {
    id: 'chlorine-low',
    name: 'Chlorine low',
    description: 'Free chlorine down to 0.3 mg/l after a busy morning.',
    water: { ...GOOD, freeChlorine: 0.3 },
    bathers: 20,
  },
  'chlorine-high': {
    id: 'chlorine-high',
    name: 'Chlorine high',
    description: 'Free chlorine at 4 mg/l after a pump ran away overnight.',
    water: { ...GOOD, freeChlorine: 4 },
    bathers: 0,
  },
  'ph-high': {
    id: 'ph-high',
    name: 'pH high',
    description: 'pH at 7.9: chlorine weak and the water heading for scale.',
    water: { ...GOOD, ph: 7.9 },
    bathers: 10,
  },
  'ph-low': {
    id: 'ph-low',
    name: 'pH low',
    description: 'pH at 6.9 after too much acid: sore eyes, corroding plant.',
    water: { ...GOOD, ph: 6.9 },
    bathers: 10,
  },
  'alkalinity-low': {
    id: 'alkalinity-low',
    name: 'Alkalinity low',
    description: 'Alkalinity at 50 mg/l: the pH swings at every dose.',
    water: { ...GOOD, alkalinity: 50 },
    bathers: 10,
  },
  'combined-high': {
    id: 'combined-high',
    name: 'Combined chlorine high',
    description: 'Combined chlorine at 1.2 mg/l: the hall smells of chlorine.',
    water: { ...GOOD, freeChlorine: 1.0 },
    chloramine: 0.7,
    organicChloramine: 0.5,
    bathers: 20,
  },
  'hardness-low': {
    id: 'hardness-low',
    name: 'Hardness low (aggressive)',
    description: 'Soft, low-alkalinity water that eats grout and metal.',
    water: { ...GOOD, hardness: 40, alkalinity: 60, ph: 7.2 },
    bathers: 10,
  },
  scaling: {
    id: 'scaling',
    name: 'Scaling',
    description: 'Hard, alkaline water at high pH, laying scale in the heater.',
    water: { ...GOOD, hardness: 650, alkalinity: 220, ph: 7.7 },
    bathers: 10,
  },
  'tds-high': {
    id: 'tds-high',
    name: 'TDS high',
    description: 'Dissolved solids at 2,500 mg/l: the water wants diluting.',
    water: { ...GOOD, tds: 2500, sulphate: 300 },
    bathers: 10,
  },
  busy: {
    id: 'busy',
    name: 'A busy session',
    description:
      'Good water meeting a full pool of bathers: AUTO must keep up.',
    water: GOOD,
    bathers: 60,
  },
};

export const RIG_SCENARIO_IDS = Object.keys(RIG_SCENARIOS) as RigScenarioId[];

/** What the ideal sources have given, all told: they never run dry. */
export interface RigSourcesUsed {
  /** Litres of 14 % hypochlorite and of 10 % hydrochloric acid, grams of CO₂. */
  hypochlorite: number;
  acid: number;
  co2: number;
}

export interface Rig {
  scenario: RigScenarioId;
  /** World time, s. */
  time: number;
  water: PoolChemistry;
  temperature: number;
  bathers: number;
  pump: { running: boolean; flowM3h: number };
  /** The filter: isolated (out of service), the loop has no flow. */
  filter: { inService: boolean };
  /** The sample's flow, l/h, while the loop runs (0 cuts it, to test lost flow). */
  sampleFlowLh: number;
  devices: Record<ChannelId, RigDevice>;
  /** What the devices have delivered into the line since the last chemistry tick, in their units·h, and the seconds pending. */
  pending: { seconds: number } & Record<ChannelId, number>;
  /** Delivered with the water still: held in the injection line until it moves. */
  line: Record<ChannelId, number>;
  sources: RigSourcesUsed;
}

const zeroChannels = (): Record<ChannelId, number> => ({
  hypochlorite: 0,
  acid: 0,
  co2: 0,
});

const device = (id: ChannelId): RigDevice => ({
  mode: 'remote',
  manualRate: RIG_DEVICE_MOST[id] / 2,
  powered: true,
  fault: null,
  connected: true,
  delivering: 0,
  most: RIG_DEVICE_MOST[id],
});

/** A fresh rig on a scenario's water: everything connected, powered, in remote; the loop running. */
export function newRig(scenario: RigScenarioId = 'good'): Rig {
  const s = RIG_SCENARIOS[scenario];
  const water = {
    ...waterFrom(s.water),
    chloramine: s.chloramine ?? 0,
    organicChloramine: s.organicChloramine ?? 0,
  };
  return {
    scenario,
    time: 0,
    water,
    temperature: s.water.temperature,
    bathers: s.bathers,
    pump: { running: true, flowM3h: RIG_POOL.flowM3h },
    filter: { inService: true },
    sampleFlowLh: RIG_POOL.sampleFlowLh,
    devices: {
      hypochlorite: device('hypochlorite'),
      acid: device('acid'),
      co2: device('co2'),
    },
    pending: { seconds: 0, ...zeroChannels() },
    line: zeroChannels(),
    sources: { hypochlorite: 0, acid: 0, co2: 0 },
  };
}

/** The loop's flow now, m³/h: the pump running through a filter in service. */
export function rigFlow(rig: Rig): number {
  return rig.pump.running && rig.filter.inService
    ? Math.max(0, rig.pump.flowM3h)
    : 0;
}

/** What a device delivers, given the controller's demand (0 to 1) at its port. */
export function deviceDelivery(d: RigDevice, demand: number): number {
  if (!d.powered || d.fault) return 0;
  if (d.mode === 'off') return 0;
  if (d.mode === 'manual') return Math.max(0, Math.min(d.most, d.manualRate));
  if (!d.connected) return 0;
  return Math.max(0, Math.min(1, demand || 0)) * d.most;
}

/** A device's feedback at its port: null while unplugged. */
export function deviceFeedback(d: RigDevice): ChannelFeedback | null {
  if (!d.connected) return null;
  return {
    mode: d.mode,
    powered: d.powered,
    running: d.delivering > 0,
    fault: d.fault,
    delivering: d.delivering,
    most: d.most,
  };
}

/** Every port's feedback, as the cabinet's control ports see it. */
export function rigPorts(rig: Rig): ChannelPorts {
  return {
    hypochlorite: deviceFeedback(rig.devices.hypochlorite),
    acid: deviceFeedback(rig.devices.acid),
    co2: deviceFeedback(rig.devices.co2),
  };
}

/** The water at the cabinet's tapping: the pool's, its sample flowing only while the loop runs. */
export function rigSample(rig: Rig): SampleInput {
  return {
    water: rig.water,
    temperature: rig.temperature,
    flowLh: rigFlow(rig) > 0 ? Math.max(0, rig.sampleFlowLh) : 0,
  };
}

/** Grams of each additive in a channel's delivered amount (its unit·h). */
const additionsOf = (a: Record<ChannelId, number>): Additions => {
  const hypo = a.hypochlorite * CHANNELS.hypochlorite.gramsPerUnit;
  return {
    hypochlorite: hypo,
    chlorate: hypo * STRENGTH.chlorate,
    hcl: a.acid * CHANNELS.acid.gramsPerUnit,
    co2: a.co2 * CHANNELS.co2.gramsPerUnit,
  };
};

const MAINS_WATER = waterFrom(MAINS);

/** One chemistry tick of `dt` seconds over what is pending. */
function tick(rig: Rig, dt: number): Rig {
  const flow = rigFlow(rig);
  const delivered = {
    hypochlorite: rig.pending.hypochlorite,
    acid: rig.pending.acid,
    co2: rig.pending.co2,
  };
  let line = rig.line;
  let into = zeroChannels();
  if (flow > 0) {
    for (const id of CHANNEL_IDS) into[id] = delivered[id] + line[id];
    line = zeroChannels();
  } else {
    line = { ...line };
    for (const id of CHANNEL_IDS) line[id] += delivered[id];
    into = zeroChannels();
  }
  const water = stepChemistry(
    rig.water,
    {
      volume: RIG_POOL.volumeM3,
      temperature: rig.temperature,
      surface: RIG_POOL.surfaceM2,
      circulation: flow,
      added: additionsOf(into),
      bathers: rig.bathers,
      visitHours: RIG_POOL.visitHours,
      agitation: Math.min(1, rig.bathers / RIG_POOL.busyBathers),
      mains: MAINS_WATER,
      airCo2: RIG_POOL.airCo2,
    },
    dt,
  ).water;
  return {
    ...rig,
    water,
    line,
    pending: { seconds: 0, ...zeroChannels() },
  };
}

/**
 * The rig `dt` seconds on, with the controller's demand (0 to 1) at each
 * port: each device delivers (as its own selector says), the sources give,
 * and the chemistry steps on its 10 s tick over whatever has built up.
 */
export function stepRig(
  rig: Rig,
  demands: Partial<Record<ChannelId, number>>,
  dt: number,
): Rig {
  if (!(dt > 0)) return rig;
  const devices = { ...rig.devices };
  const sources = { ...rig.sources };
  for (const id of CHANNEL_IDS) {
    const d = devices[id];
    const delivering = deviceDelivery(d, demands[id] ?? 0);
    if (delivering !== d.delivering) devices[id] = { ...d, delivering };
  }
  let next: Rig = { ...rig, devices, sources, time: rig.time + dt };
  let left = dt;
  while (left > 0) {
    const room = RIG_TICK - next.pending.seconds;
    const step = Math.min(room, left);
    const pending = { ...next.pending, seconds: next.pending.seconds + step };
    for (const id of CHANNEL_IDS) {
      const amount = (devices[id].delivering * step) / 3600;
      pending[id] += amount;
      sources[id] += amount;
    }
    next = { ...next, pending };
    left -= step;
    if (pending.seconds >= RIG_TICK - 1e-9) next = tick(next, pending.seconds);
  }
  return next;
}

// ---- The setters ------------------------------------------------------------------

const withDevice = (
  rig: Rig,
  id: ChannelId,
  change: Partial<RigDevice>,
): Rig => ({
  ...rig,
  devices: { ...rig.devices, [id]: { ...rig.devices[id], ...change } },
});

/** A device's own selector: remote (the controller's demand), manual (its own rate) or off. */
export const setDeviceMode = (rig: Rig, id: ChannelId, mode: DeviceMode) =>
  withDevice(rig, id, { mode });

/** A device's manual rate, in its unit (clamped to 0 and its most). */
export const setManualRate = (rig: Rig, id: ChannelId, rate: number) =>
  withDevice(rig, id, {
    manualRate: Math.max(0, Math.min(rig.devices[id].most, rate)),
  });

export const setDevicePower = (rig: Rig, id: ChannelId, powered: boolean) =>
  withDevice(rig, id, { powered });

/** Inject a fault (it stops, its error relay names it), or clear it with null. */
export const setDeviceFault = (rig: Rig, id: ChannelId, fault: string | null) =>
  withDevice(rig, id, { fault });

/** Plug a device's control cable into its port on the cabinet, or pull it. */
export const setDeviceConnected = (
  rig: Rig,
  id: ChannelId,
  connected: boolean,
) => withDevice(rig, id, { connected });

export const setPumpRunning = (rig: Rig, running: boolean): Rig => ({
  ...rig,
  pump: { ...rig.pump, running },
});

/** The circulation's flow while running, m³/h. */
export const setCirculation = (rig: Rig, flowM3h: number): Rig => ({
  ...rig,
  pump: { ...rig.pump, flowM3h: Math.max(0, flowM3h) },
});

export const setFilterInService = (rig: Rig, inService: boolean): Rig => ({
  ...rig,
  filter: { inService },
});

/** The sample's flow, l/h (0 cuts it). */
export const setSampleFlow = (rig: Rig, flowLh: number): Rig => ({
  ...rig,
  sampleFlowLh: Math.max(0, flowLh),
});

export const setBathers = (rig: Rig, bathers: number): Rig => ({
  ...rig,
  bathers: Math.max(0, bathers),
});

export const setTemperature = (rig: Rig, temperature: number): Rig => ({
  ...rig,
  temperature,
});

/** Start the scenario again, keeping the devices' and the loop's settings. */
export function resetWater(rig: Rig, scenario: RigScenarioId): Rig {
  const fresh = newRig(scenario);
  return {
    ...rig,
    scenario,
    water: fresh.water,
    temperature: fresh.temperature,
    bathers: fresh.bathers,
    pending: fresh.pending,
    line: fresh.line,
  };
}
