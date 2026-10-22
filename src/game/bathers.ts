/**
 * The bathers: the leisure centre's unseen users, counted pool by pool.
 *
 * The centre opens at 08:00 and closes at 21:00, every day; at closing
 * everyone is out of the water. Through the day bathers arrive at random,
 * at a rate that follows the hour's usual busyness (`TIMETABLE`), and each
 * leaves at random after a typical stay (`STAY`), so a pool's numbers
 * wander about the timetable's and are always whole people. Each day has
 * its own busyness, drawn at midnight, so some days are quiet and some
 * are packed. A pool never holds more than its bathing load (`CAPACITY`);
 * anyone who finds it full goes away.
 *
 * Everyone who goes to a pool wades through the footbath on the way, so
 * the footbath's arrivals are the other pools' arrivals, each staying
 * a few seconds.
 *
 * The world's clock starts at midnight on a Monday (day 0). Randomness
 * comes from a seeded generator whose state is kept in the world, so a
 * run repeats exactly and a reload carries on where it left off. Pure.
 */
import type { PoolId } from './plant/pools';

export const OPENS = 8;
export const CLOSES = 21;

/**
 * Each pool's bathing load, bathers: the most it may hold at once.
 * PWTAG's rule, one bather to every 2.2 m² under 1 m deep, 2.7 m² to
 * 1.5 m and 4 m² deeper, for the lounge (154 m², 0.9 m) and the Olympic
 * pool (1,250 m², 2 m); the jacuzzi's eight seats (HSG282: one bather
 * to a seat); the footbath, a channel 1.5 m to wade across 4 m, six at
 * a time.
 */
export const CAPACITY: Record<PoolId, number> = {
  pool_01: Math.floor(153.8 / 2.2),
  pool_02: Math.floor(1250 / 4),
  pool_03: 8,
  pool_04: 6,
};

/** How long a bather usually stays, seconds. */
export const STAY: Record<PoolId, number> = {
  pool_01: 60 * 60,
  pool_02: 45 * 60,
  pool_03: 15 * 60,
  pool_04: 20,
};

type Profile = readonly number[];
/**
 * The share of its bathing load a pool usually holds in each open hour,
 * 08:00 to 20:00, weekdays and weekends. The lounge is a leisure pool:
 * quiet mornings, a lunchtime rise, the after-school and after-work peak
 * from 16:00; families all day at weekends. The Olympic pool is for lane
 * swimming and clubs: early swimmers, lunchtime, and the clubs' evening
 * sessions; galas and clubs on weekend mornings. The jacuzzi's adults
 * come in the evening. Over the day each averages a third to a half of
 * the load, as PWTAG's operational daily load assumes (25–50 %).
 */
export const TIMETABLE: Record<
  'leisure' | 'lanes' | 'spa',
  { weekday: Profile; weekend: Profile }
> = {
  leisure: {
    weekday: [
      0.15, 0.2, 0.3, 0.3, 0.35, 0.3, 0.25, 0.35, 0.6, 0.7, 0.6, 0.45, 0.25,
    ],
    weekend: [
      0.2, 0.4, 0.65, 0.8, 0.75, 0.75, 0.8, 0.75, 0.6, 0.45, 0.35, 0.25, 0.15,
    ],
  },
  lanes: {
    weekday: [
      0.45, 0.3, 0.25, 0.25, 0.5, 0.4, 0.2, 0.25, 0.4, 0.6, 0.7, 0.6, 0.35,
    ],
    weekend: [
      0.4, 0.45, 0.5, 0.5, 0.45, 0.45, 0.45, 0.4, 0.35, 0.3, 0.25, 0.2, 0.15,
    ],
  },
  spa: {
    weekday: [
      0.25, 0.25, 0.3, 0.3, 0.4, 0.35, 0.3, 0.3, 0.35, 0.5, 0.65, 0.7, 0.55,
    ],
    weekend: [
      0.2, 0.4, 0.6, 0.7, 0.7, 0.7, 0.7, 0.65, 0.6, 0.55, 0.5, 0.45, 0.3,
    ],
  },
};

const USE: Record<Exclude<PoolId, 'pool_04'>, keyof typeof TIMETABLE> = {
  pool_01: 'leisure',
  pool_02: 'lanes',
  pool_03: 'spa',
};

/** A closed pool's bathers are cleared in about this long, seconds. */
export const CLEAR_SECONDS = 60;

/** A day's busyness is drawn between these, a share of the timetable's. */
export const BUSY = { min: 0.7, max: 1.3 } as const;

export interface PoolBathers {
  /** In the water now. */
  now: number;
  /** Arrived today, and since the world began. */
  today: number;
  total: number;
  /** Turned away today, the pool full. */
  turnedAway: number;
}

export interface BathersState {
  pools: Record<PoolId, PoolBathers>;
  /** Today's busyness, and the day it was drawn for. */
  busy: number;
  day: number;
  /** The random generator's state. */
  seed: number;
}

const POOL_IDS: readonly PoolId[] = [
  'pool_01',
  'pool_02',
  'pool_03',
  'pool_04',
];
const empty = (): PoolBathers => ({
  now: 0,
  today: 0,
  total: 0,
  turnedAway: 0,
});

export function newBathers(seed = 20261022): BathersState {
  return {
    pools: Object.fromEntries(POOL_IDS.map((id) => [id, empty()])) as Record<
      PoolId,
      PoolBathers
    >,
    busy: 1,
    day: 0,
    seed: seed >>> 0,
  };
}

/** One draw from the generator (mulberry32): a number in [0, 1), and the next state. */
export function draw(seed: number): [number, number] {
  const next = (seed + 0x6d2b79f5) >>> 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next];
}

/** A Poisson count with mean `mean` (small), from the generator. */
function poisson(mean: number, seed: number): [number, number] {
  if (mean <= 0) return [0, seed];
  const limit = Math.exp(-mean);
  let k = 0;
  let p = 1;
  let s = seed;
  for (;;) {
    const [u, next] = draw(s);
    s = next;
    p *= u;
    if (p <= limit) return [k, s];
    k++;
  }
}

/** The world's time, seconds, as a day number, a day of the week (0 Monday) and an hour of the day. */
export function clock(time: number) {
  const day = Math.floor(time / 86400);
  return { day, weekday: day % 7, hour: (time % 86400) / 3600 };
}

/** Whether the centre is open at `time`. */
export const isOpen = (time: number) => {
  const { hour } = clock(time);
  return hour >= OPENS && hour < CLOSES;
};

/** The share of its load a pool usually holds at `time`: its hour's, on its kind of day. */
export function usualShare(id: PoolId, time: number): number {
  if (id === 'pool_04' || !isOpen(time)) return 0;
  const { weekday, hour } = clock(time);
  const profile = TIMETABLE[USE[id]][weekday >= 5 ? 'weekend' : 'weekday'];
  return profile[Math.floor(hour) - OPENS];
}

/** The bathers `dt` seconds on from `time`. */
export function stepBathers(
  s: BathersState,
  time: number,
  dt: number,
  /** How much each pool is wanted now (`poolAppeal`). */
  appeal: Record<PoolId, number> = FULL_APPEAL,
): BathersState {
  let seed = s.seed;
  let { busy, day } = s;
  const pools = { ...s.pools };
  const today = clock(time).day;
  // A new day: its busyness drawn, its counts started afresh.
  if (today !== day) {
    const [u, next] = draw(seed);
    seed = next;
    busy = BUSY.min + (BUSY.max - BUSY.min) * u;
    day = today;
    for (const id of POOL_IDS)
      pools[id] = { ...pools[id], today: 0, turnedAway: 0 };
  }
  // Closed: everyone is out.
  if (!isOpen(time + dt)) {
    for (const id of POOL_IDS) pools[id] = { ...pools[id], now: 0 };
    return { pools, busy, day, seed };
  }
  let wading = 0;
  for (const id of POOL_IDS) {
    if (id === 'pool_04') continue;
    const p = pools[id];
    // Arrivals at the rate that, with the stay, holds the usual numbers,
    // as many as want the pool now; a pool less wanted is left sooner,
    // and a closed one cleared within a minute or two.
    const wanted = appeal[id];
    const target = usualShare(id, time) * busy * CAPACITY[id] * wanted;
    let arrived: number;
    [arrived, seed] = poisson((target / STAY[id]) * dt, seed);
    const stay =
      wanted <= 0 ? CLEAR_SECONDS : STAY[id] / (1 + 2 * (1 - wanted));
    let left: number;
    [left, seed] = poisson((p.now / stay) * dt, seed);
    left = Math.min(left, p.now);
    const room = CAPACITY[id] - (p.now - left);
    const admitted = Math.min(arrived, room);
    wading += admitted;
    pools[id] = {
      now: p.now - left + admitted,
      today: p.today + admitted,
      total: p.total + admitted,
      turnedAway: p.turnedAway + (arrived - admitted),
    };
  }
  // The footbath: everyone on their way in wades through it.
  const f = pools.pool_04;
  let out: number;
  [out, seed] = poisson((f.now / STAY.pool_04) * dt, seed);
  out = Math.min(out, f.now);
  const inFootbath = Math.min(CAPACITY.pool_04, f.now - out + wading);
  pools.pool_04 = {
    now: inFootbath,
    today: f.today + wading,
    total: f.total + wading,
    turnedAway: f.turnedAway,
  };
  return { pools, busy, day, seed };
}

/** What a pool is like now, as a bather finds it (`poolAppeal`). */
export interface PoolConditions {
  /** Its water's temperature, and what it should be, °C. */
  temperature: number;
  target: number;
  ph: number;
  /** Free and combined chlorine, mg/l. */
  freeChlorine: number;
  combinedChlorine: number;
  /** Whether its water is circulating, treated and filtered. */
  circulating: boolean;
  /** Its hall's air temperature, and what it should be, °C. */
  hallAir: number;
  hallTarget: number;
  /** Whether its hall's lights are on: nobody bathes in the dark, daylight or not. */
  lit: boolean;
  /** A spa (the jacuzzi): HSG282's hotter limit. */
  spa: boolean;
}

/** 1 within `[lo, hi]`, falling straight to 0 at `lo - fall` and `hi + fall`. */
const within = (
  v: number,
  lo: number,
  hi: number,
  fallLo: number,
  fallHi = fallLo,
) =>
  v < lo
    ? Math.max(0, 1 - (lo - v) / fallLo)
    : v > hi
      ? Math.max(0, 1 - (v - hi) / fallHi)
      : 1;

/**
 * How much bathers want a pool now, 0 to 1: the share of its usual
 * bathers who come, and how long they stay. 0 is closed: nobody is let
 * in, and those in the water are cleared.
 *
 * - Closed if its water is not circulating (no treatment, no filtering),
 *   if its hall's lights are out (whatever the daylight: nobody is let in
 *   to bathe unlit), or if its free chlorine is under 0.5 mg/l (the
 *   water not safe: PWTAG's minimum for a pool; the duty manager closes
 *   it), or a spa over 40 °C (HSG282).
 * - Its temperature: as wanted within 1.5 °C of its target, nobody 6 °C
 *   off, too cold or too hot.
 * - pH: as wanted from 7.0 to 7.6 (PWTAG), nobody at 6.5 or 8.2, where
 *   eyes sting.
 * - Free chlorine: as wanted from 1 to 3 mg/l; less, uneasily; more,
 *   irritating, and nobody at 5, where PWTAG says bathing must stop.
 * - Combined chlorine, the chloramines that smell of "chlorine" and sting
 *   the eyes: as wanted to 0.5 mg/l, nobody at 1.5.
 * - The hall's air: as wanted within 2 °C of its design temperature;
 *   nobody when it is 8 °C colder (bathers shiver getting out) or 6 °C
 *   hotter (stifling).
 *
 * (To come, with the water's biology: its smells, musty, stagnant and
 * worse, each another share.)
 *
 * Each is a share; together they multiply. Pure.
 */
export function poolAppeal(c: PoolConditions): number {
  if (!c.circulating || !c.lit) return 0;
  if (c.freeChlorine < 0.5) return 0;
  if (c.spa && c.temperature > 40) return 0;
  return (
    within(c.temperature, c.target - 1.5, c.target + 1.5, 4.5) *
    within(c.ph, 7.0, 7.6, 0.5, 0.6) *
    within(c.freeChlorine, 1, 3, 0.5, 2) *
    within(c.combinedChlorine, 0, 0.5, 1, 1) *
    within(c.hallAir, c.hallTarget - 2, c.hallTarget + 2, 6, 4)
  );
}

/** Every pool as wanted as ever. */
export const FULL_APPEAL: Record<PoolId, number> = {
  pool_01: 1,
  pool_02: 1,
  pool_03: 1,
  pool_04: 1,
};
