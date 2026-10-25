import { INSTALLED_VALVES } from './installed-valves';
import type { PlantServices } from './services';
import { serviceAvailable } from './services';
import { strokeTime } from '../../toolkit/components/plant/logic/actuated-valve';

/** The nine installed valves on the lounge pool's filter and balance-tank pipework. */
export const LOUNGE_VALVES = Object.values(INSTALLED_VALVES).filter((valve) =>
  valve.tag.startsWith('PL1-'),
);
const STROKE = strokeTime(0.09);
const VALVE_BY_TAG = new Map(LOUNGE_VALVES.map((valve) => [valve.tag, valve]));

export function newLoungeValvePositions(): Record<string, number> {
  return Object.fromEntries(
    LOUNGE_VALVES.map(({ assetId, normal }) => [
      assetId,
      normal === 'open' ? 1 : 0,
    ]),
  );
}

/**
 * Actual travel and spring return live in the world, so both the local
 * mimic and the valve agree. Their actuators are electric, spring-return
 * (the owner, 2026-10-24): driven while powered and commanded, sprung shut
 * when their room loses power. They need no air.
 */
export function stepLoungeValves(
  positions: Readonly<Record<string, number>>,
  commands: Readonly<Record<string, boolean>>,
  plant: PlantServices,
  dt: number,
): Record<string, number> {
  const power = serviceAvailable(plant, 'plant_pool_01', 'power');
  const next: Record<string, number> = {};
  for (const { assetId, normal } of LOUNGE_VALVES) {
    const current = positions[assetId] ?? (normal === 'open' ? 1 : 0);
    const target = power && (commands[assetId] ?? normal === 'open') ? 1 : 0;
    const travel = Math.max(0, dt) / STROKE;
    next[assetId] =
      target > current
        ? Math.min(target, current + travel)
        : Math.max(target, current - travel);
  }
  return next;
}

/** Two parallel filter paths, each with an inlet and outlet. */
export function loungeValveFlows(
  positions: Readonly<Record<string, number>>,
  running: boolean,
) {
  if (!running) return { toPool: 0, toWaste: 0, tankDrain: 0 };
  const at = (tag: string) => {
    const valve = VALVE_BY_TAG.get(tag)!;
    return positions[valve.assetId] ?? (valve.normal === 'open' ? 1 : 0);
  };
  let toPool = 0;
  const tankDrain = at('PL1-T1-DV1') * 5;
  let toWaste = tankDrain;
  for (const n of [1, 2]) {
    const prefix = `PL1-F${n}-`;
    const inlet = at(`${prefix}IV1`);
    toPool += 45 * Math.min(inlet, at(`${prefix}IV2`));
    toWaste += 5 * inlet * at(`${prefix}BV1`);
    toWaste += 3 * at(`${prefix}DV1`);
  }
  const discharge = Math.max(at('PL1-P1-IV1'), at('PL1-P2-IV1'));
  return { toPool: toPool * discharge, toWaste, tankDrain };
}
