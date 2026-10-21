import { describe, expect, it } from 'vite-plus/test';
import {
  createSignState,
  DEV_SIGN_DEFAULTS,
  devSignState,
  fieldText,
  SIGN_FIELDS,
  signFrame,
} from './pool-info-sign';

const field = (id: string) => SIGN_FIELDS.find((f) => f.id === id)!;
const rows = (state: ReturnType<typeof createSignState>, now = 0) =>
  Object.fromEntries(signFrame(state, now).rows.map((r) => [r.field, r]));

describe('pool information sign', () => {
  it('shows each reading to its own precision', () => {
    expect(fieldText(field('water'), { value: 29.46, at: 0 })).toBe('29.5');
    expect(fieldText(field('ph'), { value: 7.42, at: 0 })).toBe('7.4');
    expect(fieldText(field('free'), { value: 1.2, at: 0 })).toBe('1.20');
    expect(fieldText(field('combined'), { value: 0.254, at: 0 })).toBe('0.25');
  });

  it('shows the clock, and dashes without one', () => {
    const state = createSignState();
    expect(signFrame(state, 0).hours).toBe('--');
    state.clock = 9 * 3600 + 5 * 60 + 0.2;
    const frame = signFrame(state, 0);
    expect([frame.hours, frame.minutes, frame.colon]).toEqual([
      '09',
      '05',
      true,
    ]);
  });

  it('shows dashes, never zero, for a reading it has not got', () => {
    const shown = rows(createSignState());
    expect(shown.water.text).toBe('--.-');
    expect(shown.ph.text).toBe('-.-');
    expect(shown.free.text).toBe('-.--');
    expect(shown.combined.text).toBe('-.--');
    expect(shown.redox.text).toBe('---');
    expect(shown.humidity.text).toBe('---');
    expect(fieldText(field('free'), { value: Number.NaN, at: 0 })).toBe('-.--');
  });

  it('shows Err for a value its digits cannot hold', () => {
    expect(fieldText(field('water'), { value: 105, at: 0 })).toBe('Err');
    expect(fieldText(field('ph'), { value: 14, at: 0 })).toBe('Err');
  });

  it('marks readings stale once older than their field allows', () => {
    const now = 1000;
    const stale = rows(
      devSignState('MAIN POOL', true, 'stale', DEV_SIGN_DEFAULTS, now),
      now,
    );
    expect(stale.water.stale).toBe(true);
    expect(stale.water.text).toBe('29.5');
    const fresh = rows(
      devSignState('MAIN POOL', true, 'normal', DEV_SIGN_DEFAULTS, now),
      now,
    );
    expect(fresh.water.stale).toBe(false);
    // Combined chlorine is keyed in by hand: stale only after a day.
    expect(fresh.combined.stale).toBe(false);
    const nextDay = 27 * 3600;
    expect(
      rows(
        devSignState('MAIN POOL', true, 'normal', DEV_SIGN_DEFAULTS, nextDay),
        nextDay,
      ).combined.stale,
    ).toBe(true);
  });

  it('goes dark when off, and lights everything under test', () => {
    const off = devSignState(
      'MAIN POOL',
      false,
      'normal',
      DEV_SIGN_DEFAULTS,
      0,
    );
    expect(signFrame(off, 0).name).toBe('');
    expect(signFrame(off, 0).rows.every((r) => r.text === '')).toBe(true);
    const test = signFrame(
      devSignState('MAIN POOL', true, 'test', DEV_SIGN_DEFAULTS, 0),
      0,
    );
    expect(test.rows.find((r) => r.field === 'water')!.text).toBe('8.8.8.');
  });

  it('shows the missing mode as dashes on every row', () => {
    const missing = signFrame(
      devSignState('SPA', true, 'missing', DEV_SIGN_DEFAULTS, 0),
      0,
    );
    expect(missing.name).toBe('SPA');
    expect(missing.rows.every((r) => r.text.replace(/[-.]/g, '') === '')).toBe(
      true,
    );
  });
});
