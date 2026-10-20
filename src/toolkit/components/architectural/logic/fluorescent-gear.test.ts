import { describe, expect, it } from 'vite-plus/test';
import { TUBE_DROP_OUT, createFluorescentTube } from './fluorescent-gear';
import type { GearEvent } from './fluorescent-gear';

/** Run a tube `seconds` at `fps` on `volts`; when it lit, and its events. */
function run(
  tube: ReturnType<typeof createFluorescentTube>,
  seconds: number,
  volts: number | ((t: number) => number) = 1,
  fps = 60,
) {
  const events: { t: number; event: GearEvent }[] = [];
  let lit: number | null = null;
  let light = 0;
  for (let i = 1; i <= seconds * fps; i++) {
    const t = i / fps;
    const step = tube.step(
      1 / fps,
      typeof volts === 'number' ? volts : volts(t),
    );
    light = step.light;
    for (const event of step.events) events.push({ t, event });
    if (lit === null && step.events.includes('strike')) lit = t;
  }
  return { events, lit, light };
}

describe('a fluorescent tube on switch-start gear', () => {
  it('glows, clicks and strikes, then creeps up to full light', () => {
    const { events, lit, light } = run(createFluorescentTube(1, 0), 100);
    const order = events.map((e) => e.event);
    expect(order[0]).toBe('glow');
    expect(order).toContain('click');
    expect(order).toContain('strike');
    expect(lit).not.toBeNull();
    expect(light).toBeCloseTo(1);
  });

  it('strikes new tubes within a few seconds, each in its own time', () => {
    const times = Array.from(
      { length: 30 },
      (_, seed) => run(createFluorescentTube(seed, 0.1), 15).lit!,
    );
    for (const t of times) {
      expect(t).toBeGreaterThan(0.3);
      expect(t).toBeLessThan(6);
    }
    expect(new Set(times.map((t) => t.toFixed(2))).size).toBeGreaterThan(20);
    // Most catch at the first or second try.
    const median = [...times].sort((a, b) => a - b)[15];
    expect(median).toBeLessThan(3);
  });

  it('makes old tubes fail more strikes and take longer', () => {
    const flashes = (age: number) =>
      Array.from({ length: 30 }, (_, seed) =>
        run(createFluorescentTube(seed, age), 20).events.filter(
          (e) => e.event === 'flash',
        ),
      ).flat().length;
    expect(flashes(0.8)).toBeGreaterThan(flashes(0.1) * 2);
  });

  it('stays dark while the supply is too low for its starter to glow', () => {
    const tube = createFluorescentTube(4, 0.2);
    const low = run(tube, 5, 0.6);
    expect(low.light).toBe(0);
    expect(low.events).toEqual([]);
  });

  it('lets a dud blink on and on, its starter clicking', () => {
    const dud = createFluorescentTube(5, 0.97);
    expect(dud.dud).toBe(true);
    const { events } = run(dud, 30);
    expect(events.filter((e) => e.event === 'flash').length).toBeGreaterThan(
      15,
    );
  });

  it('goes out in a dip below its drop-out and comes back through the starter', () => {
    const tube = createFluorescentTube(2, 0);
    expect(run(tube, 100).light).toBeCloseTo(1);
    // A shallow dip: it holds, a little dimmer.
    const shallow = run(tube, 1, 0.9);
    expect(shallow.events.map((e) => e.event)).not.toContain('out');
    expect(shallow.light).toBeGreaterThan(0.8);
    // A deep one: out, and back through glow, click and strike.
    const deep = run(tube, 8, (t) => (t < 0.2 ? TUBE_DROP_OUT - 0.04 : 1));
    const order = deep.events.map((e) => e.event);
    expect(order[0]).toBe('out');
    expect(order).toContain('glow');
    expect(order).toContain('strike');
  });

  it('is off and silent with no supply, and the same at any frame rate', () => {
    const off = run(createFluorescentTube(3), 2, 0);
    expect(off.light).toBe(0);
    expect(off.events).toEqual([]);
    const at30 = run(createFluorescentTube(9, 0.3), 12, 1, 30).lit!;
    const at144 = run(createFluorescentTube(9, 0.3), 12, 1, 144).lit!;
    expect(Math.abs(at30 - at144)).toBeLessThan(0.05);
  });
});
