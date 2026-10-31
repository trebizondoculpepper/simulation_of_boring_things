import { describe, expect, it } from 'vite-plus/test';
import {
  BASKET_RADIUS,
  CAUSTIC_LAYERS,
  INNER_CAUSTICS,
  OUTER_CAUSTICS,
  SKIMMER_OPENING,
  causticLayerFrame,
} from './skimmer-caustic-layers';

describe('skimmer caustic layers', () => {
  it('has an outer ring at the rim and an inner one at the basket rim', () => {
    expect(CAUSTIC_LAYERS).toHaveLength(2);
    expect(OUTER_CAUSTICS.base).toBe(0);
    expect(OUTER_CAUSTICS.radius).toBeGreaterThan(SKIMMER_OPENING);
    expect(INNER_CAUSTICS.base).toBeLessThan(0);
    expect(INNER_CAUSTICS.radius).toBeLessThan(BASKET_RADIUS);
    expect(INNER_CAUSTICS.radius).toBeLessThan(OUTER_CAUSTICS.radius);
  });

  it('keeps the inner layer distinct: paler, dimmer, out of step', () => {
    expect(INNER_CAUSTICS.colour).not.toBe(OUTER_CAUSTICS.colour);
    expect(INNER_CAUSTICS.brightness).toBeLessThan(1);
    expect(INNER_CAUSTICS.lead).not.toBe(OUTER_CAUSTICS.lead);
  });

  it('rises and fades both layers with the film', () => {
    for (const layer of CAUSTIC_LAYERS) {
      expect(causticLayerFrame(layer, 1, 0, 0).glow).toBe(0);
      const f = causticLayerFrame(layer, 2, 2.4, 0.5);
      expect(f.rise).toBe(2.4);
      expect(f.glow).toBeCloseTo(0.5 * layer.brightness);
      expect(f.time).toBeCloseTo(2 + layer.lead);
    }
  });
});
