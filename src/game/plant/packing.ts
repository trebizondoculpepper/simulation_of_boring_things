import { CIRCUITS, buildGraph } from './inventory';
import type { Rect } from '../pool-styles/geometry';
import { rect } from '../pool-styles/geometry';
import {
  CHAMBERS,
  DOORWAYS,
  chamberById,
  sharedSide,
  sideOf,
} from './warren-plan';
import type { Chamber } from './warren-plan';

/**
 * Fitting the machines into the plant rooms: each room's equipment (from
 * the inventory), each piece at about its real size, set out in bands
 * along the room's long walls with a walkway kept clear down its middle,
 * nothing standing in front of a doorway, and a zone under the ceiling
 * kept free for ducts, conduits and air conditioning. It answers whether
 * everything fits, with room to walk and work. Pure; metres.
 */

/** A walkway's clear width, metres, and the gap kept between machines. */
export const WALKWAY = 1.5;
export const GAP = 0.8;
/** The zone under every ceiling kept for ducts, conduits and air conditioning, metres. */
export const SERVICE_ZONE = 0.6;
/** A doorway's clear approach, metres either side of it. */
const DOOR_CLEAR = 0.6;

export interface Size {
  w: number;
  d: number;
  h: number;
}

/** Each kind of equipment's size (width, depth, height), by the inventory's id prefix. */
const SIZES: readonly (readonly [string, Size])[] = [
  ['pumps-', { w: 3, d: 1.5, h: 1.2 }],
  ['ozone-', { w: 4, d: 2.5, h: 2.4 }],
  ['hx-', { w: 1, d: 0.8, h: 1.8 }],
  ['uv-', { w: 1.6, d: 0.6, h: 1.2 }],
  ['dosing-', { w: 2, d: 0.6, h: 1.8 }],
  ['cleaner-', { w: 1, d: 1, h: 1 }],
  ['flume-pump-', { w: 1.6, d: 1, h: 1.2 }],
  ['panel-', { w: 3, d: 0.6, h: 2.1 }],
  ['boiler-', { w: 0.8, d: 1.7, h: 1.7 }],
  ['lthw-header', { w: 3, d: 1.5, h: 2 }],
  ['gas-meter', { w: 1.2, d: 0.6, h: 1.5 }],
  ['water-main', { w: 1.2, d: 0.6, h: 1.2 }],
  ['sewer-connection', { w: 1.2, d: 1.2, h: 0.8 }],
  ['supply-intake', { w: 2, d: 0.8, h: 2.2 }],
  ['lv-board', { w: 6, d: 1, h: 2.2 }],
  ['lighting-control', { w: 1.5, d: 0.5, h: 2 }],
  ['emergency-battery', { w: 2, d: 0.6, h: 2 }],
  ['ups', { w: 1.2, d: 0.8, h: 1.8 }],
  ['hypochlorite-bulk', { w: 3, d: 3, h: 2 }],
  ['acid-bulk', { w: 2.5, d: 2.5, h: 1.8 }],
  ['break-tank', { w: 3, d: 2, h: 2 }],
  ['backwash-tank', { w: 4, d: 3, h: 2.5 }],
  ['ahu-', { w: 10, d: 2.6, h: 2.8 }],
  ['bms', { w: 4, d: 1.5, h: 2 }],
  ['duty-desk', { w: 2, d: 1, h: 0.8 }],
  ['goods-in', { w: 4, d: 3, h: 1.2 }],
  ['order-book', { w: 0.6, d: 0.4, h: 1.2 }],
  ['spares-cage', { w: 3, d: 2, h: 2.2 }],
];

/** A balance tank's size: about 5% of its pool's volume, 4 m tall, square. */
const tankSize = (volume: number): Size => {
  const side = Math.max(1.5, Math.sqrt((volume * 0.05) / 4));
  return { w: side, d: side, h: 4 };
};

export interface Machine {
  id: string;
  name: string;
  room: string;
  size: Size;
}

/** Every piece of equipment, sized; a circuit's filters each one machine. */
export function machines(): Machine[] {
  const list: Machine[] = [];
  for (const n of buildGraph().nodes.filter((x) => x.kind === 'equipment')) {
    const room = n.in!;
    if (n.id.startsWith('balance-')) {
      const c = CIRCUITS.find((x) => `balance-${x.id}` === n.id)!;
      list.push({
        id: n.id,
        name: `Balance tank: ${c.id}`,
        room,
        size: tankSize(c.volume),
      });
    } else if (n.id.startsWith('filters-')) {
      const c = CIRCUITS.find((x) => `filters-${x.id}` === n.id)!;
      for (let i = 1; i <= c.filters; i++)
        list.push({
          id: `${n.id}-${i}`,
          name: `Sand filter ${i}: ${c.id}`,
          room,
          size: { w: 2.4, d: 2.4, h: 2.6 },
        });
    } else {
      const size = SIZES.find(([prefix]) => n.id.startsWith(prefix))?.[1] ?? {
        w: 1,
        d: 1,
        h: 1.5,
      };
      list.push({ id: n.id, name: n.name, room, size });
    }
  }
  return list;
}

export interface Placed extends Machine {
  /** Where it stands, metres: its footprint, and its floor. */
  rect: Rect;
  y: number;
  chamber: string;
}

/** A chamber's doorways' clear approaches, as rectangles inside it. */
function doorClear(c: Chamber): Rect[] {
  const clear: Rect[] = [];
  for (const d of DOORWAYS) {
    const other = d.a === c.id ? d.b : d.b === c.id ? d.a : null;
    if (!other) continue;
    const side = sharedSide(c.rect, chamberById(other).rect)!;
    const s = sideOf(c.rect, side);
    const reach = WALKWAY + 1;
    const a = d.from - DOOR_CLEAR,
      b = d.to + DOOR_CLEAR;
    if (side === 'north') clear.push(rect(a, b, s.at, s.at + reach));
    if (side === 'south') clear.push(rect(a, b, s.at - reach, s.at));
    if (side === 'west') clear.push(rect(s.at, s.at + reach, a, b));
    if (side === 'east') clear.push(rect(s.at - reach, s.at, a, b));
  }
  return clear;
}

const overlaps = (a: Rect, b: Rect) =>
  a.minX < b.maxX && b.minX < a.maxX && a.minZ < b.maxZ && b.minZ < a.maxZ;

/** The walkway down a chamber's middle, along its long axis. */
export function walkway(c: Chamber): Rect {
  const r = c.rect;
  const alongX = r.maxX - r.minX >= r.maxZ - r.minZ;
  if (alongX) {
    const m = (r.minZ + r.maxZ) / 2;
    return rect(r.minX, r.maxX, m - WALKWAY / 2, m + WALKWAY / 2);
  }
  const m = (r.minX + r.maxX) / 2;
  return rect(m - WALKWAY / 2, m + WALKWAY / 2, r.minZ, r.maxZ);
}

/**
 * Set a room's machines out in its chambers: biggest first, in bands
 * along each chamber's long walls (either side of its walkway), a gap
 * between neighbours, clear of every doorway's approach. What will not
 * fit is returned unplaced.
 */
export function pack(room: string): { placed: Placed[]; unplaced: Machine[] } {
  const chambers = CHAMBERS.filter(
    (c) => c.room === room && c.to === undefined,
  );
  const todo = machines()
    .filter((m) => m.room === room)
    .sort((a, b) => b.size.w * b.size.d - a.size.w * a.size.d);
  const placed: Placed[] = [];
  const unplaced: Machine[] = [];
  for (const m of todo) {
    let done = false;
    for (const c of chambers) {
      if (done) break;
      if (m.size.h > c.height - SERVICE_ZONE && !c.open) continue;
      const r = c.rect;
      const aisle = walkway(c);
      const alongX = aisle.maxX - aisle.minX > aisle.maxZ - aisle.minZ;
      const blocked = [
        aisle,
        ...doorClear(c),
        ...placed
          .filter((p) => p.chamber === c.id)
          .map((p) => grow(p.rect, GAP / 2)),
      ];
      // Both orientations, along each band, sliding in steps.
      for (const [w, d] of [
        [m.size.w, m.size.d],
        [m.size.d, m.size.w],
      ] as const) {
        if (done) break;
        const bands = alongX
          ? [
              { z0: r.minZ + 0.2, z1: aisle.minZ },
              { z0: aisle.maxZ, z1: r.maxZ - 0.2 },
            ]
          : [
              { x0: r.minX + 0.2, x1: aisle.minX },
              { x0: aisle.maxX, x1: r.maxX - 0.2 },
            ];
        for (const band of bands) {
          if (done) break;
          if (alongX) {
            const b = band as { z0: number; z1: number };
            if (b.z1 - b.z0 < d) continue;
            // From the wall side of the band toward the walkway, row by row.
            const fromWall = b.z0 === r.minZ + 0.2;
            for (let k = 0; !done; k += 0.25) {
              const z = fromWall ? b.z0 + k : b.z1 - d - k;
              if (z < b.z0 - 1e-9 || z + d > b.z1 + 1e-9) break;
              for (
                let x = r.minX + 0.3;
                x + w <= r.maxX - 0.3 && !done;
                x += 0.25
              ) {
                const fp = rect(x, x + w, z, z + d);
                if (!blocked.some((q) => overlaps(q, fp))) {
                  placed.push({ ...m, rect: fp, y: c.y, chamber: c.id });
                  done = true;
                }
              }
            }
          } else {
            const b = band as { x0: number; x1: number };
            if (b.x1 - b.x0 < w) continue;
            const fromWall = b.x0 === r.minX + 0.2;
            for (let k = 0; !done; k += 0.25) {
              const x = fromWall ? b.x0 + k : b.x1 - w - k;
              if (x < b.x0 - 1e-9 || x + w > b.x1 + 1e-9) break;
              for (
                let z = r.minZ + 0.3;
                z + d <= r.maxZ - 0.3 && !done;
                z += 0.25
              ) {
                const fp = rect(x, x + w, z, z + d);
                if (!blocked.some((q) => overlaps(q, fp))) {
                  placed.push({ ...m, rect: fp, y: c.y, chamber: c.id });
                  done = true;
                }
              }
            }
          }
        }
      }
    }
    if (!done) unplaced.push(m);
  }
  return { placed, unplaced };
}

const grow = (r: Rect, by: number): Rect =>
  rect(r.minX - by, r.maxX + by, r.minZ - by, r.maxZ + by);

/** Every room packed. */
export function packAll() {
  const rooms = [...new Set(machines().map((m) => m.room))];
  const placed: Placed[] = [];
  const unplaced: Machine[] = [];
  for (const room of rooms) {
    const result = pack(room);
    placed.push(...result.placed);
    unplaced.push(...result.unplaced);
  }
  return { placed, unplaced };
}
