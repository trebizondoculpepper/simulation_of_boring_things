import { describe, expect, it } from 'vite-plus/test';
import { SUBSTANCES } from '../../../game/plant/experimental-source';
import type { Substance } from '../../../game/plant/experimental-source';
import {
  DEV21_CAPACITY,
  DEV21_QUANTITY,
  createSourceSinkModel,
  expectedRate,
  plumbSourceSinkRoom,
} from './source-sink-plumbing';

/**
 * Dev21's valves opened, and the flows checked against what they should
 * be: the room's own model, at its own figures, stepped at 60 frames a
 * second as the room is.
 */
const ALL = Object.keys(SUBSTANCES) as Substance[];
const plumbed = plumbSourceSinkRoom(ALL);
const fresh = () =>
  createSourceSinkModel(plumbed, {
    quantity: DEV21_QUANTITY,
    capacity: DEV21_CAPACITY,
  });
const run = (model: ReturnType<typeof fresh>, seconds: number, dt = 1 / 60) => {
  for (let t = 0; t < Math.round(seconds / dt); t++) model.step(dt);
};
const openLine = (
  model: ReturnType<typeof fresh>,
  s: Substance,
  ends = [0, 1],
) => {
  for (const k of ends) model.setOpen(model.fittingsOf(s)[k], true);
};

describe('Dev21: opening valves', () => {
  it('carries nothing while the valves are as the plumber left them, closed', () => {
    const model = fresh();
    run(model, 60);
    for (const s of ALL) {
      expect(model.sinks.get(s)!.received()).toBe(0);
      expect(model.rate(s)).toBe(0);
    }
  });

  it('carries nothing with only one end open, either end', () => {
    const model = fresh();
    openLine(model, 'mains-water', [0]);
    openLine(model, 'natural-gas', [1]);
    run(model, 60);
    expect(model.sinks.get('mains-water')!.received()).toBe(0);
    expect(model.sinks.get('natural-gas')!.received()).toBe(0);
  });

  it('carries each opened line at its expected rate, and only the lines opened', () => {
    const model = fresh();
    const opened: Substance[] = [
      'mains-water',
      'pool-water',
      'natural-gas',
      'chlorine',
      'power-230v',
      'heating-oil',
    ];
    for (const s of opened) openLine(model, s);
    run(model, 60);
    for (const s of ALL) {
      const got = model.sinks.get(s)!.received();
      if (!opened.includes(s)) {
        expect(got, s).toBe(0);
        continue;
      }
      // A minute at its rate, its unit an hour.
      expect(got, s).toBeCloseTo(expectedRate(model, s) / 60, 6);
      expect(model.rate(s), s).toBeCloseTo(expectedRate(model, s), 6);
      // Nothing made or lost on the way.
      const source = model.sources.get(s)!;
      if (!source.endless)
        expect(source.remaining() + got, s).toBeCloseTo(
          source.spec.quantity,
          9,
        );
    }
  });

  it('stops a line when it is shut again', () => {
    const model = fresh();
    openLine(model, 'mains-water');
    run(model, 30);
    const before = model.sinks.get('mains-water')!.received();
    model.setOpen(model.fittingsOf('mains-water')[1], false);
    run(model, 30);
    expect(model.sinks.get('mains-water')!.received()).toBe(before);
  });

  it('runs a finite source dry: 25 kg of chlorine at 2 kg/h lasts 12½ hours', () => {
    const model = fresh();
    openLine(model, 'chlorine');
    run(model, 12 * 3600, 1);
    expect(model.sources.get('chlorine')!.remaining()).toBeCloseTo(1, 6);
    run(model, 3600, 1);
    expect(model.sources.get('chlorine')!.remaining()).toBe(0);
    expect(model.sinks.get('chlorine')!.received()).toBeCloseTo(25, 6);
    expect(model.rate('chlorine')).toBe(0);
  });

  it('fills a finite sink: 50 l of hypochlorite at 10 l/h fills it in 5 hours, the source keeping the rest', () => {
    const model = fresh();
    openLine(model, 'hypochlorite');
    run(model, 6 * 3600, 1);
    expect(model.sinks.get('hypochlorite')!.received()).toBeCloseTo(50, 6);
    expect(model.sources.get('hypochlorite')!.remaining()).toBeCloseTo(150, 6);
    expect(model.rate('hypochlorite')).toBe(0);
  });
});
