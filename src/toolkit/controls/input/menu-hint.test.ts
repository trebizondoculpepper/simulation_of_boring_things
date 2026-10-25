import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});
describe('first room menu hint', () => {
  it('is claimed once per page and survives a reload', async () => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key),
      setItem: (key: string, value: string) => values.set(key, value),
    });
    const first = await import('./menu-hint');
    expect(first.claimMenuHint()).toBe(true);
    expect(first.claimMenuHint()).toBe(false);
    vi.resetModules();
    expect((await import('./menu-hint')).claimMenuHint()).toBe(false);
  });
  it('still works once when storage is blocked', async () => {
    vi.stubGlobal('localStorage', {
      getItem() {
        throw new Error('blocked');
      },
    });
    const hint = await import('./menu-hint');
    expect(hint.claimMenuHint()).toBe(true);
    expect(hint.claimMenuHint()).toBe(false);
  });
});
