import type { Cell, SweepRow } from '../../../ui2d';
import type { World } from '../../../game/world';
import { POOL_IDS, POOL_TARGET, poolVolume } from '../../../game/plant/pools';
import type { PoolId } from '../../../game/plant/pools';
import { MOTORS, MOTOR_TAGS } from '../../../game/plant/motor-starters';
import {
  ISOLATORS,
  ROOM_SERVICES,
  serviceAvailable,
} from '../../../game/plant/services';
import type { ServiceRoom } from '../../../game/plant/services';
import { siteLoadKw, withIntake } from '../../../game/plant/site-intake';
import { boilerGasOn } from '../../../game/plant/boiler-gas';
import {
  CHEMICALS,
  DOSE_PER_M3_DAY,
  STORE_CAPACITY,
} from '../../../game/plant/chemicals';
import type { Chemical } from '../../../game/plant/chemicals';
import {
  DAY_TANKS,
  dayLevel,
  transferRunning,
} from '../../../game/plant/chemical-distribution';
import { WET_HALL_PLANT } from '../../../game/plant/wet-hall';
import { AIR_UNITS, HALL_POOL } from '../../../game/plant/air-handling';
import { FILTER_CHANGE } from '../../components/plant/logic/pool-ahu';
import { CALL_POINTS } from '../../../game/plant/fire-alarm';
import type { CallPointId } from '../../../game/plant/fire-alarm';
import { GAS_ZONE_IDS, extractRunning } from '../../../game/plant/gas';
import {
  LIGHTING_ZONE_IDS,
  LIGHTING_ZONES,
  zoneLit,
} from '../../../game/plant/lighting';
import { CAPACITY, CLOSES, OPENS, clock, isOpen } from '../../../game/bathers';
import { loungeFlowsOf } from '../../../game/plant/lounge-valves';
import { loungeFilterDp } from '../../../game/plant/lounge-filters';
import { ALARM_TEXT, ANNUNCIATOR_ALARMS } from './control-room-demo';
import { olympicFlowsOfWorld, plantReadingOf } from './world-reading';
import {
  BOILER_STAGE_KW,
  boilersFiring,
  heatDemand,
} from './schematic-overviews';
import type { SchematicContext } from './schematic-overviews';

/**
 * The bridge's stations' schematic designs (mission 095; the owner,
 * 2026-10-27: "design some schematic displays in the LCARS style that
 * would suit each of the stations, and make it so that there could be
 * more different designs than we have placeholders. So periodically, the
 * schematic switches to a different representation"): for each station,
 * the designs its screens turn through, each drawn by the `ui2d` kit's
 * schematic components from the world: the hydrodynamic overviews
 * (`schematic-overviews.ts`), and ring clusters, status matrices, sensor
 * sweeps, vessels, reticles, trends and sequence strips. What each reads
 * is the world's own state; where the screens add a rule of their own (the
 * boilers staged on the heat demand), it says so. Pure.
 */

export const STATION_NAMES = [
  'FLOW NAVIGATOR',
  'BOILER HELMSMAN',
  'CHIEF ELECTRICAL ENGINEER',
  'DISINFECTION TACTICAL',
  'LIFE SUPPORT OFFICER',
  'SECURITY CHIEF',
  'WATER SCIENCE OFFICER',
  'DRAINAGE OFFICER',
  'LOADING BAY CHIEF',
  'OPERATIONS OFFICER',
  'CENTRAL CONTROL',
  'MAIN VIEWSCREEN',
] as const;
export type StationName = (typeof STATION_NAMES)[number];

/** Each station's duty, under its name. */
export const STATION_DUTY: Record<StationName, string> = {
  'FLOW NAVIGATOR': 'CIRCULATION AND FILTRATION',
  'BOILER HELMSMAN': 'GAS AND BOILERS',
  'CHIEF ELECTRICAL ENGINEER': 'POWER AND LIGHTING',
  'DISINFECTION TACTICAL': 'DOSING AND DISINFECTION',
  'LIFE SUPPORT OFFICER': 'AIR HANDLING',
  'SECURITY CHIEF': 'DOORS, CCTV, FIRE AND GAS',
  'WATER SCIENCE OFFICER': 'READINGS AND TRENDS',
  'DRAINAGE OFFICER': 'BACKWASH, DRAINAGE AND MAKE-UP',
  'LOADING BAY CHIEF': 'DELIVERIES AND THE DOCK',
  'OPERATIONS OFFICER': 'CHEMICAL STORES AND DISTRIBUTION',
  'CENTRAL CONTROL': 'THE DUTY MANAGER',
  'MAIN VIEWSCREEN': 'THE WHOLE PLANT',
};

/** A value as a share, its words, and whether in alarm. */
export type Ring = readonly [number, string, boolean?];

/** A design: one of the hydrodynamic overviews, or one drawn by another of the kit's components. */
export type Design =
  | { kind: 'overview'; overview: string }
  | {
      kind: 'rings';
      title: string;
      gauges: readonly {
        label: string;
        unit?: string;
        colour?: string;
        marks?: readonly number[];
      }[];
      read(c: SchematicContext): readonly Ring[];
    }
  | {
      kind: 'grid';
      title: string;
      rows: readonly string[];
      columns: readonly string[];
      labelShare?: number;
      read(c: SchematicContext): Cell[][];
    }
  | {
      kind: 'sweep';
      title: string;
      period?: number;
      read(c: SchematicContext): SweepRow[];
    }
  | {
      kind: 'vessels';
      title: string;
      vessels: readonly {
        label: string;
        colour?: string;
        marks?: readonly { at: number; label?: string }[];
        column?: boolean;
      }[];
      read(
        c: SchematicContext,
      ): readonly (readonly [
        number,
        string,
        { active?: boolean; alarm?: boolean; colour?: string }?,
      ])[];
    }
  | {
      kind: 'reticles';
      title: string;
      reticles: readonly {
        label: string;
        xRange: readonly [number, number];
        yRange: readonly [number, number];
        zone: readonly [number, number, number, number];
        xLabel?: string;
        yLabel?: string;
        colour?: string;
      }[];
      read(c: SchematicContext): readonly (readonly [number, number, string])[];
    }
  | {
      kind: 'trends';
      title: string;
      trends: readonly {
        label: string;
        min: number;
        max: number;
        band?: readonly [number, number];
        colour?: string;
      }[];
      /** Seconds between samples. */
      every: number;
      read(c: SchematicContext): readonly number[];
    }
  | {
      kind: 'strip';
      title: string;
      steps: readonly string[];
      read(c: SchematicContext): {
        current: number | null;
        progress: number;
        words: string;
        steps?: readonly string[];
      };
    }
  | {
      kind: 'combo';
      title: string;
      parts: readonly Design[];
      shares?: readonly number[];
    };

/** A design's title: an overview's own, or the design's. */
export const designTitle = (
  d: Design,
  overviewTitle: (id: string) => string,
): string => (d.kind === 'overview' ? overviewTitle(d.overview) : d.title);

// ---------------------------------------------------------------------------
// Reading the world.

const POOL_NAME: Record<PoolId, string> = {
  pool_01: 'LOUNGE',
  pool_02: 'OLYMPIC',
  pool_03: 'JACUZZI',
  pool_04: 'FOOTBATH',
};
const fixed = (v: number, places = 1) =>
  Number.isFinite(v) ? v.toFixed(places) : '----';
const share = (v: number, max: number) => Math.max(0, Math.min(1, v / max));
const plantOf = (w: World) => withIntake(w.plant, w.intake);
const ok = (good: boolean, words: string, bad = 'alert'): Cell => ({
  words,
  colour: good ? 'ok' : bad,
});
const lit = (b: boolean, on: string, off: string): Cell =>
  b ? { words: on, colour: 'ok' } : { words: off, colour: 'dim', dark: true };

/** Litres a day each chemical's pools take, at their usual load. */
export const dailyUse = (c: Chemical) =>
  POOL_IDS.reduce((t, id) => t + poolVolume(id) * DOSE_PER_M3_DAY[c], 0);

/** Days a store lasts at the pools' usual use. */
export const daysLeft = (w: World, c: Chemical) =>
  w.chemicals[c] / Math.max(1e-6, dailyUse(c));

/** The hours till each Olympic filter's next wash, by its controller's interval. */
export function nextWashHours(w: World): number[] {
  const interval = w.washOTron.setpoints.interval;
  return w.washOTron.filters.map(
    (f) => interval - (w.time - f.lastWash) / 3600,
  );
}

/** The annunciator's alarms in now, as sweep rows (the room to go to at the right). */
function alarmRows(c: SchematicContext): SweepRow[] {
  const ins = ANNUNCIATOR_ALARMS.filter((id) => c.reading.alarms.includes(id));
  if (!ins.length)
    return [{ label: 'ALL SYSTEMS NOMINAL', value: 'NO ALARMS', colour: 'ok' }];
  return ins.map((id) => ({
    label: ALARM_TEXT[id].window.replace('\n', ' '),
    value: ALARM_TEXT[id].room,
    flag: true,
  }));
}

const bandColour = (v: number, lo: number, hi: number) =>
  v < lo || v > hi ? 'alert' : 'ok';

// ---------------------------------------------------------------------------
// The designs.

const filterBank: Design = {
  kind: 'combo',
  title: 'FILTER BANK · SAND PURIFICATION ARRAY',
  shares: [0.68, 0.32],
  parts: [
    {
      kind: 'grid',
      title: 'FILTERS',
      rows: [
        'OLYMPIC F1',
        'OLYMPIC F2',
        'OLYMPIC F3',
        'OLYMPIC F4',
        'OLYMPIC F5',
        'LOUNGE F1',
        'LOUNGE F2',
      ],
      columns: ['MODE', 'BED DP', 'SINCE WASH', 'NEXT WASH'],
      read: ({ world: w }) => {
        const beds = olympicFlowsOfWorld(w).filters;
        const next = nextWashHours(w);
        const olympic = w.washOTron.filters.map((f, i): Cell[] => {
          const washing = f.mode === 'backwash' || f.mode === 'rinse';
          const dp = beds[i]?.bedBar ?? 0;
          return [
            washing
              ? {
                  words: String(f.mode).toUpperCase(),
                  colour: 'warning',
                  flashing: true,
                }
              : f.mode === 'filter'
                ? { words: 'FILTER', colour: 'ok' }
                : {
                    words: String(f.mode).toUpperCase(),
                    colour: 'dim',
                    dark: true,
                  },
            {
              words: `${fixed(dp, 2)} BAR`,
              colour: dp > 0.7 ? 'alert' : 'tertiary',
            },
            {
              words: `${fixed((w.time - f.lastWash) / 3600, 0)} H`,
              colour: 'tertiary',
            },
            {
              words: next[i] <= 0 ? 'DUE' : `${fixed(next[i], 0)} H`,
              colour: next[i] <= 0 ? 'warning' : 'secondary',
            },
          ];
        });
        const flows = loungeFlowsOf(w);
        const dps = loungeFilterDp(w.loungeFilters, flows);
        const lounge = [0, 1].map((i): Cell[] => {
          const dp = dps[i] ?? 0;
          const washing = flows.filters[i] < -0.5;
          return [
            washing
              ? { words: 'BACKWASH', colour: 'warning', flashing: true }
              : flows.filters[i] > 0.5
                ? { words: 'FILTER', colour: 'ok' }
                : { words: 'IDLE', colour: 'dim', dark: true },
            {
              words: `${fixed(dp, 2)} BAR`,
              colour: dp > 0.7 ? 'alert' : 'tertiary',
            },
            {
              words: `${fixed(w.loungeFilters.dirt[i], 1)} KG DIRT`,
              colour: 'tertiary',
            },
            { words: 'BY HAND', colour: 'secondary' },
          ];
        });
        return [...olympic, ...lounge];
      },
    },
    {
      kind: 'strip',
      title: 'WASH-O-TRON PROGRAMME',
      steps: ['BACKWASH', 'SETTLE', 'RINSE'],
      read: ({ world: w }) => {
        const t = w.washOTron;
        const step =
          t.step === 'backwash'
            ? 0
            : t.step === 'settle'
              ? 1
              : t.step === 'rinse'
                ? 2
                : null;
        const setpoint =
          step === null
            ? 1
            : [t.setpoints.backwash, t.setpoints.settle, t.setpoints.rinse][
                step
              ];
        const next = nextWashHours(w);
        const soonest = next.indexOf(Math.min(...next));
        return {
          current: step,
          progress: step === null ? 0 : t.stepTime / Math.max(1, setpoint),
          words:
            t.washing !== null
              ? `WASHING FILTER ${t.washing + 1}${t.waiting ? ` · WAITING: ${t.waiting}` : ''}`
              : `${t.running ? 'AUTO' : 'STOPPED'} · NEXT: FILTER ${soonest + 1} IN ${fixed(Math.max(0, next[soonest]), 1)} H`,
        };
      },
    },
  ],
};

const turnover: Design = {
  kind: 'rings',
  title: 'TURNOVER · CIRCULATION AGAINST DESIGN',
  gauges: [
    ...POOL_IDS.map((id) => ({
      label: `${POOL_NAME[id]} FLOW`,
      unit: 'm³/h',
      colour: 'anakiwa',
      marks: [1 / 1.2],
    })),
    ...POOL_IDS.map((id) => ({
      label: `${POOL_NAME[id]} TURNOVER`,
      unit: 'hours',
      colour: 'lilac',
    })),
  ],
  read: ({ world: w }) => [
    ...POOL_IDS.map((id): Ring => {
      const f = w.pools[id].flow;
      return [
        share(f, POOL_TARGET[id].flow * 1.2),
        fixed(f, f < 20 ? 1 : 0),
        f < POOL_TARGET[id].flow * 0.5,
      ];
    }),
    ...POOL_IDS.map((id): Ring => {
      const f = w.pools[id].flow;
      const hours = f > 0.1 ? poolVolume(id) / f : Infinity;
      return [
        Number.isFinite(hours) ? share(6 - Math.min(6, hours), 6) : 0,
        Number.isFinite(hours) ? fixed(hours, 1) : 'STILL',
        !Number.isFinite(hours),
      ];
    }),
  ],
};

const warpCore: Design = {
  kind: 'combo',
  title: 'WARP CORE · HEAT COLUMN',
  shares: [0.3, 0.7],
  parts: [
    {
      kind: 'vessels',
      title: 'HEAT',
      vessels: [
        {
          label: 'HEAT OUTPUT',
          colour: 'orange-peel',
          column: true,
          marks: [1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6].map((at, i) => ({
            at,
            label: `${i + 1}`,
          })),
        },
      ],
      read: ({ world: w }) => {
        const heat = heatDemand(w);
        const firing = boilersFiring(w);
        return [
          [
            share(heat, BOILER_STAGE_KW * 6),
            `${fixed(heat, 0)} KW`,
            { active: firing > 0, alarm: !boilerGasOn(w.boilerGas) },
          ],
        ];
      },
    },
    {
      kind: 'rings',
      title: 'POOL TEMPERATURES',
      gauges: POOL_IDS.map((id) => ({
        label: `${POOL_NAME[id]} °C`,
        colour: 'orange-peel',
        marks: [0.5],
      })),
      read: ({ world: w }) =>
        POOL_IDS.map((id): Ring => {
          const p = w.pools[id];
          return [
            0.5 + (p.temperature - p.setpoint) / 4,
            fixed(p.temperature, 1),
            p.temperature < POOL_TARGET[id].temp - 2,
          ];
        }),
    },
  ],
};

const cascade: Design = {
  kind: 'grid',
  title: 'BOILER CASCADE · REACTOR FIRING PATTERN',
  rows: ['B-501', 'B-502', 'B-503', 'B-504', 'B-505', 'B-506'],
  columns: ['CASCADE', 'GAS', 'STAGE', 'FIRING'],
  read: ({ world: w }) => {
    const gas = boilerGasOn(w.boilerGas) && w.intake.open.gas;
    const firing = boilersFiring(w);
    return [0, 1, 2, 3, 4, 5].map((i): Cell[] => [
      { words: `${Math.floor(i / 2) + 1}`, colour: 'tertiary' },
      ok(gas, gas ? 'ON' : 'OFF'),
      { words: `${i + 1}`, colour: 'secondary' },
      i < firing
        ? { words: 'FIRING', colour: 'orange-peel' }
        : { words: 'STANDBY', colour: 'dim', dark: true },
    ]);
  },
};

const feederMatrix: Design = {
  kind: 'grid',
  title: 'FEEDER MATRIX · COMPARTMENT POWER',
  rows: Object.keys(ROOM_SERVICES).map((r) =>
    r.replace(/_/g, ' ').toUpperCase(),
  ),
  columns: ['FEEDER', 'POWER'],
  labelShare: 0.4,
  read: ({ world: w }) => {
    const plant = plantOf(w);
    return (Object.keys(ROOM_SERVICES) as ServiceRoom[]).map((room): Cell[] => [
      lit(plant.feeders[room], 'ON', 'OFF'),
      ok(
        serviceAvailable(plant, room, 'power'),
        serviceAvailable(plant, room, 'power') ? 'LIVE' : 'DEAD',
      ),
    ]);
  },
};

const loadRings: Design = {
  kind: 'rings',
  title: 'LOAD RINGS · PROPULSION CURRENTS',
  gauges: [
    ...MOTOR_TAGS.map((t) => ({
      label: t,
      unit: 'A',
      colour: 'lilac',
      marks: [1 / 1.2],
    })),
    { label: 'SITE LOAD', unit: 'kW', colour: 'golden-tanoi' },
    { label: 'BATTERY', unit: '%', colour: 'periwinkle', marks: [0.3] },
  ],
  read: ({ world: w }) => [
    ...MOTOR_TAGS.map((t): Ring => {
      const s = w.motors.starters[t];
      return [
        share(s.current, MOTORS[t].fla * 1.2),
        fixed(s.current, 0),
        s.tripped,
      ];
    }),
    [share(siteLoadKw(w), 400), fixed(siteLoadKw(w), 0)],
    [
      w.centralBattery.charge,
      fixed(w.centralBattery.charge * 100, 0),
      w.centralBattery.charge < 0.3,
    ],
  ],
};

const isolationSweep: Design = {
  kind: 'sweep',
  title: 'ISOLATION SWEEP · LOCAL ISOLATORS AND LIGHTING WAYS',
  read: ({ world: w }) => {
    const plant = plantOf(w);
    return [
      ...ISOLATORS.map((name) => ({
        label: name.toUpperCase(),
        value: plant.isolators[name] ? 'ON' : 'LOCKED OFF',
        colour: plant.isolators[name] ? 'info' : 'warning',
      })),
      ...LIGHTING_ZONE_IDS.map((z) => ({
        label: `WAY ${LIGHTING_ZONES[z].way} ${LIGHTING_ZONES[z].name}`,
        value: w.lighting.tripped[z]
          ? 'TRIPPED'
          : `${fixed(w.lighting.leakage[z], 0)} MA`,
        flag: w.lighting.tripped[z],
      })),
    ];
  },
};

const reticles: Design = {
  kind: 'reticles',
  title: 'TARGETING · CHLORINE AND PH PER POOL',
  reticles: POOL_IDS.map((id) => ({
    label: POOL_NAME[id],
    xRange: [6.8, 8.0] as const,
    yRange: [0, 4] as const,
    zone: [7.2, 7.6, 1, 3] as const,
    xLabel: 'PH',
    yLabel: 'CL MG/L',
    colour: 'golden-tanoi',
  })),
  read: ({ world: w }) =>
    POOL_IDS.map((id) => {
      const p = w.pools[id];
      return [
        p.ph,
        p.freeChlorine,
        `${fixed(p.freeChlorine, 2)} · PH ${fixed(p.ph, 2)}`,
      ] as const;
    }),
};

const dosingSweep: Design = {
  kind: 'sweep',
  title: 'DOSING PUMP SWEEP · INJECTOR STATUS',
  period: 5,
  read: ({ world: w }) =>
    POOL_IDS.flatMap((id) => {
      const dosing = plantReadingOf(w, id).dosing;
      return CHEMICALS.map((c) => {
        const i = DAY_TANKS[c].findIndex((t) => t.site === id);
        const level = i >= 0 ? dayLevel(c, i, w.distribution[c]) : 0;
        const empty = level < 0.02;
        return {
          label: `${POOL_NAME[id]} ${c === 'hypochlorite' ? 'HYPOCHLORITE' : 'ACID'}`,
          value: `${dosing && !empty ? 'DOSING' : empty ? 'DAY TANK EMPTY' : 'INHIBITED'} · ${fixed(level * 100, 0)} %`,
          colour: dosing && !empty ? 'info' : 'warning',
          flag: empty,
        };
      });
    }),
};

const residuals: Design = {
  kind: 'rings',
  title: 'RESIDUALS · FREE CHLORINE AND REDOX',
  gauges: [
    ...POOL_IDS.map((id) => ({
      label: `${POOL_NAME[id]} CL`,
      unit: 'mg/l',
      colour: 'golden-tanoi',
      marks: [0.25, 0.75],
    })),
    ...POOL_IDS.map((id) => ({
      label: `${POOL_NAME[id]} REDOX`,
      unit: 'mV',
      colour: 'lilac',
      marks: [650 / 900],
    })),
  ],
  read: ({ world: w }) => [
    ...POOL_IDS.map((id): Ring => {
      const p = w.pools[id];
      return [
        share(p.freeChlorine, 4),
        fixed(p.freeChlorine, 2),
        p.freeChlorine < 1 || p.freeChlorine > 3,
      ];
    }),
    ...POOL_IDS.map((id): Ring => [
      share(w.pools[id].redox, 900),
      fixed(w.pools[id].redox, 0),
      w.pools[id].redox < 650,
    ]),
  ],
};

const ahuMatrix: Design = {
  kind: 'grid',
  title: 'AHU MATRIX · LIFE SUPPORT UNITS',
  rows: AIR_UNITS.map((u) => u.tag),
  columns: ['HALL', 'FANS', 'HEAT PUMP', 'FILTERS', 'STATE'],
  labelShare: 0.18,
  read: ({ world: w }) => {
    const powered = serviceAvailable(plantOf(w), 'air_plant', 'power');
    return AIR_UNITS.map((u): Cell[] => {
      const s = w.airHandling.units[u.tag];
      const running = powered && s.isolator && !s.tripped && s.speed > 0.05;
      return [
        { words: u.hall.toUpperCase(), colour: 'tertiary' },
        running
          ? { words: `${fixed(s.speed * 100, 0)} %`, colour: 'ok' }
          : { words: 'STOPPED', colour: 'dim', dark: true },
        lit(running && s.heatPump, 'DRYING', 'OFF'),
        {
          words: `${fixed(s.filterPa, 0)} PA`,
          colour: s.filterPa > FILTER_CHANGE ? 'warning' : 'tertiary',
        },
        s.tripped
          ? { words: 'TRIPPED', colour: 'alert', flashing: true }
          : !s.isolator
            ? { words: 'ISOLATED', colour: 'warning' }
            : { words: s.mode.toUpperCase(), colour: 'secondary' },
      ];
    });
  },
};

const atmosphere: Design = {
  kind: 'rings',
  title: 'ATMOSPHERE · HALL HUMIDITY AND AIR',
  gauges: [
    ...POOL_IDS.map((id) => ({
      label: `${POOL_NAME[id]} RH`,
      unit: '%',
      colour: 'periwinkle',
      marks: [0.65],
    })),
    ...POOL_IDS.map((id) => ({
      label: `${POOL_NAME[id]} AIR`,
      unit: '°C',
      colour: 'orange-peel',
    })),
  ],
  read: ({ world: w }) => [
    ...POOL_IDS.map((id): Ring => [
      share(w.pools[id].hallRh, 100),
      fixed(w.pools[id].hallRh, 0),
      w.pools[id].hallRh > 65,
    ]),
    ...POOL_IDS.map((id): Ring => [
      share(w.pools[id].hallAir - 10, 30),
      fixed(w.pools[id].hallAir, 1),
    ]),
  ],
};

const filterScan: Design = {
  kind: 'sweep',
  title: 'FILTER SCAN · AIR FILTER PRESSURE DROP',
  read: ({ world: w }) =>
    AIR_UNITS.map((u) => {
      const s = w.airHandling.units[u.tag];
      return {
        label: `${u.tag} ${u.serves}`,
        value: `${fixed(s.filterPa, 0)} PA`,
        colour: s.filterPa > FILTER_CHANGE ? 'warning' : 'info',
        flag: s.tripped,
      };
    }),
};

const CALL_POINT_IDS = Object.keys(CALL_POINTS) as CallPointId[];
const fireAndGas: Design = {
  kind: 'grid',
  title: 'FIRE AND GAS · DEFENCE GRID',
  rows: [
    ...CALL_POINT_IDS.map((id) => id.toUpperCase()),
    ...GAS_ZONE_IDS.map((z) => z.replace(/_/g, ' ').toUpperCase()),
    'BOILER HOUSE',
  ],
  columns: ['WHERE', 'STATE', 'EXTRACT'],
  labelShare: 0.3,
  read: ({ world: w }) => {
    const plant = plantOf(w);
    return [
      ...CALL_POINT_IDS.map((id): Cell[] => [
        {
          words: CALL_POINTS[id].replace(/_/g, ' ').toUpperCase(),
          colour: 'tertiary',
        },
        w.fireAlarm.latched[id]
          ? { words: 'FIRE', colour: 'alert', flashing: true }
          : { words: 'NORMAL', colour: 'ok' },
        { words: '—', colour: 'dim', dark: true },
      ]),
      ...GAS_ZONE_IDS.map((z): Cell[] => {
        const g = w.gas[z].state;
        return [
          {
            words: z.startsWith('plant') ? 'OZONE' : 'CHLORINE',
            colour: 'tertiary',
          },
          g.a2
            ? { words: 'HIGH', colour: 'alert', flashing: true }
            : g.a1
              ? { words: 'LOW ALARM', colour: 'warning', flashing: true }
              : { words: 'CLEAR', colour: 'ok' },
          lit(extractRunning(plant, z), 'RUNNING', 'NO SUPPLY'),
        ];
      }),
      [
        { words: 'METHANE', colour: 'tertiary' },
        w.boilerGas.gasDetected
          ? { words: 'GAS', colour: 'alert', flashing: true }
          : { words: 'CLEAR', colour: 'ok' },
        lit(w.boilerGas.ssovOpen, 'SSOV OPEN', 'SSOV SHUT'),
      ],
    ];
  },
};

const gasSweep: Design = {
  kind: 'sweep',
  title: 'GAS DETECTION SWEEP · TOXIC ATMOSPHERE SENSORS',
  period: 3,
  read: ({ world: w }) => [
    ...GAS_ZONE_IDS.map((z) => {
      const g = w.gas[z].state;
      return {
        label: `${z.replace(/_/g, ' ').toUpperCase()} ${z.startsWith('plant') ? 'O3' : 'CL2'}`,
        value: `${fixed(g.reading, 2)} PPM`,
        colour: g.a1 ? 'warning' : 'info',
        flag: g.a2,
      };
    }),
    {
      label: 'BOILER HOUSE CH4',
      value: w.boilerGas.gasDetected ? 'DETECTED' : 'CLEAR',
      flag: w.boilerGas.gasDetected,
    },
  ],
};

const compartments: Design = {
  kind: 'grid',
  title: 'COMPARTMENTS · DECK STATUS',
  rows: LIGHTING_ZONE_IDS.map((z) => LIGHTING_ZONES[z].name),
  columns: ['WAY', 'LIGHTS', 'RCBO'],
  labelShare: 0.42,
  read: ({ world: w }) => {
    const plant = plantOf(w);
    return LIGHTING_ZONE_IDS.map((z): Cell[] => [
      { words: `${LIGHTING_ZONES[z].way}`, colour: 'tertiary' },
      lit(zoneLit(plant, w.lighting, z), 'LIT', 'DARK'),
      w.lighting.tripped[z]
        ? { words: 'TRIPPED', colour: 'alert', flashing: true }
        : { words: 'SET', colour: 'ok' },
    ]);
  },
};

const alarmSweep: Design = {
  kind: 'sweep',
  title: 'ALARM SWEEP · ANNUNCIATOR WINDOWS IN',
  period: 4,
  read: alarmRows,
};

const trendWall: Design = {
  kind: 'trends',
  title: 'TREND WALL · TEMPORAL WATER ANALYSIS',
  every: 5,
  trends: [
    {
      label: 'OLYMPIC FREE CHLORINE',
      min: 0,
      max: 4,
      band: [1, 3],
      colour: 'golden-tanoi',
    },
    {
      label: 'OLYMPIC PH',
      min: 6.8,
      max: 8,
      band: [7.2, 7.6],
      colour: 'lilac',
    },
    {
      label: 'OLYMPIC WATER °C',
      min: 24,
      max: 32,
      band: [27, 29],
      colour: 'orange-peel',
    },
    {
      label: 'LOUNGE FREE CHLORINE',
      min: 0,
      max: 4,
      band: [1, 3],
      colour: 'anakiwa',
    },
  ],
  read: ({ world: w }) => [
    w.pools.pool_02.freeChlorine,
    w.pools.pool_02.ph,
    w.pools.pool_02.temperature,
    w.pools.pool_01.freeChlorine,
  ],
};

const qualityMatrix: Design = {
  kind: 'grid',
  title: 'WATER QUALITY MATRIX',
  rows: POOL_IDS.map((id) => POOL_NAME[id]),
  columns: ['FREE CL', 'COMB CL', 'PH', 'REDOX', 'WATER', 'SOLIDS'],
  labelShare: 0.18,
  read: ({ world: w }) =>
    POOL_IDS.map((id): Cell[] => {
      const p = w.pools[id];
      return [
        {
          words: fixed(p.freeChlorine, 2),
          colour: bandColour(p.freeChlorine, 1, 3),
        },
        {
          words: fixed(p.combinedChlorine, 2),
          colour: p.combinedChlorine > 1 ? 'alert' : 'ok',
        },
        { words: fixed(p.ph, 2), colour: bandColour(p.ph, 7, 7.8) },
        { words: fixed(p.redox, 0), colour: p.redox < 650 ? 'alert' : 'ok' },
        {
          words: fixed(p.temperature, 1),
          colour: p.temperature < POOL_TARGET[id].temp - 2 ? 'warning' : 'ok',
        },
        { words: fixed(p.solids, 1), colour: p.solids > 5 ? 'warning' : 'ok' },
      ];
    }),
};

const chemistryRings: Design = {
  kind: 'rings',
  title: 'CHEMISTRY RINGS · COMBINED CHLORINE AND CLARITY',
  gauges: [
    ...POOL_IDS.map((id) => ({
      label: `${POOL_NAME[id]} COMB CL`,
      unit: 'mg/l',
      colour: 'hopbush',
      marks: [0.5],
    })),
    ...POOL_IDS.map((id) => ({
      label: `${POOL_NAME[id]} SOLIDS`,
      unit: 'g/m³',
      colour: 'sandy-brown',
    })),
  ],
  read: ({ world: w }) => [
    ...POOL_IDS.map((id): Ring => [
      share(w.pools[id].combinedChlorine, 2),
      fixed(w.pools[id].combinedChlorine, 2),
      w.pools[id].combinedChlorine > 1,
    ]),
    ...POOL_IDS.map((id): Ring => [
      share(w.pools[id].solids, 10),
      fixed(w.pools[id].solids, 1),
    ]),
  ],
};

const spectro: Design = {
  kind: 'sweep',
  title: 'SPECTROGRAPHIC ANALYSIS · EVERY READING',
  period: 8,
  read: ({ world: w }) =>
    POOL_IDS.flatMap((id) => {
      const p = w.pools[id];
      const n = POOL_NAME[id];
      return [
        {
          label: `${n} FREE CHLORINE`,
          value: `${fixed(p.freeChlorine, 2)} MG/L`,
          flag: p.freeChlorine < 1 || p.freeChlorine > 3,
        },
        {
          label: `${n} PH`,
          value: fixed(p.ph, 2),
          flag: p.ph < 7 || p.ph > 7.8,
        },
        { label: `${n} REDOX`, value: `${fixed(p.redox, 0)} MV` },
        { label: `${n} WATER`, value: `${fixed(p.temperature, 1)} °C` },
        { label: `${n} HALL RH`, value: `${fixed(p.hallRh, 0)} %` },
      ];
    }),
};

const reservoirs: Design = {
  kind: 'vessels',
  title: 'RESERVOIRS · BREAK, PIT AND BALANCE TANKS',
  vessels: [
    {
      label: 'BREAK TANK',
      colour: 'anakiwa',
      marks: [
        { at: WET_HALL_PLANT.floatOpen, label: 'FLOAT' },
        { at: WET_HALL_PLANT.lowLevel, label: 'LOW' },
      ],
    },
    {
      label: 'BACKWASH PIT',
      colour: 'sandy-brown',
      marks: [
        { at: WET_HALL_PLANT.backwashHigh, label: 'HIGH' },
        { at: WET_HALL_PLANT.backwashHighHigh, label: 'HH' },
      ],
    },
    {
      label: 'OLYMPIC BALANCE',
      colour: 'blue-bell',
      marks: [{ at: 0.2, label: 'LOW' }],
    },
    {
      label: 'LOUNGE BALANCE',
      colour: 'lilac',
      marks: [{ at: 0.2, label: 'LOW' }],
    },
  ],
  read: ({ world: w }) => {
    const wh = w.wetHall;
    const brk = wh.breakTank / WET_HALL_PLANT.breakTank;
    const pit = wh.backwashTank / WET_HALL_PLANT.backwashTank;
    return [
      [
        brk,
        `${fixed(wh.breakTank, 1)} M³`,
        { active: wh.boosterRunning, alarm: brk < WET_HALL_PLANT.lowLevel },
      ],
      [
        pit,
        `${fixed(wh.backwashTank, 0)} M³`,
        {
          active: wh.pitInflow > 0.5,
          alarm: pit > WET_HALL_PLANT.backwashHigh,
        },
      ],
      [
        w.pools.pool_02.balance,
        `${fixed(w.pools.pool_02.balance * 100, 0)} %`,
        {
          active: w.pools.pool_02.makeUp,
          alarm: w.pools.pool_02.balance < 0.2,
        },
      ],
      [
        w.pools.pool_01.balance,
        `${fixed(w.pools.pool_01.balance * 100, 0)} %`,
        {
          active: w.pools.pool_01.makeUp,
          alarm: w.pools.pool_01.balance < 0.2,
        },
      ],
    ];
  },
};

const washSequence: Design = {
  kind: 'combo',
  title: 'WASH SEQUENCE · DISCHARGE CONSENT',
  shares: [0.35, 0.65],
  parts: [
    (filterBank as Extract<Design, { kind: 'combo' }>).parts[1],
    {
      kind: 'rings',
      title: 'FLOWS',
      gauges: [
        { label: 'TO SEWER', unit: 'm³/h', colour: 'sandy-brown', marks: [1] },
        { label: 'INTO PIT', unit: 'm³/h', colour: 'anakiwa' },
        { label: 'MAKE-UP', unit: 'm³/h', colour: 'lilac' },
      ],
      read: ({ world: w }) => [
        [
          share(w.sewer.flow, WET_HALL_PLANT.sewerConsent * 1.2),
          fixed(w.sewer.flow, 1),
          w.sewer.flow > WET_HALL_PLANT.sewerConsent,
        ],
        [share(w.wetHall.pitInflow, 200), fixed(w.wetHall.pitInflow, 0)],
        [
          share(w.wetHall.flow, WET_HALL_PLANT.boosterRate),
          fixed(w.wetHall.flow, 1),
        ],
      ],
    },
  ],
};

const bulkStores: Design = {
  kind: 'vessels',
  title: 'BULK STORES · CHEMICAL RESERVES',
  vessels: CHEMICALS.map((c) => ({
    label: c === 'hypochlorite' ? 'HYPOCHLORITE' : 'ACID',
    colour: c === 'hypochlorite' ? 'golden-tanoi' : 'hopbush',
    marks: [{ at: 0.2, label: 'REORDER' }],
  })),
  read: ({ world: w }) =>
    CHEMICALS.map((c) => {
      const level = w.chemicals[c] / STORE_CAPACITY[c];
      return [
        level,
        `${fixed(w.chemicals[c], 0)} L · ${fixed(daysLeft(w, c), 0)} DAYS`,
        { alarm: level < 0.2 },
      ] as const;
    }),
};

const dockStatus: Design = {
  kind: 'grid',
  title: 'DOCK STATUS · DOCKING PORT',
  rows: [
    'LOADING BAY POWER',
    'CALL POINT LB-MCP-1',
    'CALL POINT LB-MCP-2',
    'HYPO STORE EXTRACT',
    'ACID STORE EXTRACT',
    'WATER INTAKE',
    'GAS INTAKE',
    'POWER INTAKE',
  ],
  columns: ['STATE'],
  labelShare: 0.55,
  read: ({ world: w }) => {
    const plant = plantOf(w);
    const power = serviceAvailable(plant, 'loading_bay', 'power');
    return [
      [ok(power, power ? 'LIVE' : 'DEAD')],
      [
        w.fireAlarm.latched['lb-mcp-1']
          ? { words: 'FIRE', colour: 'alert', flashing: true }
          : { words: 'NORMAL', colour: 'ok' },
      ],
      [
        w.fireAlarm.latched['lb-mcp-2']
          ? { words: 'FIRE', colour: 'alert', flashing: true }
          : { words: 'NORMAL', colour: 'ok' },
      ],
      [lit(extractRunning(plant, 'hypo_store'), 'RUNNING', 'STOPPED')],
      [lit(extractRunning(plant, 'acid_store'), 'RUNNING', 'STOPPED')],
      [
        ok(
          w.intake.open.water,
          w.intake.open.water ? 'OPEN' : 'SHUT',
          'warning',
        ),
      ],
      [ok(w.intake.open.gas, w.intake.open.gas ? 'OPEN' : 'SHUT', 'warning')],
      [ok(w.intake.open.power, w.intake.open.power ? 'ON' : 'OFF', 'warning')],
    ];
  },
};

const stockProjection: Design = {
  kind: 'sweep',
  title: 'STOCK PROJECTION · DELIVERIES AND METERS',
  read: ({ world: w }) => [
    ...CHEMICALS.map((c) => ({
      label: `${c === 'hypochlorite' ? 'HYPOCHLORITE' : 'ACID'} AT USUAL USE`,
      value: `${fixed(daysLeft(w, c), 0)} DAYS · ${fixed(dailyUse(c), 0)} L/DAY`,
      flag: w.chemicals[c] < STORE_CAPACITY[c] * 0.2,
    })),
    ...CHEMICALS.map((c) => ({
      label: `${c === 'hypochlorite' ? 'HYPOCHLORITE' : 'ACID'} SPACE FOR A DELIVERY`,
      value: `${fixed(STORE_CAPACITY[c] - w.chemicals[c], 0)} L`,
      colour: 'secondary',
    })),
    { label: 'WATER METER', value: `${fixed(w.intake.meters.water, 0)} M³` },
    { label: 'GAS METER', value: `${fixed(w.intake.meters.gas, 0)} M³` },
    {
      label: 'ELECTRICITY METER',
      value: `${fixed(w.intake.meters.power, 0)} KWH`,
    },
  ],
};

const dayTanks: Design = {
  kind: 'vessels',
  title: 'DAY TANKS · DOSE RESERVOIRS',
  vessels: CHEMICALS.flatMap((c) =>
    DAY_TANKS[c].map((t) => ({
      label: `${POOL_NAME[t.site]} ${c === 'hypochlorite' ? 'HYPO' : 'ACID'}`,
      colour: c === 'hypochlorite' ? 'golden-tanoi' : 'hopbush',
      marks: [
        { at: 0.2, label: 'LOW' },
        { at: 0.9, label: 'HIGH' },
      ],
    })),
  ),
  read: ({ world: w }) =>
    CHEMICALS.flatMap((c) =>
      DAY_TANKS[c].map((_, i) => {
        const line = w.distribution[c];
        return [
          dayLevel(c, i, line),
          `${fixed(line.tanks[i].litres, 0)} L`,
          { active: line.serving === i, alarm: line.tanks[i].calling },
        ] as const;
      }),
    ),
};

const transferLines: Design = {
  kind: 'grid',
  title: 'TRANSFER LINES · ROUTING JUNCTIONS',
  rows: ['HYPOCHLORITE', 'ACID'],
  columns: ['STORE', 'PUMP', 'HOA', 'SELECTOR', 'SERVING', 'TRIP'],
  labelShare: 0.2,
  read: ({ world: w }) =>
    CHEMICALS.map((c): Cell[] => {
      const line = w.distribution[c];
      const store = c === 'hypochlorite' ? 'hypo_store' : 'acid_store';
      const running = transferRunning(
        line,
        w.chemicals[c],
        STORE_CAPACITY[c],
        serviceAvailable(plantOf(w), store, 'power'),
      );
      return [
        {
          words: `${fixed((w.chemicals[c] / STORE_CAPACITY[c]) * 100, 0)} %`,
          colour: 'tertiary',
        },
        lit(running, 'RUNNING', 'STOPPED'),
        {
          words: line.hoa.toUpperCase(),
          colour: line.hoa === 'auto' ? 'ok' : 'warning',
        },
        {
          words: line.mode === 'auto' ? 'AUTO' : `HAND ${line.pick + 1}`,
          colour: 'secondary',
        },
        line.serving === null
          ? { words: 'NONE', colour: 'dim', dark: true }
          : {
              words: POOL_NAME[DAY_TANKS[c][line.serving]?.site ?? 'pool_01'],
              colour: 'ok',
            },
        line.tripped
          ? { words: 'TRIPPED', colour: 'alert', flashing: true }
          : { words: 'CLEAR', colour: 'ok' },
      ];
    }),
};

const siteStatus: Design = {
  kind: 'grid',
  title: 'SITE STATUS · ALL DECKS',
  rows: POOL_IDS.map((id) => POOL_NAME[id]),
  columns: ['BATHERS', 'WATER', 'CIRCULATION', 'HALL'],
  labelShare: 0.2,
  read: ({ world: w }) =>
    POOL_IDS.map((id): Cell[] => {
      const p = w.pools[id];
      const b = w.bathers.pools[id].now;
      const waterOk =
        p.freeChlorine >= 1 && p.freeChlorine <= 3 && p.ph >= 7 && p.ph <= 7.8;
      return [
        {
          words: `${b} / ${CAPACITY[id]}`,
          colour: b >= CAPACITY[id] ? 'warning' : 'tertiary',
        },
        ok(waterOk, waterOk ? 'GOOD' : 'CHECK'),
        ok(p.flow > POOL_TARGET[id].flow * 0.5, `${fixed(p.flow, 0)} M³/H`),
        ok(p.hallRh <= 65, `${fixed(p.hallRh, 0)} % RH`, 'warning'),
      ];
    }),
};

const batherLoad: Design = {
  kind: 'rings',
  title: 'BATHER LOAD · CREW COMPLEMENT',
  gauges: POOL_IDS.map((id) => ({
    label: POOL_NAME[id],
    unit: `of ${CAPACITY[id]}`,
    colour: 'periwinkle',
    marks: [0.9],
  })),
  read: ({ world: w }) =>
    POOL_IDS.map((id): Ring => {
      const n = w.bathers.pools[id].now;
      return [share(n, CAPACITY[id]), String(n), n >= CAPACITY[id]];
    }),
};

const theDay: Design = {
  kind: 'strip',
  title: 'THE DAY · STARDATE',
  steps: ['00', '04', '08', '12', '16', '20'],
  read: ({ world: w }) => {
    const { hour, day } = clock(w.time);
    const hh = Math.floor(hour);
    const mm = Math.floor((hour - hh) * 60);
    const time = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    return {
      current: Math.min(5, Math.floor(hour / 4)),
      progress: (hour % 4) / 4,
      words: `DAY ${day + 1} · ${time} · ${isOpen(w.time) ? `OPEN UNTIL ${CLOSES}:00` : `CLOSED · OPENS ${String(OPENS).padStart(2, '0')}:00`}`,
    };
  },
};

const plantRings: Design = {
  kind: 'rings',
  title: 'THE PLANT AT A GLANCE',
  gauges: [
    { label: 'OLYMPIC FLOW', unit: 'm³/h', colour: 'anakiwa' },
    { label: 'HEAT', unit: 'kW', colour: 'orange-peel' },
    { label: 'SITE LOAD', unit: 'kW', colour: 'golden-tanoi' },
    { label: 'HYPOCHLORITE', unit: 'days', colour: 'golden-tanoi' },
    { label: 'BATHERS', unit: 'in the water', colour: 'periwinkle' },
    { label: 'OLYMPIC RH', unit: '%', colour: 'lilac', marks: [0.65] },
  ],
  read: ({ world: w }) => {
    const bathers = POOL_IDS.reduce((t, id) => t + w.bathers.pools[id].now, 0);
    const cap = POOL_IDS.reduce((t, id) => t + CAPACITY[id], 0);
    return [
      [share(w.pools.pool_02.flow, 744), fixed(w.pools.pool_02.flow, 0)],
      [share(heatDemand(w), BOILER_STAGE_KW * 6), fixed(heatDemand(w), 0)],
      [share(siteLoadKw(w), 400), fixed(siteLoadKw(w), 0)],
      [
        share(daysLeft(w, 'hypochlorite'), 60),
        fixed(daysLeft(w, 'hypochlorite'), 0),
        w.chemicals.hypochlorite < STORE_CAPACITY.hypochlorite * 0.2,
      ],
      [share(bathers, cap), String(bathers)],
      [
        share(w.pools.pool_02.hallRh, 100),
        fixed(w.pools.pool_02.hallRh, 0),
        w.pools.pool_02.hallRh > 65,
      ],
    ];
  },
};

const ov = (overview: string): Design => ({ kind: 'overview', overview });

/** Each station's designs, the ones its screens turn through, its own overviews first. */
export const STATION_DESIGNS: Record<StationName, readonly Design[]> = {
  'FLOW NAVIGATOR': [
    ov('olympic'),
    filterBank,
    ov('lounge'),
    turnover,
    ov('jacuzzi'),
    ov('footbath'),
  ],
  'BOILER HELMSMAN': [ov('heating'), warpCore, ov('gas'), cascade],
  'CHIEF ELECTRICAL ENGINEER': [
    ov('power'),
    feederMatrix,
    loadRings,
    isolationSweep,
  ],
  'DISINFECTION TACTICAL': [
    reticles,
    ov('hypochlorite-distribution'),
    dosingSweep,
    residuals,
    ov('acid-distribution'),
  ],
  'LIFE SUPPORT OFFICER': [ov('air'), ahuMatrix, atmosphere, filterScan],
  'SECURITY CHIEF': [fireAndGas, gasSweep, compartments, alarmSweep],
  'WATER SCIENCE OFFICER': [trendWall, qualityMatrix, chemistryRings, spectro],
  'DRAINAGE OFFICER': [ov('backwash'), reservoirs, ov('make-up'), washSequence],
  'LOADING BAY CHIEF': [bulkStores, dockStatus, stockProjection],
  'OPERATIONS OFFICER': [
    ov('hypochlorite-distribution'),
    dayTanks,
    ov('acid-distribution'),
    transferLines,
  ],
  'CENTRAL CONTROL': [
    siteStatus,
    batherLoad,
    alarmSweep,
    theDay,
    ov('olympic'),
  ],
  'MAIN VIEWSCREEN': [
    ov('olympic'),
    plantRings,
    ov('lounge'),
    ov('heating'),
    alarmSweep,
    ov('power'),
  ],
};

/** The station named `name`, if it is one (a bridge's station names, as `control-room-prototype.ts` has them). */
export const stationNamed = (name: string): StationName | undefined =>
  (STATION_NAMES as readonly string[]).includes(name)
    ? (name as StationName)
    : undefined;

export { POOL_NAME, HALL_POOL };

/** Every design but the overviews, once each, with the stations that show it (for the galleries). */
export function galleryDesigns(): {
  design: Design;
  stations: StationName[];
}[] {
  const out: { design: Design; stations: StationName[] }[] = [];
  for (const s of STATION_NAMES)
    for (const d of STATION_DESIGNS[s]) {
      if (d.kind === 'overview') continue;
      const seen = out.find((o) => o.design === d);
      if (seen) seen.stations.push(s);
      else out.push({ design: d, stations: [s] });
    }
  return out;
}
