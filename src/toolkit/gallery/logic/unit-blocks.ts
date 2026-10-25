import type { PlaceItem, PlaceLink } from './machine-placement';
import { MACHINE_GAP } from './room-sizer';

/**
 * Parallel units pre-assembled into blocks
 * (`doc/prompts/done/020-scorers-and-pipe-costs.md`, the owner, 2026-10-23):
 * identical units that work in parallel (filters, duty and standby
 * pumps) share headers and so stand together. Before placement each group
 * of them is made up into candidate blocks that reach its number (for
 * four: a row of 4, a 2 × 2 square, two pairs, a row of 3 and a single, a
 * pair and two singles, or four singles). Each block is one item for
 * placement, side by side and aligned by construction, and afterwards it
 * expands back into its units' places.
 *
 * A row stands in any band, every unit facing the walkway. A square is
 * two rows back to back, so it stands only across the island's two faces,
 * each row facing a walkway (`bothFaces`). Pure; metres, an item's own
 * frame (yaw 0 faces +z).
 */

export interface BlockShape {
  rows: 1 | 2;
  cols: number;
}

/** A make-up: the blocks a group is made up into, largest first. */
export type MakeUp = BlockShape[];

/** Every way to make up `n` units into blocks, each a row, or two rows of at least two. */
export function makeUps(n: number): MakeUp[] {
  const shapes = (p: number): BlockShape[] => [
    { rows: 1, cols: p },
    ...(p >= 4 && p % 2 === 0 ? [{ rows: 2 as const, cols: p / 2 }] : []),
  ];
  const out: MakeUp[] = [];
  const parts = (left: number, most: number, acc: number[]) => {
    if (left === 0) {
      // Each part as each of its shapes.
      const expand = (k: number, made: BlockShape[]) => {
        if (k === acc.length) {
          out.push(made);
          return;
        }
        for (const shape of shapes(acc[k])) expand(k + 1, [...made, shape]);
      };
      expand(0, []);
      return;
    }
    for (let p = Math.min(left, most); p >= 1; p--)
      parts(left - p, p, [...acc, p]);
  };
  parts(n, n, []);
  return out;
}

/** How many placements a make-up takes. */
export const placementsOf = (m: MakeUp) => m.length;

/** Where each unit of a block stands in the block's frame, and whether it is turned about. */
export interface BlockMember {
  key: string;
  dx: number;
  dz: number;
  /** Turned half round: the back row of a square, facing the other way. */
  flipped: boolean;
}

export interface Assembly {
  items: PlaceItem[];
  links: PlaceLink[];
  /** Each block's units, by the block's key; a unit placed alone is its own. */
  members: Map<string, BlockMember[]>;
  /** The make-up chosen for each group. */
  makeUp: Map<string, MakeUp>;
  /**
   * What each block's own pipework costs, £ (the owner, 2026-10-23: a
   * pre-assembled block includes its pipes and valves): for each of its
   * connections, a header along the block and a short branch to each unit.
   */
  internal: Map<string, number>;
}

/** How long a unit's branch off its block's header is, metres. */
export const BRANCH = 0.8;

/**
 * Assemble `items` with each named group made up as `choice` says: each
 * block becomes one item (its key `block:<group>:<n>`), its units' ports
 * carried through as `<unit key>/<port>`, and links to the units moved to
 * the block.
 */
export function assemble(
  items: readonly PlaceItem[],
  links: readonly PlaceLink[],
  choice: ReadonlyMap<string, MakeUp>,
): Assembly {
  const out: PlaceItem[] = [];
  const members = new Map<string, BlockMember[]>();
  const where = new Map<
    string,
    { block: string; port: (p: string) => string }
  >();
  const used = new Set<string>();
  for (const [group, makeUp] of choice) {
    const units = items.filter((it) => it.group === group);
    let next = 0;
    makeUp.forEach((shape, n) => {
      const size = shape.rows * shape.cols;
      const take = units.slice(next, next + size);
      next += size;
      if (take.length < size) return;
      if (size === 1) {
        // A single: placed as itself.
        out.push({ ...take[0], group: undefined });
        used.add(take[0].key);
        members.set(take[0].key, [
          { key: take[0].key, dx: 0, dz: 0, flipped: false },
        ]);
        return;
      }
      const u = take[0];
      const w = shape.cols * u.w + (shape.cols - 1) * MACHINE_GAP;
      const back = MACHINE_GAP / 2;
      const d = shape.rows === 1 ? u.d : 2 * u.d + back;
      const key = `block:${group}:${n}`;
      const list: BlockMember[] = [];
      const ports: Record<
        string,
        {
          at: readonly [number, number, number];
          out: readonly [number, number, number];
        }
      > = {};
      take.forEach((unit, j) => {
        const col = j % shape.cols;
        const row = Math.floor(j / shape.cols);
        const dx = -w / 2 + u.w / 2 + col * (u.w + MACHINE_GAP);
        const flipped = shape.rows === 2 && row === 1;
        const dz =
          shape.rows === 1 ? 0 : (flipped ? -1 : 1) * (u.d / 2 + back / 2);
        list.push({ key: unit.key, dx, dz, flipped });
        for (const [name, p] of Object.entries(unit.ports ?? {})) {
          const s = flipped ? -1 : 1;
          ports[`${unit.key}/${name}`] = {
            at: [dx + s * p.at[0], p.at[1], dz + s * p.at[2]],
            out: [s * p.out[0], p.out[1], s * p.out[2]],
          };
        }
        used.add(unit.key);
        where.set(unit.key, {
          block: key,
          port: (port) => `${unit.key}/${port}`,
        });
      });
      members.set(key, list);
      out.push({
        ...u,
        key,
        w,
        d,
        group: undefined,
        ports,
        ...(shape.rows === 2 ? { bothFaces: true } : {}),
      });
    });
  }
  for (const it of items) if (!used.has(it.key)) out.push(it);
  const moved = links.map((l) => {
    const a = where.get(l.a);
    const b = where.get(l.b);
    return {
      ...l,
      a: a?.block ?? l.a,
      aPort: a && l.aPort ? a.port(l.aPort) : l.aPort,
      b: b?.block ?? l.b,
      bPort: b && l.bPort ? b.port(l.bPort) : l.bPort,
    };
  });
  // A block is associated with what it serves as one, like a single
  // machine (the owner, 2026-10-23): its units' parallel links to the same
  // port become one, through their header, which carries their combined
  // flow, so a bigger pipe (its pull grows as the root of the count).
  const merged = new Map<string, PlaceLink & { count: number }>();
  for (const l of moved) {
    const blockEnd =
      members.has(l.a) && members.get(l.a)!.length > 1
        ? 'a'
        : members.has(l.b) && members.get(l.b)!.length > 1
          ? 'b'
          : null;
    if (!blockEnd) {
      merged.set(`${merged.size}`, { ...l, count: 1 });
      continue;
    }
    const other = blockEnd === 'a' ? `${l.b}|${l.bPort}` : `${l.a}|${l.aPort}`;
    const key = `${blockEnd === 'a' ? l.a : l.b}>${other}`;
    const seen = merged.get(key);
    if (seen) seen.count++;
    else merged.set(key, { ...l, count: 1 });
  }
  const links2 = [...merged.values()].map(({ count, ...l }) => ({
    ...l,
    weight: l.weight * Math.sqrt(count),
  }));
  // Each block's own pipework: per connection, its header the block's
  // width, at the header's price, and a branch to each unit at the unit's.
  const internal = new Map<string, number>();
  for (const l of merged.values()) {
    const block =
      members.has(l.a) && members.get(l.a)!.length > 1
        ? l.a
        : members.has(l.b) && members.get(l.b)!.length > 1
          ? l.b
          : null;
    if (!block) continue;
    const it = out.find((x) => x.key === block)!;
    const branch = l.weight * 25;
    const header = branch * Math.sqrt(l.count);
    internal.set(
      block,
      (internal.get(block) ?? 0) + it.w * header + l.count * BRANCH * branch,
    );
  }
  return {
    items: out,
    links: links2,
    members,
    makeUp: new Map(choice),
    internal,
  };
}

/** A block's units' places, from the block's: each offset in its frame, a flipped one turned half round. */
export function expandBlock(
  place: { x: number; z: number; yaw: number },
  list: readonly BlockMember[],
) {
  const c = Math.cos(place.yaw);
  const s = Math.sin(place.yaw);
  return list.map((m) => ({
    key: m.key,
    x: place.x + m.dx * c + m.dz * s,
    z: place.z - m.dx * s + m.dz * c,
    yaw: place.yaw + (m.flipped ? Math.PI : 0),
  }));
}
