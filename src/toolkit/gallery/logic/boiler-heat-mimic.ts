import type { BoilerState } from '../../components/plant/logic/boiler-house';
import type {
  MimicSpec,
  MimicState,
  Reading,
} from '../../components/industrial-control/logic/mimic';

export const BOILER_RATING_KW = 300;
export const BOILER_COUNT = 6;

const positions = Array.from({ length: BOILER_COUNT }, (_, i) => ({
  id: `b${i + 1}`,
  label: `B-${501 + i}`,
  x: i % 2 ? 0.6 : -0.6,
  y: 0.46 - Math.floor(i / 2) * 0.39,
}));

export const BOILER_HEAT_MIMIC: MimicSpec = {
  title: 'BOILER HOUSE — HEAT OUTPUT',
  width: 2.4,
  height: 1.8,
  lines: [
    {
      colour: '#b9372d',
      points: [
        [0, 0.68],
        [0, -0.44],
      ],
    },
    ...positions.map(({ x, y }) => ({
      colour: '#b9372d',
      points: [
        [x < 0 ? x - 0.18 : x + 0.18, y + 0.04],
        [0, y + 0.04],
      ] as const,
    })),
  ],
  shapes: positions.map(({ x, y, label }) => ({
    symbol: 'boiler' as const,
    at: [x - 0.2, y] as const,
    size: 0.1,
    label,
  })),
  labels: [{ text: 'LTHW FLOW', at: [0, 0.72] }],
  lamps: positions.flatMap(({ id, x, y }) => [
    {
      id: `${id}-ready`,
      at: [x - 0.26, y + 0.13] as const,
      colour: 'green' as const,
      label: 'READY',
    },
    {
      id: `${id}-fire`,
      at: [x - 0.18, y + 0.13] as const,
      colour: 'amber' as const,
      label: 'FIRE',
    },
    {
      id: `${id}-fault`,
      at: [x - 0.1, y + 0.13] as const,
      colour: 'red' as const,
      label: 'FAULT',
    },
  ]),
  readouts: [
    ...positions.map(({ id, x, y }) => ({ id, at: [x + 0.21, y] as const })),
    { id: 'total', at: [0, -0.68] },
  ],
  modes: [
    { id: 'output', legend: 'kW' },
    { id: 'rate', legend: 'RATE' },
    { id: 'temperature', legend: 'TEMP' },
  ],
};

const reading = (
  value: number,
  unit: string,
  name: string,
  places = 0,
): Reading => ({
  value,
  unit,
  name,
  places,
});

/** Estimated useful heat from the six live 300 kW firing fractions. */
export function boilerHeatState(boilers: readonly BoilerState[]): MimicState {
  const output = boilers.map((boiler) =>
    boiler.code === 3 && boiler.on && !boiler.lockout
      ? BOILER_RATING_KW * Math.max(0, Math.min(1, boiler.rate))
      : 0,
  );
  const total = output.reduce((sum, kw) => sum + kw, 0);
  const lamps = Object.fromEntries(
    boilers.flatMap((boiler, i) => [
      [
        `b${i + 1}-ready`,
        boiler.on && boiler.lockout === null && boiler.code !== 3,
      ],
      [`b${i + 1}-fire`, output[i] > 0],
      [`b${i + 1}-fault`, boiler.lockout !== null || boiler.code === 9],
    ]),
  );
  const readouts = Object.fromEntries(
    boilers.map((boiler, i) => [
      `b${i + 1}`,
      {
        output: reading(output[i], 'kW', `B-${501 + i}`),
        rate: reading(output[i] / 3, '%', `B-${501 + i}`),
        temperature: reading(boiler.flow, 'C', `B-${501 + i}`, 1),
      },
    ]),
  );
  readouts.total = {
    output: reading(total, 'kW', 'TOTAL'),
    rate: reading(
      (total / (BOILER_COUNT * BOILER_RATING_KW)) * 100,
      '%',
      'CASCADE',
    ),
    temperature: reading(
      total > 0
        ? boilers.reduce((sum, boiler, i) => sum + boiler.flow * output[i], 0) /
            total
        : Math.max(...boilers.map((boiler) => boiler.flow)),
      'C',
      'HEADER',
      1,
    ),
  };
  return { lamps, readouts };
}
