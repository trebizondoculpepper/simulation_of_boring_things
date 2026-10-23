import type { Footprint } from '../../controls/logic/walk-collision';
import type { PlaceItem, PlaceLink } from './machine-placement';
import { layoutSizedPlantRoom } from './plant-room-layout';
import type { ExhibitSize, SizedPlantRoomLayout } from './plant-room-layout';
import { leadOf, scorePlacement } from './placement-scorer';
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
    /** Its estimated pipework, £: in all, and to its groups of parallel units. */
    pipework: number;
    groupPipework: number;
  }[];
}

/**
 * Estimates (the owner's rule, 2026-10-23): pipework made up in the shop
 * as part of a pre-assembled block costs this share of the site rate, and
 * each joint made in the field where a branch meets a main costs this, £.
 */
export const SHOP_RATE = 0.6;
export const FIELD_JOINT = 150;

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
    // The pipework, the same way for every make-up (the owner, 2026-10-23):
    // a link to a group of parallel units is a main, at its header's size,
    // from the far port to the group's middle, and a branch to each unit;
    // a block's branches are short, scattered units' long. Every length is
    // square: the sum of its x, y and z distances.
    const square = (p: readonly number[], q: readonly number[]) =>
      Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) + Math.abs(p[2] - q[2]);
    const median = (v: number[]) => {
      const s = [...v].sort((x, y) => x - y);
      return s[Math.floor(s.length / 2)];
    };
    const groupOf = new Map(
      items.map((it) => [
        it.key,
        groups.some(([g]) => g === it.group) ? it.group! : null,
      ]),
    );
    const lead = (key: string, port?: string) => {
      const k = items.findIndex((it) => it.key === key);
      return leadOf(items[k], layout.places[k], port);
    };
    const blockOfUnit = new Map<string, string>();
    for (const [key, list] of a.members)
      if (list.length > 1) for (const m of list) blockOfUnit.set(m.key, key);
    const bundles = new Map<
      string,
      {
        other: number[];
        price: number;
        units: { at: number[]; block: string | null }[];
      }
    >();
    let pipework = 0;
    for (const l of links) {
      const ga = groupOf.get(l.a);
      const gb = groupOf.get(l.b);
      const price = l.weight * 25;
      if (!ga && !gb) {
        pipework += square(lead(l.a, l.aPort), lead(l.b, l.bPort)) * price;
        continue;
      }
      const [unit, unitPort, other, otherPort, g] = ga
        ? [l.a, l.aPort, l.b, l.bPort, ga]
        : [l.b, l.bPort, l.a, l.aPort, gb!];
      const key = `${g}|${other}|${otherPort}`;
      const bundle = bundles.get(key) ?? {
        other: [...lead(other, otherPort)],
        price,
        units: [],
      };
      bundle.units.push({
        at: [...lead(unit, unitPort)],
        block: blockOfUnit.get(unit) ?? null,
      });
      bundles.set(key, bundle);
    }
    // Pre-assembled blocks are made in the shop (the owner, 2026-10-23: a
    // block includes its pipes and valves): their branches at the shop's
    // rate, and one field joint for the whole block where it meets the
    // main; a loose unit's branch is run on site, with a field joint each.
    let groupPipework = 0;
    for (const b of bundles.values()) {
      const middle = [0, 1, 2].map((k) => median(b.units.map((u) => u.at[k])));
      const blocks = new Set(
        b.units.map((u) => u.block).filter((x) => x !== null),
      );
      let cost = square(b.other, middle) * b.price * Math.sqrt(b.units.length);
      for (const u of b.units)
        cost += square(middle, u.at) * b.price * (u.block ? SHOP_RATE : 1);
      cost +=
        FIELD_JOINT *
        (blocks.size + b.units.filter((u) => u.block === null).length);
      groupPipework += cost;
      pipework += cost;
    }
    const score = scorePlacement(
      [...choice].map(([g, m]) => `${g}: ${describe(m)}`).join('; ') ||
        'no groups',
      layout,
      items,
      priced,
      minimumArea,
      makeUp,
      pipework,
    );
    tried.push({
      makeUp: score.name,
      score: score.total,
      passes: score.passes,
      gates: score.gates,
      size: placed.halfX * 2,
      pipework: Math.round(pipework),
      groupPipework: Math.round(groupPipework),
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
