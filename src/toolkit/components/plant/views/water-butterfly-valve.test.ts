import { describe, expect, it } from 'vite-plus/test';
import { createPanelKit } from '../../core/views/eighties-controls';
import { createWaterButterflyValve } from './water-butterfly-valve';

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
});
