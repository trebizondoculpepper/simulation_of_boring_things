import { describe, expect, it } from 'vite-plus/test';
import { withHeldReadouts } from './museum-1-mimic';
import type { MimicState } from '../../components/industrial-control/logic/mimic';

const state = (lamp: boolean, t: string): MimicState =>
  ({
    lamps: { a: lamp },
    readouts: { t: { live: t } },
  }) as unknown as MimicState;

describe('Hall 1’s mimic readouts, held between readings', () => {
  it('keeps the previous readouts until a refresh, the lamps following', () => {
    const before = state(false, '20.1');
    const held = withHeldReadouts(state(true, '20.2'), before, false);
    expect(held.readouts).toBe(before.readouts);
    expect((held as unknown as { lamps: object }).lamps).toEqual({ a: true });
  });
  it('takes the new readouts on a refresh, or with nothing before', () => {
    const fresh = state(true, '20.2');
    expect(withHeldReadouts(fresh, state(false, '20.1'), true)).toBe(fresh);
    expect(withHeldReadouts(fresh, null, false)).toBe(fresh);
  });
});
