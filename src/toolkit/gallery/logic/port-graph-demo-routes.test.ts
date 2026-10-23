import { describe, expect, it } from 'vite-plus/test';
import { createPortGraphDemo } from '../../../game/plant/port-graph-demo';
import {
  leavesPortsSquare,
  pipeClashes,
} from '../../components/core/logic/pipe-route';
import { runEntersRegion } from './room-regions';
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
  ADOPTED_RULES,
  demoPlaceItems,
  demoPlaceLinks,
  demoPlumbing,
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

describe('dev19 plumbed by the adopted rules', () => {
  const layout = layoutSizedPlantRoom(
    EXHIBITS.map((exhibit) => exhibit.size),
    { items: demoPlaceItems(), links: demoPlaceLinks() },
  );
  const plumbing = demoPlumbing(layout, ADOPTED_RULES);

  it('reports any branch it cannot route, and keeps installed fittings reachable', () => {
    expect(
      plumbing.problems.every((p) => p.includes('no clash-free route')),
    ).toBe(true);
    // Power feeds leaving the mains share their way out as a bus, so none
    // is left out for want of room at the port.
    expect(plumbing.problems.some((p) => p.includes('power'))).toBe(false);
    expect(plumbing.devices.every((d) => d.reachable)).toBe(true);
  });

  it('never draws a line through another when a route cannot be found', () => {
    // Runs sharing a port's bus or header may lie together; nothing else.
    const clashes = pipeClashes(
      plumbing.runs.map((run) => ({
        name: run.id,
        points: run.points,
        ...demoPipeSpec(run.edgeId, run.medium),
      })),
    ).filter((c) => {
      const a = plumbing.shares.get(c.run)!;
      const b = plumbing.shares.get(c.other)!;
      return !a.some((k) => b.includes(k));
    });
    expect(clashes).toEqual([]);
    for (const run of plumbing.runs) {
      const spec = demoPipeSpec(run.edgeId, run.medium);
      if (run.startPort || run.endPort)
        expect(
          leavesPortsSquare(
            { name: run.id, points: run.points, ...spec },
            { start: run.startPort, end: run.endPort },
          ),
          `${run.id} ${JSON.stringify(run.points)} ${JSON.stringify(run.endPort)}`,
        ).toBe(true);
      for (let k = 1; k < run.points.length; k++)
        expect(
          runEntersRegion(
            run.points[k - 1],
            run.points[k],
            spec.od / 2,
            'regions' in layout ? layout.regions : [],
          ),
          run.id,
        ).toBeNull();
    }
  });

  it('isolates the boiler beyond its breaker, and puts no non-return valve on a single pump', () => {
    const ids = plumbing.devices.map((d) => d.id);
    expect(ids).toContain('demo.boiler.power.isolator');
    expect(ids.some((id) => id.endsWith('.nrv'))).toBe(false);
    expect(ids).toContain('demo.poolPump.suction.iso');
    expect(ids).toContain('demo.poolPump.discharge.iso');
  });

  it('sets the remote valves into their lines, not on the floor', () => {
    for (const id of ['demo.remoteSuction']) {
      const i = demoVisualBindings.findIndex((b) => b.nodeId === id);
      expect(plumbing.places[i].inline).toBe(true);
      expect(plumbing.places[i].y).toBeGreaterThan(0.4);
    }
  });

  it('terminates the flue at the ceiling, straight above the boiler', () => {
    expect(plumbing.terminals).toHaveLength(1);
    expect(plumbing.terminals[0].at[1]).toBe(layout.height);
  });
});

describe('dev19 runs on the graph the plumber installed', () => {
  const layout = layoutSizedPlantRoom(
    EXHIBITS.map((exhibit) => exhibit.size),
    { items: demoPlaceItems(), links: demoPlaceLinks() },
  );
  const plumbing = demoPlumbing(layout, ADOPTED_RULES);

  it('holds every installed fitting as a node, wired into its line', () => {
    const ids = new Set(plumbing.graph.nodes.map((n) => n.id));
    for (const d of plumbing.devices)
      if (d.kind !== 'remote-valve') expect(ids.has(d.id), d.id).toBe(true);
    expect(
      plumbing.graph.edges.some(
        (e) => e.targetId === 'demo.poolPump.suction.iso',
      ),
    ).toBe(true);
  });

  it('stops the pool circulating when the pump\u2019s suction isolator is shut, and runs again when opened', () => {
    const demo = createPortGraphDemo(plumbing.graph);
    demo.step(2);
    expect(demo.state.poolFlowKgPerSecond).toBeGreaterThan(0);
    demo.setFitting('demo.poolPump.suction.iso', false);
    demo.step(2);
    expect(demo.state.poolFlowKgPerSecond).toBe(0);
    demo.setFitting('demo.poolPump.suction.iso', true);
    demo.step(2);
    expect(demo.state.poolFlowKgPerSecond).toBeGreaterThan(0);
  });

  it('cuts the boiler\u2019s power at its own isolator, beyond the breaker', () => {
    const demo = createPortGraphDemo(plumbing.graph);
    demo.setFitting('demo.boiler.power.isolator', false);
    demo.step(2);
    expect(demo.state.boilerMode).toBe('unpowered');
  });
});
