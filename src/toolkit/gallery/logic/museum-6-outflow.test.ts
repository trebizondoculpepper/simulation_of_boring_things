import { describe, expect, it } from 'vite-plus/test';
import {
  DROP_M,
  MAX_SHOWN_DROPS,
  MIN_STREAM_M,
  due,
  fallTime,
  outflowOf,
} from './museum-6-outflow';
import { PUMP_NOS, deliveryAlone } from '../../../game/plant/museum-6-pumps';

const BORE = 0.15;
const FULL = deliveryAlone(11);

describe('Hall 6’s tank inlet outflow', () => {
  it('shows nothing without flow', () => {
    expect(outflowOf(0, BORE, FULL).kind).toBe('none');
  });

  it('drips at a dosing pump, a drop as often as the flow fills one', () => {
    const o = outflowOf(0.002, BORE, FULL); // 2 l/h
    expect(o.kind).toBe('drops');
    if (o.kind !== 'drops') return;
    expect(o.dropsPerSecond).toBeCloseTo(11.1, 1);
    expect(o.shownPerSecond).toBe(o.dropsPerSecond);
    expect(DROP_M).toBeCloseTo(0.0046, 4);
  });

  it('caps the drops drawn', () => {
    const o = outflowOf(0.008, BORE, FULL);
    expect(o.kind).toBe('drops');
    if (o.kind === 'drops') expect(o.shownPerSecond).toBe(MAX_SHOWN_DROPS);
  });

  it('merges into a stream that widens to the full bore at the largest pump', () => {
    const thin = outflowOf(0.03, BORE, FULL);
    expect(thin.kind).toBe('stream');
    if (thin.kind === 'stream') expect(thin.diameter).toBe(MIN_STREAM_M);
    const full = outflowOf(FULL, BORE, FULL);
    if (full.kind === 'stream') expect(full.diameter).toBeCloseTo(BORE);
    const widths = PUMP_NOS.map((n) => {
      const o = outflowOf(deliveryAlone(n), BORE, FULL);
      return o.kind === 'stream' ? o.diameter : 0;
    });
    for (let i = 1; i < widths.length; i++)
      if (deliveryAlone(PUMP_NOS[i]) > deliveryAlone(PUMP_NOS[i - 1]))
        expect(widths[i]).toBeGreaterThanOrEqual(widths[i - 1]);
  });

  it('times falls and counts what falls due', () => {
    expect(fallTime(1)).toBeCloseTo(0.4515, 3);
    expect(due(10, 0.25, 0.6)).toEqual({
      count: 3,
      carry: expect.closeTo(0.1),
    });
  });
});
