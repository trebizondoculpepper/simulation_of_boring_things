import { describe, expect, it } from 'vite-plus/test';
import { leavesPortsSquare } from '../../components/core/logic/pipe-route';
import { EXHIBITS } from '../rooms/plant/port-graph-demo';
import {
  layoutPlantRoom,
  layoutSizedPlantRoom,
  layoutSquarePlantRoom,
} from './plant-room-layout';
import {
  adjacencyLinks,
  physicalAdjacencyMatrix,
} from '../../../game/plant/port-adjacency';
import {
  demoGraph,
  demoVisualBindings,
} from '../../../game/plant/port-graph-demo';
import {
  demoLineRequest,
  demoPipeSpec,
  demoPlaceItems,
  demoPlaceLinks,
  demoServiceRoutes,
} from './port-graph-demo-routes';

describe('dev19 pipe endpoints', () => {
  it('leaves every connected physical port square before bending', () => {
    const layout = layoutPlantRoom(EXHIBITS.map((exhibit) => exhibit.size));
    const routes = demoServiceRoutes(layout);
    expect(routes.length).toBeGreaterThan(20);
    for (const route of routes) {
      const { od, joint } = demoPipeSpec(route.edgeId, route.medium);
      expect(
        leavesPortsSquare(
          { name: route.edgeId, points: route.points, od, joint },
          { start: route.startPort, end: route.endPort },
        ),
        route.edgeId,
      ).toBe(true);
    }
  });

  it('asks the new helper for service-specific pipes and conduit', () => {
    expect(demoLineRequest('gas-supply', 'gas').commodity).toBe('natural-gas');
    expect(demoLineRequest('primary-supply', 'water').commodity).toBe('lthw');
    expect(demoLineRequest('pool-return', 'water').commodity).toBe(
      'pool-water',
    );
    expect(demoLineRequest('makeup-supply', 'water').commodity).toBe(
      'mains-water',
    );
    expect(demoPipeSpec('flue', 'flue').kind).toBe('twin-wall-flue');
    expect(demoPipeSpec('pool-pump-power', 'power').kind).toBe('steel-screwed');
  });
});

describe('dev19 laid out by its layers', () => {
  const sizes = EXHIBITS.map((exhibit) => exhibit.size);
  const layout = layoutSizedPlantRoom(sizes, {
    items: demoPlaceItems(),
    links: demoPlaceLinks(),
  });
  const kinds = demoVisualBindings.map((binding) => binding.kind);

  it('is sized for its machines, two storeys, with a gantry, and breaks no rule', () => {
    expect(layout.problems).toEqual([]);
    expect(layout.halfX * 2).toBeLessThanOrEqual(14);
    expect(layout.height).toBe(8);
    expect(layout.gantry).not.toBeNull();
  });

  it('puts the big tanks in corners and the panels on walls', () => {
    layout.places.forEach((place, i) => {
      const f = layout.solids[i];
      if (kinds[i] === 'balance-tank' || kinds[i] === 'water-tank') {
        expect(
          Math.min(f.minX + layout.halfX, layout.halfX - f.maxX),
        ).toBeLessThan(0.5);
        expect(
          Math.min(f.minZ + layout.halfZ, layout.halfZ - f.maxZ),
        ).toBeLessThan(0.5);
      }
      if (kinds[i] === 'mimic' || kinds[i] === 'pool-mimic') {
        const toWall = Math.min(
          f.minX + layout.halfX,
          layout.halfX - f.maxX,
          f.minZ + layout.halfZ,
          layout.halfZ - f.maxZ,
        );
        expect(toWall).toBeLessThan(0.5);
        void place;
      }
    });
  });

  it('brings piped machines closer than the old square layout did', () => {
    const old = layoutSquarePlantRoom(
      sizes,
      adjacencyLinks(
        physicalAdjacencyMatrix(
          demoGraph,
          demoVisualBindings.map((binding) => binding.nodeId),
        ),
      ),
    );
    const length = (places: readonly { x: number; z: number }[]) =>
      demoPlaceLinks().reduce(
        (sum, link) =>
          sum +
          link.weight *
            (Math.abs(places[+link.a].x - places[+link.b].x) +
              Math.abs(places[+link.a].z - places[+link.b].z)),
        0,
      );
    expect(length(layout.places)).toBeLessThan(0.75 * length(old.places));
  });
});
