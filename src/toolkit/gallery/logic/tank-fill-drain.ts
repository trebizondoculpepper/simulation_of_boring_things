import { IBC } from '../../components/plant/logic/ibc';
import { stepTankTee } from '../../../game/plant/tank-tee';
import type { Leg, TankTeeState, TeeFlows } from '../../../game/plant/tank-tee';
import type { Vec3 } from '../../components/core/logic/pipe-route';
import type { PlantRoomLayout } from './plant-room-layout';
import { GULLY, PLINTH, WASTE, runLosses } from './jacuzzi-drain';

/**
 * Filling and draining a tank through one port (Dev25; scenario 2,
 * `doc/prompts/done/025-scenario-tank-fill-float.md`): the IBC on its plinth
 * as in Dev23, its one bottom port to a tee; from the tee, a fill leg up
 * to a mains-water source through a manual valve, and a drain leg down to
 * the floor gully through another. Which way the water goes through the
 * port follows the valves and the pressures (`tank-tee.ts`). The runs are
 * laid by hand: the drain falls all the way, as Dev23's. Pure.
 */

export type FillItem = 'tank' | 'gully' | 'mains';
export const FILL_ITEMS: readonly FillItem[] = ['tank', 'gully', 'mains'];

const PLACES: Record<FillItem, { x: number; z: number; yaw: number }> = {
  tank: { x: -2, z: -1.5, yaw: 0 },
  gully: { x: 1.2, z: -1.5, yaw: 0 },
  mains: { x: -1, z: 0.4, yaw: 0 },
};

export const FILL_SIZE: Record<FillItem, { w: number; d: number; h: number }> =
  {
    tank: { w: PLINTH.w, d: PLINTH.d, h: PLINTH.h + 1.16 },
    gully: { w: GULLY.size, d: GULLY.size, h: 0.02 },
    mains: { w: 0.7, d: 0.7, h: 1.2 },
  };

export function layoutTankFillDrain(): PlantRoomLayout {
  const places = FILL_ITEMS.map((item) => ({ ...PLACES[item], y: 0 }));
  const footprint = (item: FillItem) => ({
    minX: PLACES[item].x - FILL_SIZE[item].w / 2,
    maxX: PLACES[item].x + FILL_SIZE[item].w / 2,
    minZ: PLACES[item].z - FILL_SIZE[item].d / 2,
    maxZ: PLACES[item].z + FILL_SIZE[item].d / 2,
  });
  return {
    halfX: 6,
    halfZ: 4.5,
    height: 4,
    places,
    solids: [footprint('tank'), footprint('mains')],
  };
}

const round = (v: number) => Math.round(v * 1e4) / 1e4;

/** The tank's port (its outlet valve's end), and the tee a short way along from it. */
export function tankPort(): Vec3 {
  const { x, z } = PLACES.tank;
  return [round(x + IBC.outlet[0]), round(PLINTH.h + IBC.outlet[1]), z];
}
export function teeAt(): Vec3 {
  const [x, y, z] = tankPort();
  return [round(x + 0.35), y, z];
}

/** The mains source's outlet, its stud's end on its top. */
const MAINS_OUT: Vec3 = [PLACES.mains.x, 1.18, PLACES.mains.z];

/** The three legs' runs, each from the tee outward (the tank's from the tank in). */
export function fillDrainRuns() {
  const port = tankPort();
  const tee = teeAt();
  const high = 1.6;
  const tank: Vec3[] = [port, tee];
  // Up from the tee, across at 1.6 m, down onto the mains source's stud.
  const fill: Vec3[] = [
    tee,
    [tee[0], high, tee[2]],
    [tee[0], high, MAINS_OUT[2]],
    [MAINS_OUT[0], high, MAINS_OUT[2]],
    MAINS_OUT,
  ];
  // Down from the tee, along at its fall to the gully, down over the grating.
  const low = 0.25;
  const gx = PLACES.gully.x;
  const drain: Vec3[] = [
    tee,
    [tee[0], low, tee[2]],
    [gx, round(low - (gx - tee[0]) * WASTE.fall), tee[2]],
    [gx, GULLY.airGap, tee[2]],
  ];
  return { tank, fill, drain };
}

/** Where each leg's valve sits, and the way its pipe runs there. */
export function valveSpots() {
  const tee = teeAt();
  return {
    fill: { at: [tee[0], 1.3, tee[2]] as Vec3, along: [0, 1, 0] as Vec3 },
    drain: { at: [tee[0], 0.38, tee[2]] as Vec3, along: [0, -1, 0] as Vec3 },
  };
}

export const FILL_PIPE = { od: 0.032, bore: 0.025 } as const;

/** The legs as the tee's model takes them. */
export function fillDrainLegs(): { fill: Leg; tank: Leg; drain: Leg } {
  const runs = fillDrainRuns();
  return {
    // DN25 mains: its bends, the open valve and its friction.
    fill: {
      bore: FILL_PIPE.bore,
      K: 1 + 3 * 0.75 + 0.3 + (0.02 * 3.2) / FILL_PIPE.bore,
    },
    // The tank's own outlet (its butterfly) and the tee's run.
    tank: { bore: WASTE.bore, K: 0.5 + 0.3 + 0.4 },
    drain: { bore: WASTE.bore, K: runLosses(runs.drain) + 0.5 },
  };
}

/** Mains at 3 bar (30.6 m of water), up to 10 m³/h. */
export const MAINS = { head: 30.6, cap: 10 / 3600 } as const;

export function createTankFillDrainModel() {
  const legs = fillDrainLegs();
  const tank = {
    area: IBC.area,
    depth: IBC.depth,
    floorAbove: PLINTH.h + IBC.floor - GULLY.airGap,
  };
  const open = { fill: false, drain: false, tank: true };
  let state: TankTeeState = {
    level: 0.5,
    fromMains: 0,
    drained: 0,
    spilled: 0,
  };
  let flows: TeeFlows = { head: 0, fromMains: 0, intoTank: 0, toDrain: 0 };
  let spilling = false;
  return {
    isOpen: (valve: 'fill' | 'drain' | 'tank') => open[valve],
    setOpen: (valve: 'fill' | 'drain' | 'tank', value: boolean) => {
      open[valve] = value;
    },
    step(dt: number) {
      if (!(dt > 0)) return;
      const before = state.spilled;
      const s = stepTankTee(tank, legs, open, MAINS, state, dt);
      flows = s.flows;
      spilling = s.spilled > before;
      state = {
        level: s.level,
        fromMains: s.fromMains,
        drained: s.drained,
        spilled: s.spilled,
      };
    },
    readings: () => ({
      ...state,
      litres: state.level * tank.area * tank.depth * 1000,
      /** Through the tank's port, l/s: + in, − out. */
      port: state.level <= 0 && flows.intoTank < 0 ? 0 : flows.intoTank * 1000,
      toDrain: flows.toDrain * 1000,
      fromMainsRate: flows.fromMains * 1000,
      spilling,
    }),
  };
}

export type TankFillDrainModel = ReturnType<typeof createTankFillDrainModel>;
