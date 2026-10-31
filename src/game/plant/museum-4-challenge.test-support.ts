import type { Dose } from './museum-4-challenge';
import { sizeShare } from './museum-4-doses';
import type { TankId } from './museum-4-lab';

/**
 * What counts as "close" to a stored solution, for the partial-solution
 * tests (the owner, 2026-10-31): chemicals that do the same job are one
 * family (the two chlorines; the three acids), each dose its share of its
 * tank's largest sensible dose (`sizeShare`), every tank's Huge being the
 * same strength of measure. A winning sequence is close to a route when, for
 * every family the route uses, it puts in at least the route's total less
 * one size step (a √10); a family it adds on top only spends a dose.
 */
const FAMILY: Partial<Record<TankId, string>> = {
  hypo: 'chlorine',
  calHypo: 'chlorine',
  hcl: 'acid',
  bisulphate: 'acid',
  co2: 'acid',
};
const family = (t: TankId) => FAMILY[t] ?? t;

const totals = (doses: readonly Dose[]) => {
  const m = new Map<string, number>();
  for (const d of doses)
    m.set(family(d.tank), (m.get(family(d.tank)) ?? 0) + sizeShare(d.size));
  return m;
};

export function closeTo(doses: readonly Dose[], route: readonly Dose[]) {
  const got = totals(doses);
  for (const [f, need] of totals(route))
    if ((got.get(f) ?? 0) < need / Math.sqrt(10) - 1e-9) return false;
  return true;
}

/** Every proper partial of `route`: each subset, and each dose shrunk by one or more steps. */
export function partials(route: readonly Dose[]) {
  const out: { doses: Dose[]; steps: number }[] = [];
  for (let m = 0; m < (1 << route.length) - 1; m++)
    out.push({ doses: route.filter((_, i) => m & (1 << i)), steps: Infinity });
  route.forEach((d, i) => {
    for (let s = d.size - 1; s >= 0; s--)
      out.push({
        doses: route.map((e, j) =>
          j === i ? { ...e, size: s as Dose['size'] } : e,
        ),
        steps: d.size - s,
      });
  });
  return out;
}

export const doseKey = (ds: readonly Dose[]) =>
  ds.map((d) => `${d.tank} ${d.size}`).join(', ');
