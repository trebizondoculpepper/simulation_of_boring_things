import { ROOM_SERVICES } from '../../../game/plant/services';
import type { ServiceRoom, Utility } from '../../../game/plant/services';
import { layoutRoom } from './room-equipment';
import { machinePorts, placedPort } from './machine-ports';
import type { PipeKindId } from '../../components/core/views/pipe-kinds';

export type Point3 = readonly [number, number, number];
export interface ServiceRoute {
  name: string;
  utility: Utility;
  kind: PipeKindId | 'rectangular-duct';
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
/** The switch room's cabinets, fed by heavy trunking rather than conduit. */
const SWITCHGEAR = new Set(['lv-switchboard', 'mcc', 'central-battery']);

export function roomServiceRoutes(room: string): ServiceRoute[] {
  if (!(room in ROOM_SERVICES)) return [];
  const layout = layoutRoom(room);
  if (!layout) return [];
  const { box, placed } = layout;
  const routes: ServiceRoute[] = [];
  const roof = room.startsWith('plant_pool_')
    ? 7.2
    : room === 'wet_hall'
      ? 7.2
      : 7;
  const y = roof - 1.1;
  const west = -box.w / 2 + 0.3;
  const east = box.w / 2 - 0.3;
  const north = -box.d / 2 + 0.32;
  const south = box.d / 2;

  // These rooms already have individually authored cabinet/plant feeders.
  if (
    ![
      'plant_pool_01',
      'plant_pool_02',
      'plant_pool_03',
      'plant_pool_04',
    ].includes(room)
  ) {
    routes.push({
      name: `${room} distribution conduit`,
      utility: 'power',
      kind: 'steel-screwed',
      od: 0.0337,
      points: [
        [west, y, south],
        [west, y, north],
        [east, y, north],
      ],
      to: 'switch_room',
    });
    for (const [i, p] of placed.entries()) {
      if (!active(p.item.key)) continue;
      // The switch room's cabinets carry hundreds of amps: heavy trunking,
      // below, not a conduit.
      if (room === 'switch_room' && SWITCHGEAR.has(p.item.key)) continue;
      // Every power port of it (a pump pair has one a motor); a machine
      // with none, at its top.
      const powers = machinePorts(p.item).filter(
        (port) => port.service === 'power',
      );
      const ats: Point3[] = powers.length
        ? powers.map((port) => placedPort(p, port.name).at)
        : [
            [
              p.x,
              p.item.mount === 'floor'
                ? p.item.h + 0.08
                : p.y + p.item.h / 2 + 0.08,
              p.z,
            ],
          ];
      // Each has its own short metal conduit. On a wall panel the cable
      // enters at its top, with no tube through its front face.
      ats.forEach((at, k) =>
        routes.push({
          name: `${p.item.label} power feed ${i + 1}${ats.length > 1 ? `.${k + 1}` : ''}`,
          utility: 'power',
          kind: 'steel-screwed',
          od: 0.0269,
          points: [at, [at[0], y, at[2]], [at[0], y, north]],
          to: p.item.key,
        }),
      );
    }
  }

  // The pool plant rooms' process pipework is routed port to port in
  // `room-pipes.ts`.

  if (room === 'switch_room') {
    // Each cabinet, flush to its wall, its 300 mm cable trunking up off its
    // top and into the nearest of the east, west and south walls, where
    // the cables go on out of sight to the rooms they feed.
    for (const p of placed) {
      if (!SWITCHGEAR.has(p.item.key)) continue;
      const top = p.item.h;
      const level = top + 0.45;
      const walls = [
        { d: p.x - -box.w / 2, to: [-box.w / 2, level, p.z] as Point3 },
        { d: box.w / 2 - p.x, to: [box.w / 2, level, p.z] as Point3 },
        { d: box.d / 2 - p.z, to: [p.x, level, box.d / 2] as Point3 },
      ].sort((a, b) => a.d - b.d);
      routes.push({
        name: `${p.item.label} trunking`,
        utility: 'power',
        kind: 'rectangular-duct',
        od: 0.3,
        points: [[p.x, top, p.z], [p.x, level, p.z], walls[0].to],
        to: p.item.key,
      });
    }
  }

  if (room === 'air_plant') {
    // An AHU's four spigots are built into its model; the paired supply
    // and extract duct corridors leave the east and west sides of the room.
    for (const [i, p] of placed.entries()) {
      if (p.item.key !== 'ahu') continue;
      const top = Math.min(p.item.h + 0.35, y - 0.25);
      for (const side of [-1, 1] as const) {
        const wallX = side < 0 ? -box.w / 2 : box.w / 2;
        routes.push({
          name: `${p.item.label} ${side < 0 ? 'extract' : 'supply'} duct ${i + 1}`,
          utility: 'air',
          kind: 'rectangular-duct',
          od: 0.5,
          points: [
            [p.x, top, p.z + side * 0.35],
            [wallX, top, p.z + side * 0.35],
          ],
          to: p.item.key,
        });
      }
    }
  }
  return routes.filter((r) => r.points.every((p) => p.every(Number.isFinite)));
}

export function serviceRooms(): ServiceRoom[] {
  return Object.keys(ROOM_SERVICES) as ServiceRoom[];
}
