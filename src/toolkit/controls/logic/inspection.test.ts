import { describe, expect, it } from 'vite-plus/test';
import {
  INSPECT_DELAY_MS,
  NO_INSPECTION,
  inspectionText,
  stepInspection,
} from './inspection';

const valve = {
  key: 'PL3-BT1-IV1',
  title: 'PL3-BT1-IV1: Balance tank make-up valve',
  detail: 'Isolates water.',
};
const tank = { key: 'PL3-BT1', title: 'PL3-BT1: Jacuzzi balance tank' };

describe('inspecting', () => {
  it('names a target once it has stayed under the aim a moment', () => {
    let s = stepInspection(NO_INSPECTION, valve, 0);
    expect(s.shown).toBeNull();
    s = stepInspection(s, valve, INSPECT_DELAY_MS - 1);
    expect(s.shown).toBeNull();
    s = stepInspection(s, valve, INSPECT_DELAY_MS);
    expect(s.shown).toBe(valve);
  });

  it('does not flicker to a neighbour passed over, and clears at once when nothing is aimed at', () => {
    let s = stepInspection(NO_INSPECTION, valve, 0);
    s = stepInspection(s, valve, 200);
    // Over the tank for less than the delay, and back.
    s = stepInspection(s, tank, 250);
    expect(s.shown).toBe(valve);
    s = stepInspection(s, valve, 300);
    expect(s).toEqual({ shown: valve, pending: null });
    s = stepInspection(s, null, 310);
    expect(s).toBe(NO_INSPECTION);
  });

  it('changes the wording of the same target at once, and only when it changes', () => {
    let s = stepInspection(NO_INSPECTION, tank, 0);
    s = stepInspection(s, tank, 200);
    const again = stepInspection(s, { ...tank }, 300);
    expect(again).toBe(s);
    const live = {
      ...tank,
      detail: '1st Balance tank in PL3, currently 40 % full',
    };
    expect(stepInspection(s, live, 301).shown).toEqual(live);
  });

  it('puts the detail on its own line, and leaves it out when there is none', () => {
    expect(inspectionText(valve)).toBe(
      'PL3-BT1-IV1: Balance tank make-up valve\nIsolates water.',
    );
    expect(inspectionText(tank)).toBe('PL3-BT1: Jacuzzi balance tank');
  });
});
