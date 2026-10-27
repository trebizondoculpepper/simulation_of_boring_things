import type { PoolId } from './pools';
import type { Chemical } from './chemicals';
import { CHEMICALS, DOSE_PER_M3_DAY } from './chemicals';

/**
 * The chemical distribution (plan 085; the owner, 2026-10-26): each
 * chemical's transfer pump in its store, sending it along one main to its
 * transfer selector on the wet hall's dirty side, which sends it on to
 * each plant room's day tank in turn; each pool doses from its own day
 * tank. Pure.
 *
 * - The bulk stores are the world's `chemicals` (litres each store holds);
 *   transfer draws them down, deliveries fill them.
 * - A day tank calls at its low switch (20%) and stops calling at its high
 *   switch (90%).
 * - Its selector in AUTO serves the calling day tanks one at a time, in
 *   turn; in HAND, the one picked while it is below high. Only the served
 *   outlet's valve is open.
 * - The pump (one, not a duty and standby pair: light work, and soon
 *   swapped) runs in AUTO or HAND while an outlet is served and its store
 *   has chemical above its low-level cut-out; in OFF, never. Any day tank's
 *   high-high (98%) trips it and shuts its selector until RESET.
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
    { site: 'pool_01', litres: 200 },
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
  /** Its low switch has called, and its high switch not yet stopped it. */
  calling: boolean;
}

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
      (t, i) => line.tanks[i] ?? { litres: t.litres * 0.7, calling: false },
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
    tanks: DAY_TANKS[c].map((t) => ({
      litres: t.litres * (START[c]?.[t.site] ?? 0.7),
      calling: false,
    })),
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
): boolean {
  return (
    !line.tripped &&
    line.serving !== null &&
    line.hoa !== 'off' &&
    store > capacity * DISTRIBUTION.storeLow
  );
}

/** Whether outlet `i`'s valve is open. */
export const outletOpen = (line: ChemicalLine, i: number) => line.serving === i;

function serve(c: Chemical, line: ChemicalLine): number | null {
  if (line.tripped) return null;
  const n = line.tanks.length;
  if (line.mode === 'hand')
    return line.pick < n && dayLevel(c, line.pick, line) < DISTRIBUTION.high
      ? line.pick
      : null;
  if (line.serving !== null && line.tanks[line.serving]?.calling)
    return line.serving;
  const from = line.serving === null ? 0 : line.serving + 1;
  for (let k = 0; k < n; k++) {
    const i = (from + k) % n;
    if (line.tanks[i].calling) return i;
  }
  return null;
}

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
 * The distribution `dt` seconds on: each line's switches, its selector,
 * its pump moving litres from its store to the served day tank, and every
 * day tank drawn on by its pool's dosing (`draw`, litres a second). Gives
 * the litres each store gave.
 */
export function stepDistribution(
  d: ChemicalDistribution,
  stores: Record<Chemical, number>,
  capacity: Record<Chemical, number>,
  draw: Partial<Record<PoolId, Record<Chemical, number>>>,
  dt: number,
): { distribution: ChemicalDistribution; taken: Record<Chemical, number> } {
  const taken = { hypochlorite: 0, acid: 0 };
  const out = { ...d };
  for (const c of CHEMICALS) {
    let line = fitted(c, d[c]);
    // The switches.
    let tripped = line.tripped;
    let tanks = line.tanks.map((t, i) => {
      const level = t.litres / DAY_TANKS[c][i].litres;
      if (level >= DISTRIBUTION.highHigh) tripped = true;
      if (level >= DISTRIBUTION.high)
        return t.calling ? { ...t, calling: false } : t;
      if (level <= DISTRIBUTION.low)
        return t.calling ? t : { ...t, calling: true };
      return t;
    });
    line = { ...line, tanks, tripped };
    line = { ...line, serving: serve(c, line) };
    // The transfer, never more than the store has.
    const inflow = transferRunning(line, stores[c], capacity[c])
      ? Math.min(stores[c], (DISTRIBUTION.pumpLpm * dt) / 60)
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
  | { act: 'reset'; chemical: Chemical };

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
    case 'reset':
      return line.tanks.every(
        (_, i) => dayLevel(a.chemical, i, line) < DISTRIBUTION.highHigh,
      )
        ? set({ ...line, tripped: false })
        : d;
  }
}
