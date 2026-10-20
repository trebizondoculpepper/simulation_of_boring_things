import type { BlockKind, PortValues, Sleep } from '../sim/block-kind';
import { compose } from '../sim/composite';

/**
 * The main pool's ozone plant, as blocks, and the whole plant as one block
 * made of them (`sim/composite.ts`). Pure. Units: ozone g/h, water flow
 * m³/h, dissolved ozone mg/l (the same as g/m³), cooling water l/h and °C,
 * dew point °C, vacuum mbar (negative: below atmosphere), room ozone ppm,
 * power kW, time s.
 *
 * After PWTAG's Code of Practice (full-flow ozonation: at least two
 * minutes' contact at 1 g of ozone per m³ of flow, a deozonising carbon
 * filter after it, and the generator interlocked against the conditions
 * its list names) and German DIN 19643 practice, which UK designers
 * followed (at most 0.05 mg/l of ozone in the pool). The generator is
 * after ProMinent's Bono Zon BONa 2D, a vacuum (negative-pressure) corona
 * generator on ambient air with a heat-regenerated dryer: 160 g/h, about
 * 18 Wh per gram, 200 l/h of cooling water, which at 1 g/m³ is exactly the
 * game's 160 m³/h circulation. See `doc/research/ozone-plant.md`.
 *
 * Air is dried (wet air cuts the output, and makes nitric acid), ozonised
 * in the water-cooled discharge, and drawn by the booster pump's venturi
 * into a side stream that rejoins the main flow before the contact tank.
 * The undissolved gas leaves the tank's top through the off-gas
 * destructor. The carbon deozoniser destroys what ozone is left in the
 * water before it goes on toward the heat exchanger, the UV unit and the
 * chlorine dosing; as its carbon is used up it lets ozone through. The
 * room's ozone-in-air monitor stops the generator if gas escapes, and
 * after a leak the generator does not start again until the alarm and the
 * generator have both been reset (HSE EH38: not restarted until the leak
 * is found and put right).
 */

/** Ozone in air: mg/m³ per ppm (HSE EH40: 0.2 ppm is 0.4 mg/m³). */
export const OZONE_MG_PER_PPM = 2;
/** DIN 19643: the most ozone the pool water may carry, mg/l. */
export const POOL_OZONE_LIMIT = 0.05;

const clamp = (x: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, x));
const num = (v: PortValues[string], fallback = 0) =>
  typeof v === 'number' ? v : fallback;

// ---- The air dryer ----------------------------------------------------------

export interface DryerParams {
  /** The dew point it holds when well, °C, and the one its air reaches when not. */
  dry: number;
  wet: number;
  /** Above this dew point it reports itself failed, °C. */
  alarm: number;
  /** How fast it dries down and how fast it goes wet, s (time constants). */
  dryTime: number;
  wetTime: number;
  /** Air it passes, Nm³/h; its blower's and regeneration heater's power, kW. */
  air: number;
  blower: number;
  heater: number;
  /** Its dew point at the start, °C (it has been running). */
  start: number;
}

/**
 * A heat-regenerated twin-tower desiccant dryer, as on the Bono Zon: one
 * tower dries while the other is baked dry by its heater. A failed heater
 * (`fault`) leaves the towers wet, and the dew point creeps up.
 */
export const AIR_DRYER: BlockKind<DryerParams, { dewPoint: number }> = {
  kind: 'ozone-air-dryer',
  inputs: [
    { name: 'power' },
    { name: 'fault', about: 'regeneration heater failed' },
  ],
  outputs: [
    { name: 'dewPoint', unit: '°C' },
    { name: 'dry', about: 'dew point below its alarm' },
    { name: 'air', unit: 'Nm³/h' },
    { name: 'power', unit: 'kW' },
  ],
  params: {
    dry: -65,
    wet: 5,
    alarm: -50,
    dryTime: 900,
    wetTime: 1800,
    air: 8,
    blower: 0.3,
    heater: 1,
    start: -65,
  },
  init: (p) => ({ dewPoint: p.start }),
  step(p, s, i, dt) {
    const on = i.power === true;
    const well = on && i.fault !== true;
    const target = well ? p.dry : p.wet;
    const tau = target < s.dewPoint ? p.dryTime : p.wetTime;
    let dewPoint = target + (s.dewPoint - target) * Math.exp(-dt / tau);
    // Settled: snap to where it is going, and sleep until disturbed.
    const settled = Math.abs(dewPoint - target) < 0.05;
    if (settled) dewPoint = target;
    return {
      state: { dewPoint },
      outputs: {
        dewPoint,
        dry: dewPoint <= p.alarm,
        air: on ? p.air : 0,
        power: on ? p.blower + (i.fault === true ? 0 : p.heater) : 0,
      },
      sleep: settled
        ? { until: Infinity, hold: { power: 0, fault: 0 } }
        : undefined,
    };
  },
};

// ---- The booster pump and injector -------------------------------------------

export interface BoosterParams {
  /** The vacuum its venturi draws, mbar; its side stream, m³/h; its motor, kW. */
  vacuum: number;
  flow: number;
  power: number;
}

/**
 * The booster pump driving a side stream through the venturi injector,
 * whose throat draws the ozonised air out of the generator: on a vacuum
 * generator, no booster means no vacuum, and the generator trips on it.
 */
export const BOOSTER_INJECTOR: BlockKind<BoosterParams, null> = {
  kind: 'ozone-booster-injector',
  inputs: [{ name: 'supply' }, { name: 'run' }],
  outputs: [
    { name: 'running' },
    { name: 'vacuum', unit: 'mbar' },
    { name: 'flow', unit: 'm³/h' },
    { name: 'power', unit: 'kW' },
  ],
  params: { vacuum: -300, flow: 4, power: 1.5 },
  init: () => null,
  read(p, _s, i) {
    const running = i.supply === true && i.run === true;
    return {
      running,
      vacuum: running ? p.vacuum : 0,
      flow: running ? p.flow : 0,
      power: running ? p.power : 0,
    };
  },
  step(p, s, i) {
    return {
      state: s,
      outputs: BOOSTER_INJECTOR.read!(p, s, i, 0),
      sleep: { until: Infinity, hold: { supply: 0, run: 0 } },
    };
  },
};

// ---- The ozone generator -----------------------------------------------------

export interface GeneratorParams {
  /** Its rated output, g/h, and the energy each gram takes, Wh. */
  rated: number;
  energy: number;
  /** Its controls' and fans' own draw, kW. */
  overhead: number;
  /** Interlocks: the least circulation, m³/h; cooling water, l/h; the most cooling-water temperature, °C; the least vacuum, mbar. */
  minFlow: number;
  minCooling: number;
  maxCoolingTemp: number;
  minVacuum: number;
  /** Output falls by this fraction per kelvin of cooling water above `coolBase`, °C. */
  coolLoss: number;
  coolBase: number;
  /** Output falls from full at `dewFull` to nothing at `dewNone`, °C dew point. */
  dewFull: number;
  dewNone: number;
}

/** Why it is stopped, in the order its panel checks them, with the code its display shows. */
export const GENERATOR_FAULTS = {
  'no flow': 1,
  'cooling water': 2,
  dryer: 3,
  vacuum: 4,
  'door open': 5,
  'ozone in room': 6,
} as const;
export type GeneratorFault = keyof typeof GENERATOR_FAULTS;

export interface GeneratorState {
  /** The fault it has latched, until reset with its cause gone. */
  trip: GeneratorFault | null;
}

/** What stops it now, if anything (not counting what it has latched). */
function generatorCause(
  p: GeneratorParams,
  i: PortValues,
): GeneratorFault | null {
  if (num(i.coolingFlow) < p.minCooling) return 'cooling water';
  if (num(i.coolingTemp) > p.maxCoolingTemp) return 'cooling water';
  if (i.dry !== true) return 'dryer';
  if (num(i.vacuum) > p.minVacuum) return 'vacuum';
  if (i.door === true) return 'door open';
  if (i.roomAlarm === true) return 'ozone in room';
  return null;
}

/** Its state and outputs, from its state and its inputs now. */
function generatorNow(
  p: GeneratorParams,
  s: GeneratorState,
  i: PortValues,
): { state: GeneratorState; outputs: PortValues } {
  const power = i.power === true;
  const asked = power && i.enable === true;
  let trip = s.trip;
  if (asked) {
    const cause = generatorCause(p, i);
    if (trip && i.reset === true && cause === null) trip = null;
    if (!trip && cause) trip = cause;
  }
  // No flow is an interlock, not a fault: it holds the generator off and
  // lets it go again by itself when the flow returns.
  const blocked = asked && !trip && num(i.circulation) < p.minFlow;
  const running = asked && !trip && !blocked;
  const setpoint = clamp(num(i.setpoint), 0, 100) / 100;
  const dewFactor = clamp(
    1 - (num(i.dewPoint) - p.dewFull) / (p.dewNone - p.dewFull),
    0,
    1,
  );
  const coolFactor = clamp(
    1 - p.coolLoss * Math.max(0, num(i.coolingTemp) - p.coolBase),
    0,
    1,
  );
  const produced = running ? p.rated * setpoint * dewFactor * coolFactor : 0;
  // Gas escaping from a leaking joint, while there is gas to escape.
  const escape = Math.min(Math.max(0, num(i.leak)), produced);
  const fault: GeneratorFault | null = trip ?? (blocked ? 'no flow' : null);
  return {
    state: { trip },
    outputs: {
      ozone: produced - escape,
      escape,
      // The discharge's power is set by the setpoint, whatever the air
      // makes of it: wet air wastes it.
      power: power
        ? p.overhead + (running ? (p.rated * setpoint * p.energy) / 1000 : 0)
        : 0,
      running,
      tripped: trip !== null,
      alarm: fault !== null,
      code: fault ? GENERATOR_FAULTS[fault] : 0,
      status: !power
        ? 'off'
        : trip
          ? `tripped: ${trip}`
          : blocked
            ? 'blocked: no flow'
            : running
              ? 'running'
              : 'standby',
      lampPower: power,
      lampOzone: produced > 0,
      lampAlarm: fault !== null,
    },
  };
}

/**
 * The corona-discharge generator, after the Bono Zon BONa 2D: dried air
 * through water-cooled discharge gaps at about 12 kV. Its output is its
 * setpoint's share of its rating, less for wet air and for warm cooling
 * water. It trips, and latches until reset, on each condition of PWTAG's
 * list it can see; no circulation only holds it off.
 */
export const OZONE_GENERATOR: BlockKind<GeneratorParams, GeneratorState> = {
  kind: 'ozone-generator',
  inputs: [
    { name: 'power' },
    { name: 'enable', about: 'its run command' },
    { name: 'setpoint', unit: '%' },
    { name: 'circulation', unit: 'm³/h', about: 'the flow being treated' },
    { name: 'dewPoint', unit: '°C' },
    { name: 'dry', about: 'the dryer well' },
    { name: 'coolingFlow', unit: 'l/h' },
    { name: 'coolingTemp', unit: '°C' },
    { name: 'vacuum', unit: 'mbar' },
    { name: 'door', about: 'cabinet door open' },
    { name: 'roomAlarm', about: 'the room monitor’s stop relay' },
    { name: 'leak', unit: 'g/h', about: 'gas a leaking joint would let out' },
    { name: 'reset' },
  ],
  outputs: [
    { name: 'ozone', unit: 'g/h', about: 'delivered to the injector' },
    { name: 'escape', unit: 'g/h', about: 'leaking into the room' },
    { name: 'power', unit: 'kW' },
    { name: 'running' },
    { name: 'tripped' },
    { name: 'alarm' },
    { name: 'code', about: 'fault code on its display, 0 for none' },
    { name: 'status' },
    { name: 'lampPower' },
    { name: 'lampOzone' },
    { name: 'lampAlarm' },
  ],
  params: {
    rated: 160,
    energy: 18,
    overhead: 0.3,
    minFlow: 50,
    minCooling: 100,
    maxCoolingTemp: 30,
    minVacuum: -100,
    coolLoss: 0.015,
    coolBase: 20,
    dewFull: -60,
    dewNone: -20,
  },
  init: () => ({ trip: null }),
  read: (p, s, i) => generatorNow(p, s, i).outputs,
  step(p, s, i) {
    const { state, outputs } = generatorNow(p, s, i);
    // Its outputs follow its dew point, cooling water and leak (`read`);
    // asleep, only a switch, a setpoint or a reading crossing an
    // interlock's threshold needs it stepped.
    const hold = {
      power: 0,
      enable: 0,
      setpoint: 0,
      dry: 0,
      door: 0,
      roomAlarm: 0,
      reset: 0,
    };
    const blocked = outputs.status === 'blocked: no flow';
    const sleep: Sleep = {
      until: Infinity,
      hold,
      within:
        outputs.running === true
          ? {
              circulation: [p.minFlow, Infinity],
              coolingFlow: [p.minCooling, Infinity],
              coolingTemp: [-Infinity, p.maxCoolingTemp],
              vacuum: [-Infinity, p.minVacuum],
            }
          : blocked
            ? { circulation: [-Infinity, p.minFlow - 1e-9] }
            : {},
    };
    return { state, outputs, sleep };
  },
};

// ---- The contact tank --------------------------------------------------------

export interface ContactParams {
  /** Its volume, m³: at 160 m³/h, 8 m³ gives three minutes' contact. */
  volume: number;
  /** The share of the ozone injected that dissolves; the rest leaves as off-gas. */
  transfer: number;
  /** Dissolved ozone's half-life in the water, s (its decay and the pollution it burns). */
  halfLife: number;
}

/**
 * The contact tank, as plug flow: the water spends `volume / flow` in it,
 * its dissolved ozone decaying meanwhile; what does not dissolve rises to
 * the top and leaves as off-gas.
 */
export const CONTACT_TANK: BlockKind<ContactParams, null> = {
  kind: 'ozone-contact-tank',
  inputs: [
    { name: 'flow', unit: 'm³/h' },
    { name: 'dose', unit: 'g/h' },
  ],
  outputs: [
    { name: 'applied', unit: 'mg/l', about: 'the dose per volume treated' },
    { name: 'residual', unit: 'mg/l', about: 'leaving the tank' },
    { name: 'contact', unit: 's' },
    { name: 'offGas', unit: 'g/h' },
  ],
  params: { volume: 8, transfer: 0.9, halfLife: 600 },
  init: () => null,
  read(p, _s, i) {
    const flow = Math.max(0, num(i.flow));
    const dose = Math.max(0, num(i.dose));
    const contact = flow > 0 ? (p.volume / flow) * 3600 : Infinity;
    const applied = flow > 0 ? dose / flow : 0;
    return {
      applied,
      residual: applied * p.transfer * Math.pow(0.5, contact / p.halfLife),
      contact,
      offGas: dose * (1 - p.transfer),
    };
  },
  step(p, s, i) {
    return {
      state: s,
      outputs: CONTACT_TANK.read!(p, s, i, 0),
      sleep: { until: Infinity, hold: {} },
    };
  },
};

// ---- The deozoniser ----------------------------------------------------------

export interface DeozoniserParams {
  /** The ozone its carbon can destroy before it is spent, g. */
  capacity: number;
  /** The share of ozone fresh carbon lets through. */
  fresh: number;
}

export interface DeozoniserState {
  /** How much of its carbon is used, 0 to 1, as of `at`. */
  used: number;
  at: number;
}

/** The share of the ozone arriving that carbon this far used lets through. */
const passing = (p: DeozoniserParams, used: number) =>
  p.fresh + (1 - p.fresh) * Math.pow(clamp(used, 0, 1), 3);

/** The ozone it destroys each second, as a share of its capacity. */
function usingRate(p: DeozoniserParams, used: number, i: PortValues) {
  const load =
    Math.max(0, num(i.residualIn)) *
    Math.max(0, num(i.flow)) *
    (1 - passing(p, used));
  return load / 3600 / p.capacity;
}

function deozoniserOutputs(p: DeozoniserParams, used: number, i: PortValues) {
  const pass = passing(p, used);
  return {
    residual: Math.max(0, num(i.residualIn)) * pass,
    carbon: 100 * (1 - used),
    exhausted: pass >= POOL_OZONE_LIMIT,
  };
}

/** How far its residual may drift asleep, mg/l. */
const DEOZONISER_DRIFT = 0.002;

/**
 * The activated-carbon deozoniser: its carbon destroys the dissolved ozone
 * and is slowly consumed doing it, so a spent bed lets ozone through
 * toward the pool. `exhausted` is its breakthrough: a twentieth of what
 * arrives getting through.
 */
export const DEOZONISER: BlockKind<DeozoniserParams, DeozoniserState> = {
  kind: 'ozone-deozoniser',
  inputs: [
    { name: 'flow', unit: 'm³/h' },
    { name: 'residualIn', unit: 'mg/l' },
  ],
  outputs: [
    { name: 'residual', unit: 'mg/l' },
    { name: 'carbon', unit: '%', about: 'carbon left' },
    { name: 'exhausted' },
  ],
  // Its carbon's life in a pool is not known (`doc/research`); this gives
  // years at the plant's usual load.
  params: { capacity: 2_000_000, fresh: 0.001 },
  init: () => ({ used: 0, at: 0 }),
  // Its carbon now, carried on from when it last stepped.
  read(p, s, i, t) {
    const used = Math.min(1, s.used + usingRate(p, s.used, i) * (t - s.at));
    return deozoniserOutputs(p, used, i);
  },
  step(p, s, i, dt, t) {
    const rate = usingRate(p, s.used, i);
    const used = Math.min(1, s.used + rate * dt);
    // Asleep while its residual would drift less than DEOZONISER_DRIFT.
    const residualIn = Math.max(0, num(i.residualIn));
    const drifting =
      residualIn * (1 - p.fresh) * 3 * used * used * (used < 1 ? rate : 0);
    const horizon = drifting > 0 ? DEOZONISER_DRIFT / drifting : Infinity;
    return {
      state: { used, at: t },
      outputs: deozoniserOutputs(p, used, i),
      sleep:
        horizon >= 10
          ? {
              until: t + Math.min(horizon, 3600),
              hold: {
                residualIn: 0.02,
                flow: 0.05 * Math.max(num(i.flow), 1),
              },
            }
          : undefined,
    };
  },
};

// ---- The off-gas destructor --------------------------------------------------

export interface DestructorParams {
  /** The share of off-gas it lets through failed or unpowered. */
  slip: number;
  power: number;
}

/**
 * The off-gas destructor (heated catalyst) on the contact tank's vent:
 * well and powered it destroys the off-gas; failed, some gets through to
 * the room.
 */
export const OFF_GAS_DESTRUCTOR: BlockKind<DestructorParams, null> = {
  kind: 'ozone-off-gas-destructor',
  inputs: [
    { name: 'offGas', unit: 'g/h' },
    { name: 'power' },
    { name: 'fault' },
  ],
  outputs: [
    { name: 'slip', unit: 'g/h' },
    { name: 'power', unit: 'kW' },
  ],
  params: { slip: 0.5, power: 0.5 },
  init: () => null,
  read(p, _s, i) {
    const working = i.power === true && i.fault !== true;
    return {
      slip: working ? 0 : Math.max(0, num(i.offGas)) * p.slip,
      power: i.power === true ? p.power : 0,
    };
  },
  step(p, s, i) {
    return {
      state: s,
      outputs: OFF_GAS_DESTRUCTOR.read!(p, s, i, 0),
      sleep: { until: Infinity, hold: { power: 0, fault: 0 } },
    };
  },
};

// ---- The room and its ozone-in-air monitor -----------------------------------

export interface MonitorParams {
  /** The room's volume, m³, and its ventilation, air changes an hour. */
  volume: number;
  changes: number;
  /**
   * Its warning and its stop, ppm: no UK pool source gives them; 0.1 ppm
   * and 0.2 ppm (the UK's 15-minute limit) are inferred
   * (`doc/research/ozone-plant.md`).
   */
  warning: number;
  shutdown: number;
}

export interface MonitorState {
  /** Ozone in the room's air, mg/m³. */
  conc: number;
  /** Its stop relay, latched until reset. */
  alarm: boolean;
}

/**
 * The ozone room and the electrochemical ozone-in-air monitor on its wall
 * (mounted low: ozone is heavier than air). Gas escaping into the room
 * builds up against its ventilation; the monitor warns, then latches its
 * alarm and stops the generator, and resets only once the air is clear
 * again.
 */
export const OZONE_MONITOR: BlockKind<MonitorParams, MonitorState> = {
  kind: 'ozone-in-air-monitor',
  inputs: [
    { name: 'leak', unit: 'g/h' },
    { name: 'slip', unit: 'g/h' },
    { name: 'reset' },
  ],
  outputs: [
    { name: 'ppm', unit: 'ppm' },
    { name: 'warning' },
    { name: 'alarm' },
  ],
  params: { volume: 60, changes: 6, warning: 0.1, shutdown: 0.2 },
  init: () => ({ conc: 0, alarm: false }),
  step(p, s, i, dt) {
    const inflow = 1000 * (Math.max(0, num(i.leak)) + Math.max(0, num(i.slip))); // mg/h
    const settle = inflow / (p.volume * p.changes);
    let conc = settle + (s.conc - settle) * Math.exp((-p.changes * dt) / 3600);
    const settled = Math.abs(conc - settle) < 1e-3;
    if (settled) conc = settle;
    const ppm = conc / OZONE_MG_PER_PPM;
    let alarm = s.alarm || ppm >= p.shutdown;
    if (alarm && i.reset === true && ppm < p.warning) alarm = false;
    return {
      state: { conc, alarm },
      outputs: { ppm, warning: ppm >= p.warning, alarm },
      sleep: settled
        ? { until: Infinity, hold: { leak: 0, slip: 0, reset: 0 } }
        : undefined,
    };
  },
};

/** Powers added, kW. */
export const POWER_TOTAL: BlockKind<object, null> = {
  kind: 'power-total',
  inputs: ['a', 'b', 'c', 'd'].map((name) => ({ name, unit: 'kW' })),
  outputs: [{ name: 'total', unit: 'kW' }],
  params: {},
  init: () => null,
  read: (_p, _s, i) => ({
    total: ['a', 'b', 'c', 'd'].reduce((n, k) => n + num(i[k]), 0),
  }),
  step(p, s, i) {
    return {
      state: s,
      outputs: POWER_TOTAL.read!(p, s, i, 0),
      sleep: { until: Infinity, hold: {} },
    };
  },
};

// ---- The ozone plant, as one block -------------------------------------------

export interface OzonePlantOptions {
  /** The deozoniser's carbon, g of ozone (small, to see it exhausted in a test). */
  carbonCapacity?: number;
}

/**
 * The whole ozone plant as one block. In: the circulation's flow, the
 * plant's power and run command, the generator's cooling water and
 * setpoint, the faults the game can inject (dryer heater failed, cabinet
 * door open, a leaking joint, destructor failed) and the reset. Out: the
 * dose, the residual after the contact tank and after the deozoniser, the
 * room's ozone, the generator's panel (status, fault code, lamps) and the
 * power it all draws.
 *
 * The monitor is stepped before the generator, so one press of reset
 * clears both once the air is clear.
 */
export function ozonePlant(options: OzonePlantOptions = {}) {
  return compose({
    kind: 'ozone-plant',
    blocks: {
      dryer: { kind: AIR_DRYER },
      booster: { kind: BOOSTER_INJECTOR },
      monitor: { kind: OZONE_MONITOR },
      generator: { kind: OZONE_GENERATOR },
      contact: { kind: CONTACT_TANK },
      deozoniser: {
        kind: DEOZONISER,
        params:
          options.carbonCapacity === undefined
            ? {}
            : { capacity: options.carbonCapacity },
      },
      destructor: { kind: OFF_GAS_DESTRUCTOR },
      total: { kind: POWER_TOTAL },
    },
    wires: {
      'generator.dewPoint': 'dryer.dewPoint',
      'generator.dry': 'dryer.dry',
      'generator.vacuum': 'booster.vacuum',
      'generator.roomAlarm': 'monitor.alarm',
      'contact.dose': 'generator.ozone',
      'deozoniser.residualIn': 'contact.residual',
      'destructor.offGas': 'contact.offGas',
      'monitor.leak': 'generator.escape',
      'monitor.slip': 'destructor.slip',
      'total.a': 'dryer.power',
      'total.b': 'booster.power',
      'total.c': 'generator.power',
      'total.d': 'destructor.power',
    },
    inputs: {
      flow: ['generator.circulation', 'contact.flow', 'deozoniser.flow'],
      power: [
        'dryer.power',
        'booster.supply',
        'generator.power',
        'destructor.power',
      ],
      run: ['booster.run', 'generator.enable'],
      setpoint: ['generator.setpoint'],
      coolingFlow: ['generator.coolingFlow'],
      coolingTemp: ['generator.coolingTemp'],
      dryerFault: ['dryer.fault'],
      door: ['generator.door'],
      leak: ['generator.leak'],
      destructorFault: ['destructor.fault'],
      reset: ['generator.reset', 'monitor.reset'],
    },
    outputs: {
      dose: 'generator.ozone',
      applied: 'contact.applied',
      contact: 'contact.contact',
      residual: 'contact.residual',
      residualOut: 'deozoniser.residual',
      carbon: 'deozoniser.carbon',
      exhausted: 'deozoniser.exhausted',
      dewPoint: 'dryer.dewPoint',
      air: 'dryer.air',
      vacuum: 'booster.vacuum',
      roomOzone: 'monitor.ppm',
      roomWarning: 'monitor.warning',
      roomAlarm: 'monitor.alarm',
      status: 'generator.status',
      code: 'generator.code',
      running: 'generator.running',
      tripped: 'generator.tripped',
      alarm: 'generator.alarm',
      lampPower: 'generator.lampPower',
      lampOzone: 'generator.lampOzone',
      lampAlarm: 'generator.lampAlarm',
      power: 'total.total',
    },
  });
}

export const OZONE_PLANT = ozonePlant();
