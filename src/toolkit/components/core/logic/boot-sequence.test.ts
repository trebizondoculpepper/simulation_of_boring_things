import { describe, expect, it } from 'vite-plus/test';
import {
  BOOT_FAMILIES,
  BOOT_NAMES,
  bootFrame,
  bootScript,
  bootUploads,
  LIVE_HZ,
  pixelRect,
  seededRandom,
} from './boot-sequence';
import type { BootApp, BootFamily, BootFrame } from './boot-sequence';

const APP: BootApp = {
  name: 'Test App',
  maker: 'Test Maker',
  subtitle: 'v1',
  messages: ['One…', 'Two…', 'Loading the doctor…'],
};

/** Every frame at `hz` across the boot. */
const frames = (family: BootFamily, seed = 1, hz = 50, unclean = false) => {
  const s = bootScript(family, { seed, app: APP, unclean });
  const out: { t: number; f: BootFrame }[] = [];
  for (let k = 0; k / hz <= s.total + 2; k++)
    out.push({ t: k / hz, f: bootFrame(s, k / hz) });
  return { s, out };
};

describe('boot scripts', () => {
  it('last about as long as each family should', () => {
    const range: Record<BootFamily, [number, number]> = {
      gui: [30, 45],
      unix: [15, 25],
      dos: [8, 16],
      firmware: [2, 5],
    };
    for (const family of BOOT_FAMILIES)
      for (let seed = 1; seed <= 40; seed++)
        for (const unclean of [false, true]) {
          const s = bootScript(family, { seed, app: APP, unclean });
          expect(s.total).toBeGreaterThanOrEqual(range[family][0]);
          expect(s.total).toBeLessThanOrEqual(range[family][1]);
        }
  });

  it('are the same for a seed and differ between seeds', () => {
    for (const family of BOOT_FAMILIES) {
      const a = JSON.stringify(bootScript(family, { seed: 3 }));
      expect(JSON.stringify(bootScript(family, { seed: 3 }))).toBe(a);
      const others = [4, 5, 6, 7].map((seed) =>
        JSON.stringify(bootScript(family, { seed })),
      );
      expect(others.some((o) => o !== a)).toBe(true);
    }
  });

  it('keep every line on its screen', () => {
    for (const family of BOOT_FAMILIES)
      for (let seed = 1; seed <= 10; seed++) {
        const s = bootScript(family, { seed, app: APP, unclean: true });
        for (const step of s.steps) {
          if (!step.grid) continue;
          for (const l of step.lines ?? []) {
            const room = step.grid.cols - (l.col ?? 0) - (l.result ? 9 : 0);
            expect(l.text.length, `${step.id}: ${l.text}`).toBeLessThanOrEqual(
              room,
            );
            if (l.row !== undefined) expect(l.row).toBeLessThan(step.grid.rows);
          }
          for (const l of step.live ?? [])
            if (l.kind === 'counter')
              expect(l.col + l.done.length).toBeLessThanOrEqual(step.grid.cols);
        }
      }
  });

  it('use invented names only', () => {
    const all = JSON.stringify([
      BOOT_NAMES,
      ...BOOT_FAMILIES.map((f) => bootScript(f, { unclean: true })),
    ]);
    for (const real of [
      'Windows',
      'Microsoft',
      'Vista',
      'Award',
      'Phoenix',
      'American Megatrends',
      'FreeBSD',
      'NetBSD',
      'OpenBSD',
      'MS-DOS',
      'Intel',
      'Pentium',
      'Energy Star',
      'Realtek',
    ])
      expect(all).not.toContain(real);
  });

  it('seed a small, even source', () => {
    const r = seededRandom(9);
    const xs = Array.from({ length: 2000 }, r);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...xs)).toBeLessThan(1);
    const mean = xs.reduce((a, b) => a + b) / xs.length;
    expect(mean).toBeGreaterThan(0.45);
    expect(mean).toBeLessThan(0.55);
  });
});

describe('the gui boot', () => {
  it('runs POST, the logo, the Welcome, then the application', () => {
    const { s, out } = frames('gui');
    const order = [...new Set(out.map((x) => x.f.step))];
    expect(order).toEqual([
      'power',
      'post',
      'pci',
      'loader',
      'logo',
      'welcome',
      'app',
    ]);
    expect(bootFrame(s, s.total).done).toBe(true);
    expect(bootFrame(s, s.total - 0.01).done).toBe(false);
  });

  it('counts its memory up, then shows it done', () => {
    const s = bootScript('gui', { seed: 2 });
    const post = s.steps.find((x) => x.id === 'post')!;
    const counts = [1.5, 2, 2.5, 3].map(
      (t) => bootFrame(s, post.start + t).live!,
    );
    expect(counts.every((c) => c.kind === 'counter')).toBe(true);
    const values = counts.map((c) => c.value);
    expect([...values].sort((a, b) => a - b)).toEqual(values);
    expect(values[0]).toBeLessThan(values[3]);
    expect(values.every((v) => v % 1024 === 0)).toBe(true);
    const after = bootFrame(s, post.start + 3.3);
    expect(after.live).toBe(null);
    expect(after.cells.some((c) => c.text.startsWith('1047552K OK'))).toBe(
      true,
    );
    // The setup key at the bottom, period fashion.
    expect(after.cells.some((c) => c.text.includes('Press DEL'))).toBe(true);
  });

  it('shows the recovery menu after a power cut, counting down', () => {
    const s = bootScript('gui', { seed: 1, unclean: true, app: APP });
    const rec = s.steps.find((x) => x.id === 'recovery')!;
    expect(rec).toBeTruthy();
    const a = bootFrame(s, rec.start + 0.1).live!;
    const b = bootFrame(s, rec.start + 4.5).live!;
    expect(a.value).toBeGreaterThan(b.value);
    expect(
      bootScript('gui', { seed: 1 }).steps.some((x) => x.id === 'recovery'),
    ).toBe(false);
  });

  it('ends with its application’s splash, its bar filling and messages in turn', () => {
    const s = bootScript('gui', { seed: 1, app: APP });
    const app = s.steps.at(-1)!;
    expect(app.kind).toBe('splash');
    const f0 = bootFrame(s, app.start + 0.1);
    const f1 = bootFrame(s, app.start + app.duration - 0.1);
    expect(f0.live!.kind).toBe('bar');
    expect(f0.live!.value).toBeLessThan(f1.live!.value);
    expect(f0.live!.text).toBe('One…');
    expect(f1.live!.text).toBe('Loading the doctor…');
    expect(f1.app?.name).toBe('Test App');
  });

  it('has no application step without one', () => {
    const s = bootScript('gui', { seed: 1 });
    expect(s.steps.at(-1)!.id).toBe('welcome');
  });

  it('asks its permission only when a scenario wants it', () => {
    const ids = (consent: boolean) =>
      bootScript('gui', { seed: 1, consent, app: null }).steps.map((x) => x.id);
    expect(ids(false)).not.toContain('consent');
    expect(ids(true).at(-1)).toBe('consent');
  });
});

describe('the unix boot', () => {
  it('twirls, counts down, probes, starts services and asks for a login', () => {
    const { s, out } = frames('unix', 5);
    const kinds = new Set(out.map((x) => x.f.live?.kind).filter(Boolean));
    expect(kinds).toEqual(new Set(['twirl', 'counter', 'cursor']));
    const end = bootFrame(s, s.total + 5);
    const text = end.cells.map((c) => c.text).join('\n');
    expect(text).toContain('login: ');
    expect(text).toContain('[  OK  ]');
    expect(end.live?.kind).toBe('cursor');
    expect(end.cells.every((c) => c.row < 25)).toBe(true);
  });

  it('shows a service as pending, then its result', () => {
    const s = bootScript('unix', { seed: 1 });
    const rc = s.steps.find((x) => x.id === 'rc')!;
    const name = 'Setting date via ntp';
    const line = rc.lines!.find((l) => l.text === name)!;
    const find = (f: BootFrame) => f.cells.find((c) => c.text.startsWith(name));
    // A console's text moves on in bursts: look just after the line's.
    const p = bootFrame(s, rc.start + Math.ceil(line.at * 1.5) / 1.5 + 0.01);
    expect(p.step).toBe('rc');
    expect(find(p)?.text).toBe(name + ' ...');
    const done = bootFrame(s, rc.start + line.at + line.result!.after + 0.7);
    expect(find(done)?.text).toBe(name);
    expect(done.cells.some((c) => c.text === '[ WARN ]')).toBe(true);
  });

  it('notices an unclean shutdown', () => {
    const s = bootScript('unix', { seed: 1, unclean: true });
    const text = s.steps
      .flatMap((x) => x.lines ?? [])
      .map((l) => l.text)
      .join('\n');
    expect(text).toContain('was not properly dismounted');
  });
});

describe('the firmware and dos boots', () => {
  it('firmware checks its memory and devices, then runs', () => {
    const s = bootScript('firmware', { seed: 1 });
    const end = bootFrame(s, s.total);
    const text = end.cells.map((c) => c.text);
    expect(text.some((t) => t.startsWith('2048B'))).toBe(true);
    expect(text).toContain('RUN');
    expect(text.filter((t) => t.endsWith('OK')).length).toBeGreaterThanOrEqual(
      5,
    );
  });

  it('dos mistypes its program, then runs it', () => {
    const s = bootScript('dos', { seed: 1 });
    const end = bootFrame(s, s.total + 1);
    const text = end.cells.map((c) => c.text).join('\n');
    expect(text).toContain('Bad command or file name');
    expect(text).toContain('Ready.');
  });
});

describe('frames and their keys', () => {
  it('change the picture key only when the cells or caption change', () => {
    for (const family of BOOT_FAMILIES) {
      const { out } = frames(family, 3, 50, true);
      for (let k = 1; k < out.length; k++) {
        const a = out[k - 1].f;
        const b = out[k].f;
        const same =
          JSON.stringify([a.step, a.cells, a.caption, a.badge]) ===
          JSON.stringify([b.step, b.cells, b.caption, b.badge]);
        if (same)
          expect(b.pictureKey, `${family} at ${out[k].t}`).toBe(a.pictureKey);
        else expect(b.pictureKey).not.toBe(a.pictureKey);
        const liveSame = JSON.stringify(a.live) === JSON.stringify(b.live);
        expect(liveSame).toBe(a.liveKey === b.liveKey);
      }
    }
  });

  it('move the live element no more often than its rate, at most 10 Hz', () => {
    for (const family of BOOT_FAMILIES) {
      const { out } = frames(family, 2, 100);
      let last = '';
      let lastT = -1;
      for (const { t, f } of out) {
        if (f.liveKey === last) continue;
        if (
          f.live &&
          last &&
          lastT >= 0 &&
          f.liveKey.split(':')[0] === last.split(':')[0]
        )
          expect(
            t - lastT,
            `${family} ${t} ${f.liveKey} after ${last}`,
          ).toBeGreaterThanOrEqual(1 / LIVE_HZ[f.live.kind] - 0.011);
        last = f.liveKey;
        lastT = t;
      }
    }
  });

  it('hold still once done, but for a cursor', () => {
    for (const family of BOOT_FAMILIES) {
      const s = bootScript(family, { seed: 1, app: APP });
      const a = bootFrame(s, s.total + 3);
      const b = bootFrame(s, s.total + 30);
      expect(b.pictureKey).toBe(a.pictureKey);
      if (b.live) expect(b.live.kind).toMatch(/cursor|bar/);
    }
  });

  it('round live rectangles outwards to whole pixels', () => {
    expect(pixelRect({ x: 0.1, y: 0.1, w: 0.25, h: 0.04 }, 640, 480)).toEqual({
      x: 64,
      y: 48,
      w: 160,
      h: 20,
    });
    const r = pixelRect({ x: 0.333, y: 0.47, w: 0.06, h: 0.08 }, 640, 480);
    expect(r.x).toBe(213);
    expect(r.x + r.w).toBeGreaterThanOrEqual(0.393 * 640);
  });
});

describe('the upload budget (component bench: 300k texels a second running)', () => {
  /** The worst average over any `window` seconds of the boot's uploads, texels a second. */
  const worst = (ups: { t: number; texels: number }[], window: number) => {
    let most = 0;
    for (const u of ups) {
      const sum = ups
        .filter((v) => v.t >= u.t && v.t < u.t + window)
        .reduce((a, v) => a + v.texels, 0);
      most = Math.max(most, sum / window);
    }
    return most;
  };
  const SIZES: Record<BootFamily, [number, number]> = {
    gui: [640, 480],
    unix: [480, 300],
    dos: [480, 300],
    firmware: [128, 64],
  };

  it('keeps every family within it, over any three seconds, on its screen', () => {
    for (const family of BOOT_FAMILIES)
      for (const seed of [1, 2, 3, 4, 5, 6])
        for (const unclean of [false, true]) {
          const s = bootScript(family, { seed, app: APP, unclean });
          const [w, h] = SIZES[family];
          const ups = bootUploads(s, w, h, 0, s.total + 3);
          expect(
            worst(ups, 3),
            `${family} ${seed} ${unclean}`,
          ).toBeLessThanOrEqual(300_000);
        }
  });

  it('changes the gui’s big picture no more than once in 1.6 s', () => {
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8])
      for (const unclean of [false, true]) {
        const s = bootScript('gui', { seed, app: APP, unclean });
        const ups = bootUploads(s, 640, 480).filter(
          (u) => u.texels === 640 * 480,
        );
        for (let k = 1; k < ups.length; k++)
          expect(ups[k].t - ups[k - 1].t).toBeGreaterThanOrEqual(1.6 - 0.02);
      }
  });
});
