import { describe, expect, it } from 'vite-plus/test';
import { BootGroup, BootScreen, Label, bootDuration } from '../../../ui2d';
import {
  ENTRANCE_BOOT,
  ENTRANCE_GLOW,
  LIGHTS_UP,
  LIGHT_STAGES,
  THEME_AT,
  entranceBootMean,
  entranceGlow,
  entranceKind,
  entranceLightsAt,
  firstViewGlow,
  lightsUpLevels,
  lightsUpTotal,
  playsEntrance,
  REVEAL_DOORS,
  displaysOnLeaving,
  revealWaiting,
  stepReveal,
} from './bridge-lights-up';
import type { Entrance } from './bridge-lights-up';

/** A seeded source of uniform numbers in [0, 1) (mulberry32). */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The first view, played over `n` displays with a seeded draw: the screens, and its entrance. */
function firstView(n: number, seed: number) {
  const group = new BootGroup(seeded(seed));
  const screens: BootScreen[] = [];
  for (let i = 0; i < n; i++)
    screens.push(group.add(new BootScreen(new Label(`${i}`))));
  const ready = group.bootEach(ENTRANCE_BOOT);
  const entrance: Entrance = {
    kind: 'first',
    lightsAt: entranceLightsAt('first', ready),
  };
  return { group, screens, ready, entrance };
}

describe('the bridge’s lights coming up (the owner, 2026-10-27)', () => {
  it('is dark until the main lights begin, only a trace of fill left', () => {
    for (const at of [2, 14])
      for (const t of [0, 1, at - 0.01]) {
        const l = lightsUpLevels(t, at);
        for (const s of LIGHT_STAGES) expect(l[s], `${s} at ${t}`).toBe(0);
        expect(l.fill).toBeCloseTo(LIGHTS_UP.floor);
      }
  });

  it('brings the cove rings up first, then the dome, the walls and the aft strip', () => {
    const l = lightsUpLevels(5 + 1.0, 5);
    expect(l.rings).toBeGreaterThan(l.dome);
    expect(l.dome).toBeGreaterThan(l.walls);
    expect(l.walls).toBeGreaterThanOrEqual(l.aft);
  });

  it('reaches full light 3 to 4 s after the main lights begin, and stays there', () => {
    const rise = lightsUpTotal(0);
    expect(rise).toBeGreaterThanOrEqual(3);
    expect(rise).toBeLessThanOrEqual(4);
    expect(lightsUpTotal(7)).toBeCloseTo(7 + rise);
    for (const t of [lightsUpTotal(7), lightsUpTotal(7) + 60]) {
      const l = lightsUpLevels(t, 7);
      for (const s of LIGHT_STAGES) expect(l[s]).toBe(1);
      expect(l.fill).toBe(1);
    }
  });

  it('rises without a step', () => {
    let prev = lightsUpLevels(0, 2);
    for (let t = 0.05; t < lightsUpTotal(2) + 0.5; t += 0.05) {
      const l = lightsUpLevels(t, 2);
      for (const s of [...LIGHT_STAGES, 'fill'] as const) {
        expect(l[s]).toBeGreaterThanOrEqual(prev[s]);
        expect(l[s] - prev[s]).toBeLessThan(0.1);
      }
      prev = l;
    }
  });
});

describe('the first view (the owner, 2026-10-27, doc/notes/bridge_reveal.md)', () => {
  it('has the glow on as the doors shut, out over 1 s, black 5 s, back up over 1 s', () => {
    expect(ENTRANCE_GLOW.out).toBe(1);
    expect(ENTRANCE_GLOW.black).toBe(5);
    expect(ENTRANCE_GLOW.back).toBe(1);
    expect(firstViewGlow(0)).toBe(1);
    expect(firstViewGlow(0.5)).toBeCloseTo(0.5);
    for (let t = 1; t <= 6; t += 0.25)
      expect(firstViewGlow(t), `at ${t}`).toBe(0);
    expect(firstViewGlow(6.5)).toBeCloseTo(0.5);
    expect(firstViewGlow(7)).toBe(1);
    expect(firstViewGlow(60)).toBe(1);
    // Falling, then rising, without a step.
    let prev = firstViewGlow(0);
    for (let t = 0.05; t < 8; t += 0.05) {
      const g = firstViewGlow(t);
      expect(Math.abs(g - prev)).toBeLessThan(0.1);
      if (t < 1) expect(g).toBeLessThanOrEqual(prev);
      if (t > 6) expect(g).toBeGreaterThanOrEqual(prev);
      prev = g;
    }
  });

  it('begins the theme as the room goes black', () => {
    expect(THEME_AT).toBe(1);
    expect(firstViewGlow(THEME_AT)).toBe(0);
  });

  it('draws each display’s durations afresh: black from 2 s, then black, emblem, black, the interface', () => {
    expect(ENTRANCE_BOOT.from).toBe(2);
    expect(ENTRANCE_BOOT.black).toMatchObject({ mean: 4, sd: 0.6 });
    expect(ENTRANCE_BOOT.emblem).toMatchObject({ mean: 7, sd: 2 });
    expect(ENTRANCE_BOOT.after).toMatchObject({ mean: 2, sd: 0.5 });
    const { screens, ready } = firstView(12, 7);
    // Each its own timing: no two emblems alike.
    expect(new Set(screens.map((s) => s.timing.emblem)).size).toBe(12);
    const step = 1 / 30;
    const changes = screens.map(() => [] as { phase: string; at: number }[]);
    for (let t = 0; t <= ready + 0.5; t += step)
      screens.forEach((s, i) => {
        s.tick(t);
        const seen = changes[i];
        if (seen.at(-1)?.phase !== s.phase)
          seen.push({ phase: s.phase, at: t });
      });
    changes.forEach((seen, i) => {
      // Black, the emblem, its fade, black again, the draw-in, on.
      expect(seen.map((c) => c.phase)).toEqual([
        'black',
        'emblem',
        'fade',
        ...(screens[i].timing.gap > step ? ['black'] : []),
        'draw',
        'on',
      ]);
      // Nothing before 2 s.
      expect(seen[1].at).toBeGreaterThanOrEqual(2);
      // Black again lasts its draw, the fade included.
      const t = screens[i].timing;
      expect(t.fade + t.gap).toBeGreaterThanOrEqual(0.5);
      expect(t.draw).toBe(1);
      expect(t.emblemIn).toBeCloseTo(0.3);
    });
    // The last on at `ready`.
    const lastOn = Math.max(...changes.map((c) => c.at(-1)!.at));
    expect(lastOn).toBeGreaterThanOrEqual(ready - 1e-6);
    expect(lastOn).toBeLessThan(ready + step + 1e-6);
  });

  it('brings the main lights up 2 s after the last display is operational, none before', () => {
    for (const seed of [1, 2, 3, 99]) {
      const { screens, ready, entrance } = firstView(20, seed);
      expect(entrance.lightsAt).toBeCloseTo(ready + LIGHTS_UP.afterBoot);
      expect(LIGHTS_UP.afterBoot).toBe(2);
      // Every display operational by `ready`; none of the lights on before
      // `lightsAt`.
      for (const s of screens) s.tick(0);
      for (const s of screens) s.tick(ready + 1e-6);
      for (const s of screens) expect(s.operational).toBe(true);
      for (const s of LIGHT_STAGES)
        expect(
          lightsUpLevels(entrance.lightsAt - 0.01, entrance.lightsAt)[s],
        ).toBe(0);
      // The glow back well before the lights; faded only after they are full.
      expect(entranceGlow(7, entrance)).toBe(1);
      expect(entranceGlow(lightsUpTotal(entrance.lightsAt), entrance)).toBe(1);
      expect(
        entranceGlow(
          lightsUpTotal(entrance.lightsAt) + ENTRANCE_GLOW.fade,
          entrance,
        ),
      ).toBe(0);
    }
  });

  it('has the last display up at 16 s with every part at its mean, later as the last of many draws', () => {
    expect(entranceBootMean()).toBeCloseTo(2 + 4 + 7 + 2 + 1);
    const readies = Array.from(
      { length: 40 },
      (_, i) => firstView(20, i).ready,
    );
    const mean = readies.reduce((a, b) => a + b, 0) / readies.length;
    expect(mean).toBeGreaterThan(entranceBootMean());
    expect(mean).toBeLessThan(entranceBootMean() + 8);
  });

  it('boots the displays apart: the scatter grows through the sequence', () => {
    const { screens } = firstView(30, 5);
    const ons = screens.map((s) => bootDuration(s.timing));
    expect(Math.max(...ons) - Math.min(...ons)).toBeGreaterThan(2);
  });
});

describe('later visits, and other ways in (the owner, 2026-10-27)', () => {
  it('plays the first view from the corridor while the theme is unheard, a later visit once heard', () => {
    expect(entranceKind('main_corridor', false, false)).toBe('first');
    expect(entranceKind('main_corridor', false, true)).toBe('again');
  });

  it('on a later visit keeps the glow on and brings the main lights up 2 s in', () => {
    const entrance: Entrance = {
      kind: 'again',
      lightsAt: entranceLightsAt('again', 99),
    };
    expect(entrance.lightsAt).toBe(2);
    for (let t = 0; t <= lightsUpTotal(2); t += 0.25)
      expect(entranceGlow(t, entrance), `at ${t}`).toBe(1);
    for (const s of LIGHT_STAGES) {
      expect(lightsUpLevels(1.99, 2)[s]).toBe(0);
      expect(lightsUpLevels(lightsUpTotal(2), 2)[s]).toBe(1);
    }
    expect(lightsUpLevels(2.5, 2).rings).toBeGreaterThan(0);
    expect(entranceGlow(lightsUpTotal(2) + ENTRANCE_GLOW.fade, entrance)).toBe(
      0,
    );
  });

  it('plays nothing on a reload or a link straight onto the bridge', () => {
    expect(playsEntrance('main_corridor', false)).toBe(true);
    expect(playsEntrance('main_corridor', true)).toBe(false);
    expect(playsEntrance(null, false)).toBe(false);
    for (const heard of [false, true]) {
      expect(entranceKind('main_corridor', true, heard)).toBeNull();
      expect(entranceKind(null, false, heard)).toBeNull();
    }
  });
});

describe('the first view waits for the doors to shut behind the walker (the owner, 2026-10-27)', () => {
  const run = (frames: boolean[], delta = 0.1) => {
    let s = revealWaiting();
    const started: number[] = [];
    frames.forEach((shut, i) => {
      const was = s.started;
      s = stepReveal(s, delta, shut);
      if (s.started && !was) started.push(i);
    });
    return { s, started };
  };

  it('does not start while the doors stand open, and starts the moment they are shut', () => {
    const open = Array(30).fill(false);
    expect(run(open).s.started).toBe(false);
    const { started } = run([...open, true, true, true]);
    expect(started).toEqual([30]);
  });

  it('does not start before the doors are seen open (the hand-over), unless they never are', () => {
    // Shut on the first frames only (before the hand-over swings them open), then open, then shut.
    expect(run([true, false, false, true]).started).toEqual([3]);
    // Never seen open: started once `assumeOpenAfter` has passed.
    const n = Math.ceil(REVEAL_DOORS.assumeOpenAfter / 0.1) + 2;
    const { started } = run(Array(n).fill(true));
    expect(started).toHaveLength(1);
    expect((started[0] + 1) * 0.1).toBeGreaterThanOrEqual(
      REVEAL_DOORS.assumeOpenAfter - 1e-9,
    );
  });

  it('stays started, whatever the doors do next', () => {
    const { s } = run([false, true, false, false, true]);
    expect(s.started).toBe(true);
    expect(stepReveal(s, 1, false)).toBe(s);
  });
});

describe('after RESET, seen from the corridor (the owner, 2026-10-27)', () => {
  /** The bridge's screens as `startTheBridge` builds them: dark while the theme is unheard. */
  const build = (heard: boolean, n = 6) => {
    const group = new BootGroup(seeded(4));
    if (!heard) group.autoBoot({ from: Number.POSITIVE_INFINITY, spread: 0 });
    const screens = Array.from({ length: n }, (_, i) =>
      group.add(new BootScreen(new Label(`${i}`))),
    );
    return { group, screens };
  };
  /** The reset effect, applied while the walker is away. */
  const reset = (group: BootGroup) => {
    group.bootAll(0, Number.POSITIVE_INFINITY);
    group.autoBoot({ from: Number.POSITIVE_INFINITY, spread: 0 });
  };
  /** Drawn beyond the corridor's doors: suspended, never entered, then frames. */
  const seenFromCorridor = (group: BootGroup, screens: BootScreen[]) => {
    if (displaysOnLeaving(false, false)) group.skipAll();
    for (const t of [0, 1, 30, 300]) for (const s of screens) s.tick(t);
  };

  it('built after RESET: every screen black, and still black once seen through the doors', () => {
    const { group, screens } = build(false);
    seenFromCorridor(group, screens);
    for (const s of screens) expect(s.phase).toBe('black');
  });

  it('built while heard, then RESET: every screen black, and still black once seen through the doors', () => {
    const { group, screens } = build(true);
    for (const s of screens) expect(s.operational).toBe(true);
    reset(group);
    seenFromCorridor(group, screens);
    for (const s of screens) expect(s.phase).toBe('black');
  });

  it('keeps the displays on when the walker leaves after the first view began, black if before the doors shut', () => {
    expect(displaysOnLeaving(true, false)).toBe(true);
    expect(displaysOnLeaving(true, true)).toBe(false);
    expect(displaysOnLeaving(false, false)).toBe(false);
  });
});
