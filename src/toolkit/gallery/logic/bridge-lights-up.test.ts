import { describe, expect, it } from 'vite-plus/test';
import { BootGroup, BootScreen, Label, bootDuration } from '../../../ui2d';
import {
  ENTRANCE_BOOT,
  ENTRANCE_GLOW,
  LIGHTS_UP,
  NOMINAL_SWEEP_COUNT,
  SWEEP,
  clockwiseAngle,
  fillLevel,
  nominalSpan,
  sweepLevel,
  sweepSpan,
  sweepStarts,
  THEME_AT,
  entranceBootMean,
  entranceGlow,
  entranceKind,
  entranceLightsAt,
  firstViewGlow,
  lightsUpTotal,
  playsEntrance,
  DISPLAYS_ON_AT,
  REVEAL_DOORS,
  displaysOnLeaving,
  revealWaiting,
  stepReveal,
} from './bridge-lights-up';
import type { Entrance, SweepItem } from './bridge-lights-up';

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

/**
 * The first view over `n` displays with a seeded draw, as the bridge runs
 * it: the room's displays unpowered (after RESET); the doors shut (t = 0);
 * at `DISPLAYS_ON_AT` their power rises (`powerUp`, which ticks every
 * screen then, starting its clock), each booting on its own durations.
 */
function firstView(n: number, seed: number) {
  const group = new BootGroup(seeded(seed));
  const screens: BootScreen[] = [];
  for (let i = 0; i < n; i++)
    screens.push(group.add(new BootScreen(new Label(`${i}`))));
  group.setPower(false);
  const powerUp = () => {
    const r = group.setPower(true, ENTRANCE_BOOT);
    for (const s of screens) s.tick(DISPLAYS_ON_AT);
    const ready = DISPLAYS_ON_AT + r;
    const entrance: Entrance = {
      kind: 'first',
      lightsAt: entranceLightsAt('first', ready),
    };
    return { ready, entrance };
  };
  return { group, screens, powerUp };
}

/** The first view, its displays powered at `DISPLAYS_ON_AT`. */
function firstViewUp(n: number, seed: number) {
  const view = firstView(n, seed);
  return { ...view, ...view.powerUp() };
}

/** A room's lights for the tests: `NOMINAL_SWEEP_COUNT` round it, evenly, and two of the dome's. */
const ROOM: SweepItem[] = [
  ...Array.from({ length: NOMINAL_SWEEP_COUNT }, (_, k) => ({
    angle: ((k + 0.5) / NOMINAL_SWEEP_COUNT) * 2 * Math.PI,
    dome: false,
  })),
  { angle: 1, dome: true },
  { angle: 4, dome: true },
];
const STARTS = sweepStarts(ROOM);
/** Every light's level, and the fill's, `t` seconds in, the main lights beginning at `at`. */
const room = (t: number, at: number) => {
  const items = STARTS.map((s) => sweepLevel(t, at, s));
  return { items, fill: fillLevel(items) };
};
const domeOf = (items: number[]) => items.filter((_, i) => ROOM[i].dome);
const othersOf = (items: number[]) => items.filter((_, i) => !ROOM[i].dome);

describe('the bridge’s lights coming up (the owner, 2026-10-27)', () => {
  it('measures angles clockwise seen from above, from the front (−z)', () => {
    expect(clockwiseAngle(0, -1, 0, 0)).toBeCloseTo(0);
    expect(clockwiseAngle(1, 0, 0, 0)).toBeCloseTo(Math.PI / 2);
    expect(clockwiseAngle(0, 1, 0, 0)).toBeCloseTo(Math.PI);
    expect(clockwiseAngle(-1, 0, 0, 0)).toBeCloseTo((3 * Math.PI) / 2);
    expect(clockwiseAngle(5, 3, 5, 4)).toBeCloseTo(0);
  });

  it('starts each light 0.2 s after the one before it, clockwise, and the dome 5 s after the last of them has started', () => {
    expect(SWEEP.step).toBe(0.2);
    expect(SWEEP.domeAfter).toBe(5);
    const items: SweepItem[] = [
      { angle: 3, dome: false },
      { angle: 0.5, dome: false },
      { angle: 2, dome: true },
      { angle: 6, dome: false },
      { angle: 1.5, dome: false },
    ];
    const starts = sweepStarts(items);
    expect(starts[1]).toBeCloseTo(0);
    expect(starts[4]).toBeCloseTo(0.2);
    expect(starts[0]).toBeCloseTo(0.4);
    expect(starts[3]).toBeCloseTo(0.6);
    expect(starts[2]).toBeCloseTo(0.6 + 5);
    expect(sweepSpan(starts)).toBeCloseTo(5.6);
    // The nominal room's span as `nominalSpan` says.
    expect(sweepSpan(STARTS)).toBeCloseTo(nominalSpan());
  });

  it('is dark until the main lights begin, only a trace of fill left', () => {
    for (const at of [2, 14])
      for (const t of [0, 1, at - 0.01]) {
        const l = room(t, at);
        for (const v of l.items) expect(v).toBe(0);
        expect(l.fill).toBeCloseTo(LIGHTS_UP.floor);
      }
  });

  it('comes on round the room, the dome dark until the rest are all on their way', () => {
    const at = 5;
    const lastOther = (NOMINAL_SWEEP_COUNT - 1) * SWEEP.step;
    // Partway round: the first lit, the last not yet.
    const mid = room(at + lastOther / 2, at).items;
    const others = othersOf(mid);
    expect(others[0]).toBeGreaterThan(0);
    expect(others.at(-1)).toBe(0);
    for (let k = 1; k < others.length; k++)
      expect(others[k]).toBeLessThanOrEqual(others[k - 1]);
    // The dome dark until 5 s after the last of the others started.
    for (const t of [at + lastOther, at + lastOther + SWEEP.domeAfter - 0.01])
      for (const d of domeOf(room(t, at).items)) expect(d).toBe(0);
    for (const d of domeOf(
      room(at + lastOther + SWEEP.domeAfter + 1, at).items,
    ))
      expect(d).toBeGreaterThan(0);
  });

  it('comes on in exactly the same order on a later visit as on the first, only from another time', () => {
    const first = 17.3;
    const again = entranceLightsAt('again', 0);
    for (let dt = 0; dt < nominalSpan() + 3; dt += 0.1) {
      const a = room(again + dt, again).items;
      const b = room(first + dt, first).items;
      a.forEach((v, i) => expect(v).toBeCloseTo(b[i], 9));
    }
  });

  it('reaches full light at lightsUpTotal, and stays there', () => {
    expect(lightsUpTotal(7)).toBeCloseTo(7 + nominalSpan() + LIGHTS_UP.rise);
    for (const t of [lightsUpTotal(7), lightsUpTotal(7) + 60]) {
      const l = room(t, 7);
      for (const v of l.items) expect(v).toBe(1);
      expect(l.fill).toBe(1);
    }
  });

  it('rises without a step', () => {
    let prev = room(0, 2);
    for (let t = 0.05; t < lightsUpTotal(2) + 0.5; t += 0.05) {
      const l = room(t, 2);
      l.items.forEach((v, i) => {
        expect(v).toBeGreaterThanOrEqual(prev.items[i]);
        expect(v - prev.items[i]).toBeLessThan(0.1);
      });
      expect(l.fill - prev.fill).toBeLessThan(0.1);
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

  it('keeps every display unpowered until 2 s, then draws each one’s durations afresh: black, emblem, black, the interface', () => {
    expect(DISPLAYS_ON_AT).toBe(2);
    expect(ENTRANCE_BOOT.black).toMatchObject({ mean: 4, sd: 0.6 });
    expect(ENTRANCE_BOOT.emblem).toMatchObject({ mean: 7, sd: 2 });
    expect(ENTRANCE_BOOT.after).toMatchObject({ mean: 2, sd: 0.5 });
    const { screens, powerUp } = firstView(12, 7);
    const step = 1 / 30;
    for (let t = 0; t < DISPLAYS_ON_AT; t += step)
      for (const s of screens) {
        s.tick(t);
        expect(s.displayState).toBe('unpowered');
        expect(s.phase).toBe('black');
      }
    const { ready } = powerUp();
    for (const s of screens) expect(s.displayState).toBe('booting');
    // Each its own timing: no two emblems alike.
    expect(new Set(screens.map((s) => s.timing.emblem)).size).toBe(12);
    const changes = screens.map(() => [] as { phase: string; at: number }[]);
    for (let t = DISPLAYS_ON_AT; t <= ready + 0.5; t += step)
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
      const { screens, ready, entrance } = firstViewUp(20, seed);
      expect(entrance.lightsAt).toBeCloseTo(ready + LIGHTS_UP.afterBoot);
      expect(LIGHTS_UP.afterBoot).toBe(2);
      // Every display operational by `ready`; none of the lights on before
      // `lightsAt`.
      for (const s of screens) s.tick(ready + 1e-6);
      for (const s of screens) expect(s.operational).toBe(true);
      for (const v of room(entrance.lightsAt - 0.01, entrance.lightsAt).items)
        expect(v).toBe(0);
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
      (_, i) => firstViewUp(20, i).ready,
    );
    const mean = readies.reduce((a, b) => a + b, 0) / readies.length;
    expect(mean).toBeGreaterThan(entranceBootMean());
    expect(mean).toBeLessThan(entranceBootMean() + 8);
  });

  it('boots the displays apart: the scatter grows through the sequence', () => {
    const { screens } = firstViewUp(30, 5);
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
    for (const v of room(1.99, 2).items) expect(v).toBe(0);
    for (const v of room(lightsUpTotal(2), 2).items) expect(v).toBe(1);
    expect(othersOf(room(2.5, 2).items)[0]).toBeGreaterThan(0);
    expect(entranceGlow(lightsUpTotal(2) + ENTRANCE_GLOW.fade, entrance)).toBe(
      0,
    );
  });

  it('plays nothing on a reload or a link straight onto the bridge', () => {
    expect(playsEntrance('main_corridor', false)).toBe(true);
    expect(playsEntrance('main_corridor', true)).toBe(false);
    // Out of the freight lift, as through the corridor's doors (mission 108).
    expect(playsEntrance('freight_lift', false)).toBe(true);
    expect(playsEntrance('freight_lift', true)).toBe(false);
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
