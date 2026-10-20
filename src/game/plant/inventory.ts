import type { Point } from '../pool-styles/geometry';
import * as municipal from '../pool-styles/municipal-plan';
import * as tunnel from '../pool-styles/tunnel-plan';
import * as reservoir from '../pool-styles/reservoir-plan';
import * as white from '../pool-styles/white-plan';
import * as atrium from '../pool-styles/atrium-plan';
import { evaporationHeat, evaporationRate } from './evaporation';
import type { Activity } from './evaporation';
import { GROUND, OUTSIDE, fabricLoss, ventilationLoss } from './heat-loss';
import { FABRIC_MASS } from './pool-hall';
import type { HallParams, PoolParams } from './pool-hall';

/**
 * The plant's inventory: everything the pool rooms need behind their
 * Authorised Personnel Only doors, as a graph. Each attraction (each of
 * the five pool rooms) has a plant room of its own, holding the water
 * circuits that serve its pools and features; the plant rooms share a
 * great deal of central infrastructure (the boiler house, the gas and
 * electrical intakes, the chemical store, the balance-tank hall, make-up
 * water, drainage, air handling, the control room and the office), joined
 * by a service corridor. The nodes are attractions, water bodies, rooms
 * and equipment; the edges are what runs between them: pool water, the
 * heating loop, gas, power, chemicals, make-up water, drains, signals,
 * air and people.
 *
 * Everything is sized from the pools themselves (`src/game/pool-styles/`):
 * each circuit's flow from its water's volume and the turnover its kind
 * of pool needs, its filters from its flow, its heat from its surface,
 * the boilers from all of it. The rules are typical UK practice of
 * around 2000 and rules of thumb, not a design calculation: good enough to
 * say how much plant there is and where it goes (`doc/plant-inventory.md`,
 * generated from this). Pure.
 */

// ---- Water bodies, measured from the rooms' plans --------------------------

/** What a body of water is for, which sets how often it must be turned over. */
export type WaterUse =
  | 'learner'
  | 'main'
  | 'diving'
  | 'deep'
  | 'splash'
  | 'feature';

/**
 * How long a body of water of each use may take to pass once through its
 * filters, hours: typical periods for UK public pools (after PWTAG's
 * guidance; approximate). Shallow, warm, busy water is turned over fastest.
 */
export const TURNOVER_HOURS: Record<WaterUse, number> = {
  learner: 1,
  main: 3,
  diving: 4,
  deep: 3,
  splash: 0.5,
  feature: 1,
};

export interface WaterBody {
  id: string;
  name: string;
  /** The attraction (pool room) it is in. */
  attraction: string;
  /** The circuit that treats it: bodies with the same use and water may share one. */
  circuit: string;
  use: WaterUse;
  /** Its surface, m², and volume, m³. */
  area: number;
  volume: number;
  /** The temperature it is kept at, °C. */
  temperature: number;
  /** How agitated it is, which sets how fast it evaporates (`evaporation.ts`). */
  activity: Activity;
  /** Its basin's area (floor and sides), m², through which it loses heat to the ground. */
  basin: number;
}

/** A polygon's area, m² (the shoelace formula). */
export function areaOf(outline: readonly Point[]): number {
  let sum = 0;
  for (let i = 0, j = outline.length - 1; i < outline.length; j = i++)
    sum += outline[j][0] * outline[i][1] - outline[i][0] * outline[j][1];
  return Math.abs(sum) / 2;
}

/** A closed outline's perimeter, m. */
export function perimeterOf(outline: readonly Point[]): number {
  let sum = 0;
  for (let i = 0, j = outline.length - 1; i < outline.length; j = i++)
    sum += Math.hypot(
      outline[i][0] - outline[j][0],
      outline[i][1] - outline[j][1],
    );
  return sum;
}

const rectArea = (r: {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}) => (r.maxX - r.minX) * (r.maxZ - r.minZ);

/** The channel the Porthole Tunnel's water runs in, metres deep (not in its plan). */
const CHANNEL_DEPTH = 0.3;

function measure(): WaterBody[] {
  const bodies: WaterBody[] = [];
  // The Municipal Infinite: a learner pool on its own (warmer, shallower,
  // its own water), and the main and diving pools on one circuit; the
  // diving pool's water runs on down its channel through the north wall.
  for (const p of municipal.POOLS) {
    const area = areaOf(p.outline);
    const channel =
      p.id === 'deep'
        ? (municipal.CHANNEL.to - municipal.CHANNEL.from) *
          (municipal.BOUNDS.minZ - municipal.CHANNEL.end)
        : 0;
    bodies.push({
      id: `municipal-${p.id}`,
      name: `${p.name.charAt(0)}${p.name.slice(1).toLowerCase()}, the Municipal Infinite`,
      attraction: 'municipal',
      circuit: p.id === 'learner' ? 'municipal-learner' : 'municipal-main',
      use: p.id === 'learner' ? 'learner' : p.id === 'deep' ? 'diving' : 'main',
      area: area + channel,
      volume: (area + channel) * p.depth,
      basin:
        area +
        channel +
        perimeterOf(p.outline) * p.depth +
        (p.id === 'deep'
          ? 2 * (municipal.BOUNDS.minZ - municipal.CHANNEL.end) * p.depth
          : 0),
      temperature: p.id === 'learner' ? 31 : 28,
      activity: 'calm',
    });
  }
  // The Porthole Tunnel: its channel and the water underfoot, one small
  // feature circuit.
  const channelTunnel = tunnel.TUNNELS.find((t) => t.channel)!;
  const channelArea = tunnel.lengthOf(channelTunnel) * channelTunnel.channel!;
  const wetTunnel = tunnel.TUNNELS.find((t) => t.wet)!;
  const wetArea = (wetTunnel.wet!.to - wetTunnel.wet!.from) * tunnel.FULL;
  const corridorArea = rectArea(tunnel.CORRIDOR.rect);
  bodies.push(
    {
      id: 'tunnel-channel',
      name: 'Channel, the Porthole Tunnel',
      attraction: 'tunnel',
      circuit: 'tunnel',
      use: 'feature',
      area: channelArea,
      volume: channelArea * CHANNEL_DEPTH,
      basin: channelArea + 2 * tunnel.lengthOf(channelTunnel) * CHANNEL_DEPTH,
      temperature: 28,
      activity: 'flowing',
    },
    {
      id: 'tunnel-wet',
      name: 'Water underfoot, the Porthole Tunnel',
      attraction: 'tunnel',
      circuit: 'tunnel',
      use: 'feature',
      area: wetArea,
      volume: wetArea * wetTunnel.wet!.depth,
      basin: wetArea,
      temperature: 28,
      activity: 'calm',
    },
    {
      id: 'tunnel-corridor',
      name: 'Flooded corridor, the Porthole Tunnel',
      attraction: 'tunnel',
      circuit: 'tunnel',
      use: 'feature',
      area: corridorArea,
      volume: corridorArea * -tunnel.CORRIDOR.floor,
      basin:
        corridorArea +
        2 *
          (tunnel.CORRIDOR.rect.maxX -
            tunnel.CORRIDOR.rect.minX +
            tunnel.CORRIDOR.rect.maxZ -
            tunnel.CORRIDOR.rect.minZ) *
          -tunnel.CORRIDOR.floor,
      temperature: 28,
      activity: 'still',
    },
  );
  // The Reservoir: wall to wall but its landings.
  const reservoirArea =
    rectArea(reservoir.BOUNDS) -
    reservoir.LANDINGS.reduce((s, r) => s + rectArea(r), 0);
  bodies.push({
    id: 'reservoir-water',
    name: 'The Reservoir',
    attraction: 'reservoir',
    circuit: 'reservoir',
    use: 'deep',
    area: reservoirArea,
    volume: reservoirArea * reservoir.DEPTH,
    basin:
      reservoirArea +
      2 *
        (reservoir.BOUNDS.maxX -
          reservoir.BOUNDS.minX +
          reservoir.BOUNDS.maxZ -
          reservoir.BOUNDS.minZ) *
        reservoir.DEPTH,
    temperature: 27,
    activity: 'still',
  });
  // The White Room's diving pool (kept at 30 °C by design: its plaque's
  // 41 °C is a fault).
  const whiteArea = Math.PI * white.POOL.r ** 2;
  bodies.push({
    id: 'white-pool',
    name: 'Diving pool, the White Room',
    attraction: 'white',
    circuit: 'white',
    use: 'diving',
    area: whiteArea,
    volume: whiteArea * white.POOL.depth,
    basin: whiteArea + 2 * Math.PI * white.POOL.r * white.POOL.depth,
    temperature: 30,
    activity: 'calm',
  });
  // The Slide Atrium's two splash pools, on one circuit.
  atrium.POOLS.forEach((p, i) => {
    const area = areaOf(p.outline);
    bodies.push({
      id: `atrium-splash-${i + 1}`,
      name: `Splash pool ${i + 1}, the Slide Atrium`,
      attraction: 'atrium',
      circuit: 'atrium',
      use: 'splash',
      area,
      volume: area * p.depth,
      basin: area + perimeterOf(p.outline) * p.depth,
      temperature: 30,
      // Churned by the slides coming down into them.
      activity: 'gushing',
    });
  });
  return bodies;
}

export const WATER_BODIES: readonly WaterBody[] = measure();

// ---- The attractions, their halls and their features -----------------------

export interface Attraction {
  id: string;
  name: string;
  /** The room id of its pool room. */
  room: string;
  /** Its hall's air, m³, which its air handling must heat and dry. */
  air: number;
  /** Its fabric, m²: its walls, its roof and its floor, through which its hall loses heat to the cold world. */
  walls: number;
  roof: number;
}

export const ATTRACTIONS: readonly Attraction[] = [
  {
    id: 'municipal',
    name: 'The Municipal Infinite',
    room: 'pool_municipal',
    air: rectArea(municipal.BOUNDS) * municipal.CEILING,
    walls: perimeterOf(municipal.wallOutline()) * municipal.CEILING,
    roof: rectArea(municipal.BOUNDS),
  },
  {
    id: 'tunnel',
    name: 'The Porthole Tunnel',
    room: 'pool_tunnel',
    // Its tunnels and chambers, not the dark between them.
    air:
      tunnel.TUNNELS.reduce(
        (s, t) => s + tunnel.lengthOf(t) * tunnel.FULL * tunnel.FULL,
        0,
      ) +
      tunnel.CHAMBERS.reduce((s, c) => s + rectArea(c.rect) * c.height, 0) +
      rectArea(tunnel.CORRIDOR.rect) * tunnel.CORRIDOR.height,
    // Its vaults: walls and roof in one curve, about a half circle round
    // each tunnel; its chambers' walls; its floors as roof.
    walls:
      tunnel.TUNNELS.reduce(
        (s, t) => s + (tunnel.lengthOf(t) * (Math.PI * tunnel.FULL)) / 2,
        0,
      ) +
      tunnel.CHAMBERS.reduce(
        (s, c) =>
          s +
          2 *
            (c.rect.maxX - c.rect.minX + c.rect.maxZ - c.rect.minZ) *
            c.height,
        0,
      ),
    roof:
      tunnel.TUNNELS.reduce((s, t) => s + tunnel.lengthOf(t) * tunnel.FULL, 0) +
      tunnel.CHAMBERS.reduce((s, c) => s + rectArea(c.rect), 0) +
      rectArea(tunnel.CORRIDOR.rect),
  },
  {
    id: 'reservoir',
    name: 'The Reservoir',
    room: 'pool_reservoir',
    air: rectArea(reservoir.BOUNDS) * reservoir.CEILING,
    walls:
      2 *
      (reservoir.BOUNDS.maxX -
        reservoir.BOUNDS.minX +
        reservoir.BOUNDS.maxZ -
        reservoir.BOUNDS.minZ) *
      reservoir.CEILING,
    roof: rectArea(reservoir.BOUNDS),
  },
  {
    id: 'white',
    name: 'The White Room',
    room: 'pool_white',
    air: areaOf(white.OUTLINE) * white.CEILING,
    walls: perimeterOf(white.OUTLINE) * white.CEILING,
    roof: areaOf(white.OUTLINE),
  },
  {
    id: 'atrium',
    name: 'The Slide Atrium',
    room: 'pool_atrium',
    air: areaOf(atrium.OUTLINE) * atrium.HEIGHT,
    walls: perimeterOf(atrium.OUTLINE) * atrium.HEIGHT,
    roof: areaOf(atrium.OUTLINE),
  },
];

/** A feature: something in an attraction that needs plant of its own. */
export interface Feature {
  id: string;
  name: string;
  attraction: string;
  /** The circuit whose water it uses. */
  circuit: string;
  kind: 'flume';
  /** Whether it runs (a closed slide's pump is idle; a slide into thin air has none). */
  running: boolean;
  /** Its trough's wetted surface while it runs, m², gushing water evaporating. */
  wetted: number;
}

/** A slide trough's wetted width, metres. */
const TROUGH_WIDTH = 0.8;
const pathLength = (path: readonly (readonly [number, number, number])[]) =>
  path.slice(1).reduce((s, p, i) => {
    const q = path[i];
    return s + Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
  }, 0);

/** The Slide Atrium's slides: each that runs has a flume pump, lubricating it from the splash pools' circuit. */
export const FEATURES: readonly Feature[] = atrium.SLIDES.map((s) => ({
  id: `flume-${s.id}`,
  name: `${s.colour[0].toUpperCase()}${s.colour.slice(1)} slide (${s.id})`,
  attraction: 'atrium',
  circuit: 'atrium',
  kind: 'flume' as const,
  running: s.rideable,
  wetted: s.rideable ? pathLength(s.path) * TROUGH_WIDTH : 0,
}));

// ---- Sizing ------------------------------------------------------------------

/** A sand filter's area, m² (Ø2.4 m), and the rate water passes through it, m³/h per m² (medium rate). */
export const FILTER_AREA = Math.PI * 1.2 ** 2;
export const FILTER_RATE = 25;
/** A pool hall's air is kept a degree above its warmest water, so the water does not steam more. */
export const HALL_ABOVE_WATER = 1;
/** The air handling's air changes an hour, and the share of their heat it recovers. */
export const AIR_CHANGES = 4;
export const HEAT_RECOVERY = 0.6;
/** Water's heat, kWh per m³ per kelvin, and the rise from mains to pool, K. */
export const WATER_HEAT = 1.163;
export const MAINS_TEMPERATURE = 10;
/** One boiler's output, kW (after the boiler room's Remeha Gas 220 Ace 300). */
export const BOILER_OUTPUT = 300;
/** A flume pump's flow, m³/h, and power, kW: an open-trough slide's, typically. */
export const FLUME_FLOW = 80;
export const FLUME_POWER = 5.5;
/** Circulation pumps' head, m, and efficiency. */
const PUMP_HEAD = 15;
const PUMP_EFFICIENCY = 0.65;

/** The circuits that carry ozone as well as UV: a bit of everything (`plant-model.md`). */
export const OZONE_CIRCUITS: ReadonlySet<string> = new Set([
  'municipal-main',
  'reservoir',
]);

export interface Circuit {
  id: string;
  attraction: string;
  bodies: readonly WaterBody[];
  volume: number;
  area: number;
  /** Its circulation, m³/h: its water turned over in its strictest body's period. */
  flow: number;
  /** Its filters (at least two, so one can backwash). */
  filters: number;
  /** Its evaporation at its temperatures, kg/h, its slides' troughs' included. */
  evaporation: number;
  /** Its heat kept warm (evaporation and other losses), kW, and to heat it from cold, kWh. */
  heat: number;
  heatUp: number;
  /** Each circulation pump's power, kW (duty and standby). */
  pumpPower: number;
  ozone: boolean;
  flumes: readonly Feature[];
}

const circuitIds = [...new Set(WATER_BODIES.map((b) => b.circuit))];

/** A circuit's evaporation, kg/h: its waters', and its running slides' troughs' at its waters' temperature, gushing. */
function evaporationOf(
  bodies: readonly WaterBody[],
  flumes: readonly Feature[],
) {
  const pools = bodies.reduce(
    (s, b) => s + evaporationRate(b.area, b.temperature, b.activity),
    0,
  );
  const troughs = flumes
    .filter((f) => f.running)
    .reduce(
      (s, f) => s + evaporationRate(f.wetted, bodies[0].temperature, 'gushing'),
      0,
    );
  return pools + troughs;
}

export const CIRCUITS: readonly Circuit[] = circuitIds.map((id) => {
  const bodies = WATER_BODIES.filter((b) => b.circuit === id);
  const volume = bodies.reduce((s, b) => s + b.volume, 0);
  const area = bodies.reduce((s, b) => s + b.area, 0);
  const flow = bodies.reduce((s, b) => s + b.volume / TURNOVER_HOURS[b.use], 0);
  return {
    id,
    attraction: bodies[0].attraction,
    bodies,
    volume,
    area,
    flow,
    filters: Math.max(2, Math.ceil(flow / (FILTER_RATE * FILTER_AREA))),
    evaporation: evaporationOf(
      bodies,
      FEATURES.filter((f) => f.circuit === id),
    ),
    // Evaporation, and conduction through its basins into the ground.
    heat:
      evaporationHeat(
        evaporationOf(
          bodies,
          FEATURES.filter((f) => f.circuit === id),
        ),
      ) +
      bodies.reduce(
        (s, b) => s + fabricLoss('basin', b.basin, b.temperature, GROUND),
        0,
      ),
    heatUp: bodies.reduce(
      (s, b) => s + b.volume * WATER_HEAT * (b.temperature - MAINS_TEMPERATURE),
      0,
    ),
    pumpPower: (flow * PUMP_HEAD * 9.81) / 3600 / PUMP_EFFICIENCY,
    ozone: OZONE_CIRCUITS.has(id),
    flumes: FEATURES.filter((f) => f.circuit === id),
  };
});

/** A hall's air temperature: a degree above its warmest water. */
export const hallTemperature = (attraction: string) =>
  Math.max(
    ...WATER_BODIES.filter((b) => b.attraction === attraction).map(
      (b) => b.temperature,
    ),
  ) + HALL_ABOVE_WATER;

/**
 * What a hall loses to the cold world, kW: through its walls and roof to
 * the air outside, through its floor to the ground, and in the air its
 * handling changes (part recovered). The bigger the hall, the more.
 */
export function hallLoss(a: Attraction) {
  const inside = hallTemperature(a.id);
  const fabric =
    fabricLoss('wall', a.walls, inside, OUTSIDE) +
    fabricLoss('roof', a.roof, inside, OUTSIDE) +
    fabricLoss('floor', a.roof, inside, GROUND);
  const ventilation = ventilationLoss(
    a.air,
    AIR_CHANGES,
    inside,
    OUTSIDE,
    HEAT_RECOVERY,
  );
  return { fabric, ventilation, total: fabric + ventilation };
}

/** The whole plant's heat, kW: the pools kept warm, and the halls' fabric and air. */
export function heatDemand() {
  const water = CIRCUITS.reduce((s, c) => s + c.heat, 0);
  const halls = ATTRACTIONS.map(hallLoss);
  const fabric = halls.reduce((s, h) => s + h.fabric, 0);
  const ventilation = halls.reduce((s, h) => s + h.ventilation, 0);
  return {
    water,
    fabric,
    ventilation,
    air: fabric + ventilation,
    total: water + fabric + ventilation,
  };
}

/** The boilers it needs: enough for the demand, and one more on standby. */
export const BOILERS = Math.ceil(heatDemand().total / BOILER_OUTPUT) + 1;

// ---- The graph -----------------------------------------------------------------

export type NodeKind =
  | 'attraction'
  | 'water'
  | 'plant-room'
  | 'shared-room'
  | 'equipment';
export type Medium =
  | 'pool-water'
  | 'lthw'
  | 'gas'
  | 'power'
  | 'chemical'
  | 'make-up'
  | 'drain'
  | 'signal'
  | 'air'
  | 'lighting'
  | 'delivery'
  | 'access';

export interface PlantNode {
  id: string;
  kind: NodeKind;
  name: string;
  /** The room it stands in, for equipment and water. */
  in?: string;
}

export interface PlantEdge {
  from: string;
  to: string;
  medium: Medium;
}

/** The shared infrastructure: the rooms every attraction's plant room depends on. */
export const SHARED_ROOMS: readonly PlantNode[] = [
  ['service-corridor', 'Service corridor'],
  ['boiler-house', 'Boiler house'],
  ['utilities-intake', 'Utilities intake: electricity, gas and water'],
  ['switch-room', 'Electrical switch room'],
  ['loading-bay', 'Loading bay'],
  ['chemical-store', 'Chemical store'],
  ['balance-tanks', 'Balance-tank hall'],
  ['make-up', 'Make-up water: break tank'],
  ['drainage', 'Backwash holding and drainage'],
  ['air-plant', 'Air handling plant'],
  ['control-room', 'Control room'],
  ['office', 'Duty manager’s office'],
].map(([id, name]) => ({ id, name, kind: 'shared-room' as const }));

const plantRoomOf = (attraction: string) => `plant-${attraction}`;

export function buildGraph(): { nodes: PlantNode[]; edges: PlantEdge[] } {
  const nodes: PlantNode[] = [...SHARED_ROOMS];
  const edges: PlantEdge[] = [];
  const node = (id: string, kind: NodeKind, name: string, inRoom?: string) => {
    nodes.push({ id, kind, name, in: inRoom });
    return id;
  };
  const edge = (from: string, to: string, medium: Medium) =>
    edges.push({ from, to, medium });
  const equipment = (id: string, name: string, room: string) =>
    node(id, 'equipment', name, room);

  // The shared plant itself.
  equipment(
    'gas-meter',
    'Gas meter, governor and main gas inlet valve',
    'utilities-intake',
  );
  // The switch room: the supply in, the main switchboard, and its branches
  // (power to every plant room's motor control centre, the lighting, the
  // emergency lighting, and the control room's UPS).
  equipment(
    'supply-intake',
    'Incoming supply: 800 A main isolator and meter',
    'utilities-intake',
  );
  equipment('water-main', 'Water main: stopcock and meter', 'utilities-intake');
  edge('water-main', 'break-tank', 'make-up');
  // And out: the sewer connection, where the wastewater leaves for the
  // municipal sewer, metered (the water company charges for it) and
  // guarded by a non-return valve.
  equipment(
    'sewer-connection',
    'Sewer connection: trade effluent meter and non-return valve',
    'utilities-intake',
  );
  equipment('lv-board', 'LV main switchboard', 'switch-room');
  edge('supply-intake', 'lv-board', 'power');
  equipment(
    'lighting-control',
    'Lighting control panel: contactors, time clocks, switching',
    'switch-room',
  );
  edge('lv-board', 'lighting-control', 'power');
  edge('lighting-control', 'bms', 'signal');
  equipment(
    'emergency-battery',
    'Emergency lighting central battery and changeover',
    'switch-room',
  );
  edge('lv-board', 'emergency-battery', 'power');
  edge('emergency-battery', 'bms', 'signal');
  equipment('ups', 'UPS for the control room', 'switch-room');
  edge('lv-board', 'ups', 'power');
  // The loading bay: deliveries in, chemicals to the store, spares to the
  // plant rooms.
  equipment(
    'goods-in',
    'Goods-in door, dock leveller and pallet truck',
    'loading-bay',
  );
  equipment('order-book', 'Delivery log and order book', 'loading-bay');
  equipment('spares-cage', 'Spares cage', 'loading-bay');
  edge('loading-bay', 'chemical-store', 'delivery');
  for (let i = 1; i <= BOILERS; i++) {
    equipment(
      `boiler-${i}`,
      `Boiler ${i} (${BOILER_OUTPUT} kW)`,
      'boiler-house',
    );
    edge('gas-meter', `boiler-${i}`, 'gas');
    edge('lv-board', `boiler-${i}`, 'power');
    edge(`boiler-${i}`, 'lthw-header', 'lthw');
    edge(`boiler-${i}`, 'bms', 'signal');
  }
  equipment('lthw-header', 'Low-loss header and LTHW pumps', 'boiler-house');
  edge('lv-board', 'lthw-header', 'power');
  equipment(
    'hypochlorite-bulk',
    'Bulk sodium hypochlorite tank',
    'chemical-store',
  );
  equipment('acid-bulk', 'Bulk acid tank (and CO₂ bottles)', 'chemical-store');
  equipment('break-tank', 'Break tank', 'make-up');
  equipment(
    'backwash-tank',
    'Backwash holding tank and pumping station',
    'drainage',
  );
  // Pumped up its rising main to the sewer connection: the basement is
  // deeper than the sewer.
  edge('backwash-tank', 'sewer-connection', 'drain');
  edge('lv-board', 'backwash-tank', 'power');
  equipment('bms', 'BMS outstation, mimics and annunciator', 'control-room');
  edge('ups', 'bms', 'power');
  equipment('duty-desk', 'Duty manager’s desk, logbook and test kit', 'office');
  edge('bms', 'duty-desk', 'signal');

  for (const a of ATTRACTIONS) {
    node(a.id, 'attraction', a.name);
    const room = node(plantRoomOf(a.id), 'plant-room', `Plant room: ${a.name}`);
    // Through its Authorised Personnel Only door, and on to the corridor.
    edge(a.id, room, 'access');
    edge(room, 'service-corridor', 'access');
    // Its hall's air handling unit, in the shared air plant.
    const ahu = equipment(
      `ahu-${a.id}`,
      `Air handling unit: ${a.name}`,
      'air-plant',
    );
    edge(ahu, a.id, 'air');
    edge('lthw-header', ahu, 'lthw');
    edge('lv-board', ahu, 'power');
    edge(ahu, 'bms', 'signal');
    // Its motor control centre and local panel, on a sub-main from the
    // switchboard, reporting to the control room.
    const panel = equipment(
      `panel-${a.id}`,
      `Motor control centre and local panel: ${a.name}`,
      room,
    );
    edge('lv-board', panel, 'power');
    edge(panel, 'bms', 'signal');
    // Its hall's lights, and the emergency lights in its hall and its plant room.
    edge('lighting-control', a.id, 'lighting');
    edge('emergency-battery', a.id, 'lighting');
    edge('emergency-battery', room, 'lighting');
    // Spares and replacements come in by the loading bay.
    edge('loading-bay', room, 'delivery');
  }

  for (const c of CIRCUITS) {
    const room = plantRoomOf(c.attraction);
    const panel = `panel-${c.attraction}`;
    const tag = c.id;
    const tank = equipment(
      `balance-${tag}`,
      `Balance tank: ${tag}`,
      'balance-tanks',
    );
    edge('break-tank', tank, 'make-up');
    for (const b of c.bodies) {
      node(b.id, 'water', b.name, b.attraction);
      edge(b.id, tank, 'pool-water');
    }
    // Duty and standby pumps from the balance tank, to the filters.
    const pumps = equipment(
      `pumps-${tag}`,
      `Circulation pumps, duty and standby: ${tag} (${Math.round(c.flow)} m³/h, ${c.pumpPower.toFixed(1)} kW each)`,
      room,
    );
    edge(tank, pumps, 'pool-water');
    edge(panel, pumps, 'power');
    let from = pumps;
    const filters = equipment(
      `filters-${tag}`,
      `Sand filters × ${c.filters}: ${tag}`,
      room,
    );
    edge(from, filters, 'pool-water');
    edge(filters, 'backwash-tank', 'drain');
    from = filters;
    if (c.ozone) {
      const ozone = equipment(`ozone-${tag}`, `Ozone plant: ${tag}`, room);
      edge(from, ozone, 'pool-water');
      edge(panel, ozone, 'power');
      from = ozone;
    }
    const hx = equipment(
      `hx-${tag}`,
      `Plate heat exchanger: ${tag} (${Math.round(c.heat)} kW)`,
      room,
    );
    edge(from, hx, 'pool-water');
    edge('lthw-header', hx, 'lthw');
    from = hx;
    const uv = equipment(`uv-${tag}`, `UV unit: ${tag}`, room);
    edge(from, uv, 'pool-water');
    edge(panel, uv, 'power');
    from = uv;
    const dosing = equipment(
      `dosing-${tag}`,
      `Dosing and sampling: ${tag}`,
      room,
    );
    edge(from, dosing, 'pool-water');
    edge('hypochlorite-bulk', dosing, 'chemical');
    edge('acid-bulk', dosing, 'chemical');
    edge(panel, dosing, 'power');
    edge(dosing, panel, 'signal');
    for (const b of c.bodies) edge(dosing, b.id, 'pool-water');
    const cleaner = equipment(
      `cleaner-${tag}`,
      `Pool cleaner and vacuum points: ${tag}`,
      room,
    );
    edge(panel, cleaner, 'power');
    for (const f of c.flumes) {
      if (!f.running) continue;
      const pump = equipment(
        `flume-pump-${f.id}`,
        `Flume pump: ${f.name} (${FLUME_FLOW} m³/h)`,
        room,
      );
      edge(tank, pump, 'pool-water');
      edge(pump, c.bodies[0].id, 'pool-water');
      edge(panel, pump, 'power');
    }
  }

  // The shared rooms all open off the service corridor.
  for (const r of SHARED_ROOMS)
    if (r.id !== 'service-corridor') edge('service-corridor', r.id, 'access');
  return { nodes, edges };
}

// ---- The running model's black boxes, from the inventory ------------------------

/** A pool block's parameters for a body of water, at its design temperature. */
export const poolParams = (b: WaterBody): PoolParams => ({
  area: b.area,
  basin: b.basin,
  volume: b.volume,
  activity: b.activity,
  start: b.temperature,
  ground: GROUND,
});

/** A hall block's parameters for an attraction, at its design temperature. */
export const hallParams = (a: Attraction): HallParams => ({
  air: a.air,
  walls: a.walls,
  roof: a.roof,
  changes: AIR_CHANGES,
  recovered: HEAT_RECOVERY,
  mass: FABRIC_MASS * (a.walls + 2 * a.roof),
  outside: OUTSIDE,
  ground: GROUND,
  start: hallTemperature(a.id),
});
