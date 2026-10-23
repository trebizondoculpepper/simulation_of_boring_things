import { pricePerMetre } from '../../components/core/logic/pipe-costs';
import type { Vec3 } from '../../components/core/logic/pipe-route';
import type { PlaceItem, PlaceLink } from './machine-placement';
import type { SizedPlantRoomLayout } from './plant-room-layout';
import type { Dimension, Score } from './room-scorer';

/**
 * The placement scorer (`doc/prompts/020-scorers-and-pipe-costs.md`): the
 * first of the stage scorers, straight after placement and before any
 * plumbing, so that a poor layout is caught, and searched past, before the
 * dearer stages run on it. It judges only what placement decides, against
 * baselines the candidate cannot choose. Gates first; then each dimension
 * 0 to 1, with why. Pure.
 */

/** Each link's pipe, priced: what joining its two ends costs a metre, £. */
export type PricedLink = PlaceLink & { perMetre: number };

const LEAD = 0.5;
const clamp = (x: number) => Math.max(0, Math.min(1, x));

/** A port's lead end, in the room. */
export function leadOf(
  item: PlaceItem,
  place: { x: number; z: number; yaw: number },
  port?: string,
): Vec3 {
  const p = port ? item.ports?.[port] : undefined;
  if (!p) return [place.x, 0, place.z];
  const [x, y, z] = [
    p.at[0] + p.out[0] * LEAD,
    p.at[1] + p.out[1] * LEAD,
    p.at[2] + p.out[2] * LEAD,
  ];
  const c = Math.cos(place.yaw);
  const s = Math.sin(place.yaw);
  return [place.x + x * c + z * s, y, place.z - x * s + z * c];
}

export function scorePlacement(
  name: string,
  layout: SizedPlantRoomLayout,
  items: readonly PlaceItem[],
  links: readonly PricedLink[],
  minimumArea: number,
  /** Each group of parallel units: how many units, made up into how many blocks. */
  makeUp: ReadonlyMap<string, { units: number; blocks: number }> = new Map(),
  /**
   * The pipework's estimated cost, £, if the caller knows it better (a
   * layout of pre-assembled blocks, each with its own pipework). The
   * baseline stays the plan's links at 1.5 m, whatever the make-up.
   */
  pipework?: number,
): Score {
  const gates: string[] = [];
  const dimensions: Dimension[] = [];
  const index = new Map(items.map((item, i) => [item.key, i]));
  const placed = items
    .map((item, i) => ({ item, i, band: layout.bandOf[i] }))
    .filter((p) => !p.item.inline);

  // Gates: placement's own reports.
  for (const p of layout.problems) gates.push(p);
  const unreachable = layout.problems.filter((p) =>
    p.includes('no way to walk'),
  ).length;
  dimensions.push({
    name: 'access',
    score: clamp(1 - unreachable / Math.max(1, placed.length)),
    weight: 18,
    why: `${placed.length - unreachable} of ${placed.length} machines' access reachable`,
  });

  // Sites: corner, wall, freestanding.
  const hw = layout.halfX;
  const hd = layout.halfZ;
  let wanted = 0;
  let honoured = 0;
  for (const { item, i, band } of placed) {
    if (!item.site) continue;
    wanted++;
    const f = layout.solids[i];
    const nearX = Math.min(f.minX + hw, hw - f.maxX) < 0.6;
    const nearZ = Math.min(f.minZ + hd, hd - f.maxZ) < 0.6;
    if (item.site === 'corner' && nearX && nearZ) honoured++;
    else if (item.site === 'wall' && band?.endsWith('wall')) honoured++;
    else if (item.site === 'free' && band?.startsWith('island')) honoured++;
  }
  dimensions.push({
    name: 'sites',
    score: wanted ? honoured / wanted : 1,
    weight: 8,
    why: `${honoured} of ${wanted} machines where their kind belongs (corner, wall, freestanding)`,
  });

  // Batteries: machines of a kind together, in one band.
  const groups = new Map<string, typeof placed>();
  for (const p of placed)
    if (p.item.group)
      groups.set(p.item.group, [...(groups.get(p.item.group) ?? []), p]);
  const batteries = [...groups.values()].filter((g) => g.length > 1);
  const together = batteries.filter(
    (g) => new Set(g.map((p) => p.band)).size === 1,
  ).length;
  dimensions.push({
    name: 'batteries',
    score: batteries.length ? together / batteries.length : 1,
    weight: 6,
    why: batteries.length
      ? `${together} of ${batteries.length} groups of like machines in one band`
      : 'no machines alike',
  });

  // Fewer placements (the owner, 2026-10-23): a group of parallel units
  // made up in fewer blocks is better.
  if (makeUp.size) {
    const groups = [...makeUp.values()];
    const score =
      groups.reduce((sum, g) => sum + 1 / Math.max(1, g.blocks), 0) /
      groups.length;
    dimensions.push({
      name: 'fewer placements',
      score,
      weight: 6,
      why: groups
        .map(
          (g) =>
            `${g.units} units in ${g.blocks} block${g.blocks === 1 ? '' : 's'}`,
        )
        .join('; '),
    });
  }

  // Groups beside what they serve (the owner, 2026-10-23): a bonus, as
  // for a single machine, for each thing a group of like machines is piped
  // to standing within 4 m of it.
  if (batteries.length) {
    let near = 0;
    let all = 0;
    for (const members of batteries) {
      const ids = new Set(members.map((m) => m.item.key));
      const served = new Set<number>();
      for (const l of links) {
        if (ids.has(l.a) && !ids.has(l.b)) served.add(index.get(l.b)!);
        if (ids.has(l.b) && !ids.has(l.a)) served.add(index.get(l.a)!);
      }
      for (const j of served) {
        if (j === undefined) continue;
        all++;
        const p = layout.places[j];
        const d = Math.min(
          ...members.map(
            (m) =>
              Math.abs(layout.places[m.i].x - p.x) +
              Math.abs(layout.places[m.i].z - p.z),
          ),
        );
        if (d <= 4) near++;
      }
    }
    dimensions.push({
      name: 'groups by what they serve',
      score: all ? near / all : 1,
      weight: 6,
      why: `${near} of ${all} things groups are piped to stand within 4 m of them`,
    });
  }

  // Process order (Nandagopal: sequence equipment according to the PFD):
  // the share of the process's links, by their pipe's price, that go the
  // way most of them go round the room.
  {
    let cw = 0;
    let ccw = 0;
    for (const l of links) {
      const a = index.get(l.a);
      const b = index.get(l.b);
      if (a === undefined || b === undefined) continue;
      const pa = layout.places[a];
      const pb = layout.places[b];
      let turn = Math.atan2(pb.z, pb.x) - Math.atan2(pa.z, pa.x);
      while (turn > Math.PI) turn -= 2 * Math.PI;
      while (turn <= -Math.PI) turn += 2 * Math.PI;
      if (turn < 0) cw += -turn * l.perMetre;
      else ccw += turn * l.perMetre;
    }
    const all = cw + ccw;
    dimensions.push({
      name: 'process order',
      score: all ? Math.max(cw, ccw) / all : 1,
      weight: 6,
      why: `${all ? Math.round((100 * Math.max(cw, ccw)) / all) : 100} % of the process, by its pipes' price, goes one way round the room`,
    });
  }

  // Short pump suctions (process layout: minimise suction piping).
  {
    const suctions = links.filter((l) => l.suction);
    let length = 0;
    for (const l of suctions) {
      const a = index.get(l.a);
      const b = index.get(l.b);
      if (a === undefined || b === undefined) continue;
      const pa = leadOf(items[a], layout.places[a], l.aPort);
      const pb = leadOf(items[b], layout.places[b], l.bPort);
      length +=
        Math.abs(pa[0] - pb[0]) +
        Math.abs(pa[1] - pb[1]) +
        Math.abs(pa[2] - pb[2]);
    }
    if (suctions.length)
      dimensions.push({
        name: 'short suctions',
        score: length > 0 ? clamp((1.5 * suctions.length) / length) : 1,
        weight: 6,
        why: `${suctions.length} pump suctions, ${length.toFixed(1)} m in all, against 1.5 m each`,
      });
  }

  // Estimated pipework: each link's square length, lead to lead (the sum
  // of its x, y and z distances: pipes run square, never on a diagonal),
  // at its pipe's price, against every link at 1.5 m.
  let cost = 0;
  let near = 0;
  for (const l of links) {
    const a = index.get(l.a);
    const b = index.get(l.b);
    if (a === undefined || b === undefined) continue;
    const pa = leadOf(items[a], layout.places[a], l.aPort);
    const pb = leadOf(items[b], layout.places[b], l.bPort);
    const length =
      Math.abs(pa[0] - pb[0]) +
      Math.abs(pa[1] - pb[1]) +
      Math.abs(pa[2] - pb[2]);
    cost += length * l.perMetre;
    near += 1.5 * l.perMetre;
  }
  if (pipework !== undefined) cost = pipework;
  dimensions.push({
    name: 'pipework estimate',
    score: cost > 0 ? clamp(near / cost) : 1,
    weight: 12,
    why: `about £${Math.round(cost).toLocaleString('en-GB')} of pipe, end to end, against £${Math.round(near).toLocaleString('en-GB')} if every link were 1.5 m`,
  });

  // The room's area against what its contents need.
  const area = 4 * hw * hd;
  dimensions.push({
    name: 'room area',
    score: clamp((1.5 * minimumArea - area) / (0.5 * minimumArea)),
    weight: 7,
    why: `${area.toFixed(0)} m² against ${minimumArea.toFixed(0)} m² the sizer says`,
  });

  const weights = dimensions.reduce((sum, d) => sum + d.weight, 0);
  const mean =
    dimensions.reduce((sum, d) => sum + d.score * d.weight, 0) / weights;
  return {
    name,
    passes: gates.length === 0,
    gates,
    total: Math.round(mean * 1000) / 10,
    dimensions,
  };
}

/** Links priced by their pipe: a helper for callers with a pipe per link. */
export function priced(
  links: readonly PlaceLink[],
  pipe: (link: PlaceLink) => { kind: string; od: number },
): PricedLink[] {
  return links.map((l) => {
    const { kind, od } = pipe(l);
    return { ...l, perMetre: pricePerMetre(kind, od) };
  });
}
