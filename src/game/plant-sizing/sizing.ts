import { ahuSizeFor, ductSize, STACKED_MAX } from './ahu-range';
import type {
  AttractionConfig,
  WaterBodyConfig,
  WaterUse,
} from './pools.config';

/**
 * Plant sizing: from the pools (`pools.config.ts`), the machinery they
 * need, the plant rooms to hold it and how big each must be, and which
 * level of the plant building each should be on. Pure; rerun whenever the
 * pools change (`scripts/plant-sizing.test.ts`).
 *
 * Each attraction has its own plant room, however small: its filters,
 * circulation pumps, UV, heat exchanger and dosing. Everything they share
 * is in the main plant facility: the balance tanks, break tank and
 * backwash tank in the wet hall; and round it the boiler house, the
 * hypochlorite and acid stores, the loading bay, the switch room, the air
 * handling plant, the control room and an office.
 *
 * The method is a designer's first pass, from general knowledge of UK pool
 * practice (PWTAG's code, VDI 2089 for evaporation): good for proportions
 * and counts, not for a real building. Every assumption is in `ASSUME`.
 */

/** The plant building's levels, and its gantries' width round the wet hall. */
export const LEVELS = 3;
export const GANTRY = 2.6;

export const ASSUME = {
  /** Turnover period by use, hours: the time to pass a pool's volume. */
  turnover: {
    leisure: 2.5,
    teaching: 1,
    spa: 0.1,
    footspa: 0.05,
    footbath: 0.1,
    competition: 3.5,
    children: 0.5,
  } as Record<WaterUse, number>,
  /**
   * How hard each use is on its water, against a leisure pool's 1: its
   * disinfectant demand and its fresh-water dilution scale by it. Children
   * and spas foul their water most; a competition pool, swum by few for
   * its size, least.
   */
  chemistry: {
    leisure: 1,
    teaching: 1.5,
    spa: 2.5,
    footspa: 3,
    footbath: 4,
    competition: 0.7,
    children: 2.5,
  } as Record<WaterUse, number>,
  /** An open-top slide's water, m³/h, and its pump's head over the drop, m. */
  slideFlow: 20,
  slideHeadOver: 5,
  /**
   * Below this circulation, m³/h, a circuit gets a packaged spa set (pump,
   * cartridge filter, UV and heat exchanger on one skid) instead of pool
   * plant: a foot spa's, or a commercial spa's (the Jacuzzi's, once 28 m³/h, now 8),
   * as such skids are sold to about 30 m³/h.
   */
  packageBelow: 30,
  /** Standing room in front of a prefabricated plant cabinet's doors, m. */
  cabinetAccess: 1,
  /** Medium-rate sand filtration, m/h, and the filter sizes on offer, m. */
  filterRate: 25,
  filterDiameters: [0.6, 0.9, 1.2, 1.6, 2.0, 2.4, 2.8, 3.0],
  /** The most filters a circuit has before the largest size is taken. */
  maxFilters: 4,
  /** Circulation pump head, m, and the set's efficiency. */
  pumpHead: 15,
  pumpEfficiency: 0.7,
  /** Evaporation coefficient by use, kg/(m²·h·kPa) (VDI 2089's order). */
  evaporation: {
    leisure: 0.12,
    teaching: 0.14,
    spa: 0.21,
    footspa: 0.21,
    footbath: 0.14,
    competition: 0.1,
    children: 0.18,
  } as Record<WaterUse, number>,
  /** Hall air: relative humidity, and degrees above its warmest water. */
  hallHumidity: 0.6,
  hallAbove: 1,
  /** Moisture outdoor air can take away, kg water per m³ of air. */
  dryingPerM3: 0.0048,
  /** The least air changes an hour in a hall. */
  airChanges: 4,
  /**
   * Air handling units' largest size, m³/h: the DanX XWPS 9/18's greatest
   * airflow, the largest the air plant stacks (`ahu-range.ts`); and their
   * duct face speed, m/s.
   */
  ahuMax: STACKED_MAX.max,
  ahuFaceSpeed: 2.5,
  /** Heat recovery on the air handling, and the winter outdoor design, °C. */
  heatRecovery: 0.6,
  outdoor: -2,
  /** Latent heat of evaporation, kWh/kg, and other pool losses, a share. */
  latent: 0.68,
  poolOtherLosses: 0.2,
  /** A boiler's output, kW; one more than needed is fitted (N + 1). */
  boilerOutput: 300,
  /** Balance tank: the larger of this share of volume and these hours of flow. */
  balanceShare: 0.08,
  balanceHours: 0.15,
  balanceDepth: 2,
  /** Chemicals a day per m³ of water, litres; days held in store. */
  hypoPerM3: 0.08,
  acidPerM3: 0.03,
  storeDays: 14,
  /** One IBC (1 m³ intermediate bulk container) on its bund. */
  ibc: { litres: 1000, w: 1.2, d: 1.0, h: 1.2 },
  /** Fan power per unit air flow, kW per m³/s. */
  fanPower: 2,
  /** A switchboard panel: its width and what load it serves, kW. */
  panel: { w: 0.8, d: 0.6, h: 2.1, kw: 120 },
  /** Water's heat, kWh/(m³·K), and the heating ring's temperature drop, K. */
  waterHeat: 1.163,
  lthwDrop: 20,
  /** Design speeds in pipes, m/s. */
  pipeSpeed: { lthw: 1, water: 1.5, drain: 1.5 },
  /** Filter backwash rate, m/h, for 5 minutes; filters backwashed every other day. */
  backwashRate: 50,
  /** Fresh water to dilute the pools, a share of their volume a day. */
  dilutionPerDay: 0.01,
  /** Clear space round each machine, and the share added for walkways. */
  clearance: 0.8,
  circulation: 0.35,
  /** Headroom over the tallest machine for services, m; a storey's height. */
  servicesZone: 1.5,
  storey: 4,
};

/** Saturated vapour pressure of water, kPa, at T °C (Magnus). */
export const saturation = (t: number) =>
  0.6108 * Math.exp((17.27 * t) / (t + 237.3));

export interface Machine {
  /** What it is: 'Circulation pump', 'Sand filter'. */
  kind: string;
  /** Which one, for the inventory: 'Main pool, duty'. */
  name: string;
  w: number;
  d: number;
  h: number;
  /** A figure worth showing: '96 m³/h', '2.4 m dia'. */
  rating?: string;
  /** Clear space round it, if not the usual (`ASSUME.clearance`). */
  clearance?: number;
}

export interface Circuit {
  attraction: string;
  body: WaterBodyConfig;
  /** Circulation, m³/h. */
  flow: number;
  filters: { count: number; diameter: number };
  pumpPower: number;
  /** Evaporation, kg/h, and the heat to keep it warm, kW. */
  evaporation: number;
  heat: number;
  balanceTank: number;
}

export interface Hall {
  attraction: AttractionConfig;
  airTemperature: number;
  evaporation: number;
  /** Air handling, m³/h, set by drying or air changes, whichever is more. */
  airflow: number;
  drivenBy: 'drying' | 'air changes';
  units: number;
  /** The air's heating, kW, after heat recovery. */
  heat: number;
}

/** A circuit's sizing: one per body of water. */
export function sizeCircuit(
  attraction: string,
  body: WaterBodyConfig,
  airTemperature: number,
): Circuit {
  const flow = body.volume / ASSUME.turnover[body.use];
  const needed = flow / ASSUME.filterRate;
  // Two at least, so one can backwash, for all but spas and foot spas.
  const min =
    body.use === 'spa' || body.use === 'footspa' || body.use === 'footbath'
      ? 1
      : 2;
  const area = (d: number) => Math.PI * (d / 2) ** 2;
  // The fewest filters (but no fewer than the least): the smallest size
  // that does it with that many; if none does, more of the largest.
  const fits = (d: number, n: number) => needed / area(d) <= n;
  const diameter =
    ASSUME.filterDiameters.find((d) => fits(d, min)) ??
    ASSUME.filterDiameters.find(
      (d) => Math.ceil(needed / area(d)) <= ASSUME.maxFilters,
    ) ??
    ASSUME.filterDiameters[ASSUME.filterDiameters.length - 1];
  const count = Math.max(min, Math.ceil(needed / area(diameter)));
  const evaporation =
    body.area *
    ASSUME.evaporation[body.use] *
    Math.max(
      0,
      saturation(body.temperature) -
        ASSUME.hallHumidity * saturation(airTemperature),
    );
  return {
    attraction,
    body,
    flow,
    filters: { count, diameter },
    pumpPower:
      (flow * ASSUME.pumpHead * 9.81 * 1000) /
      3600 /
      1000 /
      ASSUME.pumpEfficiency,
    evaporation,
    heat: evaporation * ASSUME.latent * (1 + ASSUME.poolOtherLosses),
    balanceTank: Math.max(
      0.3,
      ASSUME.balanceShare * body.volume,
      ASSUME.balanceHours * flow,
    ),
  };
}

/** A hall's air handling. */
export function sizeHall(
  attraction: AttractionConfig,
  circuits: readonly Circuit[],
): Hall {
  const airTemperature =
    Math.max(...attraction.bodies.map((b) => b.temperature)) + ASSUME.hallAbove;
  const evaporation = circuits.reduce((s, c) => s + c.evaporation, 0);
  const drying = evaporation / ASSUME.dryingPerM3;
  const changes = attraction.hallAir * ASSUME.airChanges;
  const airflow = Math.max(drying, changes);
  return {
    attraction,
    airTemperature,
    evaporation,
    airflow,
    drivenBy: drying > changes ? 'drying' : 'air changes',
    units: Math.max(1, Math.ceil(airflow / ASSUME.ahuMax)),
    heat:
      ((airflow * 1.2 * 1.005) / 3600) *
      (airTemperature - ASSUME.outdoor) *
      (1 - ASSUME.heatRecovery),
  };
}

/**
 * An air handling unit's casing for `airflow` m³/h: the DanX XWPS size
 * that carries it (`ahu-range.ts`), with its ducts' connections at its
 * ends, as the air plant stands them.
 */
export function ahuCasing(airflow: number) {
  const size = ahuSizeFor(airflow);
  return {
    w: size.length + 2 * (0.25 + ductSize(size).w),
    d: size.depth,
    h: size.height,
  };
}

export interface PlantRoom {
  id: string;
  name: string;
  /** Which part of the plant it is. */
  part: 'attraction' | 'wet hall' | 'shared';
  machines: Machine[];
  /** Floor area needed, m², a suggested plan, and height and storeys. */
  area: number;
  w: number;
  d: number;
  height: number;
  storeys: number;
  /** Its recommended level (0 the lowest), and why. */
  level: number;
  why: string;
  /** What it needs besides floor: an outside wall, vehicle access, a flue… */
  needs: string[];
}

/**
 * A room's size to hold `machines`: each with clear space round it, and a
 * share more for walkways; a plan no more than 1.6 times as long as it is
 * wide, and wide enough for its biggest machine and an aisle.
 */
export function roomSize(machines: readonly Machine[]) {
  const clear = (m: Machine) => m.clearance ?? ASSUME.clearance;
  const footprint = machines.reduce(
    (s, m) => s + (m.w + 2 * clear(m)) * (m.d + 2 * clear(m)),
    0,
  );
  const area = Math.max(6, footprint * (1 + ASSUME.circulation));
  const widest = Math.max(
    2,
    ...machines.map((m) => Math.min(m.w, m.d) + 2 * clear(m) + 1.2),
  );
  const longest = Math.max(
    2,
    ...machines.map((m) => Math.max(m.w, m.d) + 2 * clear(m)),
  );
  let w = Math.max(widest, Math.sqrt(area / 1.6));
  let d = Math.max(longest, area / w);
  if (d < w) [w, d] = [d, w];
  const round = (v: number) => Math.ceil(v * 2) / 2;
  const height = Math.max(...machines.map((m) => m.h), 2) + ASSUME.servicesZone;
  return {
    area: round(w) * round(d),
    w: round(w),
    d: round(d),
    height,
    storeys: Math.max(1, Math.ceil(height / ASSUME.storey)),
  };
}

/** A service run from one room to many: a ring main or a set of lines. */
export interface Ring {
  name: string;
  /** The room it starts from, and the rooms it serves. */
  from: string;
  serves: string[];
  /** Its design flow, m³/h, and its nominal bore, mm. */
  flow: number;
  dn: number;
  note: string;
}

/** Nominal pipe bores, mm. */
export const DN = [
  15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300,
];

/** The smallest bore that carries `flow` m³/h at no more than `speed` m/s. */
export function dnFor(flow: number, speed: number) {
  const bore = Math.sqrt((4 * (flow / 3600)) / (Math.PI * speed)) * 1000;
  return DN.find((d) => d >= bore) ?? DN[DN.length - 1];
}

/** Water lost and replaced a day, m³: evaporation, backwashing, dilution. */
export function makeUpPerDay(circuits: readonly Circuit[], volume: number) {
  const evaporated = circuits.reduce((s, c) => s + c.evaporation, 0) * 0.024;
  const backwashed = circuits.reduce(
    (s, c) =>
      s +
      (c.filters.count *
        Math.PI *
        (c.filters.diameter / 2) ** 2 *
        ASSUME.backwashRate *
        (5 / 60)) /
        2,
    0,
  );
  const diluted = circuits.reduce(
    (sum, c) =>
      sum +
      c.body.volume * ASSUME.dilutionPerDay * ASSUME.chemistry[c.body.use],
    0,
  );
  return evaporated + backwashed + (diluted || volume * ASSUME.dilutionPerDay);
}

export interface PlantSizing {
  circuits: Circuit[];
  halls: Hall[];
  rooms: PlantRoom[];
  rings: Ring[];
  totals: {
    flow: number;
    poolHeat: number;
    airHeat: number;
    heat: number;
    boilers: number;
    airflow: number;
    ahus: number;
    load: number;
    hypoLitresPerDay: number;
    acidLitresPerDay: number;
  };
}

const r1 = (v: number) => Math.round(v * 10) / 10;

export function sizePlant(pools: readonly AttractionConfig[]): PlantSizing {
  const circuits: Circuit[] = [];
  const halls: Hall[] = [];
  for (const a of pools) {
    const airTemperature =
      Math.max(...a.bodies.map((b) => b.temperature)) + ASSUME.hallAbove;
    const own = a.bodies.map((b) => sizeCircuit(a.id, b, airTemperature));
    circuits.push(...own);
    halls.push(sizeHall(a, own));
  }
  const volume = pools.reduce(
    (s, a) => s + a.bodies.reduce((t, b) => t + b.volume, 0),
    0,
  );
  const poolHeat = circuits.reduce((s, c) => s + c.heat, 0);
  const airHeat = halls.reduce((s, h) => s + h.heat, 0);
  const heat = poolHeat + airHeat;
  const boilers = Math.ceil(heat / ASSUME.boilerOutput) + 1;
  const airflow = halls.reduce((s, h) => s + h.airflow, 0);
  const ahus = halls.reduce((s, h) => s + h.units, 0);
  const uvPower = (flow: number) => 0.02 * flow + 0.3;
  const load =
    circuits.reduce((s, c) => s + 2 * c.pumpPower + uvPower(c.flow), 0) * 0.6 +
    (airflow / 3600) * ASSUME.fanPower +
    boilers * 1.5 +
    20;

  // ---- Each attraction's own plant room ---------------------------------
  const rooms: PlantRoom[] = [];
  pools.forEach((a, i) => {
    const machines: Machine[] = [];
    for (const c of circuits.filter((c) => c.attraction === a.id)) {
      const n = c.body.name;
      if (c.flow < ASSUME.packageBelow) {
        // Too small for pool plant: a packaged spa set, as a hot tub or
        // foot spa has, a small pump, cartridge filter, inline UV and
        // heat exchanger on one skid, and a wall-hung dosing controller.
        machines.push({
          kind: 'Packaged spa set',
          name: `${n} (pump, cartridge filter, UV, heat exchanger, surge vessel)`,
          w: 1 + c.flow * 0.04,
          d: 0.6,
          h: 1.1,
          rating: `${r1(c.flow)} m³/h, ${r1(c.pumpPower)} kW`,
          clearance: 0.5,
        });
        machines.push({
          kind: 'Wall dosing controller',
          name: `${n} (with peristaltic pumps)`,
          w: 0.5,
          d: 0.25,
          h: 0.6,
          clearance: 0.4,
        });
        // A spa's jet pump and air blower, in their own bay of its cabinet.
        if (c.body.use === 'spa') {
          machines.push({
            kind: 'Spa jet pump',
            name: n,
            w: 0.8,
            d: 0.35,
            h: 0.45,
            rating: '2.2 kW',
            clearance: 0.1,
          });
          machines.push({
            kind: 'Spa air blower',
            name: n,
            w: 0.45,
            d: 0.4,
            h: 0.4,
            rating: '2.2 kW',
            clearance: 0.1,
          });
        }
        continue;
      }
      // The pool's own balance tank: its water is never shared.
      const tankSide = Math.max(
        0.8,
        Math.sqrt(c.balanceTank / ASSUME.balanceDepth),
      );
      machines.push({
        kind: 'Balance tank',
        name: n,
        w: tankSide,
        d: tankSide,
        h: ASSUME.balanceDepth + 0.3,
        rating: `${r1(c.balanceTank)} m³`,
      });
      const fd = c.filters.diameter;
      for (let k = 0; k < c.filters.count; k++)
        machines.push({
          kind: 'Sand filter',
          name: `${n} ${k + 1}`,
          w: fd,
          d: fd,
          h: fd + 0.9,
          rating: `${fd} m dia`,
        });
      const pump =
        c.flow > 60
          ? { w: 1.9, d: 0.7, h: 1.1 }
          : c.flow > 10
            ? { w: 1.2, d: 0.5, h: 0.8 }
            : { w: 0.6, d: 0.35, h: 0.5 };
      for (const duty of ['duty', 'standby'])
        machines.push({
          kind: 'Circulation pump',
          name: `${n}, ${duty}`,
          ...pump,
          rating: `${r1(c.flow)} m³/h, ${r1(c.pumpPower)} kW`,
        });
      machines.push({ kind: 'Strainer', name: n, w: 0.6, d: 0.5, h: 0.8 });
      machines.push({
        kind: 'UV unit',
        name: n,
        w: c.flow > 30 ? 1.6 : 0.9,
        d: 0.5,
        h: 0.6,
        rating: `${r1(c.flow)} m³/h`,
      });
      machines.push({
        kind: 'Plate heat exchanger',
        name: n,
        w: 0.8,
        d: 0.5,
        h: 1.2,
        rating: `${r1(c.heat)} kW`,
      });
      machines.push({
        kind: 'Dosing set',
        name: `${n} (controller, hypochlorite and acid pumps)`,
        w: 1.2,
        d: 0.6,
        h: 1.6,
      });
      if (c.body.ozone) {
        machines.push({
          kind: 'Ozone generator',
          name: n,
          w: 1.2,
          d: 0.8,
          h: 2,
        });
        const t = Math.max(0.8, Math.sqrt((c.flow * 2) / 60 / 2));
        machines.push({
          kind: 'Ozone contact tank',
          name: n,
          w: t,
          d: t,
          h: 2.4,
        });
      }
    }
    // A spa's own: its jet pump and its air blower, after the room's
    // Speck BADU 90/40 and side-channel blower exhibits.
    for (const c of circuits.filter(
      (c) =>
        c.attraction === a.id &&
        c.body.use === 'spa' &&
        c.flow >= ASSUME.packageBelow,
    )) {
      machines.push({
        kind: 'Spa jet pump',
        name: c.body.name,
        w: 0.8,
        d: 0.35,
        h: 0.45,
        rating: '2.2 kW',
      });
      machines.push({
        kind: 'Spa air blower',
        name: c.body.name,
        w: 0.45,
        d: 0.4,
        h: 0.4,
        rating: '2.2 kW',
      });
    }
    // Open-top slides: a pump each lifting their water to the top.
    if (a.slides)
      for (let k = 0; k < a.slides.count; k++) {
        const head = a.slides.drop + ASSUME.slideHeadOver;
        const kw =
          (ASSUME.slideFlow * head * 9.81) / 3600 / ASSUME.pumpEfficiency;
        machines.push({
          kind: 'Slide water pump',
          name: `Slide ${k + 1}`,
          w: 1.2,
          d: 0.5,
          h: 0.8,
          rating: `${ASSUME.slideFlow} m³/h at ${head} m, ${kw.toFixed(1)} kW`,
        });
      }
    const level = i % 3;
    const why =
      'attraction rooms are spread over every level, so pipes go everywhere';
    const own = circuits.filter((c) => c.attraction === a.id);
    if (own.every((c) => c.flow < ASSUME.packageBelow)) {
      // So small its whole plant room is prefabricated: a factory-built
      // cabinet with its spa set, dosing and controls inside, delivered
      // complete, with room to stand at its doors.
      const inside = machines.reduce((s, m) => s + m.w, 0);
      const cabinet: Machine = {
        kind: 'Prefabricated plant cabinet',
        name: `${a.name} (${machines.map((m) => m.kind.toLowerCase()).join(', ')} inside)`,
        w: Math.max(1.4, inside * 0.8 + 0.3),
        d: 0.9,
        h: 2.1,
        rating: own.map((c) => `${r1(c.flow)} m³/h`).join(', '),
        clearance: 0,
      };
      const w = Math.ceil((cabinet.w + 0.6) * 2) / 2;
      const d = Math.ceil((cabinet.d + ASSUME.cabinetAccess) * 2) / 2;
      rooms.push({
        id: `plant-${a.id}`,
        name: `${a.name} plant cabinet (prefabricated)`,
        part: 'attraction',
        machines: [cabinet],
        area: w * d,
        w,
        d,
        height: cabinet.h + 0.5,
        storeys: 1,
        level,
        why,
        needs: ['a recess off a gantry or corridor, its doors opening onto it'],
      });
      return;
    }
    rooms.push(
      room(
        `plant-${a.id}`,
        `${a.name} plant room`,
        'attraction',
        machines,
        level,
        why,
      ),
    );
  });

  // ---- The wet hall: the water services every pool shares -------------
  // Each pool keeps its own water (its balance tank is in its own room);
  // what is shared is the make-up water in, the backwash and drainage out,
  // and the rings that run from here to every room.
  const wet: Machine[] = [];
  const makeUp = Math.max(1, (volume * 0.02) / 4);
  const daily = makeUpPerDay(circuits, volume);
  wet.push({
    kind: 'Break tank (Category 5)',
    name: 'Make-up water',
    w: Math.sqrt(makeUp / 1.5),
    d: Math.sqrt(makeUp / 1.5),
    h: 1.8,
    rating: `${r1(makeUp)} m³`,
  });
  wet.push({
    kind: 'Booster set',
    name: 'Make-up main (duty and standby pumps)',
    w: 1.4,
    d: 0.8,
    h: 1.3,
    rating: `${r1(daily / 24)} m³/h average`,
  });
  const biggest = Math.max(
    ...circuits
      .filter((c) => c.flow >= ASSUME.packageBelow)
      .map((c) => c.filters.diameter),
    0.6,
  );
  const backwash =
    Math.PI * (biggest / 2) ** 2 * ASSUME.backwashRate * (5 / 60);
  wet.push({
    kind: 'Backwash holding tank',
    name: 'Backwash',
    w: Math.max(1, Math.sqrt(backwash / 2)),
    d: Math.max(1, Math.sqrt(backwash / 2)),
    h: 2.3,
    rating: `${r1(backwash)} m³`,
  });
  // The wet hall is the main plant room: square, three storeys high, with
  // gantries round it at the upper two levels to the rooms' doors.
  const hall = room(
    'wet-hall',
    'Wet hall (main plant room)',
    'wet hall',
    wet,
    0,
    'lowest, so every room’s backwash and drainage falls to its holding tank',
    [
      `gantries ${GANTRY} m wide round it at levels 1 and 2`,
      'stairs between the levels',
    ],
  );
  const side = Math.ceil(Math.max(Math.sqrt(hall.area), hall.d) + 2 * GANTRY);
  rooms.push({
    ...hall,
    w: side,
    d: side,
    area: side * side,
    storeys: LEVELS,
    height: LEVELS * ASSUME.storey,
  });

  // ---- The shared rooms --------------------------------------------------
  const boilerMachines: Machine[] = [
    ...Array.from({ length: boilers }, (_, k) => ({
      kind: 'Gas boiler',
      name: `Boiler ${k + 1}${k === boilers - 1 ? ' (standby)' : ''}`,
      w: 1.2,
      d: 1.0,
      h: 1.9,
      rating: `${ASSUME.boilerOutput} kW`,
    })),
    {
      kind: 'LTHW header',
      name: 'Flow and return headers',
      w: 1.6,
      d: 0.6,
      h: 1.8,
    },
    { kind: 'LTHW pump set', name: 'Primary pumps', w: 1.6, d: 0.8, h: 1.3 },
    {
      kind: 'Pressurisation unit',
      name: 'Pressurisation',
      w: 1.4,
      d: 0.7,
      h: 1.6,
    },
    { kind: 'Calorifier', name: 'Domestic hot water', w: 1.7, d: 1.2, h: 2.3 },
  ];
  rooms.push(
    room(
      'boiler-house',
      'Boiler house',
      'shared',
      boilerMachines,
      0,
      'decided: the furnace is on the lower deck',
      [
        'flue to the roof',
        'combustion air from an outside wall',
        'fire-resisting enclosure',
        'kept away from the chemical stores',
      ],
    ),
  );
  const ibcs = (litresPerDay: number) =>
    Math.max(
      1,
      Math.ceil((litresPerDay * ASSUME.storeDays) / ASSUME.ibc.litres),
    );
  // Chemicals by each water's use: a children's pool takes far more.
  const hard = circuits.reduce(
    (sum, c) => sum + c.body.volume * ASSUME.chemistry[c.body.use],
    0,
  );
  const hypo = hard * ASSUME.hypoPerM3;
  const acid = hard * ASSUME.acidPerM3;
  const tank = (kind: string, n: number): Machine[] =>
    Array.from({ length: n }, (_, k) => ({
      kind,
      name: `IBC ${k + 1}`,
      ...ASSUME.ibc,
      rating: '1 m³ on its bund',
    }));
  rooms.push(
    room(
      'hypo-store',
      'Sodium hypochlorite store',
      'shared',
      [
        ...tank('Hypochlorite tank', ibcs(hypo)),
        {
          kind: 'Spill kit and eyewash',
          name: 'Hypochlorite',
          w: 0.7,
          d: 0.5,
          h: 1.8,
        },
      ],
      1,
      'decided: chemical stores on the middle tier, by the loading bay',
      [
        'opens onto the loading bay',
        'own extract to outside',
        'never shares a wall or drain with the acid store',
      ],
    ),
  );
  rooms.push(
    room(
      'acid-store',
      'Acid store',
      'shared',
      [
        ...tank('Acid tank', ibcs(acid)),
        { kind: 'Spill kit and eyewash', name: 'Acid', w: 0.7, d: 0.5, h: 1.8 },
      ],
      1,
      'decided: chemical stores on the middle tier, by the loading bay',
      [
        'opens onto the loading bay',
        'own extract to outside',
        'never shares a wall or drain with the hypochlorite store',
      ],
    ),
  );
  rooms.push(
    room(
      'loading-bay',
      'Loading bay',
      'shared',
      [
        {
          kind: 'Delivery lorry space',
          name: 'Tanker stand',
          w: 3.2,
          d: 9,
          h: 3.6,
        },
        { kind: 'Fill point', name: 'Hypochlorite', w: 1.1, d: 0.8, h: 1.2 },
        { kind: 'Fill point', name: 'Acid', w: 1.1, d: 0.8, h: 1.2 },
      ],
      1,
      'decided: the loading bay is on the middle tier',
      ['vehicle access from outside, at this level', 'roller shutter'],
    ),
  );
  const panels = Math.max(3, Math.ceil(load / ASSUME.panel.kw) + 1);
  rooms.push(
    room(
      'switch-room',
      'Electrical switch room',
      'shared',
      [
        ...Array.from({ length: panels }, (_, k) => ({
          kind: 'LV switchboard panel',
          name: `Panel ${k + 1}`,
          w: ASSUME.panel.w,
          d: ASSUME.panel.d,
          h: ASSUME.panel.h,
        })),
        {
          kind: 'Incoming supply',
          name: 'Meter and main switch',
          w: 1.5,
          d: 0.8,
          h: 2,
        },
        { kind: 'UPS', name: 'Controls', w: 0.8, d: 0.7, h: 1.4 },
      ],
      1,
      'above the lowest level, out of reach of any flood from the wet hall',
      ['dry, well away from the chemical stores', 'authorised access only'],
    ),
  );
  const ahuMachines: Machine[] = halls.flatMap((h) =>
    Array.from({ length: h.units }, (_, k) => ({
      kind: 'Air handling unit',
      name: `${h.attraction.name}${h.units > 1 ? ` ${k + 1}` : ''}`,
      ...ahuCasing(h.airflow / h.units),
      rating: `${Math.round(h.airflow / h.units)} m³/h (${h.drivenBy})`,
    })),
  );
  rooms.push(
    room(
      'air-plant',
      'Air handling plant',
      'shared',
      ahuMachines,
      2,
      'on the top level, nearest the roof for its intakes and exhausts',
      ['louvres or roof outlets for air in and out'],
    ),
  );
  rooms.push(
    room(
      'control-room',
      'Control room',
      'shared',
      [
        { kind: 'Control desk', name: 'Desk', w: 2.4, d: 1.5, h: 1.4 },
        { kind: 'Mimic board', name: 'Mimics', w: 4, d: 0.4, h: 2.2 },
        { kind: 'Controls cabinet', name: 'BMS', w: 1.2, d: 0.6, h: 2 },
      ],
      2,
      'up on the top gantry, overlooking the wet hall, clean and dry',
    ),
  );
  rooms.push(
    room(
      'office',
      'Engineer’s office',
      'shared',
      [
        { kind: 'Desk', name: 'Engineer', w: 1.6, d: 0.8, h: 0.75 },
        { kind: 'Filing and spares', name: 'Cabinets', w: 2, d: 0.6, h: 2 },
      ],
      2,
      'beside the control room',
    ),
  );

  // ---- The rings: the shared services run to every room ----------------
  const plantRooms = pools.map((a) => `plant-${a.id}`);
  const pooled = circuits.filter((c) => c.flow >= ASSUME.packageBelow);
  const lthw = heat / (ASSUME.waterHeat * ASSUME.lthwDrop);
  const peakMakeUp = Math.max(daily / 24, backwash / 0.5);
  const drain = Math.PI * (biggest / 2) ** 2 * ASSUME.backwashRate;
  const rings: Ring[] = [
    {
      name: 'Heating (LTHW) ring, flow and return',
      from: 'boiler-house',
      serves: [...plantRooms, 'air-plant'],
      flow: lthw,
      dn: dnFor(lthw, ASSUME.pipeSpeed.lthw),
      note: `${ASSUME.lthwDrop} K across; each room taps it through its own pump and heat exchanger`,
    },
    {
      name: 'Make-up water main',
      from: 'wet-hall',
      serves: plantRooms,
      flow: peakMakeUp,
      dn: dnFor(peakMakeUp, ASSUME.pipeSpeed.water),
      note: `${r1(daily)} m³ a day; sized for refilling after the largest backwash in half an hour`,
    },
    {
      name: 'Backwash and drainage main',
      from: 'wet-hall',
      serves: plantRooms,
      flow: drain,
      dn: dnFor(drain * 2, ASSUME.pipeSpeed.drain),
      note: `by gravity, half full, to the backwash holding tank; the largest filter's backwash at ${ASSUME.backwashRate} m/h`,
    },
    ...(['hypochlorite', 'acid'] as const).map((chemical) => ({
      name: `${chemical === 'acid' ? 'Acid' : 'Hypochlorite'} dosing lines`,
      from: chemical === 'acid' ? 'acid-store' : 'hypo-store',
      serves: [...new Set(pooled.map((c) => `plant-${c.attraction}`))],
      flow: 0,
      dn: 15,
      note: `one line to each pool with pool plant (${pooled.length}), each pool's controller metering its own dose; packaged sets dose from their own containers`,
    })),
  ];

  return {
    circuits,
    halls,
    rooms,
    rings,
    totals: {
      flow: circuits.reduce((s, c) => s + c.flow, 0),
      poolHeat,
      airHeat,
      heat,
      boilers,
      airflow,
      ahus,
      load,
      hypoLitresPerDay: hypo,
      acidLitresPerDay: acid,
    },
  };
}

function room(
  id: string,
  name: string,
  part: PlantRoom['part'],
  machines: Machine[],
  level: number,
  why: string,
  needs: string[] = [],
): PlantRoom {
  return { id, name, part, machines, ...roomSize(machines), level, why, needs };
}
