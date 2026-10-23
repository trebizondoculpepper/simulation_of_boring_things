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
  demoLines,
  demoPipeSpec,
  demoPlaceItems,
  demoPlaceLinks,
  demoPlumbing,
  demoServiceRoutes,
} from './port-graph-demo-routes';
import type { PlumbingRules } from './port-graph-demo-routes';
import type { Region } from './room-regions';
import { scoreRoom } from './room-scorer';
import { scorePlacement } from './placement-scorer';
import type { PlaceItem } from './machine-placement';
import { sizeRoom } from './room-sizer';
import { pricePerMetre } from '../../components/core/logic/pipe-costs';
import type { Score } from './room-scorer';

/**
 * Dev19 scored (`room-scorer.ts`): each way of making it, end to end, so
 * that they can be compared by number. Pure.
 */

/** What the rules ask for: the adopted rules' fittings, the same goal for every version. */
const wanted = () => demoExpansion(ADOPTED_RULES).fittings.length;

/** A line's price a metre, installed, £: by its pipe, or conduit for cables. */
function price(edgeId: string, medium: string) {
  const { kind, od } = demoPipeSpec(
    edgeId,
    medium as Parameters<typeof demoPipeSpec>[1],
  );
  return pricePerMetre(kind, od, { conduit: medium === 'power' });
}

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
    runPrices: plumbing.runs.map((r) => price(r.edgeId, r.medium)),
    ends: [...byLine.values()].map(
      (pieces) => [pieces[0][0], pieces.at(-1)!.at(-1)!] as const,
    ),
    endPrices: [...byLine.keys()].map((edgeId) =>
      price(edgeId, plumbing.runs.find((r) => r.edgeId === edgeId)!.medium),
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
    runPrices: routes.map((r) => price(r.edgeId, r.medium)),
    ends: routes.map((r) => [r.points[0], r.points.at(-1)!] as const),
    endPrices: routes.map((r) => price(r.edgeId, r.medium)),
    regions: [],
    fittings: { wanted: wanted(), installed: 0, reachable: 0 },
  });
}

/**
 * The seed Dev19c uses: the best of seeds 1 to 16 by `searchDev19`, with
 * the process layout rules (2026-10-23: 74.1, against 72.2 for the best
 * layout before them). The search takes some seconds, so it is run
 * offline and its winner kept here.
 */
export const DEV19C_SEED = 9;

/** Dev19 laid out with a given placement seed, plumbed by the adopted rules. */
export function dev19Candidate(
  sizes: readonly ExhibitSize[],
  seed: number,
  practice = true,
) {
  return layoutSizedPlantRoom(sizes, {
    items: demoPlaceItems(),
    links: demoPlaceLinks(),
    seed,
    practice,
  });
}

/** Dev19's placement scored, before plumbing (`placement-scorer.ts`). */
export function scoreDev19Placement(
  name: string,
  sizes: readonly ExhibitSize[],
  layout: ReturnType<typeof layoutSizedPlantRoom>,
): Score {
  const extra = demoPlaceItems();
  const items: PlaceItem[] = sizes.map((s, i) => ({
    key: String(i),
    w: s.w,
    d: s.d,
    h: s.h,
    ...extra[i],
  }));
  const lines = demoLines().filter(
    (l) => l.medium === 'gas' || l.medium === 'water',
  );
  const links = demoPlaceLinks().map((l, k) => {
    const { kind, od } = demoPipeSpec(
      lines[k]?.edges[0] ?? '',
      lines[k]?.medium ?? 'water',
    );
    return { ...l, perMetre: pricePerMetre(kind, od) };
  });
  return scorePlacement(name, layout, items, links, minimumArea(sizes));
}

/**
 * Dev19 scored whole: the plumbed room's score, with placement's own
 * dimensions that the room scorer does not see (sites, batteries) carried
 * through.
 */
export function scoreDev19(
  name: string,
  sizes: readonly ExhibitSize[],
  layout: ReturnType<typeof layoutSizedPlantRoom>,
  rules: PlumbingRules,
): Score {
  const room = scorePlumbedDev19(name, sizes, layout, rules);
  const placement = scoreDev19Placement(name, sizes, layout);
  const dimensions = [
    ...room.dimensions,
    ...placement.dimensions.filter((d) =>
      ['sites', 'batteries', 'process order', 'short suctions'].includes(
        d.name,
      ),
    ),
  ];
  const weights = dimensions.reduce((sum, d) => sum + d.weight, 0);
  const mean =
    dimensions.reduce((sum, d) => sum + d.score * d.weight, 0) / weights;
  return { ...room, dimensions, total: Math.round(mean * 1000) / 10 };
}

/**
 * Search in two levels (the owner, 2026-10-23: a scorer after each stage):
 * place each seed and score the placement, which is quick; then plumb and
 * score whole only the best `keep` of them. The best first.
 */
export function searchDev19(
  sizes: readonly ExhibitSize[],
  seeds: readonly number[],
  keep = 3,
) {
  const placed = seeds
    .map((seed) => {
      const layout = dev19Candidate(sizes, seed);
      return {
        seed,
        layout,
        placement: scoreDev19Placement(`seed ${seed}`, sizes, layout),
      };
    })
    .sort(
      (a, b) =>
        Number(b.placement.passes) - Number(a.placement.passes) ||
        b.placement.total - a.placement.total,
    );
  return placed
    .slice(0, keep)
    .map((p) => ({
      ...p,
      score: scoreDev19(
        `Dev19c, seed ${p.seed}`,
        sizes,
        p.layout,
        ADOPTED_RULES,
      ),
    }))
    .sort(
      (a, b) =>
        Number(b.score.passes) - Number(a.score.passes) ||
        b.score.total - a.score.total,
    )
    .concat(placed.slice(keep).map((p) => ({ ...p, score: p.placement })));
}
