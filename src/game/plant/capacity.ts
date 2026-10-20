import { CIRCUITS, buildGraph } from './inventory';
import { CHAMBERS } from './warren-plan';

/**
 * Whether the plant rooms are big enough: each room's equipment, from the
 * inventory, against its chambers' floor. Each kind of equipment takes a
 * floor allowance (its footprint and the access round it, by rule of
 * thumb); each balance tank is sized for its pool (about 5% of its
 * volume, standing 4 m tall, with a metre round it). Pure; m².
 */

/** Floor allowances, m², by the inventory's equipment id prefix. */
export const FOOTPRINT: readonly (readonly [prefix: string, area: number])[] = [
  ['filters-', 13], // per filter: Ø2.4 m and a metre round it
  ['pumps-', 8], // a duty and standby pair on their bases
  ['ozone-', 18], // generator, dryer, booster, contact tank, deozoniser
  ['hx-', 4],
  ['uv-', 3],
  ['dosing-', 5],
  ['cleaner-', 2],
  ['flume-pump-', 5],
  ['panel-', 6], // motor control centre and local panel, with working space
  ['boiler-', 7],
  ['lthw-header', 12],
  ['gas-meter', 4],
  ['water-main', 4],
  ['sewer-connection', 4],
  ['supply-intake', 8],
  ['lv-board', 20], // the switchboard and its working space front and back
  ['lighting-control', 6],
  ['emergency-battery', 8],
  ['ups', 4],
  ['hypochlorite-bulk', 16], // in its bund
  ['acid-bulk', 12],
  ['break-tank', 12],
  ['backwash-tank', 30],
  ['ahu-', 45], // a pool hall unit, with its maintenance space
  ['bms', 12],
  ['duty-desk', 8],
  ['goods-in', 60],
  ['order-book', 2],
  ['spares-cage', 12],
];

/** A balance tank's share of its pool's volume, its height, and the space round it. */
const BALANCE_SHARE = 0.05;
const BALANCE_HEIGHT = 4;
const BALANCE_CLEARANCE = 1;

/** A balance tank's floor allowance, m². */
export function balanceTankArea(volume: number): number {
  const side = Math.sqrt((volume * BALANCE_SHARE) / BALANCE_HEIGHT);
  return (side + 2 * BALANCE_CLEARANCE) ** 2;
}

/** Each room's equipment floor allowance, m². */
export function requiredArea(room: string): number {
  const graph = buildGraph();
  let area = 0;
  for (const n of graph.nodes.filter(
    (x) => x.kind === 'equipment' && x.in === room,
  )) {
    if (n.id.startsWith('balance-')) {
      const circuit = CIRCUITS.find((c) => `balance-${c.id}` === n.id)!;
      area += balanceTankArea(circuit.volume);
      continue;
    }
    if (n.id.startsWith('filters-')) {
      const circuit = CIRCUITS.find((c) => `filters-${c.id}` === n.id)!;
      area += 13 * circuit.filters;
      continue;
    }
    const allowance = FOOTPRINT.find(([prefix]) => n.id.startsWith(prefix));
    area += allowance ? allowance[1] : 4;
  }
  return area;
}

/** A room's floor: all its chambers' plan areas, m². */
export function floorArea(room: string): number {
  return CHAMBERS.filter((c) => c.room === room).reduce(
    (s, c) => s + (c.rect.maxX - c.rect.minX) * (c.rect.maxZ - c.rect.minZ),
    0,
  );
}

export interface Capacity {
  room: string;
  required: number;
  floor: number;
  /** The share of its floor its equipment takes. */
  used: number;
}

/** Every room's capacity: what its equipment needs, what it has. */
export function capacities(): Capacity[] {
  const rooms = [
    ...new Set(CHAMBERS.map((c) => c.room).filter((r): r is string => !!r)),
  ];
  return rooms.map((room) => {
    const required = requiredArea(room);
    const floor = floorArea(room);
    return { room, required, floor, used: floor ? required / floor : Infinity };
  });
}
