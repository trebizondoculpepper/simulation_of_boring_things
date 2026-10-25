import { describe, expect, it } from 'vite-plus/test';
import {
  JACUZZI_FITTINGS,
  JACUZZI_LINKS,
  JACUZZI_NODES,
  JACUZZI_VALVE_IDS,
  jacuzziExpansion,
} from './jacuzzi-schematic';
import { MODEL_VALVES } from './model-valves';
import { JACUZZI_VALVES, jacuzziPaths } from './jacuzzi';
import { applyAction, newWorld } from '../world';

describe('the jacuzzi plant room’s schematic (prompt 064)', () => {
  it('holds every valve: the plumber adds nothing', () => {
    const x = jacuzziExpansion();
    expect(x.added).toEqual([]);
    expect(x.fittings.map((f) => f.id).sort()).toEqual(
      JACUZZI_FITTINGS.map((f) => f.id).sort(),
    );
    expect(x.fittings.every((f) => f.given)).toBe(true);
  });

  it('gives every node, link and fitting one id, and joins only its own nodes', () => {
    const ids = [
      ...JACUZZI_NODES.map((n) => n.id),
      ...JACUZZI_LINKS.map((l) => l.id),
      ...JACUZZI_FITTINGS.map((f) => f.id),
    ];
    expect(new Set(ids).size).toBe(ids.length);
    const nodes = new Set(JACUZZI_NODES.map((n) => n.id));
    for (const l of JACUZZI_LINKS) {
      expect(nodes.has(l.sourceId), l.id).toBe(true);
      expect(nodes.has(l.targetId), l.id).toBe(true);
    }
  });

  it('never valves the spa’s gravity overflow, nor the tank’s', () => {
    for (const link of ['Overflow from the spa', 'Balance tank overflow'])
      expect(jacuzziExpansion().along.get(link)).toBeUndefined();
  });

  it('derives each valve’s tag from the hierarchy, and its words from its link', () => {
    const byRole = new Map(MODEL_VALVES.map((v) => [v.role, v]));
    expect(byRole.get('makeUp')).toMatchObject({
      tag: 'PL3-BT1-IV1',
      normal: 'open',
      route: {
        from: 'the water service',
        to: 'the jacuzzi balance tank',
        medium: 'water',
      },
    });
    expect(byRole.get('tankDrain')?.tag).toBe('PL3-BT1-DV1');
    expect(byRole.get('drain')?.tag).toBe('PL3-CAB1-DV1');
    expect(byRole.get('air')?.route.medium).toBe('air');
    expect(byRole.get('heatingFlow')?.route.medium).toBe('heating water');
    const tags = MODEL_VALVES.map((v) => v.tag);
    expect(new Set(tags).size).toBe(tags.length);
  });

  it('is what the world’s jacuzzi reads: each valve by its model id', () => {
    expect(JACUZZI_VALVES).toBe(JACUZZI_VALVE_IDS);
    const world = newWorld();
    for (const id of Object.values(JACUZZI_VALVES))
      expect(id in world.installedValves, id).toBe(true);
    const shut = applyAction(world, {
      type: 'plant/valve',
      id: JACUZZI_VALVES.suction,
      open: false,
    });
    expect(jacuzziPaths(shut.installedValves).circulation).toBe(false);
    // The tub's drain valve is its drain-down.
    const draining = applyAction(world, {
      type: 'plant/valve',
      id: JACUZZI_VALVES.drain,
      open: true,
    });
    expect(draining.pools.pool_03.drainDown).toBe(true);
    const back = applyAction(draining, {
      type: 'pool/drain-down',
      pool: 'pool_03',
      open: false,
    });
    expect(back.installedValves[JACUZZI_VALVES.drain]).toBe(false);
  });
});
