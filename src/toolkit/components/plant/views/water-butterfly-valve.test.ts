import { describe, expect, it } from 'vite-plus/test';
import { BoxGeometry, Mesh, TorusGeometry } from 'three';
import { createPanelKit } from '../../core/views/eighties-controls';
import { PIPE_SIZES } from './plant-tools';
import {
  addChainWheel,
  createWaterButterflyValve,
} from './water-butterfly-valve';

describe('pool-water butterfly valve', () => {
  it('exposes an operable handle and animates its position', () => {
    const valve = createWaterButterflyValve(
      createPanelKit(),
      200,
      'x',
      'Filter inlet',
    );
    expect(valve.open).toBe(true);
    const handle = valve.uses.keys().next().value;
    expect(handle).toBeDefined();
    valve.uses.get(handle!)!();
    valve.update(1);
    expect(valve.open).toBe(false);
    valve.uses.get(handle!)!();
    valve.update(1);
    expect(valve.open).toBe(true);
    valve.dispose();
  });

  it('uses one chain wheel on an upright overhead valve, without a second lever', () => {
    const kit = createPanelKit();
    const valve = createWaterButterflyValve(
      kit,
      200,
      'y',
      'Filter inlet',
      undefined,
      'chain',
    );
    const bars: Mesh[] = [];
    valve.object.traverse((piece) => {
      if (piece instanceof Mesh && piece.geometry instanceof BoxGeometry)
        bars.push(piece);
    });
    expect(bars).toHaveLength(0);
    const chains = addChainWheel(kit, valve.object, {
      dn: 200,
      axis: 'y',
      at: 2.735,
      chainTo: 1.2,
      name: 'Filter inlet',
    });
    const expectedTip =
      PIPE_SIZES[200].flange * 0.42 + Math.max(0.08, PIPE_SIZES[200].od * 0.6);
    const wheel = valve.object.children.find(
      (piece) =>
        piece instanceof Mesh && piece.geometry instanceof TorusGeometry,
    );
    expect(wheel?.position.z).toBeCloseTo(expectedTip);
    expect(chains).toHaveLength(2);
    expect(chains[0].position.z).toBeCloseTo(expectedTip);
    valve.dispose();
  });
});
