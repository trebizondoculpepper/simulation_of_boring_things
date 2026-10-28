import { describe, expect, it } from 'vite-plus/test';
import {
  RIG_LENGTH,
  TRAILER,
  TWENTY_FOOT,
  UNIT,
  rigFootprint,
  rigLayout,
} from './rig';

describe('an articulated delivery lorry', () => {
  it('is about 16.5 m long, within the UK’s 16.5 m artic limit and a little', () => {
    expect(RIG_LENGTH).toBeGreaterThan(16);
    expect(RIG_LENGTH).toBeLessThan(17);
  });

  it('carries its 20 ft container at the trailer’s rear, flush with its end', () => {
    const { container } = rigLayout();
    expect(container - TWENTY_FOOT.l / 2).toBeCloseTo(0);
    // Its front clear of the unit's cab, with room to turn.
    const cabBack = rigLayout().unit + UNIT.cab.back;
    expect(container + TWENTY_FOOT.l / 2).toBeLessThan(cabBack - 3);
  });

  it('puts the kingpin over the fifth wheel, and the unit ahead of the trailer’s front', () => {
    const { kingpin, unit } = rigLayout();
    expect(unit + UNIT.fifthWheel.z).toBeCloseTo(kingpin);
    expect(kingpin + TRAILER.front).toBeLessThan(unit + UNIT.cab.back);
  });

  it('keeps the walker off the whole rig', () => {
    const f = rigFootprint(0.1);
    expect(f.maxX - f.minX).toBeCloseTo(2.7);
    expect(f.maxZ - f.minZ).toBeCloseTo(RIG_LENGTH + 0.2);
  });
});
