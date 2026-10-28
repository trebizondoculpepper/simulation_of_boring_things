import type { PoolId } from './pools';
import type { Chemical } from './chemicals';
import { CHEMICALS, DOSE_PER_M3_DAY } from './chemicals';
import { bottleBund, bottleSize, isDoseBottle } from './dose-bottle';

/**
 * The chemical distribution (plan 085; the owner, 2026-10-26): each
 * chemical's transfer pump in its store, sending it along one main to its
 * transfer selector on the wet hall's dirty side, which sends it on to
 * each plant room's day tank in turn; each pool doses from its own day
 * tank. Pure.
 *
 * - The bulk stores are the world's `chemicals` (litres each store holds);
 *   transfer draws them down, deliveries fill them.
 * - The wet hall's chemical transfer control box (prompt 091,
 *   `chem-control.ts`) runs both lines in AUTO: a day tank calls at its
 *   own low level and stops at its own high (litres, set at the
 *   terminals: today's 20% and 90% to begin with); FILL NOW calls it at
 *   once, to be filled to its high in its turn; an inhibited tank (STOP)
 *   never calls and is not served. With the box's controller not running
 *   nothing is called or served in AUTO, and a pump in AUTO (on the box's
 *   remote-run relay) does not run.
 * - Its selector in AUTO serves the calling day tanks one at a time, in
 *   turn; in HAND, the one picked while it is below its fixed high switch
 *   (90%), box or no box. Only the served outlet's valve is open.
 * - The pump (one, not a duty and standby pair: light work, and soon
 *   swapped) runs in AUTO (the box running) or HAND while an outlet is
 *   served and its store has chemical above its low-level cut-out; in OFF,
 *   never. Any day tank's high-high (98%), hard-wired and not settable,
 *   trips it and shuts its selector until RESET.
 * - Each day tank is drawn down by its pool's dosing.
 */

/** A day tank's site: the plant room of the pool it doses. */
export type DayTankSite = PoolId;

/**
 * Each chemical's day tanks, in its selector's outlet order, and their
 * sizes, litres (plan 085): sized to each pool's use. The footbath's acid
 * is the smallest (its pH held as every pool's is). The selectors are six-way; the outlets beyond these are blanked
 * spares for the pools to come.
 */
export const DAY_TANKS: Record<
  Chemical,
  readonly { site: DayTankSite; litres: number }[]
> = {
  hypochlorite: [
    { site: 'pool_01', litres: 300 },
    { site: 'pool_02', litres: 1000 },
    { site: 'pool_03', litres: 60 },
    { site: 'pool_04', litres: 30 },
  ],
  acid: [
    // The lounge uses little acid: a 60 l bottle lasts about two weeks.
    { site: 'pool_01', litres: 60 },
    { site: 'pool_02', litres: 500 },
    { site: 'pool_03', litres: 30 },
    { site: 'pool_04', litres: 15 },
  ],
};

/**
 * A day tank's body for its size, metres: framed rectangular tanks, as
 * the bulk tanks are, from the Olympic's 1,000 l down to the footbath's
 * 15 l acid (plan 085).
 */
export function dayTankSize(litres: number) {
  const table: [number, { L: number; W: number; H: number }][] = [
    [15, { L: 0.36, W: 0.3, H: 0.32 }],
    [30, { L: 0.42, W: 0.34, H: 0.4 }],
    [60, { L: 0.5, W: 0.4, H: 0.5 }],
    [200, { L: 0.8, W: 0.6, H: 0.7 }],
    [300, { L: 0.9, W: 0.65, H: 0.8 }],
    [500, { L: 1.1, W: 0.75, H: 0.85 }],
    [1000, { L: 1.4, W: 0.9, H: 1.05 }],
  ];
  return (table.find(([l]) => l >= litres) ?? table[table.length - 1])[1];
}

/** A day tank's place in a room, metres: its bund, and its inlet riser's height. */
export function dayTankFootprint(litres: number) {
  if (isDoseBottle(litres)) {
    const { side, sump } = bottleBund(litres);
    return {
      w: side + 0.1,
      d: side + 0.1,
      h: Math.max(1.2, sump + bottleSize(litres).h + 0.45),
    };
  }
  const { L, W } = dayTankSize(litres);
  return { w: L + 0.4, d: W + 0.6, h: 1.8 };
}

/** The selectors' outlets: six each. */
export const SELECTOR_WAYS = 6;

export const DISTRIBUTION = {
  /** The transfer pump's flow through an open outlet, litres a minute. */
  pumpLpm: 20,
  low: 0.2,
  high: 0.9,
  highHigh: 0.98,
  /** The store's low-level cut-out: the pump stops with this share left. */
  storeLow: 0.02,
} as const;

export type Hoa = 'hand' | 'off' | 'auto';

export interface DayTank {
  litres: number;
  /** It has called (at its low, or FILL NOW), and not yet been filled to its high. */
  calling: boolean;
  /** Its low and high levels, litres: set at its terminal, kept by the control box through a power cut. */
  lowL: number;
  highL: number;
  /** STOP at its terminal: never filled until RESUME. */
  inhibited: boolean;
  /** FILL NOW at its terminal: calling at once, to be filled to its high. */
  fillNow: boolean;
  /** World seconds its last fill ended; null before its first. */
  lastFilled: number | null;
}

/** The setting limits for a day tank's levels, shares of the tank (prompt 091). */
export const LEVEL_LIMITS = {
  minLow: 0.1,
  maxHigh: 0.95,
  minBand: 0.1,
} as const;

/** A new day tank's levels: today's switches, 20% and 90%, in whole litres. */
export const defaultLevels = (capacity: number) => ({
  lowL: Math.round(capacity * DISTRIBUTION.low),
  highL: Math.round(capacity * DISTRIBUTION.high),
});

/** A day tank of `capacity` litres holding `litres`, its levels the defaults. */
export const newDayTank = (capacity: number, litres: number): DayTank => ({
  litres,
  calling: false,
  ...defaultLevels(capacity),
  inhibited: false,
  fillNow: false,
  lastFilled: null,
});

/** A day tank's limits for its low and high levels, whole litres. */
export function levelLimits(
  capacity: number,
  t: Pick<DayTank, 'lowL' | 'highL'>,
) {
  const band = Math.ceil(capacity * LEVEL_LIMITS.minBand);
  return {
    low: {
      min: Math.ceil(capacity * LEVEL_LIMITS.minLow),
      max: t.highL - band,
    },
    high: {
      min: t.lowL + band,
      max: Math.floor(capacity * LEVEL_LIMITS.maxHigh),
    },
  };
}

/** The step a level changes by on a terminal, litres, by the tank's size. */
export const levelStep = (capacity: number) =>
  capacity <= 60 ? 1 : capacity <= 300 ? 5 : 10;

export interface ChemicalLine {
  /** Its day tanks, in its selector's outlet order (`DAY_TANKS`). */
  tanks: DayTank[];
  /** Its selector: serving the calls in turn, or the outlet picked. */
  mode: 'auto' | 'hand';
  pick: number;
  /** The outlet whose valve is open now, if any. */
  serving: number | null;
  /** Its transfer pump's selector, at its store. */
  hoa: Hoa;
  /** High-high reached somewhere: the pump tripped, the selector shut, until reset. */
  tripped: boolean;
}

export type ChemicalDistribution = Record<Chemical, ChemicalLine>;

/** A line with a day tank for each of its sites: one saved with fewer given new ones, part full. */
function fitted(c: Chemical, line: ChemicalLine): ChemicalLine {
  const want = DAY_TANKS[c].length;
  if (line.tanks.length === want) return line;
  return {
    ...line,
    tanks: DAY_TANKS[c].map(
      (t, i) => line.tanks[i] ?? newDayTank(t.litres, t.litres * 0.7),
    ),
    serving: line.serving !== null && line.serving < want ? line.serving : null,
  };
}

/**
 * Where each day tank stands in a new game, a share of full: most part
 * full; the Olympic's hypochlorite and the lounge's acid just below low,
 * so each line is seen to call and transfer as the game begins.
 */
const START: Partial<Record<Chemical, Partial<Record<DayTankSite, number>>>> = {
  hypochlorite: { pool_02: 0.18 },
  acid: { pool_01: 0.18 },
};

export function newChemicalDistribution(): ChemicalDistribution {
  const line = (c: Chemical): ChemicalLine => ({
    tanks: DAY_TANKS[c].map((t) =>
      newDayTank(t.litres, t.litres * (START[c]?.[t.site] ?? 0.7)),
    ),
    mode: 'auto',
    pick: 0,
    serving: null,
    hoa: 'auto',
    tripped: false,
  });
  return { hypochlorite: line('hypochlorite'), acid: line('acid') };
}

/** A day tank's level, a fraction of full. */
export const dayLevel = (c: Chemical, i: number, line: ChemicalLine) =>
  line.tanks[i].litres / DAY_TANKS[c][i].litres;

/** The day tank of chemical `c` that doses `site`, if it has one. */
export function dayTankOf(c: Chemical, site: DayTankSite): number {
  return DAY_TANKS[c].findIndex((t) => t.site === site);
}

/** Whether `c`'s transfer pump runs now, with `store` litres in its store of `capacity`. */
export function transferRunning(
  line: ChemicalLine,
  store: number,
  capacity: number,
  powered = true,
  controlRunning = true,
): boolean {
  return (
    powered &&
    !line.tripped &&
    line.serving !== null &&
    // In AUTO it runs on the control box's remote-run relay.
    (line.hoa === 'hand' || (line.hoa === 'auto' && controlRunning)) &&
    store > capacity * DISTRIBUTION.storeLow
  );
}

/** Whether outlet `i`'s valve is open. */
export const outletOpen = (line: ChemicalLine, i: number) => line.serving === i;

function serve(
  c: Chemical,
  line: ChemicalLine,
  controlRunning: boolean,
): number | null {
  if (line.tripped) return null;
  const n = line.tanks.length;
  if (line.mode === 'hand')
    return line.pick < n && dayLevel(c, line.pick, line) < DISTRIBUTION.high
      ? line.pick
      : null;
  // AUTO follows the control box: with its controller down, no outlet.
  if (!controlRunning) return null;
  const ok = (i: number) =>
    line.tanks[i]?.calling === true && !line.tanks[i].inhibited;
  if (line.serving !== null && ok(line.serving)) return line.serving;
  const from = line.serving === null ? 0 : line.serving + 1;
  for (let k = 0; k < n; k++) {
    const i = (from + k) % n;
    if (ok(i)) return i;
  }
  return null;
}

/**
 * The control box as the distribution sees it each step (`chem-control.ts`):
 * whether its controller runs, and the world's time, for each fill's end.
 */
export interface DistributionControl {
  running: boolean;
  now: number;
}
export const CONTROL_RUNNING: DistributionControl = { running: true, now: 0 };

/**
 * What each pool's dosing takes from its day tanks, litres a second, from
 * the volume of its water being dosed with each chemical (m³).
 */
export function doseDraw(
  dosed: Partial<Record<PoolId, Record<Chemical, number>>>,
) {
  const out: Partial<Record<PoolId, Record<Chemical, number>>> = {};
  for (const [id, v] of Object.entries(dosed) as [
    PoolId,
    Record<Chemical, number>,
  ][])
    out[id] = {
      hypochlorite: (DOSE_PER_M3_DAY.hypochlorite * v.hypochlorite) / 86400,
      acid: (DOSE_PER_M3_DAY.acid * v.acid) / 86400,
    };
  return out;
}

/** Which chemicals each pool has to dose with: its day tank not empty. */
export function dayTankStock(
  d: ChemicalDistribution,
  site: DayTankSite,
): Record<Chemical, boolean> {
  const has = (c: Chemical) => {
    const i = dayTankOf(c, site);
    return i >= 0 && (d[c]?.tanks[i]?.litres ?? 0) > 0;
  };
  return { hypochlorite: has('hypochlorite'), acid: has('acid') };
}

/**
 * Whether each chemical's line has its power (the owner, 2026-10-27): its
 * transfer pump's, from its store's supply, and its selector's motorised
 * valves', from the wet hall's. Either off, nothing is transferred.
 */
export type DistributionPower = Record<Chemical, boolean>;
export const ALL_POWERED: DistributionPower = {
  hypochlorite: true,
  acid: true,
};

/**
 * How each line's hand valves stand (`chemical-valves.ts`): its way out of
 * its store (a tank's outlet, the pump's suction and discharge), and on to
 * each day tank (its selector outlet's isolating valve, the day tank's
 * inlet valve). All open unless said.
 */
export type DistributionValves = Record<
  Chemical,
  { store: boolean; outlets: readonly boolean[] }
>;

/**
 * The distribution `dt` seconds on: each line's switches, its selector,
 * its pump moving litres from its store to the served day tank, and every
 * day tank drawn on by its pool's dosing (`draw`, litres a second); a
 * line without power (`power`) transfers nothing, nor one whose valves
 * (`valves`) are shut on the way (its pump then runs against them, onto
 * its relief valve). Gives the litres each store gave.
 */
export function stepDistribution(
  d: ChemicalDistribution,
  stores: Record<Chemical, number>,
  capacity: Record<Chemical, number>,
  draw: Partial<Record<PoolId, Record<Chemical, number>>>,
  dt: number,
  power: DistributionPower = ALL_POWERED,
  valves?: DistributionValves,
  control: DistributionControl = CONTROL_RUNNING,
): { distribution: ChemicalDistribution; taken: Record<Chemical, number> } {
  const taken = { hypochlorite: 0, acid: 0 };
  const out = { ...d };
  for (const c of CHEMICALS) {
    let line = fitted(c, d[c]);
    // The hard-wired high-high trips whatever the box is doing; the box's
    // levels call and stop each tank only while its controller runs.
    let tripped = line.tripped;
    let tanks = line.tanks.map((t, i) => {
      const level = t.litres / DAY_TANKS[c][i].litres;
      if (level >= DISTRIBUTION.highHigh) tripped = true;
      if (!control.running) return t;
      const done = (k: DayTank) =>
        k.calling || k.fillNow ? { ...k, calling: false, fillNow: false } : k;
      if (t.inhibited || t.litres >= t.highL) return done(t);
      if (t.litres <= t.lowL || t.fillNow)
        return t.calling ? t : { ...t, calling: true };
      return t;
    });
    line = { ...line, tanks, tripped };
    const was = line.serving;
    line = { ...line, serving: serve(c, line, control.running) };
    if (was !== null && was !== line.serving && line.tanks[was])
      line = {
        ...line,
        tanks: line.tanks.map((t, i) =>
          i === was ? { ...t, lastFilled: control.now } : t,
        ),
      };
    // The transfer, never more than the store has.
    // Its high switch shuts the inlet as the level reaches it, however long
    // the step: a small bottle filled at 20 l a minute is not overfilled
    // into its high-high trip in one step. It may pass the switch a little,
    // as a real one does, so it is sure to stop calling.
    // In AUTO to the box's high for the tank, in HAND to the fixed switch.
    const room =
      line.serving === null
        ? 0
        : Math.max(
            0,
            (line.mode === 'hand'
              ? DAY_TANKS[c][line.serving].litres * DISTRIBUTION.high
              : line.tanks[line.serving].highL) +
              DAY_TANKS[c][line.serving].litres * 0.02 -
              line.tanks[line.serving].litres,
          );
    const way =
      !valves ||
      (valves[c].store &&
        line.serving !== null &&
        (valves[c].outlets[line.serving] ?? true));
    const inflow =
      way &&
      transferRunning(line, stores[c], capacity[c], power[c], control.running)
        ? Math.min(stores[c], (DISTRIBUTION.pumpLpm * dt) / 60, room)
        : 0;
    taken[c] = inflow;
    tanks = line.tanks.map((t, i) => {
      const site = DAY_TANKS[c][i].site;
      const added = i === line.serving ? inflow : 0;
      const used = (draw[site]?.[c] ?? 0) * dt;
      const litres = t.litres + added - used;
      return {
        ...t,
        litres: Math.min(DAY_TANKS[c][i].litres, Math.max(0, litres)),
      };
    });
    out[c] = { ...line, tanks };
  }
  return { distribution: out, taken };
}

export type DistributionAction =
  | { act: 'hoa'; chemical: Chemical; to: Hoa }
  | { act: 'mode'; chemical: Chemical; to: 'auto' | 'hand' }
  | { act: 'pick'; chemical: Chemical; outlet: number }
  | { act: 'reset'; chemical: Chemical }
  /**
   * A developer's and a test's: set day tank `outlet`'s contents to `share`
   * of full (from the console's `act`), to try a tank nearly empty.
   */
  | { act: 'set'; chemical: Chemical; outlet: number; share: number };

export function actOnDistribution(
  d: ChemicalDistribution,
  a: DistributionAction,
): ChemicalDistribution {
  const line = d[a.chemical];
  const set = (next: ChemicalLine) => ({ ...d, [a.chemical]: next });
  switch (a.act) {
    case 'hoa':
      return set({ ...line, hoa: a.to });
    case 'mode':
      return set({ ...line, mode: a.to });
    case 'pick':
      return a.outlet >= 0 && a.outlet < line.tanks.length
        ? set({ ...line, pick: a.outlet })
        : d;
    case 'set':
      return a.outlet >= 0 && a.outlet < line.tanks.length
        ? set({
            ...line,
            tanks: line.tanks.map((t, i) =>
              i === a.outlet
                ? {
                    ...t,
                    litres:
                      DAY_TANKS[a.chemical][i].litres *
                      Math.max(0, Math.min(1, a.share)),
                  }
                : t,
            ),
          })
        : d;
    case 'reset':
      return line.tanks.every(
        (_, i) => dayLevel(a.chemical, i, line) < DISTRIBUTION.highHigh,
      )
        ? set({ ...line, tripped: false })
        : d;
  }
}
