import type {
  MimicSpec,
  MimicState,
} from '../../components/industrial-control/logic/mimic';
import { LOUNGE_VALVES } from '../../../game/plant/lounge-valves';
import type { PumpsShown } from './pool-mimics';

/** Three rows of installed valves, with commands beside their limit lamps. */
export const LOUNGE_VALVE_MIMIC: MimicSpec = {
  title: 'LOUNGE POOL — FILTER VALVES',
  width: 2.4,
  height: 1.2,
  lines: [],
  shapes: [],
  labels: LOUNGE_VALVES.map((valve, i) => ({
    text: valve.tag,
    at: [-0.9 + (i % 4) * 0.6, 0.41 - Math.floor(i / 4) * 0.25] as const,
  })),
  lamps: [
    ...LOUNGE_VALVES.flatMap((valve, i) => {
      const x = -0.9 + (i % 4) * 0.6;
      const y = 0.34 - Math.floor(i / 4) * 0.25;
      return [
        {
          id: `${valve.assetId}-open`,
          at: [x - 0.08, y] as const,
          colour: 'green' as const,
        },
        {
          id: `${valve.assetId}-shut`,
          at: [x + 0.08, y] as const,
          colour: 'red' as const,
        },
      ];
    }),
    { id: 'p1-run', at: [-0.84, -0.4], colour: 'green', label: 'P1 RUN' },
    { id: 'p2-run', at: [0.5, -0.4], colour: 'green', label: 'P2 RUN' },
  ],
  buttons: [
    ...LOUNGE_VALVES.flatMap((valve, i) => {
      const x = -0.9 + (i % 4) * 0.6;
      const y = 0.25 - Math.floor(i / 4) * 0.25;
      return [
        {
          id: `${valve.assetId}/open`,
          at: [x - 0.08, y] as const,
          colour: 'green' as const,
          legend: 'OPEN',
        },
        {
          id: `${valve.assetId}/shut`,
          at: [x + 0.08, y] as const,
          colour: 'red' as const,
          legend: 'SHUT',
        },
      ];
    }),
    { id: 'p1-start', at: [-1.05, -0.41], colour: 'green', legend: 'P1 START' },
    { id: 'p1-stop', at: [-0.66, -0.41], colour: 'red', legend: 'P1 STOP' },
    { id: 'p2-start', at: [0.28, -0.41], colour: 'green', legend: 'P2 START' },
    { id: 'p2-stop', at: [0.7, -0.41], colour: 'red', legend: 'P2 STOP' },
  ],
  readouts: [],
  modes: [{ id: 'status', legend: 'STATUS' }],
};

export function loungeValveMimicState(
  positions: Readonly<Record<string, number>>,
  pumps: PumpsShown,
): MimicState {
  return {
    lamps: {
      ...Object.fromEntries(
        LOUNGE_VALVES.flatMap((valve) => {
          const position =
            positions[valve.assetId] ?? (valve.normal === 'open' ? 1 : 0);
          return [
            [`${valve.assetId}-open`, position >= 0.98],
            [`${valve.assetId}-shut`, position <= 0.02],
          ];
        }),
      ),
      'p1-run': pumps.p1 === 0,
      'p2-run': pumps.p2 === 0,
    },
    readouts: {},
  };
}
