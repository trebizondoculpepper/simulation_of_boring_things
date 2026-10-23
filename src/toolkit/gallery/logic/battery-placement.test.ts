import { describe, expect, it } from 'vite-plus/test';
import { EXHIBITS } from '../rooms/plant/port-graph-demo';
import { demoVisualBindings } from '../../../game/plant/port-graph-demo';
import { layoutSizedPlantRoom } from './plant-room-layout';
import { demoPlaceItems, demoPlaceLinks } from './port-graph-demo-routes';

/** Dev19 with two more sand filters, piped in parallel like the first. */
function withThreeFilters(grouped: boolean) {
  const sizes = EXHIBITS.map((e) => e.size);
  const items = demoPlaceItems().map((it) =>
    grouped ? it : { ...it, group: undefined },
  );
  const links = demoPlaceLinks();
  const f = demoVisualBindings.findIndex((b) => b.nodeId === 'demo.filter');
  const filters = [f];
  for (let n = 0; n < 2; n++) {
    const i = sizes.length;
    filters.push(i);
    sizes.push(sizes[f]);
    items.push(items[f]);
    for (const l of links.filter((l) => l.a === String(f) || l.b === String(f)))
      links.push({
        ...l,
        a: l.a === String(f) ? String(i) : l.a,
        b: l.b === String(f) ? String(i) : l.b,
      });
  }
  const layout = layoutSizedPlantRoom(sizes, { items, links });
  const spread = Math.max(
    ...filters.flatMap((a) =>
      filters.map((b) =>
        Math.hypot(
          layout.places[a].x - layout.places[b].x,
          layout.places[a].z - layout.places[b].z,
        ),
      ),
    ),
  );
  return { layout, filters, spread };
}

describe('like machines stand together', () => {
  it('keeps three identical sand filters closer together with the battery rule than without', () => {
    const loose = withThreeFilters(false);
    const battery = withThreeFilters(true);
    expect(battery.layout.problems).toEqual([]);
    expect(battery.spread).toBeLessThan(loose.spread);
    // All three within a few metres of one another.
    expect(battery.spread).toBeLessThan(4);
  }, 120000);
});
