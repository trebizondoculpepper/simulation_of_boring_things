import {
  FILTER_SPEC,
  POSITIONS,
  filterFlows,
  moveLever,
  stepFilter,
} from '../../../game/plant/multiport-filter';
import type {
  FilterState,
  MultiportPosition,
} from '../../../game/plant/multiport-filter';
import { MULTIPORT } from '../../components/plant/logic/multiport';
import type { Vec3 } from '../../components/core/logic/pipe-route';
import type { PlantRoomLayout } from './plant-room-layout';
import { GULLY, WASTE } from './jacuzzi-drain';

/**
 * Backwashing a sand filter, the simple setup (Dev26; scenario 3,
 * `doc/prompts/026-scenario-filter-backwash.md`): pool water at the pump's
 * 2 bar (an experimental source) through a supply valve to the filter's
 * multiport valve; its RETURN to the pool (an experimental sink); its
 * WASTE down to a floor gully, falling all the way. The bed starts dirty,
 * due a backwash. The runs are laid by hand. Pure.
 */

export type BackwashItem = 'source' | 'filter' | 'sink' | 'gully';
export const BACKWASH_ITEMS: readonly BackwashItem[] = [
  'source',
  'filter',
  'sink',
  'gully',
];

const PLACES: Record<BackwashItem, { x: number; z: number; yaw: number }> = {
  source: { x: -1.8, z: -2, yaw: 0 },
  filter: { x: 0, z: -2, yaw: 0 },
  sink: { x: 1.8, z: -2, yaw: 0 },
  gully: { x: 0, z: -0.4, yaw: 0 },
};

export const BACKWASH_SIZE: Record<
  BackwashItem,
  { w: number; d: number; h: number }
> = {
  source: { w: 0.7, d: 0.7, h: 1.2 },
  filter: { w: 0.7, d: 0.7, h: 1.5 },
  sink: { w: 0.7, d: 0.7, h: 1.2 },
  gully: { w: GULLY.size, d: GULLY.size, h: 0.02 },
};

export function layoutFilterBackwash(): PlantRoomLayout {
  const places = BACKWASH_ITEMS.map((item) => ({ ...PLACES[item], y: 0 }));
  return {
    halfX: 6,
    halfZ: 4.5,
    height: 4,
    places,
    solids: (['source', 'filter', 'sink'] as const).map((item) => ({
      minX: PLACES[item].x - 0.35,
      maxX: PLACES[item].x + 0.35,
      minZ: PLACES[item].z - 0.35,
      maxZ: PLACES[item].z + 0.35,
    })),
  };
}

const round = (v: number) => Math.round(v * 1e4) / 1e4;
const port = (name: keyof typeof MULTIPORT.ports): Vec3 => {
  const p = MULTIPORT.ports[name];
  return [
    round(PLACES.filter.x + p.at[0]),
    p.at[1],
    round(PLACES.filter.z + p.at[2]),
  ];
};

/** The three runs: supply, return and waste. */
export function backwashRuns() {
  const high = 1.6;
  const s: Vec3 = [PLACES.source.x, 1.18, PLACES.source.z];
  const k: Vec3 = [PLACES.sink.x, 1.18, PLACES.sink.z];
  const pump = port('pump');
  const ret = port('return');
  const waste = port('waste');
  const g = PLACES.gully;
  const low = 0.25;
  const along = g.z - (waste[2] + 0.3);
  return {
    supply: [
      s,
      [s[0], high, s[2]],
      [pump[0] - 0.4, high, s[2]],
      [pump[0] - 0.4, pump[1], pump[2]],
      pump,
    ] as Vec3[],
    return: [
      ret,
      [ret[0] + 0.4, ret[1], ret[2]],
      [ret[0] + 0.4, high, ret[2]],
      [k[0], high, k[2]],
      k,
    ] as Vec3[],
    // Out of the WASTE union, down, along to the gully at its fall, down over its grating.
    waste: [
      waste,
      [waste[0], waste[1], waste[2] + 0.3],
      [waste[0], low, waste[2] + 0.3],
      [g.x, round(low - along * WASTE.fall), g.z],
      [g.x, GULLY.airGap, g.z],
    ] as Vec3[],
  };
}

/** The supply valve, on the source's riser. */
export const SUPPLY_VALVE = {
  at: [PLACES.source.x, 1.4, PLACES.source.z] as Vec3,
  along: [0, 1, 0] as Vec3,
};

export const BACKWASH_PIPE = { od: 0.05 } as const;

export function createFilterBackwashModel() {
  let state: FilterState = {
    position: 'filter',
    dirt: 1.6 * FILTER_SPEC.dirtRef,
    movedUnderFlow: 0,
  };
  let supply = false;
  let warning = 0;
  return {
    isSupplyOpen: () => supply,
    setSupply: (open: boolean) => {
      supply = open;
    },
    position: () => state.position,
    /** Turn the lever on to its next position. */
    turn() {
      const next = POSITIONS[
        (POSITIONS.indexOf(state.position) + 1) % POSITIONS.length
      ] as MultiportPosition;
      const before = state.movedUnderFlow;
      state = moveLever(state, next, supply);
      if (state.movedUnderFlow > before) warning = 5;
    },
    step(dt: number) {
      if (!(dt > 0)) return;
      state = stepFilter(state, supply, dt);
      warning = Math.max(0, warning - dt);
    },
    readings: () => ({
      ...state,
      ...filterFlows(state, supply),
      /** A warning to show for a few seconds after a mistake. */
      warning: warning > 0,
    }),
  };
}

export type FilterBackwashModel = ReturnType<typeof createFilterBackwashModel>;
