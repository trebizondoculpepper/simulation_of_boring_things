import { describe, expect, it } from 'vite-plus/test';
import { newFibreIlluminator, setFibreIlluminator } from './fibre-illuminator';

describe('the Jacuzzi fibre illuminator', () => {
  it('keeps the knobs within their physical ranges', () => {
    const base = newFibreIlluminator();
    expect(
      setFibreIlluminator(base, { control: 'brightness', value: 2 }).brightness,
    ).toBe(1);
    expect(
      setFibreIlluminator(base, { control: 'brightness', value: -1 })
        .brightness,
    ).toBe(0);
    expect(
      setFibreIlluminator(base, { control: 'twinkleSpeed', value: 20 })
        .twinkleSpeed,
    ).toBe(10);
    expect(
      setFibreIlluminator(base, { control: 'twinkleSpeed', value: 0.2 })
        .twinkleSpeed,
    ).toBe(0);
  });
});
