import { describe, expect, it } from 'vite-plus/test';
import { BLOCK_THEME, ConsolePager, PAGER_PIXELS, UiRoot } from './index';
import type { UiSound } from './index';

const mount = (locked = false, lock = true) => {
  const steps: number[] = [];
  const locks: boolean[] = [];
  const sounds: UiSound[] = [];
  const pager = new ConsolePager({
    onStep: (d) => void steps.push(d),
    onLock: (l) => void locks.push(l),
    lock,
  });
  const root = new UiRoot(pager, BLOCK_THEME, {
    width: PAGER_PIXELS.w,
    height: PAGER_PIXELS.h,
    onSound: (s) => sounds.push(s),
  });
  pager.set({ title: 'PUMPS', index: 2, count: 46, locked });
  return { pager, root, steps, locks, sounds };
};

describe('the console pager', () => {
  it('lays ◄, LOCK, ► and the title left to right across its strip, the three buttons alike', () => {
    const { pager } = mount();
    const xs = [pager.back, pager.lock, pager.forward, pager.title].map(
      (n) => n.rect.x,
    );
    const sizes = [pager.back, pager.lock, pager.forward].map((b) => [
      b.shape().w,
      b.shape().h,
    ]);
    expect(new Set(sizes.map((z) => z.join())).size).toBe(1);
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
    expect(pager.count.rect.x + pager.count.rect.w).toBeLessThanOrEqual(
      PAGER_PIXELS.w,
    );
    expect(pager.count.words).toBe('3/46');
  });

  it('steps back and forward, heard as a page change', () => {
    const { root, steps, sounds } = mount();
    root.tap(20, 32);
    root.tap(160, 32);
    expect(steps).toEqual([-1, 1]);
    expect(sounds).toEqual(['page', 'page']);
  });

  it('steps while locked too, LOCK lit and working', () => {
    const { pager, root, steps, locks, sounds } = mount(true);
    expect(pager.lock.lit).toBe(true);
    root.tap(20, 32);
    root.tap(160, 32);
    expect(steps).toEqual([-1, 1]);
    root.tap(100, 32);
    expect(locks).toEqual([false]);
    expect(sounds).toEqual(['page', 'page', 'confirm']);
  });

  it('has no LOCK where it is not wanted: ◄ and ► side by side, alike', () => {
    const { pager, root, steps } = mount(false, false);
    expect(pager.lock.parent).toBeNull();
    expect(pager.back.shape().w).toBe(pager.forward.shape().w);
    root.tap(20, 32);
    root.tap(100, 32);
    expect(steps).toEqual([-1, 1]);
  });

  it('is marked for painting only when what it shows changes', () => {
    const { pager, root } = mount();
    const ctx = {
      save() {},
      restore() {},
      fillRect() {},
      beginPath() {},
      moveTo() {},
      lineTo() {},
      arc() {},
      arcTo() {},
      closePath() {},
      fill() {},
      fillText() {},
      measureText: () => ({ width: 10 }),
    } as unknown as CanvasRenderingContext2D;
    root.paint(ctx);
    pager.set({ title: 'PUMPS', index: 2, count: 46, locked: false });
    expect(root.needsPaint).toBe(false);
    pager.set({ title: 'MIMIC', index: 3, count: 46, locked: false });
    expect(root.needsPaint).toBe(true);
    expect(pager.state?.title).toBe('MIMIC');
  });
});
