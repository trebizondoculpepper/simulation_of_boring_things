import { ROOM_SERVICES } from '../../../game/plant/services';
import type { ServiceRoom, Utility } from '../../../game/plant/services';
import { FEEDER_ISOLATOR, layoutRoom } from './room-equipment';
import { cabinetBusbar } from './cabinet-pipes';
import {
  SWITCH_FUSE,
  glandTop,
} from '../../components/industrial-control/logic/enclosures';
import type { Placed, Side } from './room-equipment';
import { machinePorts, placedPort } from './machine-ports';
import { roomStructure } from './room-structure';
import { controlBus, isControlDevice } from './control-bus';
import { chemControlConduits } from './chem-control-conduits';
import type { PipeKindId } from '../../components/core/views/pipe-kinds';

export type Point3 = readonly [number, number, number];
export interface ServiceRoute {
  name: string;
  /** What it carries: a room service, or a control or data cable (`control`). */
  utility: Utility | 'control';
  kind: PipeKindId | 'rectangular-duct' | 'flex-cable';
  od: number;
  points: Point3[];
  /** Machine key, or the room boundary for a supply header. */
  to: string;
}

/**
 * A device wired from its room's local control panel, not by a feed or the
 * control bus of its own: the lounge's annunciator, on the plant room's
 * south wall (the owner, 2026-10-28), takes its supply and its signals
 * from the panel it annunciates for, as such annunciators are.
 */
export const fedByItsPanel = (room: string, key: string) =>
  room === 'plant_pool_01' && key === 'annunciator:pool_01';

const active = (key: string) =>
  /^(pump-pair|pump-panel|uv-unit|ozone-generator|dosing-controller|hypo-pumps|acid-pump|booster-set|make-up-flowmeter|level-instruments|boiler-cascade|lthw-pumps|pressurisation|gas-safety|combustion-panel|mimic-gas|store-extract|lv-switchboard|mcc|central-battery|distribution-board|rotary-isolators|generator-point|ahu|operator-desk|alarm-printer|mimic-|annunciator|chart-recorders|readout-board|bms-outstation|fire-repeater|cctv|chem-control-box)/.test(
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

/** A run's points without its zero-length steps, or points it runs straight on through. */
function dedupe(points: Point3[]) {
  const out: Point3[] = [];
  for (const q of points) {
    const last = out[out.length - 1];
    if (
      last &&
      Math.hypot(q[0] - last[0], q[1] - last[1], q[2] - last[2]) < 1e-6
    )
      continue;
    const before = out[out.length - 2];
    if (before && last) {
      const a = [0, 1, 2].map((k) => last[k] - before[k]);
      const b = [0, 1, 2].map((k) => q[k] - last[k]);
      const cross = Math.hypot(
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
      );
      if (cross < 1e-9 && a[0] * b[0] + a[1] * b[1] + a[2] * b[2] > 0)
        out.pop();
    }
    out.push(q);
  }
  return out;
}

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
  // High level: into the services ceiling's zone, or just under a plain
  // ceiling's slab (`roomStructure`).
  const structure = roomStructure(room);
  if (!structure) return [];
  const y = Math.min(structure.ceilingZone, structure.soffit - 0.15);

  // The room's supply: its switch-fuse on the west wall by the entrance
  // (`FEEDER_ISOLATOR`), its supply in through its first gland, its feed
  // out through its second (turned onto the west wall, its first gland is
  // to the south). Each conduit runs up the wall: the supply from the
  // distribution conduit (or, in a pool plant room, which has none, from
  // the services ceiling at the same height), the feed back up to it.
  // A spa's plant room has its busbar along that wall, and its switch-fuse
  // is fed from it and feeds its cabinet's isolator: those runs are its
  // cabinet's services' (`cabinet-pipes.ts`).
  const feederS = box.d / 2 - FEEDER_ISOLATOR.fromSouth;
  if (!cabinetBusbar(room)) {
    const [gIn, gOut] = SWITCH_FUSE.glands.x;
    const top = FEEDER_ISOLATOR.y + glandTop(SWITCH_FUSE);
    routes.push(
      {
        name: `${room} room supply`,
        utility: 'power',
        kind: 'steel-screwed',
        od: 0.0337,
        points: [
          onWall(box, 'west', feederS - gIn, y, STANDOFF),
          onWall(box, 'west', feederS - gIn, top, STANDOFF),
        ],
        to: 'feeder',
      },
      {
        name: `${room} room feed`,
        utility: 'power',
        kind: 'steel-screwed',
        od: 0.0337,
        points: [
          onWall(box, 'west', feederS - gOut, top, STANDOFF),
          onWall(box, 'west', feederS - gOut, y, STANDOFF),
        ],
        to: 'room',
      },
    );
  }

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
    // The room's switch-fuse hangs on the west wall too.
    panels.push({
      i: -1,
      side: 'west',
      s0: feederS - SWITCH_FUSE.w / 2,
      s1: feederS + SWITCH_FUSE.w / 2,
      y0: FEEDER_ISOLATOR.y - SWITCH_FUSE.h / 2,
      y1: FEEDER_ISOLATOR.y + SWITCH_FUSE.h / 2,
    });
    const used: Record<Side, number[]> = {
      north: [],
      south: [],
      east: [],
      west: [feederS],
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
      if (!active(p.item.key) || fedByItsPanel(room, p.item.key)) continue;
      // Control devices take their power and signals from the room's
      // control bus (`control-bus.ts`), not a feed of their own; but a
      // machine wired to the bus at a control port of its own (the
      // booster set) still takes its power by its own feed.
      if (
        isControlDevice(p.item.key) &&
        !machinePorts(p.item).some((q) => q.service === 'control')
      )
        continue;
      // The switch room's cabinets carry hundreds of amps: heavy trunking
      // to the cable ladder (`cable-containment.ts`), not a conduit.
      if (room === 'switch_room' && SWITCHGEAR.has(p.item.key)) continue;
      const feed = (k: number, n: number) =>
        `${p.item.label} power feed ${i + 1}${n > 1 ? `.${k + 1}` : ''}`;
      const top = topOf(p, i);
      const powers = machinePorts(p.item).filter(
        (port) => port.service === 'power',
      );
      if (p.side === 'island') {
        // Out in the room: a drop from over it, branched off the north run,
        // into each of its power ports, or the middle of its top.
        const ats: Point3[] = powers.length
          ? powers.map((port) => placedPort(p, port.name).at)
          : [[p.x, top, p.z]];
        ats.forEach((at, k) =>
          routes.push({
            name: feed(k, ats.length),
            utility: 'power',
            kind: 'steel-screwed',
            od: 0.0269,
            points: [onWall(box, 'north', at[0], y, o), [at[0], y, at[2]], at],
            to: p.item.key,
          }),
        );
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
      // A machine on the floor by the wall, with power ports: down the wall
      // behind it, out square to each port, and into it along its own
      // direction (over it for a port facing up, level for one facing the
      // wall).
      if (powers.length) {
        powers.forEach((port, k) => {
          const { at, outward } = placedPort(p, port.name);
          const lead: Point3 =
            outward[1] > 0.5
              ? [at[0], at[1] + OUTLET_ABOVE, at[2]]
              : [at[0] + outward[0] * 0.1, at[1], at[2] + outward[2] * 0.1];
          const s = dropAt(
            side,
            alongWall(side, lead[0], lead[2]),
            lo,
            hi,
            lead[1],
            i,
          );
          const square: Point3 =
            side === 'west' || side === 'east'
              ? [lead[0], lead[1], s]
              : [s, lead[1], lead[2]];
          routes.push({
            name: feed(k, powers.length),
            utility: 'power',
            kind: 'steel-screwed',
            od: 0.0269,
            points: dedupe([
              onWall(box, side, s, y, o),
              onWall(box, side, s, lead[1], o),
              square,
              lead,
              at,
            ]),
            to: p.item.key,
          });
        });
        continue;
      }
      // Without them: down the wall behind it to an outlet box over it, and
      // from the box a flexible cable down to it.
      const back = (p.item.back ?? 0) + 0.15;
      const at = onWall(box, side, c, top, back);
      const s = dropAt(side, c, lo, hi, at[1] + OUTLET_ABOVE, i);
      const outlet = onWall(box, side, s, at[1] + OUTLET_ABOVE, o);
      routes.push({
        name: feed(0, 1),
        utility: 'power',
        kind: 'steel-screwed',
        od: 0.0269,
        points: [onWall(box, side, s, y, o), outlet],
        to: p.item.key,
      });
      routes.push({
        name: `${feed(0, 1)} cable`,
        utility: 'power',
        kind: 'flex-cable',
        od: 0.012,
        points: [outlet, at],
        to: p.item.key,
      });
    }
  }

  // The control devices' conduits, each to the nearest point of the
  // room's control bus.
  routes.push(...(controlBus(room)?.stubs ?? []));

  // The wet hall's chemical transfer terminals' data conduits to their
  // control box (prompt 091).
  routes.push(...chemControlConduits(room));

  // The pool plant rooms' process pipework is routed port to port in
  // `room-pipes.ts`.

  // The switch room's switchgear rises in trunking to its cable ladder
  // (`cable-containment.ts`).

  return routes.filter((r) => r.points.every((p) => p.every(Number.isFinite)));
}

export function serviceRooms(): ServiceRoom[] {
  return Object.keys(ROOM_SERVICES) as ServiceRoom[];
}
