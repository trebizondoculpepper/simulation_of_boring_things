import { describe, expect, it } from 'vite-plus/test';
import { leavesPortsSquare } from '../../components/core/logic/pipe-route';
import { EXHIBITS } from '../rooms/plant/port-graph-demo';
import { layoutPlantRoom } from './plant-room-layout';
import {
  demoLineRequest,
  demoPipeSpec,
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
