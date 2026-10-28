import { mixWaters } from './pool-chemistry';
import type { PoolChemistry } from './pool-chemistry';

/**
 * A pool's circuit as well-mixed cells in a ring, the circulation carrying
 * water from each to the next at one flow (`doc/research/
 * water-chemistry-models.md` §5): the balance tank, then the pool as a
 * short chain of cells in series, the return side first and the far side
 * last, whose water goes over the weir back to the tank. Pure.
 *
 * The pool as cells in series is its mixing lag (the owner, 2026-10-28: a
 * dose into the balance tank should take about a turnover to show fully in
 * the pool, not the ten minutes a single well-mixed pool gives). A tracer
 * put into the return reaches the far cell after the pool's own pass,
 * spread as a chain of mixers spreads it, so the far side is the pool's
 * water as bathers meet it and a poolside test reads it.
 *
 * The exchange is linear and the same for every species, so it is solved
 * exactly over a step: `c(t + dt) = exp(M·dt)·c(t)`, with M the ring's
 * flow matrix, by scaling and squaring. Exact at any step, conserving
 * every species' mass to rounding.
 */

/**
 * The share of the pool's volume in each of its cells in series, return
 * side first: three equal cells. On the bench's 25 m pool (a 3.0 h
 * turnover) a dose into the balance tank shows at the far side 63 % in
 * 69 minutes and 95 % in 113, against 10 and 24 minutes with the pool one
 * well-mixed cell; more cells approach plug flow only slowly (six: 93 and
 * 116 minutes), so three is the cheap choice (`doc/research/
 * water-chemistry-models.md` §5.1).
 */
export const POOL_CELL_SHARES: readonly number[] = [1 / 3, 1 / 3, 1 / 3];

type Matrix = number[][];

const identity = (n: number): Matrix =>
  Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  );

function multiply(a: Matrix, b: Matrix): Matrix {
  const n = a.length;
  const out: Matrix = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => 0),
  );
  for (let i = 0; i < n; i++)
    for (let k = 0; k < n; k++) {
      const aik = a[i][k];
      if (aik === 0) continue;
      for (let j = 0; j < n; j++) out[i][j] += aik * b[k][j];
    }
  return out;
}

/** exp(A) by scaling and squaring with a Taylor series: A small, exact to rounding. */
export function expm(a: Matrix): Matrix {
  const n = a.length;
  let norm = 0;
  for (const row of a)
    norm = Math.max(
      norm,
      row.reduce((t, x) => t + Math.abs(x), 0),
    );
  const s = Math.max(0, Math.ceil(Math.log2(Math.max(norm, 1e-300) / 0.25)));
  const scale = 2 ** -s;
  const as = a.map((row) => row.map((x) => x * scale));
  let term = identity(n);
  let sum = identity(n);
  for (let k = 1; k <= 12; k++) {
    term = multiply(term, as).map((row) => row.map((x) => x / k));
    sum = sum.map((row, i) => row.map((x, j) => x + term[i][j]));
  }
  for (let k = 0; k < s; k++) sum = multiply(sum, sum);
  return sum;
}

/**
 * The ring's transfer over `hours`: cell i receives cell i − 1's water at
 * `flow` m³/h and sends as much on, so `dc_i/dt = Q/V_i (c_{i−1} − c_i)`.
 * A cell of no volume is skipped by the flow (an empty pool).
 */
let cached: { key: string; e: Matrix } | null = null;

export function ringTransfer(
  volumes: readonly number[],
  flow: number,
  hours: number,
): Matrix {
  const n = volumes.length;
  if (!(flow > 0) || !(hours > 0) || n < 2) return identity(n);
  // The same ring, flow and step as last time (the usual case): reuse it.
  const key = `${flow}|${hours}|${volumes.join(',')}`;
  if (cached?.key === key) return cached.e;
  const e = transferOf(volumes, flow, hours);
  cached = { key, e };
  return e;
}

function transferOf(
  volumes: readonly number[],
  flow: number,
  hours: number,
): Matrix {
  const n = volumes.length;
  const m: Matrix = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => 0),
  );
  for (let i = 0; i < n; i++) {
    const v = volumes[i];
    if (!(v > 1e-6)) continue;
    const from = (i - 1 + n) % n;
    const k = (flow * hours) / v;
    m[i][i] -= k;
    m[i][from] += k;
  }
  return expm(m);
}

/** The species that the circulation carries, every one but pH. */
const CARRIED = [
  'freeChlorine',
  'chloramine',
  'organicChloramine',
  'trichloramine',
  'ammonia',
  'urea',
  'demand',
  'demandSlow',
  'alkalinity',
  'carbonate',
  'hardness',
  'tds',
  'sulphate',
  'chlorate',
  'cyanuric',
  'thiosulphate',
] as const satisfies readonly (keyof PoolChemistry)[];

/**
 * The ring's cells `hours` on by the circulation alone, each cell's pH
 * solved again from its new alkalinity and carbonate.
 */
export function exchangeRing(
  cells: readonly PoolChemistry[],
  volumes: readonly number[],
  flow: number,
  hours: number,
  temperature: number,
): PoolChemistry[] {
  const e = ringTransfer(volumes, flow, hours);
  if (e.every((row, i) => row.every((x, j) => x === (i === j ? 1 : 0))))
    return cells.map((c) => ({ ...c }));
  const out = cells.map((c) => ({ ...c }));
  for (const k of CARRIED)
    for (let i = 0; i < cells.length; i++) {
      let x = 0;
      for (let j = 0; j < cells.length; j++) x += e[i][j] * cells[j][k];
      out[i][k] = x;
    }
  return out.map((w) => mixWaters([{ water: w, volume: 1 }], temperature));
}

/** The pool's cells' volumes, m³, from its whole volume. */
export const poolCellVolumes = (volume: number): number[] =>
  POOL_CELL_SHARES.map((s) => s * volume);
