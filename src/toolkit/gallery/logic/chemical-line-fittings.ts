import type { Vec3 } from '../../components/core/logic/pipe-route';
import { placeInline } from '../../components/core/logic/inline-placement';
import type { InlineOptions } from '../../components/core/logic/inline-placement';
import { schematicExpansion } from '../../../game/plant/schematics';
import { MODEL_VALVES } from '../../../game/plant/model-valves';
import { EQUIPMENT_VALVES } from '../../../game/plant/chemical-valves';
import type { CheckFitting, Valve } from './room-pipes';

/**
 * A chemical line's valves set in its run (plan 085): the fittings its
 * room's enhanced network puts on its link, but those its machines draw
 * themselves (`EQUIPMENT_VALVES`), each where the plumber's inline
 * placement puts it, near the end of the line it serves, within reach
 * where it can be. Its isolating valves are PVC-U ball valves (by hand, or
 * motorised where the schematic says), under their model valves' names;
 * its non-return valves on the run beside them. Pure: the run's frame.
 */
export function chemicalLineFittings(
  room: string,
  link: string,
  points: readonly Vec3[],
  od: number,
  options: InlineOptions = {},
): { valves: Valve[]; checks: CheckFitting[]; problems: string[] } {
  const along = (schematicExpansion(room)?.along.get(link) ?? []).filter(
    (f) =>
      (f.kind === 'isolating-valve' || f.kind === 'non-return-valve') &&
      !EQUIPMENT_VALVES.has(f.id),
  );
  if (!along.length || points.length < 2)
    return { valves: [], checks: [], problems: [] };
  const placed = placeInline(
    [...points],
    along.map((f) => ({
      id: f.id,
      length: Math.max(0.12, 3 * od),
      near: f.end === 'source' ? ('start' as const) : ('end' as const),
    })),
    { ends: 0.08, bends: 0.08, gap: 0.05, ...options },
  );
  const valves: Valve[] = [];
  const checks: CheckFitting[] = [];
  for (const spot of placed.spots) {
    const f = along.find((x) => x.id === spot.id)!;
    const model = MODEL_VALVES.find((v) => v.id === f.id);
    if (!model) continue;
    if (f.kind === 'non-return-valve') {
      checks.push({
        at: spot.at,
        along: spot.along,
        od,
        name: model.name,
        tag: model.tag,
        fitting: f.id,
      });
      continue;
    }
    const a = spot.along.map(Math.abs);
    const axis: Valve['axis'] =
      a[0] >= a[1] && a[0] >= a[2] ? 'x' : a[1] >= a[2] ? 'y' : 'z';
    valves.push({
      fitting: f.id,
      at: spot.at,
      axis,
      name: model.name,
      od,
      operator: model.operator === 'motor' ? 'motor' : 'lever',
      style: 'chemical-line',
      facing: (axis === 'x' ? [0, 0, 1] : [1, 0, 0]) as Vec3,
    });
  }
  return {
    valves,
    checks,
    problems: placed.problems.map((p) => `${link}: ${p}`),
  };
}
