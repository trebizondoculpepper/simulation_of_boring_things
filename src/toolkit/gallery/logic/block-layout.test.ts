import { describe, expect, it } from 'vite-plus/test';
import { EXHIBITS } from '../rooms/plant/port-graph-demo';
import { demoVisualBindings } from '../../../game/plant/port-graph-demo';
import { demoPlaceItems, demoPlaceLinks } from './port-graph-demo-routes';
import { layoutWithBlocks } from './block-layout';
import { sizeRoom } from './room-sizer';

describe('a room with four identical filters', () => {
  it('places them in as few blocks as it can, and passes its gates', () => {
    const sizes = EXHIBITS.map((e) => e.size);
    const items = demoPlaceItems().map((it) => ({ ...it }));
    const links = demoPlaceLinks();
    const f = demoVisualBindings.findIndex((b) => b.nodeId === 'demo.filter');
    for (let n = 2; n <= 4; n++) {
      const i = sizes.length;
      sizes.push(sizes[f]);
      items.push({ ...items[f] });
      for (const l of links.filter(
        (l) => l.a === String(f) || l.b === String(f),
      ))
        links.push({
          ...l,
          a: l.a === String(f) ? String(i) : l.a,
          b: l.b === String(f) ? String(i) : l.b,
        });
    }
    const size = sizeRoom(sizes.filter((_, i) => !items[i].inline));
    const r = layoutWithBlocks(sizes, {
      items,
      links,
      minimumArea: size.w * size.d,
    });
    expect(r.score.passes).toBe(true);
    expect(r.makeUp.get('sand-filter')).toHaveLength(1);
    expect(r.tried.length).toBe(6);
  }, 120000);
});
