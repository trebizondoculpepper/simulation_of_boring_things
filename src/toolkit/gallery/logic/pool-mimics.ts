import type {
  MimicSpec,
  MimicState,
  Point,
  Reading,
} from '../../components/industrial-control/logic/mimic';
import type { PlantReading } from './control-room-demo';

/**
 * The pool plant's mimic boards, as the control room has them: the main
 * pool's water circuit, the heating (LTHW) and the pool hall's air
 * handling. Each is a layout (`MimicSpec`, metres from the board's
 * middle, y up) and a function from the plant's reading to what its lamps
 * and readouts show in each display mode. Pure.
 */

/** BS 1710 colours, as the boards draw their pipes and ducts. */
const WATER = '#2f7d3a';
const HEATING = '#b9372d';
const GAS = '#d9a21b';
const AIR = '#5c88b8';
const EXTRACT = '#8a6e4f';

const pt = (x: number, y: number): Point => [x, y];
const r = (value: number, unit: string, name: string, places = 0): Reading => ({
  value,
  unit,
  name,
  places,
});

// ---- The main pool's water circuit --------------------------------------

export const MAIN_POOL_MIMIC: MimicSpec = {
  title: 'MAIN POOL — WATER CIRCUIT',
  width: 2.4,
  height: 1.2,
  lines: [
    {
      colour: WATER,
      points: [
        pt(-1.0, 0.36),
        pt(-0.82, 0.36),
        pt(-0.82, -0.2),
        pt(-0.62, -0.2),
      ],
    },
    {
      colour: WATER,
      points: [
        pt(-0.62, -0.2),
        pt(-0.14, -0.2),
        pt(-0.14, 0.18),
        pt(0.42, 0.18),
      ],
    },
    {
      colour: WATER,
      points: [
        pt(0.42, 0.18),
        pt(0.74, 0.18),
        pt(0.74, 0.36),
        pt(0.98, 0.36),
        pt(0.98, 0.42),
        pt(-1.0, 0.42),
        pt(-1.0, 0.36),
      ],
    },
    {
      colour: HEATING,
      points: [pt(0.6, 0.1), pt(0.6, -0.3), pt(1.05, -0.3)],
      width: 7,
    },
  ],
  shapes: [
    {
      symbol: 'pool',
      at: pt(-0.1, 0.42),
      size: 0.16,
      label: 'MAIN POOL 1800 m³',
    },
    { symbol: 'tank', at: pt(-0.82, -0.28), size: 0.14, label: 'BALANCE TANK' },
    { symbol: 'pump', at: pt(-0.5, -0.2), size: 0.08, label: 'P1' },
    { symbol: 'pump', at: pt(-0.32, -0.2), size: 0.08, label: 'P2' },
    ...[0, 1, 2, 3].map((i) => ({
      symbol: 'filter' as const,
      at: pt(-0.02 + i * 0.12, 0.18),
      size: 0.09,
      label: `F${i + 1}`,
    })),
    { symbol: 'uv', at: pt(0.56, 0.18), size: 0.06, label: 'UV' },
    { symbol: 'hx', at: pt(0.74, 0.18), size: 0.08, label: 'HX' },
    { symbol: 'valve', at: pt(0.88, 0.36), size: 0.05, label: 'DOSE' },
  ],
  labels: [{ text: 'FROM BOILERS', at: pt(0.92, -0.26) }],
  lamps: [
    { id: 'p1-run', at: pt(-0.53, -0.08), colour: 'green', label: 'RUN' },
    { id: 'p1-trip', at: pt(-0.47, -0.08), colour: 'red' },
    { id: 'p2-run', at: pt(-0.35, -0.08), colour: 'green', label: 'RUN' },
    { id: 'p2-trip', at: pt(-0.29, -0.08), colour: 'red' },
    ...[0, 1, 2, 3].map((i) => ({
      id: `f${i + 1}-dp`,
      at: pt(-0.02 + i * 0.12, 0.28),
      colour: 'amber' as const,
    })),
    { id: 'uv-on', at: pt(0.56, 0.27), colour: 'green', label: 'ON' },
    { id: 'dosing', at: pt(0.88, 0.28), colour: 'green' },
    { id: 'makeup', at: pt(-0.95, -0.14), colour: 'blue', label: 'MAKE-UP' },
    { id: 'level-low', at: pt(-0.69, -0.14), colour: 'red', label: 'LOW' },
  ],
  readouts: [
    { id: 'tank', at: pt(-0.82, -0.05) },
    { id: 'pumps', at: pt(-0.41, 0.06) },
    { id: 'filters', at: pt(0.16, -0.02) },
    { id: 'return', at: pt(0.62, 0.0) },
    { id: 'pool', at: pt(0.38, 0.32) },
  ],
  modes: [
    { id: 'flow', legend: 'FLOW' },
    { id: 'pressure', legend: 'PRESS' },
    { id: 'temperature', legend: 'TEMP' },
    { id: 'water', legend: 'WATER' },
  ],
};

export function mainPoolState(p: PlantReading): MimicState {
  const worst = Math.max(...p.filterDp);
  const discharge = 2.1 + 0.3 * (worst - 0.4);
  return {
    lamps: {
      'p1-run': p.pumps.p1,
      'p1-trip': false,
      'p2-run': p.pumps.p2,
      'p2-trip': false,
      ...Object.fromEntries(
        p.filterDp.map((dp, i) => [`f${i + 1}-dp`, dp > 0.7]),
      ),
      'uv-on': p.uvOn,
      dosing: p.dosing,
      makeup: p.alarms.includes('makeup-running'),
      'level-low': p.balance < 0.3,
    },
    readouts: {
      tank: {
        flow: r(
          p.alarms.includes('makeup-running') ? 4.2 : 0,
          'm3/h',
          'MAKE-UP',
          1,
        ),
        temperature: r(p.mainPool - 0.3, 'C', 'TANK', 1),
        water: r(p.balance * 100, '%', 'LEVEL'),
      },
      pumps: {
        flow: r(p.flow, 'm3/h', 'P1 OUT'),
        pressure: r(discharge, 'bar', 'P1 OUT', 2),
        temperature: r(p.mainPool - 0.2, 'C', 'SUCTION', 1),
      },
      filters: {
        flow: r(p.flow / 4, 'm3/h', 'EACH'),
        pressure: r(worst, 'bar', 'WORST DP', 2),
        water: r(p.chlorine + 0.05, 'mg/l', 'Cl IN', 2),
      },
      return: {
        flow: r(p.flow, 'm3/h', 'RETURN'),
        pressure: r(discharge - worst - 0.55, 'bar', 'RETURN', 2),
        temperature: r(p.mainPool + 1.4, 'C', 'AFTER HX', 1),
        water: r(p.ph, 'pH', 'pH', 2),
      },
      pool: {
        temperature: r(p.mainPool, 'C', 'POOL', 1),
        water: r(p.chlorine, 'mg/l', 'FREE Cl', 2),
      },
    },
  };
}

// ---- The heating (LTHW) ---------------------------------------------------

export const HEATING_MIMIC: MimicSpec = {
  title: 'HEATING — LTHW',
  width: 2.0,
  height: 1.1,
  lines: [
    {
      colour: GAS,
      points: [pt(-0.92, -0.38), pt(-0.62, -0.38), pt(-0.62, -0.2)],
      width: 7,
    },
    {
      colour: GAS,
      points: [pt(-0.62, -0.38), pt(-0.32, -0.38), pt(-0.32, -0.2)],
      width: 7,
    },
    {
      colour: HEATING,
      points: [pt(-0.62, 0.05), pt(-0.62, 0.22), pt(-0.1, 0.22)],
    },
    { colour: HEATING, points: [pt(-0.32, 0.05), pt(-0.32, 0.22)] },
    { colour: HEATING, points: [pt(0.0, 0.22), pt(0.85, 0.22)] },
    { colour: HEATING, points: [pt(0.35, 0.22), pt(0.35, -0.05)] },
    { colour: HEATING, points: [pt(0.7, 0.22), pt(0.7, -0.05)] },
  ],
  shapes: [
    { symbol: 'boiler', at: pt(-0.62, -0.06), size: 0.14, label: 'B1 300 kW' },
    { symbol: 'boiler', at: pt(-0.32, -0.06), size: 0.14, label: 'B2 300 kW' },
    { symbol: 'cylinder', at: pt(-0.05, 0.22), size: 0.12, label: 'HEADER' },
    { symbol: 'pump', at: pt(0.18, 0.22), size: 0.07, label: 'P5' },
    { symbol: 'hx', at: pt(0.35, -0.12), size: 0.1, label: 'POOL HX' },
    { symbol: 'cylinder', at: pt(0.7, -0.12), size: 0.14, label: 'CALORIFIER' },
    { symbol: 'valve', at: pt(-0.85, -0.38), size: 0.05, label: 'GAS ESV' },
  ],
  labels: [{ text: 'AHU COIL ▸', at: pt(0.9, 0.3) }],
  lamps: [
    { id: 'b1-fire', at: pt(-0.62, 0.11), colour: 'amber', label: 'FIRE' },
    { id: 'b1-lock', at: pt(-0.56, 0.11), colour: 'red' },
    { id: 'b2-fire', at: pt(-0.32, 0.11), colour: 'amber', label: 'FIRE' },
    { id: 'b2-lock', at: pt(-0.26, 0.11), colour: 'red' },
    { id: 'esv-open', at: pt(-0.85, -0.3), colour: 'green', label: 'OPEN' },
    { id: 'p5-run', at: pt(0.18, 0.31), colour: 'green', label: 'RUN' },
  ],
  readouts: [
    { id: 'flow', at: pt(0.15, 0.0) },
    { id: 'pool-hx', at: pt(0.35, -0.36) },
    { id: 'calorifier', at: pt(0.7, -0.38) },
    { id: 'system', at: pt(-0.1, -0.3) },
  ],
  modes: [
    { id: 'temperature', legend: 'TEMP' },
    { id: 'pressure', legend: 'PRESS' },
    { id: 'flow', legend: 'FLOW' },
  ],
};

export function heatingState(p: PlantReading): MimicState {
  const firing = p.boilersFiring;
  return {
    lamps: {
      'b1-fire': firing,
      'b1-lock': false,
      'b2-fire': firing && p.lthw > 79,
      'b2-lock': false,
      'esv-open': true,
      'p5-run': true,
    },
    readouts: {
      flow: {
        temperature: r(p.lthw, 'C', 'FLOW', 1),
        pressure: r(2.4, 'bar', 'SYSTEM', 1),
        flow: r(firing ? 6.8 : 5.9, 'l/s', 'PRIMARY', 1),
      },
      'pool-hx': {
        temperature: r(p.lthw - 11, 'C', 'HX RTN', 1),
        flow: r(2.1, 'l/s', 'POOL HX', 1),
      },
      calorifier: {
        temperature: r(61 + (p.t % 60) / 30, 'C', 'STORE', 1),
        flow: r(0.8, 'l/s', 'COIL', 1),
      },
      system: {
        temperature: r(p.lthw - 14, 'C', 'RETURN', 1),
        pressure: r(2.4 + 0.05 * Math.sin(p.t / 9), 'bar', 'COLD FILL', 2),
      },
    },
  };
}

// ---- The pool hall's air handling ---------------------------------------

export const AIR_MIMIC: MimicSpec = {
  title: 'POOL HALL — AIR HANDLING',
  width: 2.0,
  height: 1.1,
  lines: [
    {
      colour: AIR,
      points: [pt(-0.9, 0.16), pt(0.55, 0.16), pt(0.55, 0.38), pt(0.85, 0.38)],
      width: 14,
    },
    {
      colour: EXTRACT,
      points: [
        pt(0.85, -0.3),
        pt(0.55, -0.3),
        pt(0.55, -0.12),
        pt(-0.9, -0.12),
      ],
      width: 14,
    },
  ],
  shapes: [
    { symbol: 'damper', at: pt(-0.78, 0.16), size: 0.08, label: 'FRESH' },
    { symbol: 'filter', at: pt(-0.58, 0.16), size: 0.08, label: 'FILTER' },
    { symbol: 'hx', at: pt(-0.3, 0.02), size: 0.18, label: 'PLATE HX' },
    { symbol: 'heatpump', at: pt(0.0, 0.02), size: 0.1, label: 'HEAT PUMP' },
    { symbol: 'coil', at: pt(0.22, 0.16), size: 0.08, label: 'LTHW' },
    { symbol: 'fan', at: pt(0.4, 0.16), size: 0.09, label: 'SUPPLY' },
    { symbol: 'fan', at: pt(0.4, -0.12), size: 0.09, label: 'EXTRACT' },
    { symbol: 'damper', at: pt(-0.78, -0.12), size: 0.08, label: 'EXHAUST' },
    { symbol: 'pool', at: pt(0.85, 0.04), size: 0.13, label: 'POOL HALL' },
  ],
  lamps: [
    { id: 'supply-run', at: pt(0.4, 0.27), colour: 'green', label: 'RUN' },
    { id: 'extract-run', at: pt(0.4, -0.01), colour: 'green', label: 'RUN' },
    { id: 'hp-on', at: pt(0.0, 0.12), colour: 'green', label: 'ON' },
    {
      id: 'filter-dirty',
      at: pt(-0.58, 0.27),
      colour: 'amber',
      label: 'DIRTY',
    },
    { id: 'rh-high', at: pt(0.85, 0.24), colour: 'amber', label: 'RH HIGH' },
  ],
  readouts: [
    { id: 'outside', at: pt(-0.78, 0.36) },
    { id: 'supply', at: pt(0.2, 0.36) },
    { id: 'hall', at: pt(0.85, -0.12) },
    { id: 'extract', at: pt(-0.1, -0.34) },
  ],
  modes: [
    { id: 'temperature', legend: 'TEMP' },
    { id: 'humidity', legend: 'RH' },
    { id: 'fans', legend: 'FANS' },
  ],
};

export function airState(p: PlantReading): MimicState {
  const high = p.hallRh > 62;
  return {
    lamps: {
      'supply-run': true,
      'extract-run': true,
      'hp-on': p.hallRh > 55,
      'filter-dirty': false,
      'rh-high': high,
    },
    readouts: {
      outside: {
        temperature: r(9.5, 'C', 'OUTSIDE', 1),
        humidity: r(81, '%', 'OUTSIDE'),
      },
      supply: {
        temperature: r(p.hallAir + 2.5, 'C', 'SUPPLY', 1),
        humidity: r(p.hallRh - 18, '%', 'SUPPLY'),
        fans: r(high ? 85 : 70, '%', 'SUPPLY'),
      },
      hall: {
        temperature: r(p.hallAir, 'C', 'HALL', 1),
        humidity: r(p.hallRh, '%', 'HALL'),
      },
      extract: {
        temperature: r(p.hallAir + 0.6, 'C', 'EXTRACT', 1),
        humidity: r(p.hallRh + 2, '%', 'EXTRACT'),
        fans: r(high ? 88 : 72, '%', 'EXTRACT'),
      },
    },
  };
}

// ---- The boiler house gas -------------------------------------------------

export const GAS_MIMIC: MimicSpec = {
  title: 'BOILER HOUSE — NATURAL GAS',
  width: 1.8,
  height: 1.0,
  lines: [
    {
      colour: GAS,
      points: [
        pt(-0.82, -0.3),
        pt(-0.62, -0.3),
        pt(-0.62, 0.05),
        pt(0.3, 0.05),
      ],
      width: 10,
    },
    {
      colour: GAS,
      points: [pt(0.3, 0.05), pt(0.3, 0.25), pt(0.55, 0.25)],
      width: 8,
    },
    {
      colour: GAS,
      points: [pt(0.3, 0.05), pt(0.3, -0.15), pt(0.55, -0.15)],
      width: 8,
    },
  ],
  shapes: [
    { symbol: 'valve', at: pt(-0.72, -0.3), size: 0.06, label: 'ECV' },
    { symbol: 'tank', at: pt(-0.4, 0.05), size: 0.08, label: 'METER G25' },
    { symbol: 'valve', at: pt(0.0, 0.05), size: 0.07, label: 'SSOV-701' },
    { symbol: 'valve', at: pt(0.42, 0.25), size: 0.05, label: 'ISOL 1' },
    { symbol: 'valve', at: pt(0.42, -0.15), size: 0.05, label: 'ISOL 2' },
    { symbol: 'boiler', at: pt(0.68, 0.25), size: 0.11, label: 'B-501' },
    { symbol: 'boiler', at: pt(0.68, -0.15), size: 0.11, label: 'B-502' },
  ],
  labels: [{ text: 'FROM STREET MAIN', at: pt(-0.7, -0.4) }],
  lamps: [
    { id: 'ecv-open', at: pt(-0.72, -0.2), colour: 'green', label: 'OPEN' },
    { id: 'ssov-open', at: pt(-0.04, 0.16), colour: 'green', label: 'OPEN' },
    { id: 'ssov-shut', at: pt(0.04, 0.16), colour: 'red', label: 'SHUT' },
    { id: 'isol-1', at: pt(0.42, 0.33), colour: 'green' },
    { id: 'isol-2', at: pt(0.42, -0.07), colour: 'green' },
    { id: 'b1-fire', at: pt(0.82, 0.3), colour: 'amber', label: 'FIRE' },
    { id: 'b1-lock', at: pt(0.82, 0.2), colour: 'red', label: 'LOCK' },
    { id: 'b2-fire', at: pt(0.82, -0.1), colour: 'amber', label: 'FIRE' },
    { id: 'b2-lock', at: pt(0.82, -0.2), colour: 'red', label: 'LOCK' },
    {
      id: 'gas-detected',
      at: pt(-0.75, 0.3),
      colour: 'red',
      label: 'GAS DETECTED',
    },
    { id: 'stop', at: pt(-0.45, 0.3), colour: 'red', label: 'EMERGENCY STOP' },
  ],
  readouts: [
    { id: 'meter', at: pt(-0.4, -0.18) },
    { id: 'burners', at: pt(0.12, -0.25) },
  ],
  modes: [
    { id: 'pressure', legend: 'PRESS' },
    { id: 'flow', legend: 'FLOW' },
  ],
};

/** What the gas mimic shows, from the gas house and its boilers. */
export interface GasReading {
  ecvOpen: boolean;
  ssovOpen: boolean;
  stopPressed: boolean;
  gasDetected: boolean;
  isolators: readonly boolean[];
  boilers: readonly { firing: boolean; lockout: boolean; rate: number }[];
  /** m³/h through the meter, and mbar at the meter and after the SSOV. */
  flow: number;
  supply: number;
  burners: number;
}

export function gasState(g: GasReading): MimicState {
  return {
    lamps: {
      'ecv-open': g.ecvOpen,
      'ssov-open': g.ssovOpen,
      'ssov-shut': !g.ssovOpen,
      'isol-1': g.isolators[0] ?? false,
      'isol-2': g.isolators[1] ?? false,
      'b1-fire': g.boilers[0]?.firing ?? false,
      'b1-lock': g.boilers[0]?.lockout ?? false,
      'b2-fire': g.boilers[1]?.firing ?? false,
      'b2-lock': g.boilers[1]?.lockout ?? false,
      'gas-detected': g.gasDetected,
      stop: g.stopPressed,
    },
    readouts: {
      meter: {
        pressure: r(g.supply, 'mbar', 'INLET', 1),
        flow: r(g.flow, 'm3/h', 'METER', 1),
      },
      burners: {
        pressure: r(g.burners, 'mbar', 'AFTER SSOV', 1),
        flow: r(
          g.boilers.reduce((n, b) => n + (b.firing ? b.rate * 300 : 0), 0),
          'kW',
          'FIRING',
        ),
      },
    },
  };
}
