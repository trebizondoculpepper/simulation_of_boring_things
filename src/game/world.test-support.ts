import type { World } from './world';
import type { Chemical } from './plant/chemicals';

/** A chemical run out everywhere: its store and every day tank (plan 085). */
export const runOut = (w: World, c: Chemical, store = 0): World => ({
  ...w,
  chemicals: { ...w.chemicals, [c]: store },
  distribution: {
    ...w.distribution,
    [c]: {
      ...w.distribution[c],
      tanks: w.distribution[c].tanks.map((t) => ({ ...t, litres: 0 })),
    },
  },
});
