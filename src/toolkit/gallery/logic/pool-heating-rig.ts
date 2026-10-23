import {
  shellTubePorts,
  ON_PLINTH,
} from '../../components/plant/logic/shell-tube-exchanger';
import { SOURCE_SHAPE } from '../../../game/plant/experimental-source';
import type { Vec3 } from '../../components/core/logic/pipe-route';
import type { PlantRoomLayout } from './plant-room-layout';

/**
 * Heat exchange (Dev27; scenario 4, `doc/prompts/027-scenario-heat-exchange.md`):
 * one gas condensing boiler (Hamwarmy, after the Remeha Gas 220 Ace) on
 * unlimited gas and power, its primary circuit through a twin-head
 * circulator to a three-way valve over the shell-and-tube heat exchanger
 * on its plinth, the valve's bypass joining the return; pool water from
 * an experimental source through the exchanger to a sink; five digital
 * thermometers, two flowmeters, and a Penfold mimic board showing it all.
 * The runs are laid by hand: each machine's connections are where its
 * model has them. Pure; metres, the room's frame.
 */

export type HeatingItem =
  | 'boiler'
  | 'gas'
  | 'power'
  | 'pool-source'
  | 'pool-sink'
  | 'exchanger';
export const HEATING_ITEMS: readonly HeatingItem[] = [
  'boiler',
  'gas',
  'power',
  'pool-source',
  'pool-sink',
  'exchanger',
];

const PLACES: Record<HeatingItem, { x: number; z: number; yaw: number }> = {
  boiler: { x: -3.6, z: -3.7, yaw: 0 },
  gas: { x: -5.2, z: -3.0, yaw: 0 },
  power: { x: -5.2, z: -1.6, yaw: 0 },
  'pool-source': { x: -1.6, z: -1.2, yaw: 0 },
  'pool-sink': { x: 2.6, z: -1.2, yaw: 0 },
  exchanger: { x: 0.5, z: -1.2, yaw: 0 },
};

/** The boiler's cabinet (800 × 657 × 1662 mm). */
export const BOILER = { w: 0.8, d: 0.657, h: 1.662 } as const;

export const HEATING_SIZE: Record<
  HeatingItem,
  { w: number; d: number; h: number }
> = {
  boiler: BOILER,
  gas: { w: 0.7, d: 0.7, h: SOURCE_SHAPE.height + 0.1 },
  power: { w: 0.7, d: 0.7, h: SOURCE_SHAPE.height + 0.1 },
  'pool-source': { w: 0.7, d: 0.7, h: SOURCE_SHAPE.height + 0.1 },
  'pool-sink': { w: 0.7, d: 0.7, h: SOURCE_SHAPE.height + 0.1 },
  exchanger: ON_PLINTH.size,
};

export function layoutPoolHeating(): PlantRoomLayout {
  const places = HEATING_ITEMS.map((item) => ({ ...PLACES[item], y: 0 }));
  return {
    halfX: 6,
    halfZ: 4.5,
    height: 4,
    places,
    solids: HEATING_ITEMS.map((item) => ({
      minX: PLACES[item].x - HEATING_SIZE[item].w / 2,
      maxX: PLACES[item].x + HEATING_SIZE[item].w / 2,
      minZ: PLACES[item].z - HEATING_SIZE[item].d / 2,
      maxZ: PLACES[item].z + HEATING_SIZE[item].d / 2,
    })),
  };
}

const round = (v: number) => Math.round(v * 1e4) / 1e4;
const at = (item: HeatingItem, p: readonly number[]): Vec3 => [
  round(PLACES[item].x + p[0]),
  round(p[1]),
  round(PLACES[item].z + p[2]),
];

/** The boiler's connections, from its model (as Dev19 has them): flow and return, gas and flue on top, power at its side. */
export const boilerPorts = () => ({
  flow: at('boiler', [-0.27, 1.78, -0.21]),
  return: at('boiler', [0.27, 1.78, -0.21]),
  gas: at('boiler', [0.2, 1.76, -0.05]),
  flue: at('boiler', [0, 1.8, -0.13]),
  power: at('boiler', [BOILER.w / 2, 1.05, 0]),
});

export const exchangerPorts = () => {
  const p = shellTubePorts(ON_PLINTH.axis);
  return {
    poolIn: at('exchanger', p['pool-in'].at),
    poolOut: at('exchanger', p['pool-out'].at),
    primaryIn: at('exchanger', p['primary-in'].at),
    primaryOut: at('exchanger', p['primary-out'].at),
  };
};

const stud = (item: HeatingItem): Vec3 =>
  at(item, [0, SOURCE_SHAPE.height + SOURCE_SHAPE.stud, 0]);

/** The circulator's run (its pipe along x at 0.75 m, 1.5 m long, centred here). */
export const CIRCULATOR = { x: -1.8, z: -2.6, y: 0.75, half: 0.75 } as const;
/** The three-way valve, over the exchanger's primary inlet; the bypass tee over its outlet. */
export const VALVE_Y = 1.7;
const HIGH_FLOW = 2.4;
const HIGH_RETURN = 2.2;

export function heatingRuns() {
  const b = boilerPorts();
  const x = exchangerPorts();
  const c = CIRCULATOR;
  const pumpIn: Vec3 = [c.x - c.half, c.y, c.z];
  const pumpOut: Vec3 = [c.x + c.half, c.y, c.z];
  const valve: Vec3 = [x.primaryIn[0], VALVE_Y, x.primaryIn[2]];
  const tee: Vec3 = [x.primaryOut[0], VALVE_Y, x.primaryOut[2]];
  const gas = stud('gas');
  const power = stud('power');
  const poolSrc = stud('pool-source');
  const poolSnk = stud('pool-sink');
  return {
    // The primary flow: up off the boiler, along, down to the circulator.
    flowToPump: [
      b.flow,
      [b.flow[0], HIGH_FLOW, b.flow[2]],
      [pumpIn[0], HIGH_FLOW, b.flow[2]],
      [pumpIn[0], HIGH_FLOW, c.z],
      pumpIn,
    ],
    // From the circulator up, along, over the exchanger, down to the three-way valve.
    flowToValve: [
      pumpOut,
      [pumpOut[0], HIGH_FLOW, c.z],
      [valve[0], HIGH_FLOW, c.z],
      [valve[0], HIGH_FLOW, valve[2]],
      valve,
    ],
    // The valve's way through: down to the exchanger's primary inlet.
    valveToExchanger: [valve, x.primaryIn],
    // Its bypass: across to the tee on the return.
    bypass: [valve, tee],
    // The return: up from the exchanger's primary outlet, through the tee, back to the boiler.
    exchangerToTee: [x.primaryOut, tee],
    returnToBoiler: [
      tee,
      [tee[0], HIGH_RETURN, tee[2]],
      [tee[0], HIGH_RETURN, -3.3],
      [b.return[0], HIGH_RETURN, -3.3],
      [b.return[0], HIGH_RETURN, b.return[2]],
      b.return,
    ],
    // The pool water: up off its source, along, down, into the exchanger's end; out of its other end, up and along to its sink.
    poolIn: [
      poolSrc,
      [poolSrc[0], 1.4, poolSrc[2]],
      [x.poolIn[0] - 0.55, 1.4, x.poolIn[2]],
      [x.poolIn[0] - 0.55, x.poolIn[1], x.poolIn[2]],
      x.poolIn,
    ],
    poolOut: [
      x.poolOut,
      [x.poolOut[0] + 0.95, x.poolOut[1], x.poolOut[2]],
      [x.poolOut[0] + 0.95, 1.4, x.poolOut[2]],
      [poolSnk[0], 1.4, poolSnk[2]],
      poolSnk,
    ],
    // Gas: up off its source, along, down onto the boiler's gas connection.
    gas: [
      gas,
      [gas[0], 2.2, gas[2]],
      [b.gas[0], 2.2, gas[2]],
      [b.gas[0], 2.2, b.gas[2]],
      b.gas,
    ],
    // Power: up off its source, along, into the boiler's side.
    power: [
      power,
      [power[0], 1.6, power[2]],
      [b.power[0] + 0.3, 1.6, power[2]],
      [b.power[0] + 0.3, 1.6, b.power[2]],
      [b.power[0] + 0.3, b.power[1], b.power[2]],
      b.power,
    ],
    // The flue: straight up to the roof (its terminal, `MAGIC_TERMINALS`).
    flue: [b.flue, [b.flue[0], 4, b.flue[2]]],
  } satisfies Record<string, Vec3[]>;
}

/** Each instrument's place: on its pipe, and which way that pipe runs there. */
export function instrumentSpots() {
  const x = exchangerPorts();
  const c = CIRCULATOR;
  return {
    tt1: { at: [c.x + c.half, 1.6, c.z] as Vec3, along: [0, 1, 0] as Vec3 },
    tt2: {
      at: [x.primaryOut[0], 1.3, x.primaryOut[2]] as Vec3,
      along: [0, 1, 0] as Vec3,
    },
    tt3: { at: [-1.5, HIGH_RETURN, -3.3] as Vec3, along: [1, 0, 0] as Vec3 },
    tt4: {
      at: [x.poolIn[0] - 0.3, x.poolIn[1], x.poolIn[2]] as Vec3,
      along: [1, 0, 0] as Vec3,
    },
    tt5: {
      at: [x.poolOut[0] + 0.3, x.poolOut[1], x.poolOut[2]] as Vec3,
      along: [1, 0, 0] as Vec3,
    },
    ft1: { at: [-0.3, HIGH_FLOW, c.z] as Vec3, along: [1, 0, 0] as Vec3 },
    ft2: {
      at: [x.poolOut[0] + 0.7, x.poolOut[1], x.poolOut[2]] as Vec3,
      along: [1, 0, 0] as Vec3,
    },
    gasValve: {
      at: [PLACES.gas.x, 1.5, PLACES.gas.z] as Vec3,
      along: [0, 1, 0] as Vec3,
    },
    powerIsolator: {
      at: [PLACES.power.x, 1.45, PLACES.power.z] as Vec3,
      along: [0, 1, 0] as Vec3,
    },
    valve: {
      at: [x.primaryIn[0], VALVE_Y, x.primaryIn[2]] as Vec3,
      along: [0, 1, 0] as Vec3,
    },
  };
}

export const HEATING_PIPES = {
  primary: { od: 0.048, colour: '#3d7f45' },
  pool: { od: 0.076, colour: '#3d7f45' },
  gas: { od: 0.034, colour: '#c49a3c' },
  power: { od: 0.025, colour: '#e07a22' },
  flue: { od: 0.2 },
} as const;
