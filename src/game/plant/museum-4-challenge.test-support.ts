import { closeTo } from './museum-4-challenge';
import type { Dose } from './museum-4-challenge';

/** What counts as "close" to a route: the engine's own test (`closeTo`). */
export { closeTo };

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
