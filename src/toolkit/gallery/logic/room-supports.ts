import { POOL_TARGET } from '../../../game/plant/pools';
import type { PoolId } from '../../../game/plant/pools';
import {
  LAGGED_HEATING_INSULATION,
  planSupports,
} from '../../components/plant/logic/pipe-supports';
import type {
  SupportPlan,
  SupportRun,
} from '../../components/plant/logic/pipe-supports';
import { cabinetPipes } from './cabinet-pipes';
import { roomPipes, roomTees } from './room-pipes';
import { roomServiceRoutes } from './room-services';
import { roomStructure } from './room-structure';
import type { Side } from './room-equipment';

/**
 * Every run of pipe and conduit drawn in a room, as the support planner
 * takes it (`pipe-supports.ts`), and the room's supports: the room's
 * process pipework (`room-pipes.ts`), its packaged cabinet's services
 * (`cabinet-pipes.ts`) and its electrical conduits (`room-services.ts`).
 * Pure.
 */

type V = readonly [number, number, number];

/** The pool whose water a plant room's pipework carries. */
const POOL_OF: Partial<Record<string, PoolId>> = {
  plant_pool_01: 'pool_01',
  plant_pool_02: 'pool_02',
  plant_pool_03: 'pool_03',
  plant_pool_04: 'pool_04',
};

/** The water's temperature in a run of each service, °C: what plastic pipe's spacing depends on. */
function temperatureOf(room: string, service: string) {
  if (service === 'pool water') {
    const pool = POOL_OF[room];
    return pool ? POOL_TARGET[pool].temp : 30;
  }
  if (service.startsWith('heating')) return 80;
  return 20;
}

/** Whether a point lies on a run's centre line. */
const onRun = (p: V, points: readonly V[]) =>
  points.some((a, i) => {
    if (i === 0) return false;
    const b = points[i - 1];
    const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const L2 = d[0] ** 2 + d[1] ** 2 + d[2] ** 2;
    if (L2 < 1e-12) return false;
    const t =
      ((p[0] - a[0]) * d[0] + (p[1] - a[1]) * d[1] + (p[2] - a[2]) * d[2]) / L2;
    if (t < -1e-6 || t > 1 + 1e-6) return false;
    return (
      Math.hypot(
        a[0] + d[0] * t - p[0],
        a[1] + d[1] * t - p[1],
        a[2] + d[2] * t - p[2],
      ) < 0.02
    );
  });

export function roomSupportRuns(room: string): SupportRun[] {
  const runs: SupportRun[] = [];
  const tees = roomTees(room);
  for (const r of roomPipes(room))
    runs.push({
      name: r.name,
      kind: r.kind,
      od: r.od,
      radius:
        r.od / 2 +
        (r.kind === 'lagged-heating' ? LAGGED_HEATING_INSULATION : 0),
      points: r.points,
      fittings: [
        ...r.valves.map((v) => v.at),
        ...tees.filter((t) => onRun(t.at, r.points)).map((t) => t.at),
      ],
      temperature: temperatureOf(room, r.service),
    });
  for (const r of cabinetPipes(room))
    runs.push({
      name: r.name,
      kind: r.kind,
      od: r.od,
      radius:
        r.od / 2 +
        (r.kind === 'lagged-heating' ? LAGGED_HEATING_INSULATION : 0),
      points: r.points,
      fittings: r.valve ? [r.valve.at] : [],
      temperature: temperatureOf(room, r.service),
      conduit: r.service === 'electrical',
    });
  for (const r of roomServiceRoutes(room))
    runs.push({
      name: r.name,
      kind: r.kind,
      od: r.od,
      radius: r.od / 2,
      points: r.points,
      conduit: r.utility === 'power',
    });
  return runs;
}

/** The room's supports, every run planned, or null if it is not a room whose services are laid out. */
export function roomSupports(
  room: string,
  options: { supplyWall?: Side } = {},
): SupportPlan | null {
  const structure = roomStructure(room, options);
  if (!structure) return null;
  return planSupports(roomSupportRuns(room), structure);
}
