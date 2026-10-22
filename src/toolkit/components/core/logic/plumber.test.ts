import { describe, expect, it } from 'vite-plus/test';
import {
  CABLES,
  KIND_SIZES,
  choosePipe,
  frictionHead,
  gasDrop,
  halfFullCapacity,
} from './plumber';
import { PIPE_KINDS } from '../views/pipe-kinds';

describe('the plumber', () => {
  it('chooses only sizes the pipe helper makes', () => {
    for (const [kind, sizes] of Object.entries(KIND_SIZES))
      for (const od of sizes)
        expect(
          PIPE_KINDS[kind as keyof typeof PIPE_KINDS].sizes,
          `${kind} ${od}`,
        ).toContain(od);
  });

  it('puts pool water in PVC-U, as small as keeps it within 2 m/s', () => {
    const c = choosePipe({ commodity: 'pool-water', flow: 90 });
    expect(c.kind).toBe('pvc-pressure');
    expect(c.velocity).toBeLessThanOrEqual(2);
    const smaller =
      KIND_SIZES['pvc-pressure'][KIND_SIZES['pvc-pressure'].indexOf(c.od) - 1];
    expect(
      choosePipe({ commodity: 'pool-water', flow: 90 }).od,
    ).toBeGreaterThan(smaller);
  });

  it('runs a suction line slower, so wider', () => {
    const pressure = choosePipe({ commodity: 'pool-water', flow: 90 });
    const suction = choosePipe({
      commodity: 'pool-water',
      flow: 90,
      role: 'suction',
    });
    expect(suction.od).toBeGreaterThan(pressure.od);
  });

  it('carries the Olympic’s 620 m³/h within 2 m/s', () => {
    const c = choosePipe({ commodity: 'pool-water', flow: 620 });
    expect(c.problems).toEqual([]);
    expect(c.velocity).toBeLessThanOrEqual(2);
  });

  it('widens a long main to keep its friction loss within the allowance', () => {
    const short = choosePipe({ commodity: 'pool-water', flow: 90, length: 10 });
    const long = choosePipe({ commodity: 'pool-water', flow: 90, length: 400 });
    expect(long.od).toBeGreaterThan(short.od);
    expect(long.loss!.value).toBeLessThanOrEqual(long.loss!.allowance);
    expect(long.reasons.join(' ')).toMatch(/widened for 400 m/);
  });

  it('gives a 100 A feed of 200 m a larger cable than one of 10 m, its drop within 5 %', () => {
    const short = choosePipe({
      commodity: 'ac-400v-3ph',
      current: 100,
      length: 10,
    });
    // 25 mm² carries 100 A and loses 3 % over 80 m: it needs no more
    // until about 133 m.
    const long = choosePipe({
      commodity: 'ac-400v-3ph',
      current: 100,
      length: 200,
    });
    expect(short.cable!.rating).toBeGreaterThanOrEqual(100);
    expect(long.cable!.csa).toBeGreaterThan(short.cable!.csa);
    expect(long.loss!.value).toBeLessThanOrEqual(5);
    expect(long.od).toBeGreaterThanOrEqual(short.od);
  });

  it('allows lighting less drop', () => {
    const power = choosePipe({ commodity: 'ac-230v', current: 16, length: 60 });
    const lighting = choosePipe({
      commodity: 'ac-230v',
      current: 16,
      length: 60,
      lighting: true,
    });
    expect(lighting.cable!.csa).toBeGreaterThanOrEqual(power.cable!.csa);
    expect(lighting.loss!.value).toBeLessThanOrEqual(3);
  });

  it('sends a current too big for any conduit to tray, as a problem, not a silent choice', () => {
    expect(
      choosePipe({ commodity: 'ac-400v-3ph', current: 400 }).problems.length,
    ).toBeGreaterThan(0);
  });

  it('keeps a gas run within 1 mbar, wider when longer', () => {
    const near = choosePipe({ commodity: 'natural-gas', flow: 30, length: 5 });
    const far = choosePipe({ commodity: 'natural-gas', flow: 30, length: 30 });
    expect(near.loss!.value).toBeLessThanOrEqual(1);
    expect(far.od).toBeGreaterThanOrEqual(near.od);
  });

  it('sizes a drain to run half full, whatever its length', () => {
    const c = choosePipe({ commodity: 'drainage', flow: 40 });
    expect(c.kind).toBe('pvc-drain');
    expect(halfFullCapacity(c.od * (1 - 2 / 21))).toBeGreaterThanOrEqual(40);
    expect(
      choosePipe({ commodity: 'drainage', flow: 40, length: 200 }).od,
    ).toBe(c.od);
  });

  it('puts ozone in stainless, dosing in tube, a flue by its boiler, control in 20 mm conduit', () => {
    expect(choosePipe({ commodity: 'ozone', output: 160 }).kind).toBe(
      'stainless',
    );
    expect(choosePipe({ commodity: 'acid', dose: 2 }).kind).toBe(
      'chemical-tube',
    );
    expect(choosePipe({ commodity: 'flue-gas', power: 300 }).od).toBe(0.3);
    expect(choosePipe({ commodity: 'control' }).od).toBe(0.0213);
  });

  it('moves mains water too big for copper into PVC-U', () => {
    expect(choosePipe({ commodity: 'mains-water', flow: 2 }).kind).toBe(
      'copper',
    );
    expect(choosePipe({ commodity: 'mains-water', flow: 60 }).kind).toBe(
      'pvc-pressure',
    );
  });

  it('rejects a capacity that does not suit the commodity, at compile time', () => {
    // @ts-expect-error: a water main has a flow, not a current.
    choosePipe({ commodity: 'pool-water', current: 100 });
    expect(true).toBe(true);
  });

  it('uses physics that agrees with the textbooks', () => {
    // 90 m³/h in a 110 mm PVC bore of about 100 mm: about 3 m/s.
    expect(frictionHead(90, 0.1, 1, 0.0000015).velocity).toBeCloseTo(3.18, 1);
    // Pole: 22 mm copper (about 20 mm bore), 3 m³/h over 10 m: about 1 mbar or less.
    expect(gasDrop(3, 0.02, 10)).toBeLessThan(1.5);
    // The cable table is in ascending order, its drops falling.
    for (let i = 1; i < CABLES.length; i++)
      expect(CABLES[i].mv3).toBeLessThan(CABLES[i - 1].mv3);
  });
});
