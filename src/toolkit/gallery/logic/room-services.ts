import { ROOM_SERVICES } from '../../../game/plant/services';
import type { ServiceRoom, Utility } from '../../../game/plant/services';
import { layoutRoom } from './room-equipment';
import type { Placed, Side } from './room-equipment';
import { machinePorts, placedPort } from './machine-ports';
import type { PipeKindId } from '../../components/core/views/pipe-kinds';

export type Point3 = readonly [number, number, number];
export interface ServiceRoute {
  name: string;
  utility: Utility;
  kind: PipeKindId | 'rectangular-duct' | 'flex-cable';
  od: number;
  points: Point3[];
  /** Machine key, or the room boundary for a supply header. */
  to: string;
}

const active = (key: string) =>
  /^(pump-pair|pump-panel|uv-unit|ozone-generator|dosing-controller|hypo-pumps|acid-pump|booster-set|water-meter|level-instruments|boiler-cascade|lthw-pumps|pressurisation|gas-safety|combustion-panel|mimic-gas|store-extract|lv-switchboard|mcc|central-battery|distribution-board|rotary-isolators|generator-point|ahu|operator-desk|alarm-printer|mimic-|annunciator|chart-recorders|readout-board|bms-outstation|fire-repeater|cctv)/.test(
    key,
  );

/** Physical room runs are in the room's metre frame, with its floor at zero.
 * The four rooms with detailed cabinet/filter routing retain those authored
 * runs; here we give the other spaces a continuous electrical distribution
 * conduit, machine drops, and connections at declared hydraulic ports. */
/** Conduit stands this far off a wall's face, on its saddles, metres. */
export const STANDOFF = 0.05;
/** Drops keep this far apart, centre to centre, metres. */
export const DROP_GAP = 0.08;
/** And this far clear of the edge of a panel they pass in front of. */
export const PASS_CLEAR = 0.03;
/** An outlet box over a machine on the floor sits this far above its top. */
export const OUTLET_ABOVE = 0.25;

/** How far along its wall a point is: z on the east and west walls, x on the others. */
export const alongWall = (side: Side, x: number, z: number) =>
  side === 'west' || side === 'east' ? z : x;

/** The point `off` metres out from a wall's face, `s` along it, at height `y`. */
export function onWall(
  box: { w: number; d: number },
  side: Side,
  s: number,
  y: number,
  off: number,
): Point3 {
  const hw = box.w / 2;
  const hd = box.d / 2;
  if (side === 'west') return [-hw + off, y, s];
  if (side === 'east') return [hw - off, y, s];
  if (side === 'north') return [s, y, -hd + off];
  return [s, y, hd - off];
}

/** The switch room's cabinets, fed by heavy trunking rather than conduit. */
const SWITCHGEAR = new Set(['lv-switchboard', 'mcc', 'central-battery']);

export function roomServiceRoutes(
  room: string,
  /**
   * Each placed machine's top as drawn, by its place in the layout, metres
   * over the floor: where a drop meets it. Its declared box's top if not
   * given.
   */
  drawnTops: readonly (number | undefined)[] = [],
): ServiceRoute[] {
  if (!(room in ROOM_SERVICES)) return [];
  const layout = layoutRoom(room);
  if (!layout) return [];
  const { box, placed } = layout;
  const topOf = (p: Placed, i: number) =>
    drawnTops[i] ?? (p.item.mount === 'floor' ? p.item.h : p.y + p.item.h / 2);
  const routes: ServiceRoute[] = [];
  const roof = room.startsWith('plant_pool_')
    ? 7.2
    : room === 'wet_hall'
      ? 7.2
      : 7;
  const y = roof - 1.1;

  // These rooms already have individually authored cabinet/plant feeders.
  if (
    ![
      'plant_pool_01',
      'plant_pool_02',
      'plant_pool_03',
      'plant_pool_04',
    ].includes(room)
  ) {
    const o = STANDOFF;
    // The distribution conduit: round the room at high level, on its
    // saddles just off every wall, so a drop from any wall meets it.
    routes.push({
      name: `${room} distribution conduit`,
      utility: 'power',
      kind: 'steel-screwed',
      od: 0.0337,
      points: [
        onWall(box, 'south', -box.w / 2 + o, y, o),
        onWall(box, 'north', -box.w / 2 + o, y, o),
        onWall(box, 'north', box.w / 2 - o, y, o),
        onWall(box, 'south', box.w / 2 - o, y, o),
        onWall(box, 'south', -box.w / 2 + o, y, o),
      ],
      to: 'switch_room',
    });
    // What hangs on each wall, that a drop must not pass in front of.
    const panels = placed
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => p.item.mount === 'wall' && p.side !== 'island')
      .map(({ p, i }) => {
        const s = alongWall(p.side as Side, p.x, p.z);
        return {
          i,
          side: p.side as Side,
          s0: s - p.item.w / 2,
          s1: s + p.item.w / 2,
          y0: p.y - p.item.h / 2,
          y1: topOf(p, i),
        };
      });
    const used: Record<Side, number[]> = {
      north: [],
      south: [],
      east: [],
      west: [],
    };
    // The place along its wall for a drop from the conduit down to `low`,
    // nearest `centre` within [lo, hi]: clear of every other panel it
    // would pass in front of, and of the other drops.
    const dropAt = (
      side: Side,
      centre: number,
      lo: number,
      hi: number,
      low: number,
      self: number,
    ) => {
      for (let k = 0; k <= 40; k++) {
        const offset = (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.05;
        const s = centre + offset;
        if (s < lo - 1e-9 || s > hi + 1e-9) continue;
        const clear = panels.every(
          (q) =>
            q.i === self ||
            q.side !== side ||
            q.y1 <= low + 1e-9 ||
            q.y0 >= y ||
            s < q.s0 - PASS_CLEAR - 1e-9 ||
            s > q.s1 + PASS_CLEAR + 1e-9,
        );
        if (
          clear &&
          used[side].every((u) => Math.abs(u - s) >= DROP_GAP - 1e-9)
        ) {
          used[side].push(s);
          return s;
        }
      }
      used[side].push(centre);
      return centre;
    };
    for (const [i, p] of placed.entries()) {
      if (!active(p.item.key)) continue;
      // The switch room's cabinets carry hundreds of amps: heavy trunking
      // to the cable ladder (`cable-containment.ts`), not a conduit.
      if (room === 'switch_room' && SWITCHGEAR.has(p.item.key)) continue;
      const feed = (k: number, n: number) =>
        `${p.item.label} power feed ${i + 1}${n > 1 ? `.${k + 1}` : ''}`;
      const top = topOf(p, i);
      if (p.side === 'island') {
        // Out in the room: a drop from over it, branched off the north run.
        const at: Point3 = [p.x, top, p.z];
        routes.push({
          name: feed(0, 1),
          utility: 'power',
          kind: 'steel-screwed',
          od: 0.0269,
          points: [onWall(box, 'north', p.x, y, o), [p.x, y, p.z], at],
          to: p.item.key,
        });
        continue;
      }
      const side = p.side as Side;
      const c = alongWall(side, p.x, p.z);
      const lo = c - p.item.w / 2 + 0.05;
      const hi = c + p.item.w / 2 - 0.05;
      if (p.item.mount === 'wall') {
        // A panel: down the wall's face into its top.
        const s = dropAt(side, c, lo, hi, top, i);
        routes.push({
          name: feed(0, 1),
          utility: 'power',
          kind: 'steel-screwed',
          od: 0.0269,
          points: [onWall(box, side, s, y, o), onWall(box, side, s, top, o)],
          to: p.item.key,
        });
        continue;
      }
      // A machine on the floor by the wall: its power ports, or one at its
      // top. Down the wall behind it to an outlet box over it, and from the
      // box a flexible cable down to it.
      const powers = machinePorts(p.item).filter(
        (port) => port.service === 'power',
      );
      const back = (p.item.back ?? 0) + 0.15;
      const ats: Point3[] = powers.length
        ? powers.map((port) => placedPort(p, port.name).at)
        : [onWall(box, side, c, top, back)];
      ats.forEach((at, k) => {
        const s = dropAt(
          side,
          alongWall(side, at[0], at[2]),
          lo,
          hi,
          at[1] + OUTLET_ABOVE,
          i,
        );
        const outlet = onWall(box, side, s, at[1] + OUTLET_ABOVE, o);
        routes.push({
          name: feed(k, ats.length),
          utility: 'power',
          kind: 'steel-screwed',
          od: 0.0269,
          points: [onWall(box, side, s, y, o), outlet],
          to: p.item.key,
        });
        routes.push({
          name: `${feed(k, ats.length)} cable`,
          utility: 'power',
          kind: 'flex-cable',
          od: 0.012,
          points: [outlet, at],
          to: p.item.key,
        });
      });
    }
  }

  // The pool plant rooms' process pipework is routed port to port in
  // `room-pipes.ts`.

  // The switch room's switchgear rises in trunking to its cable ladder
  // (`cable-containment.ts`).

  return routes.filter((r) => r.points.every((p) => p.every(Number.isFinite)));
}

export function serviceRooms(): ServiceRoom[] {
  return Object.keys(ROOM_SERVICES) as ServiceRoom[];
}
