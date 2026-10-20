import { evaporationRate } from './evaporation';
import {
  ATTRACTIONS,
  BOILERS,
  BOILER_OUTPUT,
  CIRCUITS,
  FEATURES,
  SHARED_ROOMS,
  TURNOVER_HOURS,
  WATER_BODIES,
  buildGraph,
  heatDemand,
  hallLoss,
  hallTemperature,
  AIR_CHANGES,
  HEAT_RECOVERY,
} from './inventory';
import { GROUND, OUTSIDE } from './heat-loss';
import { placements } from './placement';
import { capacities } from './capacity';
import { CHAMBERS } from './warren-plan';

/**
 * The plant inventory as a document (`doc/plant-inventory.md`): the
 * water, the circuits and their sizes, the shared plant, each plant room's
 * equipment, and a map of the rooms and what runs between them. Generated,
 * so that it never disagrees with the model; a test checks it is current.
 * Pure.
 */

const n = (v: number, places = 0) =>
  v.toLocaleString('en-GB', {
    maximumFractionDigits: places,
    minimumFractionDigits: places,
  });

/** A Markdown table, its columns padded to line up (as the formatter lays them out). */
function table(
  head: readonly string[],
  rows: readonly (readonly string[])[],
): string[] {
  const widths = head.map((h, i) =>
    Math.max(3, h.length, ...rows.map((r) => r[i].length)),
  );
  const line = (cells: readonly string[]) =>
    `| ${cells.map((c, i) => c.padEnd(widths[i])).join(' | ')} |`;
  return [
    line(head),
    `| ${widths.map((w) => '-'.repeat(w)).join(' | ')} |`,
    ...rows.map(line),
  ];
}

export function inventoryReport(): string {
  const { nodes, edges } = buildGraph();
  const demand = heatDemand();
  const totalVolume = WATER_BODIES.reduce((s, b) => s + b.volume, 0);
  const totalArea = WATER_BODIES.reduce((s, b) => s + b.area, 0);
  const lines: string[] = [];
  lines.push(
    '# Plant inventory',
    '',
    'Generated from `src/game/plant/inventory.ts` by `inventory-report.ts`: do not edit by hand. Run `UPDATE_INVENTORY=1 npx vp test run scripts/update-plant-inventory.test.ts` to regenerate it after the model changes.',
    '',
    `Everything the pool rooms need behind their Authorised Personnel Only doors. Each of the ${ATTRACTIONS.length} attractions has a plant room of its own, holding the water circuits that serve its pools and features; they share the central infrastructure, joined by a service corridor. The sizes come from the pools themselves, by typical UK practice and rules of thumb: enough to say how much plant there is and where it goes, not a design calculation.`,
    '',
    '## The water',
    '',
    `${WATER_BODIES.length} bodies of water, ${n(totalVolume)} m³ in all, with ${n(totalArea)} m² of surface.`,
    '',
    ...table(
      [
        'Water',
        'Use',
        'Activity',
        'Turnover',
        'Surface m²',
        'Volume m³',
        '°C',
        'Evaporation kg/h',
        'Circuit',
      ],
      WATER_BODIES.map((b) => [
        b.name,
        b.use,
        b.activity,
        `${TURNOVER_HOURS[b.use]} h`,
        n(b.area),
        n(b.volume),
        String(b.temperature),
        n(evaporationRate(b.area, b.temperature, b.activity), 1),
        b.circuit,
      ]),
    ),
    '',
    '## The circuits',
    '',
    `Each circuit is one water, treated on its own: balance tank, duty and standby circulation pumps, sand filters (at least two, so one can backwash), ozone where the plant has it, a plate heat exchanger off the heating loop, UV, dosing and sampling, and a pool cleaner.`,
    '',
    ...table(
      [
        'Circuit',
        'Attraction',
        'Volume m³',
        'Flow m³/h',
        'Filters',
        'Ozone',
        'Evaporation kg/h',
        'Heat kW',
        'Heat-up kWh',
        'Flume pumps',
      ],
      CIRCUITS.map((c) => [
        c.id,
        ATTRACTIONS.find((a) => a.id === c.attraction)!.name,
        n(c.volume),
        n(c.flow),
        String(c.filters),
        c.ozone ? 'yes' : 'no',
        n(c.evaporation, 1),
        n(c.heat),
        n(c.heatUp),
        String(c.flumes.filter((f) => f.running).length),
      ]),
    ),
    '',
    `Slides: ${FEATURES.map((f) => `${f.name}${f.running ? '' : ' (no pump: it does not run)'}`).join('; ')}.`,
    '',
    '## Evaporation',
    '',
    `Each body of water loses water to the air in proportion to its temperature and surface, scaled by how agitated it is (still ×0.5, calm ×1, flowing ×2, gushing ×3; \`evaporation.ts\`), and running slides lose more from their wetted troughs. In all about ${n(CIRCUITS.reduce((s, c) => s + c.evaporation, 0))} kg an hour: water the make-up supply must replace, heat the boilers must put back (about 0.68 kWh a kilogram), and moisture the air handling must take back out of the halls.`,
    '',
    '## Heat lost to the cold world',
    '',
    `The pool rooms stand in a cold world: ${OUTSIDE} °C outside, the ground at ${GROUND} °C. Every surface loses heat in proportion to its area and to the difference across it (Q = U·A·ΔT, \`heat-loss.ts\`), so the bigger a hall, the more it loses; and the plant must put it back, or the water and the air cool towards the world's temperature. Each hall is kept a degree above its warmest water, and its air handling changes its air ${AIR_CHANGES} times an hour, recovering ${HEAT_RECOVERY * 100}% of the heat.`,
    '',
    ...table(
      [
        'Attraction',
        'Hall °C',
        'Walls m²',
        'Roof m²',
        'Fabric kW',
        'Ventilation kW',
        'Total kW',
      ],
      ATTRACTIONS.map((a) => {
        const loss = hallLoss(a);
        return [
          a.name,
          String(hallTemperature(a.id)),
          n(a.walls),
          n(a.roof),
          n(loss.fabric),
          n(loss.ventilation),
          n(loss.total),
        ];
      }),
    ),
    '',
    '## Heat',
    '',
    `The pools kept warm (evaporation, and conduction through their basins) need about ${n(demand.water)} kW, the halls' fabric about ${n(demand.fabric)} kW and their ventilation about ${n(demand.ventilation)} kW: ${n(demand.total)} kW in all. That is ${BOILERS} boilers of ${BOILER_OUTPUT} kW, one of them standby. Heating every pool from cold would take about ${n(CIRCUITS.reduce((s, c) => s + c.heatUp, 0))} kWh: roughly ${n(CIRCUITS.reduce((s, c) => s + c.heatUp, 0) / ((BOILERS - 1) * BOILER_OUTPUT) / 24, 1)} days with every duty boiler firing.`,
    '',
    '## Where the rooms go',
    '',
    'Across, from the middle to the edge: what serves every attraction is central (core), what serves one is peripheral, and what must reach the outside world is on the outer edge. Down, by physics: air handling at the roof; deliveries, chemicals, electrics and staff at the surface; treatment and balance tanks just below the pools, which overflow into their tanks by gravity; boilers and drainage in the basement, drainage lowest. Stairs join every level; a hoist serves every room that takes deliveries (`placement.ts`).',
    '',
    ...table(
      ['Room', 'Ring', 'Level', 'Serves', 'Hoist', 'Why'],
      placements().map((p) => [
        p.name,
        p.ring,
        p.level,
        String(p.serves),
        p.hoist ? 'yes' : 'no',
        p.why,
      ]),
    ),
    '',
    '## Is there room enough?',
    '',
    'Each room laid out in `warren-plan.ts` against the floor its equipment needs (`capacity.ts`): every piece of equipment takes an allowance for its footprint and the access round it, and each balance tank is sized for its pool. A room should use no more than 85% of its floor, leaving room to work and to bring in a replacement.',
    '',
    ...table(
      ['Room', 'Needs m²', 'Has m²', 'Used', 'Height m'],
      capacities().map((c) => [
        placements().find((p) => p.room === c.room)?.name ?? c.room,
        n(c.required),
        n(c.floor),
        `${Math.round(c.used * 100)}%`,
        String(
          Math.max(
            ...CHAMBERS.filter((x) => x.room === c.room).map((x) => x.height),
          ),
        ),
      ]),
    ),
    '',
    '## The rooms and their equipment',
    '',
  );
  const rooms = nodes.filter(
    (x) => x.kind === 'plant-room' || x.kind === 'shared-room',
  );
  for (const room of rooms) {
    const kit = nodes.filter((x) => x.kind === 'equipment' && x.in === room.id);
    lines.push(`### ${room.name}`, '');
    if (kit.length) lines.push(...kit.map((k) => `- ${k.name}`), '');
    else lines.push('- (a way through)', '');
  }
  // The map: rooms and attractions, and what runs between them.
  const roomOf = new Map<string, string>();
  for (const x of nodes) {
    if (x.kind === 'equipment' && x.in) roomOf.set(x.id, x.in);
    if (x.kind === 'water' && x.in) roomOf.set(x.id, x.in);
    if (x.kind !== 'equipment' && x.kind !== 'water') roomOf.set(x.id, x.id);
  }
  const links = new Map<string, Set<string>>();
  for (const e of edges) {
    const a = roomOf.get(e.from)!;
    const b = roomOf.get(e.to)!;
    if (a === b) continue;
    const key = `${a}|${b}`;
    if (!links.has(key)) links.set(key, new Set());
    links.get(key)!.add(e.medium);
  }
  const label = (id: string) =>
    nodes.find((x) => x.id === id)!.name.replace(/"/g, "'");
  const safe = (id: string) => id.replace(/[^a-zA-Z0-9]/g, '_');
  lines.push(
    '## The map',
    '',
    'Rooms (attractions on the pool-room side, plant rooms and shared rooms on the plant side) and what runs between them.',
    '',
    '```mermaid',
    'flowchart LR',
    ...[...new Set([...roomOf.values()])].map(
      (id) => `  ${safe(id)}["${label(id)}"]`,
    ),
    ...[...links].map(([key, media]) => {
      const [a, b] = key.split('|');
      return `  ${safe(a)} -->|${[...media].join(', ')}| ${safe(b)}`;
    }),
    '```',
    '',
    `In all: ${nodes.length} nodes (${nodes.filter((x) => x.kind === 'equipment').length} pieces of equipment in ${rooms.length} rooms) and ${edges.length} connections. The shared rooms: ${SHARED_ROOMS.map((r) => r.name).join(', ')}.`,
    '',
  );
  return lines.join('\n');
}
