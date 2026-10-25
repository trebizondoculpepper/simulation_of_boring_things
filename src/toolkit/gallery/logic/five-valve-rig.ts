import {
  BIG_FILTER,
  MODES,
  PATTERN,
  VALVES,
  fiveValveFlows,
  newFiveValve,
  setMode,
  setSupply,
  stepFiveValve,
  supplyOn,
  valvesSet,
} from '../../../game/plant/five-valve-filter';
import type {
  FilterMode,
  FiveValveState,
  ValveName,
} from '../../../game/plant/five-valve-filter';
import { sandFilterGeometry } from '../../components/plant/logic/sand-filter';
import {
  bedGlass,
  newBedLook,
  stepBedLook,
} from '../../components/plant/logic/filter-bed';
import type { BedLook } from '../../components/plant/logic/filter-bed';
import type { Vec3 } from '../../components/core/logic/pipe-route';
import type { PlantRoomLayout } from './plant-room-layout';
import { GULLY, WASTE } from './jacuzzi-drain';

/**
 * Backwashing a sand filter, the commercial setup (Dev26; scenario 3,
 * `doc/prompts/done/026-scenario-filter-backwash.md`): one of the Olympic
 * pool's 3 m filters on its five-valve battery, each valve actuated and
 * all five switched together by a Penfold panel, with an electromagnetic
 * flowmeter on each valve's branch. The face pipework is laid by hand from
 * the filter's own nozzles (`sandFilterGeometry`): the top distributor's
 * nozzle to a tee (V1 from the supply, V4 to waste), the underdrain's to
 * a manifold (V2 to the return, V3 from the supply, V5 to waste); a supply
 * column on the left, a waste column on the right falling to a gully, and
 * the return out to the pool (an experimental sink). Pure.
 */

export type FiveItem = 'source' | 'filter' | 'sink' | 'gully' | 'panel';
export const FIVE_ITEMS: readonly FiveItem[] = [
  'source',
  'filter',
  'sink',
  'gully',
  'panel',
];

/** The Olympic pool's filter: 3 m across, its shell 1.71 m. */
export const OLYMPIC_FILTER = {
  dia: 3,
  shell: 3 * 0.57,
  dn: 200 as const,
  label: 'SMD 3000  7.1 m²',
};

const FILTER_Z = -2.6;
/** The face pipework's plane, in front of the nozzles. */
const FACE = -0.9;

const PLACES: Record<FiveItem, { x: number; z: number; yaw: number }> = {
  source: { x: -3.6, z: FACE, yaw: 0 },
  filter: { x: 0, z: FILTER_Z, yaw: 0 },
  sink: { x: 2.9, z: 0.4, yaw: 0 },
  gully: { x: 1.4, z: 0.3, yaw: 0 },
  panel: { x: -4.6, z: -3.9, yaw: 0 },
};

export const FIVE_SIZE: Record<FiveItem, { w: number; d: number; h: number }> =
  {
    source: { w: 0.7, d: 0.7, h: 1.2 },
    filter: { w: 3.1, d: 3.1, h: 3.3 },
    sink: { w: 0.7, d: 0.7, h: 1.2 },
    gully: { w: GULLY.size, d: GULLY.size, h: 0.02 },
    panel: { w: 1.2, d: 0.4, h: 2.0 },
  };

export function layoutFiveValve(): PlantRoomLayout {
  const places = FIVE_ITEMS.map((item) => ({ ...PLACES[item], y: 0 }));
  const box = (item: FiveItem) => ({
    minX: PLACES[item].x - FIVE_SIZE[item].w / 2,
    maxX: PLACES[item].x + FIVE_SIZE[item].w / 2,
    minZ: PLACES[item].z - FIVE_SIZE[item].d / 2,
    maxZ: PLACES[item].z + FIVE_SIZE[item].d / 2,
  });
  return {
    halfX: 6,
    halfZ: 4.5,
    height: 8,
    places,
    solids: [box('source'), box('filter'), box('sink'), box('panel')],
  };
}

const round = (v: number) => Math.round(v * 1e4) / 1e4;

/** The two process nozzles' flanges in the room (the model stands its vessel 0.1 m forward). */
export function nozzles() {
  const g = sandFilterGeometry(OLYMPIC_FILTER.dia, OLYMPIC_FILTER.shell);
  const at = (n: { x: number; y: number; flange: number }): Vec3 => [
    round(PLACES.filter.x + n.x),
    round(n.y),
    round(FILTER_Z + n.flange + 0.1),
  ];
  return { top: at(g.inlet), bottom: at(g.outlet) };
}

export const SUPPLY_X = -2.2;
export const WASTE_X = 1.4;

/** The face pipework: each run, and each valve's and flowmeter's place on it. */
export function fiveValveRuns() {
  const { top, bottom } = nozzles();
  const T: Vec3 = [top[0], top[1], FACE];
  const B: Vec3 = [bottom[0], bottom[1], FACE];
  const src: Vec3 = [PLACES.source.x, 1.18, PLACES.source.z];
  const sink: Vec3 = [PLACES.sink.x, 1.18, PLACES.sink.z];
  const g = PLACES.gully;
  const runs: Record<string, Vec3[]> = {
    // The nozzles out to the tee and the manifold.
    topNozzle: [top, T],
    bottomNozzle: [bottom, B],
    // The supply up to its column, and the column joining V1's and V3's branches.
    supplyIn: [src, [src[0], 1.6, src[2]], [SUPPLY_X, 1.6, FACE]],
    supplyColumn: [
      [SUPPLY_X, B[1], FACE],
      [SUPPLY_X, T[1], FACE],
    ],
    v1: [T, [SUPPLY_X, T[1], FACE]],
    v3: [B, [SUPPLY_X, B[1], FACE]],
    v4: [T, [WASTE_X, T[1], FACE]],
    v5: [B, [WASTE_X, B[1], FACE]],
    // The waste column down, along at its fall to the gully, down over it.
    waste: [
      [WASTE_X, T[1], FACE],
      [WASTE_X, 0.25, FACE],
      [g.x, round(0.25 - (g.z - FACE) * WASTE.fall), g.z],
      [g.x, GULLY.airGap, g.z],
    ],
    // The return: forward from the manifold, up, across to the pool, down.
    v2: [
      B,
      [B[0], B[1], 0],
      [B[0], 1.6, 0],
      [sink[0], 1.6, 0],
      [sink[0], 1.6, sink[2]],
      sink,
    ],
  };
  // Each valve and its flowmeter on its branch, the valve nearer the filter.
  const along = (a: Vec3, b: Vec3, t: number): Vec3 => [
    round(a[0] + (b[0] - a[0]) * t),
    round(a[1] + (b[1] - a[1]) * t),
    round(a[2] + (b[2] - a[2]) * t),
  ];
  const dir = (a: Vec3, b: Vec3): Vec3 => {
    const n = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    return [
      round((b[0] - a[0]) / n),
      round((b[1] - a[1]) / n),
      round((b[2] - a[2]) / n),
    ];
  };
  const branch = (run: Vec3[], valveAt: number, meterAt: number) => ({
    valve: { at: along(run[0], run[1], valveAt), along: dir(run[0], run[1]) },
    meter: { at: along(run[0], run[1], meterAt), along: dir(run[0], run[1]) },
  });
  const spots: Record<ValveName, ReturnType<typeof branch>> = {
    v1: branch(runs.v1, 0.35, 0.72),
    v3: branch(runs.v3, 0.3, 0.68),
    v4: branch(runs.v4, 0.4, 0.75),
    v5: branch(runs.v5, 0.35, 0.72),
    v2: branch(runs.v2, 0.3, 0.7),
  };
  return { runs, spots };
}

export const FIVE_PIPE = { od: 0.2 } as const;

/** The rig working, and what its panel shows. */
export function createFiveValveModel() {
  let state: FiveValveState = newFiveValve();
  // Its bed's clock since it was last washed (`filter-bed.ts`): ten days,
  // so it starts dirty and pitted, due a backwash.
  let look: BedLook = newBedLook(10 * 86400);
  return {
    mode: () => state.mode,
    setMode: (mode: FilterMode) => {
      state = setMode(state, mode);
    },
    start: () => {
      state = setSupply(state, true);
    },
    stop: () => {
      state = setSupply(state, false);
    },
    step(dt: number) {
      state = stepFiveValve(state, dt);
      look = stepBedLook(look, fiveValveFlows(state).bed, dt);
    },
    readings() {
      const f = fiveValveFlows(state);
      return {
        ...f,
        mode: state.mode,
        opening: state.opening,
        moving: !valvesSet(state),
        supplyOn: supplyOn(state),
        supplyWanted: state.supplyWanted,
        dirt: state.dirt,
        /** What the sight glass shows of the bed. */
        glass: bedGlass(look, {
          bedFlow: f.bed,
          dirt: state.dirt / BIG_FILTER.dirtRef,
          murk: f.bed < -1 ? Math.min(1, f.wasteDirt / 400) : undefined,
        }),
        /** A backwash is due: the bed's pressure drop past 0.5 bar in service. */
        backwashDue: state.mode === 'service' && f.bedBar > 0.5,
      };
    },
  };
}

export type FiveValveModel = ReturnType<typeof createFiveValveModel>;
export { MODES, PATTERN, VALVES };
