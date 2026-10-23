import { describe, expect, it } from 'vite-plus/test';
import {
  BACK_CLEARANCE,
  END_SPACE,
  HEADROOM,
  layoutPlantRoom,
  layoutSquarePlantRoom,
  WALL_FACE,
} from './plant-room-layout';
import {
  demoGraph,
  demoVisualBindings,
} from '../../../game/plant/port-graph-demo';
import {
  adjacencyLinks,
  physicalAdjacencyMatrix,
} from '../../../game/plant/port-adjacency';
import { EXHIBITS } from '../rooms/plant/port-graph-demo';
import type { ExhibitSize } from './plant-room-layout';

const floor = (w: number, d: number, h: number): ExhibitSize => ({
  w,
  d,
  h,
  mount: 'floor',
});

describe('a plant room layout', () => {
  it('keeps every floor exhibit inside the room, clear of the back wall', () => {
    const layout = layoutPlantRoom([floor(3, 3, 3.4), floor(1, 0.6, 0.9)]);
    for (const s of layout.solids) {
      expect(s.minX).toBeGreaterThanOrEqual(-layout.halfX + END_SPACE - 1e-9);
      expect(s.maxX).toBeLessThanOrEqual(layout.halfX - END_SPACE + 1e-9);
      expect(s.minZ).toBeCloseTo(-layout.halfZ + BACK_CLEARANCE);
    }
  });

  it('never overlaps two exhibits', () => {
    const layout = layoutPlantRoom([
      floor(3, 3, 3),
      floor(2, 1, 1),
      floor(4, 2, 2),
    ]);
    const [a, b, c] = layout.solids;
    expect(a.maxX).toBeLessThan(b.minX);
    expect(b.maxX).toBeLessThan(c.minX);
  });

  it('is tall enough for its tallest exhibit', () => {
    const layout = layoutPlantRoom([floor(3, 3, 5.2)]);
    expect(layout.height).toBeGreaterThanOrEqual(5.2 + HEADROOM);
  });

  it('hangs wall equipment on the south wall facing north', () => {
    const layout = layoutPlantRoom([
      floor(2, 1, 1),
      { w: 0.6, d: 0.3, h: 0.8, mount: 'wall', y: 1.6 },
    ]);
    expect(layout.places[1]).toMatchObject({
      z: layout.halfZ - WALL_FACE,
      y: 1.6,
    });
    expect(layout.places[1].yaw).toBeCloseTo(Math.PI);
    expect(layout.solids).toHaveLength(1);
  });

  it('grows the room to fit a long row', () => {
    const layout = layoutPlantRoom(
      Array.from({ length: 8 }, () => floor(3, 2, 2)),
    );
    expect(2 * layout.halfX).toBeGreaterThanOrEqual(8 * 3 + 2 * END_SPACE);
  });

  it('fits the coupled trial machines on four sides of a 20 m square', () => {
    const links = adjacencyLinks(
      physicalAdjacencyMatrix(
        demoGraph,
        demoVisualBindings.map((binding) => binding.nodeId),
      ),
    );
    const layout = layoutSquarePlantRoom(
      EXHIBITS.map((exhibit) => exhibit.size),
      links,
    );
    expect(layout.halfX).toBe(10);
    expect(layout.halfZ).toBe(10);
    expect(layout.height).toBe(4);
    for (const solid of layout.solids) {
      expect(solid.minX).toBeGreaterThan(-10);
      expect(solid.maxX).toBeLessThan(10);
      expect(solid.minZ).toBeGreaterThan(-10);
      expect(solid.maxZ).toBeLessThan(10);
    }
  });
});
