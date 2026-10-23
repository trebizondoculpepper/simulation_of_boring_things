import { describe, expect, it } from 'vite-plus/test';
import {
  SOURCE_SHAPE,
  SUBSTANCES,
  canAccept,
  canSupply,
  createExperimentalSink,
  createExperimentalSource,
  ratingLines,
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

  it('makes a source of every commodity, each output typed by its medium and substance', () => {
    for (const substance of Object.keys(
      SUBSTANCES,
    ) as (keyof typeof SUBSTANCES)[]) {
      const s = createExperimentalSource({ id: `t.${substance}`, substance });
      expect(s.ports[0].data).toMatchObject({
        medium: SUBSTANCES[substance].medium,
        substance,
      });
    }
    expect(SUBSTANCES['dirty-water'].medium).toBe('water');
    expect(SUBSTANCES['power-230v'].medium).toBe('power');
  });

  it('never flows at infinite speed: its rate is the potential over its resistance, capped', () => {
    const s = createExperimentalSource({
      id: 't',
      substance: 'power-230v',
    });
    expect(s.flow.potentialUnit).toBe('V');
    // Into a dead short, only its maximum.
    expect(s.rateInto(0)).toBe(7.4);
    // Into something near its own potential, much less; at it, nothing.
    expect(s.rateInto(229)).toBeCloseTo(1 / s.flow.resistance, 6);
    expect(s.rateInto(230)).toBe(0);
    // A second's draw is capped at its rate.
    expect(s.draw(1000, 1)).toBeCloseTo(7.4 / 3600, 9);
    expect(() =>
      createExperimentalSource({
        id: 't',
        substance: 'acid',
        maxRate: Infinity,
      }),
    ).toThrow();
  });

  it('has sinks to match, typed, with a capacity that may be infinite', () => {
    const d = createExperimentalSink({
      id: 'drain',
      substance: 'dirty-water',
      inputs: 2,
      capacity: 10,
    });
    expect(d.role).toBe('sink');
    expect(d.ports.map((p) => [p.name, p.direction])).toEqual([
      ['in-1', 'in'],
      ['in-2', 'in'],
      ['capacity', 'out'],
    ]);
    expect(d.ports[2].data.control).toMatchObject({
      access: 'read',
      infinite: false,
    });
    expect(d.accept(4, 3600)).toBe(4);
    expect(d.space()).toBe(6);
    expect(d.accept(100, 3600)).toBe(6);
    expect(d.accept(1, 3600)).toBe(0);
    // Its rate too: 60 m³/h, from 2 bar into its 0 bar, through its resistance.
    const open = createExperimentalSink({
      id: 'grid',
      substance: 'dirty-water',
    });
    expect(open.endless).toBe(true);
    expect(open.reading()).toBe('∞');
    expect(open.rateFrom(2)).toBe(60);
    expect(open.accept(1e6, 60)).toBeCloseTo(1, 6);
    expect(canAccept(open, 'water', 'dirty-water')).toBe(true);
    expect(canAccept(open, 'water', 'pool-water')).toBe(false);
  });

  it('letters a rating plate in each medium’s own units', () => {
    expect(
      ratingLines(
        createExperimentalSource({ id: 't', substance: 'mains-water' }),
      ),
    ).toEqual([
      'SUBSTANCE  MAINS WATER',
      'MAX FLOW  5 m³/h',
      'RESISTANCE  0.3 bar/(m³/h)',
      'SUPPLY PRESSURE  3 bar',
    ]);
    // Power: kilowatts, and ohms (32 A dropping half of 230 V: 3.57 Ω).
    expect(
      ratingLines(
        createExperimentalSource({ id: 't', substance: 'power-230v' }),
      ),
    ).toEqual([
      'SUBSTANCE  230 V 1-PH',
      'MAX FLOW  7.4 kW',
      'RESISTANCE  3.57 Ω',
      'SUPPLY VOLTAGE  230 V',
    ]);
    expect(
      ratingLines(
        createExperimentalSink({ id: 't', substance: 'dirty-water' }),
      )[3],
    ).toBe('BACK PRESSURE  0 bar');
  });

  it('runs down as it is drawn from, and delivers nothing once empty', () => {
    const s = createExperimentalSource({
      id: 't',
      substance: 'hypochlorite',
      quantity: 10,
    });
    // An hour at a time, so its rate (10 l/h) does not hold it back.
    expect(s.draw(4, 3600)).toBe(4);
    expect(s.remaining()).toBe(6);
    expect(s.draw(10, 3600)).toBe(6);
    expect(s.remaining()).toBe(0);
    expect(s.draw(1, 3600)).toBe(0);
  });

  it('can be endless, and says so', () => {
    const s = createExperimentalSource({ id: 't', substance: 'mains-water' });
    expect(s.endless).toBe(true);
    // Endless, but never faster than its rate: 5 m³/h over a day.
    expect(s.draw(1e6, 86400)).toBeCloseTo(120, 6);
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
