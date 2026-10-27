import { describe, expect, it } from 'vite-plus/test';
import {
  BRIDGE_CONSOLES,
  chooseConsole,
  newBridgeConsoles,
} from './bridge-consoles';
import { applyAction, newWorld } from './world';

describe('the bridge’s consoles’ choices', () => {
  it('lists every console once, by a stable id', () => {
    const ids = BRIDGE_CONSOLES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(40);
    // A rename is a conscious act: saves are keyed by these.
    expect(ids).toMatchSnapshot();
  });

  it('starts every console on its default page, unlocked', () => {
    const c = newBridgeConsoles();
    expect(Object.keys(c)).toHaveLength(BRIDGE_CONSOLES.length);
    for (const v of Object.values(c))
      expect(v).toEqual({ page: null, locked: false });
  });

  it('pages, locks, pages while locked (the page then held), and ignores what is not a console', () => {
    const s0 = newBridgeConsoles();
    expect(chooseConsole(s0, 'nothing', { page: 'x' })).toBe(s0);
    expect(chooseConsole(s0, 'viewscreen', { page: null })).toBe(s0);
    const s1 = chooseConsole(s0, 'viewscreen', { page: 'overview.gas' });
    expect(s1.viewscreen.page).toBe('overview.gas');
    const s2 = chooseConsole(s1, 'viewscreen', { locked: true });
    expect(s2.viewscreen).toEqual({ page: 'overview.gas', locked: true });
    expect(
      chooseConsole(s2, 'viewscreen', { page: 'cc-01' }).viewscreen,
    ).toEqual({ page: 'cc-01', locked: true });
    expect(chooseConsole(s2, 'viewscreen', { locked: true })).toBe(s2);
  });

  it('is worked through the world’s actions', () => {
    const w0 = newWorld();
    const w1 = applyAction(w0, {
      type: 'bridge/console',
      console: 'desk.0.1',
      page: 'display.site-status',
    });
    expect(w1.bridgeConsoles['desk.0.1'].page).toBe('display.site-status');
    expect(
      applyAction(w1, { type: 'bridge/console', console: 'no', locked: true }),
    ).toBe(w1);
  });
});
