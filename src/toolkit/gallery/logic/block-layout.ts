import type { Footprint } from '../../controls/logic/walk-collision';
import type { PlaceItem, PlaceLink } from './machine-placement';
import { layoutSizedPlantRoom } from './plant-room-layout';
import type { ExhibitSize, SizedPlantRoomLayout } from './plant-room-layout';
import { scorePlacement } from './placement-scorer';
import type { Score } from './room-scorer';
import { assemble, expandBlock, makeUps } from './unit-blocks';
import type { MakeUp } from './unit-blocks';

/**
 * A room laid out with its parallel units pre-assembled into blocks
 * (`unit-blocks.ts`; prompt 020): each candidate make-up of each group is
 * sized, reserved and placed, expanded back into its units, and scored by
 * the placement scorer, which rewards fewer placements; the best is kept,
 * gates first. Pure.
 */

export interface BlockLayout {
  layout: SizedPlantRoomLayout;
  makeUp: Map<string, MakeUp>;
  score: Score;
  /** Every candidate tried, with its placement score. */
  tried: {
    makeUp: string;
    score: number;
    passes: boolean;
    gates: string[];
    size: number;
  }[];
}

const describe = (m: MakeUp) =>
  m
    .map((b) =>
      b.rows === 2 ? `${b.cols}×2` : b.cols === 1 ? '1' : `row of ${b.cols}`,
    )
    .join(' + ');

export function layoutWithBlocks(
  sizes: readonly ExhibitSize[],
  {
    items: extra,
    links,
    minimumArea,
    seed = 1,
    most = 40,
  }: {
    items: readonly Partial<PlaceItem>[];
    links: readonly PlaceLink[];
    /** The floor the sizer says the contents need, m², for the placement scorer. */
    minimumArea: number;
    seed?: number;
    /** At most this many combinations of make-ups. */
    most?: number;
  },
): BlockLayout {
  const items: PlaceItem[] = sizes.map((s, i) => ({
    key: String(i),
    w: s.w,
    d: s.d,
    h: s.h,
    ...extra[i],
  }));
  // Groups of two or more placed units.
  const counts = new Map<string, number>();
  for (const it of items)
    if (it.group && !it.inline)
      counts.set(it.group, (counts.get(it.group) ?? 0) + 1);
  const groups = [...counts].filter(([, n]) => n > 1);
  // Every combination of their make-ups.
  let combos: Map<string, MakeUp>[] = [new Map()];
  for (const [group, n] of groups)
    combos = combos.flatMap((c) =>
      makeUps(n).map((m) => new Map([...c, [group, m]])),
    );
  combos = combos.slice(0, most);

  const priced = links.map((l) => ({ ...l, perMetre: l.weight * 25 }));
  const tried: BlockLayout['tried'] = [];
  let best: BlockLayout | null = null;
  for (const choice of combos) {
    const a = assemble(items, links, choice);
    const placed = layoutSizedPlantRoom(
      a.items.map((it) => ({
        w: it.w,
        d: it.d,
        h: it.h,
        mount: 'floor' as const,
      })),
      { items: a.items, links: a.links, seed },
    );
    // Back into each unit's place.
    const places = [...placed.places];
    const solids: Footprint[] = [...placed.solids];
    const bandOf = [...placed.bandOf];
    const indexOf = new Map(a.items.map((it, i) => [it.key, i]));
    const out = items.map((it) => {
      const own = indexOf.get(it.key);
      if (own !== undefined)
        return { place: places[own], solid: solids[own], band: bandOf[own] };
      return null;
    });
    for (const [key, list] of a.members) {
      const i = indexOf.get(key);
      if (i === undefined || list.length < 2) continue;
      for (const m of expandBlock(places[i], list)) {
        const unit = items.find((it) => it.key === m.key)!;
        const turned = Math.round(m.yaw / (Math.PI / 2)) % 2 !== 0;
        const [hx, hz] = turned
          ? [unit.d / 2, unit.w / 2]
          : [unit.w / 2, unit.d / 2];
        out[items.indexOf(unit)] = {
          place: { x: m.x, z: m.z, y: 0, yaw: m.yaw },
          solid: {
            minX: m.x - hx,
            maxX: m.x + hx,
            minZ: m.z - hz,
            maxZ: m.z + hz,
          },
          band: bandOf[i],
        };
      }
    }
    const layout: SizedPlantRoomLayout = {
      ...placed,
      places: out.map((o) => o!.place),
      solids: out.map((o) => o!.solid),
      bandOf: out.map((o) => o!.band),
    };
    const makeUp = new Map(
      groups.map(([group, n]) => [
        group,
        { units: n, blocks: choice.get(group)!.length },
      ]),
    );
    const score = scorePlacement(
      [...choice].map(([g, m]) => `${g}: ${describe(m)}`).join('; ') ||
        'no groups',
      layout,
      items,
      priced,
      minimumArea,
      makeUp,
    );
    tried.push({
      makeUp: score.name,
      score: score.total,
      passes: score.passes,
      gates: score.gates,
      size: placed.halfX * 2,
    });
    if (
      !best ||
      Number(score.passes) > Number(best.score.passes) ||
      (score.passes === best.score.passes && score.total > best.score.total)
    )
      best = { layout, makeUp: choice, score, tried };
  }
  return best!;
}
