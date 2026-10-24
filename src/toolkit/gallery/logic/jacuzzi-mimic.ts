import type { MimicSpec } from '../../components/industrial-control/logic/mimic';
import { jacuzziCabinetPanel } from '../../../game/world';
import type { World } from '../../../game/world';

/** The jacuzzi plant room's water-circuit mimic, on its north wall. */
export const JACUZZI_MIMIC: MimicSpec = {
  title: 'JACUZZI · WATER CIRCUIT',
  width: 1.2,
  height: 0.72,
  lines: [
    {
      colour: '#2f7d3a',
      points: [
        [-0.43, 0.16],
        [-0.33, 0.16],
        [-0.33, -0.08],
        [0.37, -0.08],
        [0.37, 0.16],
        [-0.43, 0.16],
      ],
    },
  ],
  shapes: [
    { symbol: 'pool', at: [-0.38, 0.18], size: 0.08, label: 'SPA' },
    { symbol: 'pump', at: [-0.19, -0.08], size: 0.055, label: 'PUMP' },
    { symbol: 'filter', at: [0.01, -0.08], size: 0.055, label: 'FILTER' },
    { symbol: 'uv', at: [0.18, -0.08], size: 0.05, label: 'UV' },
    { symbol: 'hx', at: [0.37, -0.08], size: 0.055, label: 'HEAT' },
  ],
  lamps: [
    { id: 'pump', at: [-0.19, 0.04], colour: 'green', label: 'RUN' },
    { id: 'uv', at: [0.18, 0.04], colour: 'green', label: 'ON' },
  ],
  readouts: [{ id: 'water', at: [0.16, 0.19] }],
  modes: [
    { id: 'temp', legend: 'TEMP' },
    { id: 'flow', legend: 'FLOW' },
  ],
};

/**
 * The Jacuzzi mimic's lamps and readout, as the world has its water
 * (`pools.ts`) and its cabinet (`jacuzziCabinetPanel`): its pump's RUN
 * while the cabinet runs its motor, its UV's ON while the water moves
 * through it; its water's temperature and its return flow.
 */
export function jacuzziMimicState(world: World) {
  const pool = world.pools.pool_03;
  const panel = jacuzziCabinetPanel(world);
  return {
    lamps: { pump: panel.pumpRun, uv: panel.flowing },
    readouts: {
      water: {
        temp: { value: pool.temperature, unit: '°C', name: 'WATER', places: 1 },
        flow: { value: pool.flow, unit: 'm³/h', name: 'RETURN', places: 0 },
      },
    },
  };
}
