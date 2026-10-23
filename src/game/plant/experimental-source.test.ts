import { describe, expect, it } from 'vite-plus/test';
import { canSupply, createExperimentalSource } from './experimental-source';

describe('experimental sources', () => {
  it('has typed outputs, as many as asked, and a control port reporting what is left', () => {
    const s = createExperimentalSource({
      id: 'test.chlorine',
      substance: 'chlorine',
      outputs: 2,
      quantity: 25,
    });
    expect(s.ports.map((p) => p.name)).toEqual(['out-1', 'out-2', 'remaining']);
    expect(s.ports[0].data).toMatchObject({
      medium: 'gas',
      substance: 'chlorine',
    });
    expect(s.ports[2].data.control).toEqual({
      valueType: 'number',
      unit: 'kg',
      access: 'read',
    });
    expect(s.reading()).toBe('25.0');
  });

  it('runs down as it is drawn from, and delivers nothing once empty', () => {
    const s = createExperimentalSource({
      id: 't',
      substance: 'hypochlorite',
      quantity: 10,
    });
    expect(s.draw(4)).toBe(4);
    expect(s.remaining()).toBe(6);
    expect(s.draw(10)).toBe(6);
    expect(s.remaining()).toBe(0);
    expect(s.draw(1)).toBe(0);
  });

  it('can be endless, and says so', () => {
    const s = createExperimentalSource({ id: 't', substance: 'mains-water' });
    expect(s.endless).toBe(true);
    expect(s.draw(1e6)).toBe(1e6);
    expect(s.remaining()).toBe(Infinity);
    expect(s.reading()).toBe('∞');
  });

  it('only supplies a port of its own medium and substance', () => {
    const s = createExperimentalSource({ id: 't', substance: 'ozone' });
    expect(canSupply(s, 'gas')).toBe(true);
    expect(canSupply(s, 'gas', 'chlorine')).toBe(false);
    expect(canSupply(s, 'water')).toBe(false);
  });

  it('refuses nonsense', () => {
    expect(() =>
      createExperimentalSource({ id: 't', substance: 'acid', outputs: 0 }),
    ).toThrow();
    expect(() =>
      createExperimentalSource({ id: 't', substance: 'acid', quantity: -1 }),
    ).toThrow();
  });
});
