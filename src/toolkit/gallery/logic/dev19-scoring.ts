import {
  demoGraph,
  demoVisualBindings,
} from '../../../game/plant/port-graph-demo';
import {
  adjacencyLinks,
  physicalAdjacencyMatrix,
} from '../../../game/plant/port-adjacency';
import type { Vec3 } from '../../components/core/logic/pipe-route';
import {
  layoutSizedPlantRoom,
  layoutSquarePlantRoom,
} from './plant-room-layout';
import type { ExhibitSize, PlantRoomLayout } from './plant-room-layout';
import {
  ADOPTED_RULES,
  demoExpansion,
  demoPipeSpec,
  demoPlaceItems,
  demoPlaceLinks,
  demoPlumbing,
  demoServiceRoutes,
} from './port-graph-demo-routes';
import type { PlumbingRules } from './port-graph-demo-routes';
import type { Region } from './room-regions';
import { scoreRoom } from './room-scorer';
import { sizeRoom } from './room-sizer';
import type { Score } from './room-scorer';

/**
 * Dev19 scored (`room-scorer.ts`): each way of making it, end to end, so
 * that they can be compared by number. Pure.
 */

/** What the rules ask for: the adopted rules' fittings, the same goal for every version. */
const wanted = () => demoExpansion(ADOPTED_RULES).fittings.length;

/** The floor the sizer says Dev19's machines need (its valves sit in lines), m². */
function minimumArea(sizes: readonly ExhibitSize[]) {
  const items = demoPlaceItems();
  const size = sizeRoom(sizes.filter((_, i) => !items[i]?.inline));
  return size.w * size.d;
}

/** Placement's reports of machines no one can walk to. */
const unreachable = (problems: readonly string[] = []) =>
  problems.filter((p) => p.includes('no way to walk')).length;

/** A laid-out, plumbed Dev19, scored. */
export function scorePlumbedDev19(
  name: string,
  sizes: readonly ExhibitSize[],
  layout: PlantRoomLayout & { regions?: Region[]; problems?: string[] },
  rules: PlumbingRules,
): Score {
  const plumbing = demoPlumbing(layout, rules);
  const fittings = plumbing.devices.filter((d) => d.kind !== 'remote-valve');
  const byLine = new Map<string, Vec3[][]>();
  for (const run of plumbing.runs)
    byLine.set(run.edgeId, [...(byLine.get(run.edgeId) ?? []), run.points]);
  return scoreRoom({
    name,
    w: layout.halfX * 2,
    d: layout.halfZ * 2,
    h: layout.height,
    minimumArea: minimumArea(sizes),
    machines: layout.solids.filter((f) => f.maxX > f.minX),
    unreachableAccess: unreachable(layout.problems),
    runs: plumbing.runs.map((r) => {
      const { od, joint } = demoPipeSpec(r.edgeId, r.medium);
      return { name: r.id, points: r.points, od, joint };
    }),
    ends: [...byLine.values()].map(
      (pieces) => [pieces[0][0], pieces.at(-1)!.at(-1)!] as const,
    ),
    regions: layout.regions ?? [],
    fittings: {
      wanted: wanted(),
      installed: fittings.length,
      reachable: fittings.filter((d) => d.reachable).length,
    },
  });
}

/**
 * Dev19 as it was this morning (commit eb75ba5), as near as the present
 * code can make it: the fixed 20 m square, machines round its walls, the
 * old lanes, no fittings. Its remote valves are today's small ones, at the
 * height of the morning's stands.
 */
export function scoreMorningDev19(sizes: readonly ExhibitSize[]): Score {
  const layout = layoutSquarePlantRoom(
    sizes,
    adjacencyLinks(
      physicalAdjacencyMatrix(
        demoGraph,
        demoVisualBindings.map((b) => b.nodeId),
      ),
    ),
  );
  const places = layout.places.map((p, i) =>
    demoVisualBindings[i].kind.startsWith('remote-') &&
    demoVisualBindings[i].kind !== 'remote-breaker'
      ? { ...p, y: 0.74 }
      : p,
  );
  const morning = { ...layout, places };
  const routes = demoServiceRoutes(morning);
  return scoreRoom({
    name: 'Dev19 this morning (20 m square, old lanes)',
    w: layout.halfX * 2,
    d: layout.halfZ * 2,
    h: layout.height,
    minimumArea: minimumArea(sizes),
    machines: layout.solids,
    // Not checked this morning; taken as reachable.
    unreachableAccess: 0,
    runs: routes.map((r) => {
      const { od, joint } = demoPipeSpec(r.edgeId, r.medium);
      return { name: r.edgeId, points: r.points, od, joint };
    }),
    ends: routes.map((r) => [r.points[0], r.points.at(-1)!] as const),
    regions: [],
    fittings: { wanted: wanted(), installed: 0, reachable: 0 },
  });
}

/**
 * The seed Dev19c uses: the best of seeds 1 to 12 by `searchDev19`
 * (2026-10-23: 67.9, against 66.2 for seed 1). The search takes some
 * seconds, so it is run offline and its winner kept here.
 */
export const DEV19C_SEED = 8;

/** Dev19 laid out with a given placement seed, plumbed by the adopted rules. */
export function dev19Candidate(sizes: readonly ExhibitSize[], seed: number) {
  return layoutSizedPlantRoom(sizes, {
    items: demoPlaceItems(),
    links: demoPlaceLinks(),
    seed,
  });
}

/** Search: each seed's room, end to end, scored; the best first. */
export function searchDev19(
  sizes: readonly ExhibitSize[],
  seeds: readonly number[],
) {
  return seeds
    .map((seed) => ({
      seed,
      score: scorePlumbedDev19(
        `Dev19c, seed ${seed}`,
        sizes,
        dev19Candidate(sizes, seed),
        ADOPTED_RULES,
      ),
    }))
    .sort((a, b) => b.score.total - a.score.total);
}
