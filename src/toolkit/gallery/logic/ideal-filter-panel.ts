import type {
  MimicSpec,
  MimicState,
  Point,
} from '../../components/industrial-control/logic/mimic';
import { flowState } from '../../components/industrial-control/logic/mimic-chaser';
import {
  RIG_VALVES,
  cleanFilter,
  commandProcess,
  filterSizing,
  rigFlows,
} from '../../../game/plant/ideal-filter';
import type {
  FilterProcess,
  FilterRig,
  RigValve,
} from '../../../game/plant/ideal-filter';

/**
 * The ideal filter rig's control panel (dev40, the owner, 2026-10-25): a
 * mimic of the rig, every pipe chasing its flow, every servo valve's OPEN
 * and SHUT lit by where the valve actually is, the processes' buttons,
 * the dirty source's dirt, the rig's time, and readouts of every flow and
 * of the water's and the bed's dirt (FLOW and QUALITY). Pure.
 */

const BLUE = '#2a5f9e';
const WASTE = '#7a5a2a';

/** The filter's symbol, and its top and bottom connections. */
const F: Point = [0.15, 0.0];
const TOP_L: Point = [0.08, 0.17];
const TOP_R: Point = [0.22, 0.17];
const BOT_L: Point = [0.08, -0.17];
const BOT_M: Point = [0.15, -0.18];
const BOT_R: Point = [0.22, -0.17];
const HEADER = -0.55;

const NAMES: Record<RigValve, string> = {
  clean: 'CLEAN',
  dirty: 'DIRTY',
  v1: 'V1 INLET',
  v2: 'V2 OUTLET',
  v3: 'V3 BW IN',
  v4: 'V4 BW OUT',
  v5: 'V5 RINSE',
};

/** Where each valve stands on its pipe. */
const AT: Record<RigValve, Point> = {
  clean: [-0.75, 0.3],
  dirty: [-0.75, -0.2],
  v1: [-0.25, 0.42],
  v3: [-0.25, -0.42],
  v4: [0.5, 0.42],
  v2: [0.55, -0.32],
  v5: [0.55, -0.5],
};

const valveUnit = (v: RigValve) => {
  const [x, y] = AT[v];
  return {
    label: { text: NAMES[v], at: [x, y - 0.07] as Point, size: 0.55 },
    shape: { symbol: 'valve' as const, at: [x, y] as Point, size: 0.025 },
    buttons: [
      {
        id: `${v}/open`,
        at: [x - 0.085, y] as Point,
        colour: 'green' as const,
        legend: 'OPEN',
        lamp: `${v}-open`,
      },
      {
        id: `${v}/shut`,
        at: [x + 0.085, y] as Point,
        colour: 'red' as const,
        legend: 'SHUT',
        lamp: `${v}-shut`,
      },
    ],
  };
};
const units = RIG_VALVES.map(valveUnit);

const line = (
  flow: string,
  points: Point[],
  colour = BLUE,
): MimicSpec['lines'][number] => ({ colour, points, flow: { id: flow } });

const PROCESS_BUTTONS: readonly [FilterProcess, string, number][] = [
  ['service', 'SERVICE', -0.42],
  ['backwash', 'BACKWASH', -0.27],
  ['rinse', 'RINSE', -0.12],
  ['off', 'ALL SHUT', 0.03],
];

export const IDEAL_FILTER_PANEL: MimicSpec = {
  title: 'IDEAL FILTER RIG',
  width: 2.4,
  height: 1.4,
  lines: [
    line('clean', [
      [-0.92, 0.3],
      [HEADER, 0.3],
    ]),
    line(
      'dirty',
      [
        [-0.92, -0.2],
        [HEADER, -0.2],
      ],
      WASTE,
    ),
    line('header', [
      [HEADER, -0.2],
      [HEADER, 0.3],
    ]),
    line('v1', [[HEADER, 0.3], [HEADER, 0.42], [TOP_L[0], 0.42], TOP_L]),
    line('v3', [[HEADER, -0.2], [HEADER, -0.42], [BOT_L[0], -0.42], BOT_L]),
    line(
      'v4',
      [TOP_R, [TOP_R[0], 0.42], [0.8, 0.42], [0.8, 0.15], [0.98, 0.15]],
      WASTE,
    ),
    line('v2', [BOT_R, [BOT_R[0], -0.32], [0.98, -0.32]]),
    line('v5', [BOT_M, [BOT_M[0], -0.5], [0.98, -0.5]], WASTE),
  ],
  shapes: [
    { symbol: 'tank', at: [-1.02, 0.3], size: 0.12, label: 'CLEAN SOURCE' },
    { symbol: 'tank', at: [-1.02, -0.2], size: 0.12, label: 'DIRTY SOURCE' },
    { symbol: 'filter', at: F, size: 0.36, label: 'IDEAL FILTER' },
    { symbol: 'tank', at: [1.07, 0.15], size: 0.1, label: 'WASTE' },
    { symbol: 'tank', at: [1.07, -0.32], size: 0.1, label: 'OUTLET' },
    { symbol: 'tank', at: [1.07, -0.5], size: 0.06 },
    ...units.map((u) => u.shape),
  ],
  labels: [...units.map((u) => u.label)],
  lamps: [],
  readouts: [
    { id: 'source', at: [-0.1, 0.62] },
    { id: 'bed', at: [0.15, 0.62] },
    { id: 'dp', at: [0.4, 0.62] },
    { id: 'outlet', at: [0.65, 0.62] },
    { id: 'waste', at: [0.9, 0.62] },
  ],
  buttons: [
    ...units.flatMap((u) => u.buttons),
    ...PROCESS_BUTTONS.map(([p, legend, x]) => ({
      id: `process/${p}`,
      at: [x, -0.64] as Point,
      colour: 'white' as const,
      legend,
      lamp: `process-${p}`,
    })),
    {
      id: 'clean-media',
      at: [0.2, -0.64],
      colour: 'black',
      legend: 'CLEAN MEDIA',
    },
    { id: 'dirt/down', at: [0.45, -0.64], colour: 'black', legend: 'DIRT −' },
    { id: 'dirt/up', at: [0.57, -0.64], colour: 'black', legend: 'DIRT +' },
    {
      id: 'speed/1',
      at: [0.8, -0.64],
      colour: 'white',
      legend: 'TIME ×1',
      lamp: 'speed-1',
    },
    {
      id: 'speed/600',
      at: [0.95, -0.64],
      colour: 'white',
      legend: 'TIME ×600',
      lamp: 'speed-600',
    },
  ],
  modes: [
    { id: 'flow', legend: 'FLOW' },
    { id: 'quality', legend: 'QUALITY' },
  ],
};

/** What the panel's buttons do to the rig. */
export type RigAction =
  | { valve: RigValve; open: boolean }
  | { process: FilterProcess }
  | { clean: true }
  | { dirt: 1 | -1 }
  | { speed: number };

export function panelAction(button: string): RigAction | null {
  const [what, arg] = button.split('/');
  if ((RIG_VALVES as readonly string[]).includes(what))
    return { valve: what as RigValve, open: arg === 'open' };
  if (what === 'process') return { process: arg as FilterProcess };
  if (what === 'clean-media') return { clean: true };
  if (what === 'dirt') return { dirt: arg === 'up' ? 1 : -1 };
  if (what === 'speed') return { speed: Number(arg) };
  return null;
}

/** The dirty source's settings, g/m³. */
export const DIRT_STEPS = [0, 2, 5, 10, 20, 50, 100] as const;

export function actOnRig(rig: FilterRig, a: RigAction): FilterRig {
  if ('valve' in a)
    return { ...rig, command: { ...rig.command, [a.valve]: a.open } };
  if ('process' in a) return commandProcess(rig, a.process);
  if ('clean' in a) return cleanFilter(rig);
  if ('dirt' in a) {
    const i = DIRT_STEPS.findIndex((d) => d >= rig.dirtySource);
    const next = Math.max(0, Math.min(DIRT_STEPS.length - 1, i + a.dirt));
    return { ...rig, dirtySource: DIRT_STEPS[next] };
  }
  return rig;
}

/** Which process the valves are commanded to, if any. */
function processOf(rig: FilterRig): FilterProcess | null {
  const want = (p: FilterProcess) =>
    RIG_VALVES.every(
      (v) => rig.command[v] === (commandProcess(rig, p).command[v] as boolean),
    );
  return (['service', 'backwash', 'rinse', 'off'] as const).find(want) ?? null;
}

/** The panel's lamps, readouts and chasers, from the rig alone. */
export function idealFilterPanelState(
  rig: FilterRig,
  speed: number,
): MimicState {
  const f = rigFlows(rig);
  const z = filterSizing(rig.spec);
  const process = processOf(rig);
  const reading = (value: number, unit: string, name: string, places = 1) => ({
    value,
    unit,
    name,
    places,
  });
  return {
    lamps: {
      ...Object.fromEntries(
        RIG_VALVES.flatMap((v) => [
          [`${v}-open`, rig.opening[v] >= 0.98],
          [`${v}-shut`, rig.opening[v] <= 0.02],
        ]),
      ),
      ...Object.fromEntries(
        PROCESS_BUTTONS.map(([p]) => [`process-${p}`, process === p]),
      ),
      'speed-1': speed === 1,
      'speed-600': speed === 600,
    },
    readouts: {
      source: {
        flow: reading(f.valve.clean + f.valve.dirty, 'm3/h', 'SUPPLY'),
        quality: reading(rig.dirtySource, 'g/m3', 'DIRTY SRC', 0),
      },
      bed: {
        flow: reading(f.bed, 'm3/h', 'BED'),
        quality: reading(rig.filter.dirt, 'kg', 'BED DIRT', 2),
      },
      dp: {
        flow: reading(f.bedBar, 'bar', 'BED DP', 2),
        quality: reading(rig.filter.fissuring * 100, '%', 'FISSURED', 0),
      },
      outlet: {
        flow: reading(f.toOutlet, 'm3/h', 'OUTLET'),
        quality: reading(f.outletDirt, 'g/m3', 'OUT DIRT'),
      },
      waste: {
        flow: reading(f.toWaste, 'm3/h', 'WASTE'),
        quality: reading(f.wasteDirt, 'g/m3', 'WST DIRT', 0),
      },
    },
    flows: {
      clean: flowState(f.valve.clean),
      dirty: flowState(f.valve.dirty),
      header: flowState(f.valve.dirty - f.valve.v3),
      v1: flowState(f.valve.v1),
      v3: flowState(f.valve.v3),
      v4: flowState(f.valve.v4),
      v2: flowState(f.valve.v2),
      v5: flowState(f.valve.v5),
    },
  };
  void z;
}
