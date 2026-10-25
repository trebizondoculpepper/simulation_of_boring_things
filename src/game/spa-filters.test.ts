import { describe, expect, it } from 'vite-plus/test';
import { applyAction, newWorld, stepWorld } from './world';
import type { World } from './world';
import { PROGRAMME } from './plant/spa-filter';

/** The world run on `seconds`, a second a step. */
const run = (w: World, seconds: number) => {
  for (let t = 0; t < seconds; t++) w = stepWorld(w, 1);
  return w;
};

describe.each(['pool_03', 'pool_04'] as const)(
  'the %s cabinet’s filter, outside it, in the world',
  (pool) => {
    // Circulating, settled.
    const settled = run(newWorld(), 600);

    it('circulates the spa through its filter, the bed taking dirt', () => {
      expect(settled.pools[pool].flow).toBeGreaterThan(1);
      expect(settled.spaFilters[pool].bed.dirt).toBeGreaterThan(0);
    });

    it('washes on WASH NOW: the spa’s flow stops, then comes back, the bed cleaner', () => {
      const dirty = settled.spaFilters[pool].bed.dirt;
      let w = applyAction(settled, {
        type: 'spa-filter',
        pool,
        action: { act: 'wash-now' },
      });
      // Half way through its backwash: nothing to the spa.
      w = run(w, PROGRAMME.stopping + PROGRAMME.backwash / 2);
      expect(w.spaFilters[pool].phase).toBe('backwash');
      expect(w.pools[pool].flow).toBeLessThan(0.5);
      // Its water to drain, from its tank: the tank lower, its make-up
      // calling for more.
      expect(w.pools[pool].balance).toBeLessThan(settled.pools[pool].balance);
      // After its rinse, filtering again, the bed cleaner.
      w = run(w, PROGRAMME.backwash / 2 + PROGRAMME.rinse + 2);
      expect(w.spaFilters[pool].phase).toBe('filter');
      expect(w.spaFilters[pool].bed.dirt).toBeLessThan(dirty);
      // And the spa's flow back.
      w = run(w, 300);
      expect(w.pools[pool].flow).toBeGreaterThan(1);
    });

    it('carries the spa’s water’s solids to its bed', () => {
      expect(settled.pools[pool].solids).toBeGreaterThan(0);
    });

    it('steps its schedule on MODE', () => {
      const w = applyAction(settled, {
        type: 'spa-filter',
        pool,
        action: { act: 'mode' },
      });
      expect(w.spaFilters[pool].schedule).toBe('12h');
    });
  },
);
