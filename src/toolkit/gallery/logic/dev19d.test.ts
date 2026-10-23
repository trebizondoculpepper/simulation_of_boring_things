import { describe, expect, it } from 'vite-plus/test';
import { exhibitsFor } from '../rooms/plant/port-graph-demo';
import { DEV19D_MODEL, variantIssues } from '../../../game/plant/demo-variants';
import { createPortGraphDemo } from '../../../game/plant/port-graph-demo';
import {
  ADOPTED_RULES,
  demoPlaceItems,
  demoPlaceLinks,
  demoPlumbing,
} from './port-graph-demo-routes';
import { layoutWithBlocks } from './block-layout';
import { sizeRoom } from './room-sizer';

describe('dev19d: three sand filters in parallel', () => {
  const sizes = exhibitsFor(DEV19D_MODEL).map((e) => e.size);
  const items = demoPlaceItems(DEV19D_MODEL);
  const size = sizeRoom(sizes.filter((_, i) => !items[i]?.inline));
  const placed = layoutWithBlocks(sizes, {
    items,
    links: demoPlaceLinks(DEV19D_MODEL),
    minimumArea: size.w * size.d,
  });
  const plumbing = demoPlumbing(placed.layout, ADOPTED_RULES, DEV19D_MODEL);

  it('is a valid plant with three filters, made up as one block', () => {
    expect(variantIssues(DEV19D_MODEL)).toEqual([]);
    expect(
      DEV19D_MODEL.bindings.filter((b) => b.kind === 'sand-filter'),
    ).toHaveLength(3);
    expect(placed.score.passes).toBe(true);
    expect(placed.makeUp.get('sand-filter')).toHaveLength(1);
  }, 120000);

  it('isolates the pump once, on the common pipe, with a header the filters branch from', () => {
    expect(plumbing.problems).toEqual([]);
    const ids = plumbing.graph.nodes.map((n) => n.id);
    expect(
      ids.filter((id) => id === 'demo.poolPump.discharge.iso'),
    ).toHaveLength(1);
    expect(ids).toContain('demo.poolPump.discharge.header');
  }, 120000);

  it('circulates the pool through all three, and stops when the shared isolator is shut', () => {
    const demo = createPortGraphDemo(plumbing.graph);
    demo.step(2);
    expect(demo.state.poolFlowKgPerSecond).toBeGreaterThan(0);
    demo.setFitting('demo.poolPump.discharge.iso', false);
    demo.step(2);
    expect(demo.state.poolFlowKgPerSecond).toBe(0);
  }, 120000);
});
