import { describe, expect, it } from 'vite-plus/test';
import {
  SOURCE_SHAPE,
  canSupply,
  createExperimentalSource,
} from './experimental-source';

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
      infinite: false,
    });
    expect(s.reading()).toBe('25.0');
  });

  it('places every port precisely: outputs proud of the cylinder facing out, the control port on top facing up', () => {
    const s = createExperimentalSource({
      id: 't',
      substance: 'power-400v',
      outputs: 3,
    });
    const reach = SOURCE_SHAPE.radius + SOURCE_SHAPE.stud;
    const outputs = s.ports.filter((p) => p.data.medium !== 'control');
    expect(outputs).toHaveLength(3);
    for (const p of outputs) {
      expect(Math.hypot(p.at[0], p.at[2])).toBeCloseTo(reach, 3);
      expect(p.at[1]).toBe(SOURCE_SHAPE.outputs);
      // Facing straight out from the axis, and toward the back (−z).
      expect(p.out[0] * p.at[2] - p.out[2] * p.at[0]).toBeCloseTo(0, 3);
      expect(p.out[2]).toBeLessThan(0);
    }
    expect(new Set(outputs.map((p) => p.at.join())).size).toBe(3);
    const control = s.ports.find((p) => p.name === 'remaining')!;
    expect(control.at).toEqual([
      0,
      SOURCE_SHAPE.height + SOURCE_SHAPE.gland,
      0,
    ]);
    expect(control.out).toEqual([0, 1, 0]);
    expect(control.data.control?.infinite).toBe(true);
  });

  it('has one control port, which only reports: no switch', () => {
    const s = createExperimentalSource({ id: 't', substance: 'ozone' });
    const controls = s.ports.filter((p) => p.data.medium === 'control');
    expect(controls.map((p) => p.name)).toEqual(['remaining']);
    expect(controls[0].data.control?.access).toBe('read');
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
