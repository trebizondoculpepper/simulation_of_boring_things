import { describe, expect, it } from 'vite-plus/test';
import {
  BLOCK_THEME,
  BOOT_HZ,
  BOOT_TIMING,
  Bar,
  BootGroup,
  BootScreen,
  Button,
  DRAW_IN,
  Elbow,
  Frame,
  Label,
  UiRoot,
  bootDuration,
  bootState,
  drawInPlan,
  drawInShare,
  rect,
  staggeredOffsets,
} from './index';
import type { UiNode } from './index';

/** A canvas context that does nothing, recording which nodes' fills happen. */
function nullContext(): CanvasRenderingContext2D {
  const gradient = { addColorStop: () => {} };
  return new Proxy({} as Record<string, unknown>, {
    get(target, key) {
      if (key in target) return target[key as string];
      if (key === 'measureText') return () => ({ width: 10 });
      if (key === 'createRadialGradient' || key === 'createLinearGradient')
        return () => gradient;
      return () => {};
    },
    set(target, key, value) {
      target[key as string] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
}

function panel() {
  let pressed = 0;
  const button = new Button({
    label: 'GO',
    onPress: () => {
      pressed++;
    },
  });
  const frame = new Frame({
    title: 'TEST',
    sidebar: [new Button({ label: 'A' })],
    content: button,
  });
  const boot = new BootScreen(frame);
  const root = new UiRoot(boot, BLOCK_THEME, { width: 800, height: 450 });
  const centre = () => ({
    x: button.rect.x + button.rect.w / 2,
    y: button.rect.y + button.rect.h / 2,
  });
  return { boot, root, button, frame, centre, pressed: () => pressed };
}

describe('a display’s boot (the owner, 2026-10-27)', () => {
  it('runs black, emblem, fade, black, draw-in, on, in that order and time', () => {
    const T = BOOT_TIMING;
    // About 5 s (the owner, 2026-10-27).
    expect(T.emblem).toBeGreaterThanOrEqual(4);
    expect(T.emblem).toBeLessThanOrEqual(6);
    expect(T.fade).toBeCloseTo(0.5);
    expect(T.draw).toBeCloseTo(1);
    expect(bootState(-0.1).phase).toBe('black');
    expect(bootState(0).phase).toBe('emblem');
    expect(bootState(T.emblem - 0.01).phase).toBe('emblem');
    expect(bootState(T.emblem + 0.01).phase).toBe('fade');
    expect(bootState(T.emblem + T.fade + 0.01).phase).toBe('black');
    expect(bootState(T.emblem + T.fade + T.gap + 0.01).phase).toBe('draw');
    expect(bootState(bootDuration() + 0.01).phase).toBe('on');
    // The emblem fades in from black and out to it.
    expect(bootState(0).emblem).toBe(0);
    expect(bootState(T.emblemIn).emblem).toBe(1);
    expect(bootState(T.emblem + T.fade / 2).emblem).toBeCloseTo(0.5);
    expect(bootState(T.emblem + T.fade).emblem).toBe(0);
  });

  it('scatters offsets over their spread', () => {
    const offsets = staggeredOffsets(50, 1.5, 0.2);
    expect(offsets).toHaveLength(50);
    for (const o of offsets) {
      expect(o).toBeGreaterThanOrEqual(0.2);
      expect(o).toBeLessThanOrEqual(1.7);
    }
    expect(new Set(offsets).size).toBeGreaterThan(40);
  });

  it('starts on and operational, and takes touches', () => {
    const p = panel();
    expect(p.boot.operational).toBe(true);
    expect(p.boot.phase).toBe('on');
    const c = p.centre();
    p.root.tap(c.x, c.y);
    expect(p.pressed()).toBe(1);
  });

  it('goes black at once on boot, refuses touches until on, then works', () => {
    const p = panel();
    p.root.tick(10);
    p.boot.boot(0.5);
    expect(p.boot.phase).toBe('black');
    expect(p.root.needsPaint).toBe(true);
    const c = p.centre();
    let t = 10;
    const step = 1 / 60;
    const seen = new Set<string>();
    while (t < 10 + 0.5 + bootDuration() - 0.05) {
      p.root.tick(t);
      seen.add(p.boot.phase);
      expect(p.root.tap(c.x, c.y).node).toBeNull();
      t += step;
    }
    expect(p.pressed()).toBe(0);
    expect([...seen]).toEqual(['black', 'emblem', 'fade', 'draw']);
    p.root.tick(10 + 0.5 + bootDuration() + 0.01);
    expect(p.boot.operational).toBe(true);
    p.root.tap(c.x, c.y);
    expect(p.pressed()).toBe(1);
  });

  it('starts dark when asked, waiting for its boot', () => {
    const boot = new BootScreen(new Label('x'), { dark: true });
    boot.tick(1);
    expect(boot.phase).toBe('black');
    expect(boot.operational).toBe(false);
    expect(boot.booting).toBe(false);
    boot.boot();
    expect(boot.booting).toBe(true);
  });

  it('takes a boot’s own timing for that boot', () => {
    const boot = new BootScreen(new Label('x'));
    boot.boot(0, { emblem: 2 });
    boot.tick(0);
    boot.tick(2.1);
    expect(boot.phase).toBe('fade');
    boot.boot(0);
    boot.tick(3);
    boot.tick(5.1);
    expect(boot.phase).toBe('emblem');
  });

  it('skips straight to on', () => {
    const p = panel();
    p.boot.boot(0);
    p.root.tick(1);
    p.boot.skip();
    expect(p.boot.operational).toBe(true);
    expect(p.boot.booting).toBe(false);
  });

  it('marks itself dirty at most BOOT_HZ a second while booting, and never by itself once on', () => {
    const p = panel();
    const ctx = nullContext();
    p.root.paint(ctx);
    p.boot.boot(0);
    let paints = 0;
    let t = 0;
    const step = 1 / 120;
    const end = bootDuration() + 0.5;
    while (t < end) {
      p.root.tick(t);
      if (p.root.needsPaint) {
        paints++;
        p.root.paint(ctx);
      }
      t += step;
    }
    expect(paints).toBeLessThanOrEqual(Math.ceil(end * BOOT_HZ) + 4);
    expect(paints).toBeGreaterThan(bootDuration() * BOOT_HZ * 0.6);
    // On: nothing more of its own.
    let after = 0;
    for (let i = 0; i < 240; i++) {
      t += step;
      p.root.tick(t);
      if (p.root.needsPaint) {
        after++;
        p.root.paint(ctx);
      }
    }
    expect(after).toBe(0);
  });

  it('paints every phase without a canvas of its own (a null context)', () => {
    const p = panel();
    const ctx = nullContext();
    p.boot.boot(0);
    for (let t = 0; t < bootDuration() + 0.2; t += 0.05) {
      p.root.tick(t);
      p.root.paint(ctx);
    }
    expect(p.boot.operational).toBe(true);
  });

  it('draws in the frame first, sweeping, then the panels in turn', () => {
    const p = panel();
    const plan = drawInPlan(p.frame, rect(0, 0, 800, 450));
    const entries = [...plan.entries()];
    const frames = entries.filter(
      ([n]) => n instanceof Elbow || n instanceof Bar,
    );
    const panels = entries.filter(
      ([n]) => !(n instanceof Elbow || n instanceof Bar),
    );
    expect(frames.length).toBeGreaterThanOrEqual(4);
    expect(panels.length).toBeGreaterThanOrEqual(2);
    for (const [, e] of frames) {
      expect(e.frame).toBe(true);
      expect(e.start).toBeLessThanOrEqual(DRAW_IN.frameSpread);
      expect(drawInShare(e, 0)).toBe(0);
      expect(drawInShare(e, e.start + DRAW_IN.frameSweep)).toBe(1);
    }
    const starts = panels.map(([, e]) => e.start);
    expect(Math.min(...starts)).toBeCloseTo(DRAW_IN.panelsFrom);
    expect(Math.max(...starts)).toBeCloseTo(DRAW_IN.panelsTo);
    for (const [, e] of panels) {
      expect(drawInShare(e, e.start - 0.01)).toBe(0);
      expect(drawInShare(e, e.start)).toBe(0.5);
      expect(drawInShare(e, e.start + DRAW_IN.flicker)).toBe(1);
    }
  });

  it('boots a room of screens at scattered offsets, skips them, and boots newcomers', () => {
    let k = 0;
    const group = new BootGroup(() => (k++ % 10) / 10);
    const screens: BootScreen[] = [];
    for (let i = 0; i < 5; i++)
      screens.push(group.add(new BootScreen(new Label(`${i}`))));
    group.bootAll(1.5);
    expect(group.booting).toBe(true);
    for (const s of screens) s.tick(0);
    // At 0.05 s only the first (offset 0) shows its emblem.
    for (const s of screens) s.tick(0.05);
    expect(screens.map((s) => s.phase)).toEqual([
      'emblem',
      'black',
      'black',
      'black',
      'black',
    ]);
    group.skipAll();
    expect(group.booting).toBe(false);
    group.autoBoot({ spread: 1 });
    const late: UiNode = group.add(new BootScreen(new Label('late')));
    expect((late as BootScreen).booting).toBe(true);
  });
});
