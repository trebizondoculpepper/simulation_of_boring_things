/**
 * A water network, solved for its steady state: the head at every node
 * and the flow in every link. Pure.
 *
 * Units: heads in metres of water (above the deck's level), flows in
 * cubic metres an hour. Nodes are junctions, or reservoirs whose head is
 * fixed (a tank's or the pool's water level). Links join two nodes:
 *
 * - **resistance**: a pipe run, a fitting, an open valve, a strainer, a
 *   filter, a heat exchanger: losing Δh = r·Q·|Q| (turbulent flow);
 * - **check**: the same, but passing flow one way only (a non-return
 *   valve);
 * - **pump**: adding head along its curve, H(Q) = shutoff − k·Q², one way
 *   only (a stopped pump passes nothing: its own non-return valve);
 * - **closed**: nothing (a shut valve).
 *
 * The solver finds the heads at which every junction's flows balance,
 * Newton's method on the junction heads, as network solvers such as
 * EPANET do; each link's law is softened very slightly near zero flow so
 * the method stays well behaved there.
 */

export interface NetNode {
  id: string;
  /** For a reservoir: its fixed head, metres. */
  head?: number;
}

export type NetLink =
  | {
      id: string;
      kind: 'resistance' | 'check';
      from: string;
      to: string;
      r: number;
    }
  | {
      id: string;
      kind: 'pump';
      from: string;
      to: string;
      shutoff: number;
      k: number;
    }
  | { id: string; kind: 'closed'; from: string; to: string };

export interface NetSolution {
  heads: Record<string, number>;
  flows: Record<string, number>;
  /** Whether the balance was found to within its tolerance. */
  converged: boolean;
}

/** The softening near zero flow, metres per m³/h: negligible at any real flow. */
const SOFT = 1e-5;
/**
 * What a closed path still lets through, m³/h per metre of head: nothing
 * that matters (a few litres an hour at full pump head), but enough to
 * anchor the head of a dead end shut off on every side.
 */
export const SHUT = 1e-4;
/**
 * The head, metres, over which a one-way link (a non-return valve, a
 * pump) changes from passing to holding: a smooth change, since a kink
 * at zero flow stalls the solver.
 */
const ONE_WAY = 1e-3;

/** A one-way link's flow: its forward law blended into shut as `dh` goes negative. */
function oneWay(forward: (dh: number) => number, dh: number) {
  const open = 1 / (1 + Math.exp(-dh / ONE_WAY));
  return open * forward(Math.max(dh, 0)) + (1 - open) * dh * SHUT;
}

/** Q from Δh where Δh = r·Q·|Q| + SOFT·Q. */
function quadraticFlow(r: number, dh: number) {
  const a = Math.abs(dh);
  const q =
    r > 0 ? (-SOFT + Math.sqrt(SOFT * SOFT + 4 * r * a)) / (2 * r) : a / SOFT;
  return Math.sign(dh) * q;
}

/** A link's flow, from → to, given the heads at its two ends. */
export function linkFlow(link: NetLink, from: number, to: number) {
  switch (link.kind) {
    case 'closed':
      return (from - to) * SHUT;
    case 'resistance':
      return quadraticFlow(link.r, from - to);
    case 'check': {
      const dh = from - to;
      return oneWay((d) => quadraticFlow(link.r, d), dh);
    }
    case 'pump': {
      // The head it must add: delivered when its curve can give it.
      const spare = link.shutoff - (to - from);
      return oneWay((d) => quadraticFlow(link.k, d), spare);
    }
  }
}

/** Solve a small linear system A·x = b by Gaussian elimination with pivoting. */
function solveLinear(a: number[][], b: number[]) {
  const n = b.length;
  const m = a.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++)
      if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
    [m[c], m[p]] = [m[p], m[c]];
    const pivot = m[c][c] || 1e-30;
    for (let r = c + 1; r < n; r++) {
      const f = m[r][c] / pivot;
      if (f) for (let k = c; k <= n; k++) m[r][k] -= f * m[c][k];
    }
  }
  const x = new Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = m[r][n];
    for (let k = r + 1; k < n; k++) s -= m[r][k] * x[k];
    x[r] = s / (m[r][r] || 1e-30);
  }
  return x;
}

export function solveNetwork(
  nodes: readonly NetNode[],
  links: readonly NetLink[],
  { tolerance = 1e-6, iterations = 200 } = {},
): NetSolution {
  const fixed = nodes.filter((n) => n.head !== undefined);
  const free = nodes.filter((n) => n.head === undefined);
  const index = new Map(free.map((n, i) => [n.id, i]));
  const start =
    fixed.length > 0
      ? fixed.reduce((s, n) => s + (n.head ?? 0), 0) / fixed.length
      : 0;
  let x = free.map(() => start);
  const headOf = (h: readonly number[], id: string) => {
    const i = index.get(id);
    if (i !== undefined) return h[i];
    const node = nodes.find((n) => n.id === id);
    if (node?.head === undefined) throw new Error(`No node "${id}"`);
    return node.head;
  };
  // Each junction's imbalance: flow in minus flow out.
  const residual = (h: readonly number[]) => {
    const f = free.map(() => 0);
    for (const link of links) {
      const q = linkFlow(link, headOf(h, link.from), headOf(h, link.to));
      const i = index.get(link.from),
        j = index.get(link.to);
      if (i !== undefined) f[i] -= q;
      if (j !== undefined) f[j] += q;
    }
    return f;
  };
  let f = residual(x);
  let norm = Math.max(0, ...f.map(Math.abs));
  let converged = norm < tolerance;
  for (let it = 0; it < iterations && !converged; it++) {
    // The Jacobian, by small differences: the networks here are small. The
    // step is a fixed tenth of a micrometre, not a share of the head: on a
    // short joint, losing millimetres, a step scaled to a head tens of
    // metres up spoils the estimate, and the solve stalls short of balance.
    const jac = free.map(() => free.map(() => 0));
    for (let c = 0; c < free.length; c++) {
      const step = 1e-7;
      const xs = [...x];
      xs[c] += step;
      const fs = residual(xs);
      for (let r = 0; r < free.length; r++) jac[r][c] = (fs[r] - f[r]) / step;
    }
    const dx = solveLinear(
      jac,
      f.map((v) => -v),
    );
    // Halve the step until it improves the balance.
    let scale = 1;
    let next = x,
      nextF = f,
      nextNorm = norm;
    for (let tries = 0; tries < 30; tries++) {
      next = x.map((v, i) => v + dx[i] * scale);
      nextF = residual(next);
      nextNorm = Math.max(0, ...nextF.map(Math.abs));
      if (nextNorm < norm) break;
      scale /= 2;
    }
    x = next;
    f = nextF;
    norm = nextNorm;
    converged = norm < tolerance;
  }
  const heads: Record<string, number> = {};
  for (const n of nodes) heads[n.id] = headOf(x, n.id);
  const flows: Record<string, number> = {};
  for (const link of links)
    flows[link.id] = linkFlow(link, heads[link.from], heads[link.to]);
  return { heads, flows, converged };
}

/** Gauge pressure, bar, at a point `elevation` metres up where the head is `head`. */
export const gaugeBar = (head: number, elevation: number) =>
  (head - elevation) * 0.0981;

/** The resistance r that loses `dh` metres at `flow` m³/h. */
export const resistanceFor = (dh: number, flow: number) => dh / (flow * flow);
