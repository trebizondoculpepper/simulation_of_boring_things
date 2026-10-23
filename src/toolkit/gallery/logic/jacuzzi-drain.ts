import { IBC } from '../../components/plant/logic/ibc';
import { stepDrain } from '../../../game/plant/gravity-drain';
import type { DrainPipe, DrainTank } from '../../../game/plant/gravity-drain';
import type { Vec3 } from '../../components/core/logic/pipe-route';
import type { PlantRoomLayout } from './plant-room-layout';

/**
 * Draining a jacuzzi (Dev23; the owner, 2026-10-23): a 1000 L IBC of water
 * standing in for the spa's water, on a concrete plinth, its bottom
 * outlet valve piped to a floor gully. Open the valve and it empties by
 * gravity (`gravity-drain.ts`), the water line falling through the
 * bottle's wall, quickly at first and more slowly as the head goes.
 *
 * The drain run is laid by the drainage rule, not the router: out of the
 * valve, down, then along to the gully at a steady fall of 1 in 40, and
 * down again to discharge over the grating with an air gap, never rising
 * anywhere, so it can only run one way. Pure.
 */

export type DrainItem = 'tank' | 'gully';
export const DRAIN_ITEMS: readonly DrainItem[] = ['tank', 'gully'];

/** The plinth: its plan and height, metres. */
export const PLINTH = { w: 1.4, d: 1.2, h: 0.3 } as const;
/** The gully's grating, flush with the floor, and the air gap over it. */
export const GULLY = { size: 0.3, airGap: 0.1 } as const;
/** The waste pipe: DN50 (56 mm outside), and its fall. */
export const WASTE = { od: 0.056, bore: 0.05, fall: 1 / 40 } as const;

const PLACES: Record<DrainItem, { x: number; z: number; yaw: number }> = {
  tank: { x: -2, z: -1.5, yaw: 0 },
  gully: { x: 1.2, z: -1.5, yaw: 0 },
};

export const DRAIN_SIZE: Record<
  DrainItem,
  { w: number; d: number; h: number }
> = {
  tank: { w: PLINTH.w, d: PLINTH.d, h: PLINTH.h + 1.16 },
  gully: { w: GULLY.size, d: GULLY.size, h: 0.02 },
};

export function layoutJacuzziDrain(): PlantRoomLayout {
  const places = DRAIN_ITEMS.map((item) => ({ ...PLACES[item], y: 0 }));
  return {
    halfX: 6,
    halfZ: 4.5,
    height: 4,
    places,
    // The gully is walked over; only the tank on its plinth stands in the way.
    solids: [
      {
        minX: PLACES.tank.x - PLINTH.w / 2,
        maxX: PLACES.tank.x + PLINTH.w / 2,
        minZ: PLACES.tank.z - PLINTH.d / 2,
        maxZ: PLACES.tank.z + PLINTH.d / 2,
      },
    ],
  };
}

const round = (v: number) => Math.round(v * 1e4) / 1e4;

/** The valve's open end, in the room: the IBC stands on the plinth, its outlet toward +x. */
export function tankOutlet(): Vec3 {
  const { x, z } = PLACES.tank;
  return [
    round(x + IBC.outlet[0]),
    round(PLINTH.h + IBC.outlet[1]),
    round(z + IBC.outlet[2]),
  ];
}

/** The drain run: out of the valve, down, along at its fall, down over the gully. */
export function drainRun(): Vec3[] {
  const [ox, oy, oz] = tankOutlet();
  const gx = PLACES.gully.x;
  const out = ox + 0.2;
  const low = 0.25;
  const along = gx - out;
  const end = GULLY.airGap;
  return [
    [ox, oy, oz],
    [round(out), oy, oz],
    [round(out), low, oz],
    [round(gx), round(low - along * WASTE.fall), oz],
    [round(gx), end, oz],
  ];
}

/** The run's loss coefficient: entry 0.5, the open butterfly 0.3, three bends at 0.75, friction f·L/D, exit 1. */
export function runLosses(points: readonly Vec3[]) {
  const length = points
    .slice(1)
    .reduce(
      (sum, p, k) =>
        sum +
        Math.hypot(
          p[0] - points[k][0],
          p[1] - points[k][1],
          p[2] - points[k][2],
        ),
      0,
    );
  const bends = Math.max(0, points.length - 2);
  return 0.5 + 0.3 + bends * 0.75 + (0.02 * length) / WASTE.bore + 1;
}

/** The tank and pipe as the drainage model takes them. */
export function drainModelParts() {
  const run = drainRun();
  const tank: DrainTank = {
    area: IBC.area,
    depth: IBC.depth,
    // Its inside floor above the pipe's open end over the gully.
    floorAbove: PLINTH.h + IBC.floor - run[run.length - 1][1],
  };
  const pipe: DrainPipe = { bore: WASTE.bore, K: runLosses(run) };
  return { run, tank, pipe };
}

/** The rig working: the tank's level, its valve, and what has gone down the drain. */
export function createJacuzziDrainModel() {
  const { tank, pipe } = drainModelParts();
  let level = 1;
  let open = false;
  let drained = 0;
  let flow = 0;
  return {
    tank,
    pipe,
    isOpen: () => open,
    setOpen: (value: boolean) => {
      open = value;
    },
    step(dt: number) {
      const s = stepDrain(tank, pipe, level, open, dt);
      level = s.level;
      drained += s.out;
      flow = s.flow;
    },
    readings: () => ({
      level,
      litres: level * tank.area * tank.depth * 1000,
      drained: drained * 1000,
      flow: flow * 1000,
    }),
  };
}

export type JacuzziDrainModel = ReturnType<typeof createJacuzziDrainModel>;
