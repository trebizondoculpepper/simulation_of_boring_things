import { describe, expect, it } from 'vite-plus/test';
import { applyAction, newWorld } from './world';

describe('the bridge’s first visit (the owner, 2026-10-27)', () => {
  it('plays its theme once a save, until the knob plate’s RESET', () => {
    let w = newWorld();
    expect(w.bridgeThemeHeard).toBe(false);
    w = applyAction(w, { type: 'bridge/theme-heard' });
    expect(w.bridgeThemeHeard).toBe(true);
    expect(applyAction(w, { type: 'bridge/theme-heard' })).toBe(w);
    w = applyAction(w, { type: 'bridge/first-visit-reset' });
    expect(w.bridgeThemeHeard).toBe(false);
  });
});
