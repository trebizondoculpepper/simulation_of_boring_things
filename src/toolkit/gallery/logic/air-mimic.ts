import type {
  MimicSpec,
  MimicState,
  Point,
} from '../../components/industrial-control/logic/mimic';
import { AIR_UNITS } from './air-plant';
import type { AirHall, AirUnit } from './air-plant';

/**
 * The air plant's mimic and control panel, one board by the door: every
 * air handling unit (`air-plant.ts`) with its RUN, HEAT PUMP, FILTER and
 * FAULT lamps, ducted down to the hall it serves; under each hall, a
 * readout of its air (relative humidity, or the airflow its running
 * units deliver) and its time programme's OCCUPIED and UNOCCUPIED
 * buttons and lamp, which the units follow in AUTO. Pure.
 */

const SUPPLY = '#5c88b8';
const OUTSIDE = '#7fa7c9';
const pt = (x: number, y: number): Point => [x, y];

export const AIR_HALLS: readonly AirHall[] = [
  'lounge',
  'olympic',
  'jacuzzi',
  'footbath',
];
const HALL_NAME: Record<AirHall, string> = {
  lounge: 'LOUNGE',
  olympic: 'OLYMPIC',
  jacuzzi: 'JACUZZI',
  footbath: 'FOOTBATH',
};

const WIDTH = 2.2;
const HEIGHT = 1.2;
/** Each unit's place across the board, west to east, a gap between halls. */
function unitXs(units: readonly AirUnit[]) {
  const gaps = AIR_HALLS.length - 1;
  // Clear of the mode buttons in the board's bottom left corner.
  const step = (WIDTH - 0.5) / (units.length - 1 + gaps * 0.6);
  let x = -WIDTH / 2 + 0.35;
  return units.map((u, i) => {
    if (i > 0 && units[i - 1].hall !== u.hall) x += step * 0.6;
    const at = x;
    x += step;
    return at;
  });
}

const UNIT_Y = 0.24;
const BUS_Y = -0.02;
const HALL_Y = -0.1;

export function airMimicSpec(units: readonly AirUnit[] = AIR_UNITS): MimicSpec {
  const xs = unitXs(units);
  const hallX = (h: AirHall) => {
    const mine = xs.filter((_, i) => units[i].hall === h);
    return (Math.min(...mine) + Math.max(...mine)) / 2;
  };
  const halls = AIR_HALLS.filter((h) => units.some((u) => u.hall === h));
  return {
    title: 'AIR HANDLING PLANT — AHU-801 TO 812',
    width: WIDTH,
    height: HEIGHT,
    lines: [
      // Outside air along the top, into every unit.
      {
        colour: OUTSIDE,
        points: [pt(xs[0] - 0.05, 0.38), pt(xs.at(-1)! + 0.05, 0.38)],
        width: 8,
      },
      ...xs.map((x) => ({
        colour: OUTSIDE,
        points: [pt(x, 0.38), pt(x, UNIT_Y + 0.05)],
        width: 5,
      })),
      // Each unit's supply down to its hall's bus, and on to its hall.
      ...xs.map((x) => ({
        colour: SUPPLY,
        points: [pt(x, UNIT_Y - 0.05), pt(x, BUS_Y)],
        width: 6,
      })),
      ...halls.flatMap((h) => {
        const mine = xs.filter((_, i) => units[i].hall === h);
        return [
          {
            colour: SUPPLY,
            points: [
              pt(Math.min(...mine), BUS_Y),
              pt(Math.max(...mine), BUS_Y),
            ],
            width: 8,
          },
          {
            colour: SUPPLY,
            points: [pt(hallX(h), BUS_Y), pt(hallX(h), HALL_Y)],
            width: 8,
          },
        ];
      }),
    ],
    shapes: [
      ...units.map((u, i) => ({
        symbol: 'heatpump' as const,
        at: pt(xs[i], UNIT_Y),
        size: 0.08,
        label: u.tag.replace('AHU-', ''),
      })),
      ...halls.map((h) => ({
        symbol: 'pool' as const,
        at: pt(hallX(h), HALL_Y - 0.03),
        size: 0.1,
        label: HALL_NAME[h],
      })),
    ],
    labels: [
      { text: 'OUTSIDE AIR', at: pt(0, 0.42) },
      {
        text: 'RUN · HP · FILTER · FAULT',
        at: pt(xs[0] + 0.25, 0.47),
        size: 0.8,
      },
    ],
    lamps: [
      ...units.flatMap((u, i) =>
        (
          [
            ['run', 'green'],
            ['hp', 'white'],
            ['filter', 'amber'],
            ['fault', 'red'],
          ] as const
        ).map(([k, colour], j) => ({
          id: `${u.tag}-${k}`,
          at: pt(xs[i] - 0.045 + j * 0.03, UNIT_Y + 0.085),
          colour,
        })),
      ),
      ...halls.map((h) => ({
        id: `${h}-occupied`,
        at: pt(hallX(h), -0.43),
        colour: 'green' as const,
        label: 'OCCUPIED',
      })),
    ],
    readouts: halls.map((h) => ({ id: h, at: pt(hallX(h), -0.33) })),
    buttons: halls.flatMap((h) => [
      {
        id: `${h}-on`,
        at: pt(hallX(h) - 0.05, -0.51),
        colour: 'green' as const,
        legend: 'OCC',
      },
      {
        id: `${h}-off`,
        at: pt(hallX(h) + 0.05, -0.51),
        colour: 'black' as const,
        legend: 'UNOCC',
      },
    ]),
    modes: [
      { id: 'rh', legend: 'RH %' },
      { id: 'flow', legend: 'FLOW' },
    ],
  };
}

/** What each unit and hall is doing, as the mimic needs it. */
export interface AirReading {
  units: Readonly<
    Record<
      string,
      {
        run: boolean;
        heatPump: boolean;
        filter: boolean;
        fault: boolean;
        speed: number;
        hallRh: number;
      }
    >
  >;
  occupied: Readonly<Record<string, boolean>>;
}

export function airMimicState(
  reading: AirReading,
  units: readonly AirUnit[] = AIR_UNITS,
): MimicState {
  const lamps: Record<string, boolean> = {};
  for (const u of units) {
    const r = reading.units[u.tag];
    lamps[`${u.tag}-run`] = r?.run ?? false;
    lamps[`${u.tag}-hp`] = r?.heatPump ?? false;
    lamps[`${u.tag}-filter`] = r?.filter ?? false;
    lamps[`${u.tag}-fault`] = r?.fault ?? false;
  }
  const readouts: MimicState['readouts'] = {};
  for (const h of AIR_HALLS) {
    const mine = units.filter((u) => u.hall === h);
    if (!mine.length) continue;
    lamps[`${h}-occupied`] = reading.occupied[h] ?? false;
    const rh =
      mine.reduce((s, u) => s + (reading.units[u.tag]?.hallRh ?? 0), 0) /
      mine.length;
    const flow =
      mine.reduce(
        (s, u) => s + u.airflow * (reading.units[u.tag]?.speed ?? 0),
        0,
      ) / 3600;
    (readouts as Record<string, MimicState['readouts'][string]>)[h] = {
      rh: { value: rh, unit: '%', name: `${HALL_NAME[h]} RH`, places: 0 },
      flow: {
        value: flow,
        unit: 'm3/s',
        name: `${HALL_NAME[h]} AIR`,
        places: 1,
      },
    };
  }
  return { lamps, readouts };
}
