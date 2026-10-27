import { describe, expect, it } from 'vite-plus/test';
import {
  ANIMATION_HZ,
  BLOCK_THEME,
  FlowNetwork,
  Label,
  Reticle,
  Rotator,
  SchematicBrowser,
  SensorSweep,
  SequenceStrip,
  StatusGrid,
  UiNode,
  Vessel,
  animationStep,
  gridCells,
  pointsAlong,
  polylineLength,
  rect,
  ringArc,
  rotation,
  sweepAt,
  sweepRow,
} from './index';

/** A design that counts its ticks and can ask for paint by itself. */
class Probe extends UiNode {
  ticks = 0;
  tick() {
    this.ticks++;
    this.markDirty();
  }
}

/** Run `node`'s clock from `from` to `to` seconds at 60 frames a second, counting the frames it asked for paint. */
function run(node: UiNode, from: number, to: number) {
  let dirtyFrames = 0;
  for (let t = from; t < to; t += 1 / 60) {
    node.tick(t);
    if (node.dirty) dirtyFrames++;
    node.clean();
  }
  return dirtyFrames;
}

describe('the schematic kit’s geometry', () => {
  it('measures a polyline and sets marks along it, moving with the offset', () => {
    const line = [
      [0, 0],
      [10, 0],
      [10, 10],
    ] as const;
    expect(polylineLength(line)).toBe(20);
    const marks = pointsAlong(line, 5);
    expect(marks.map((m) => [m.x, m.y])).toEqual([
      [0, 0],
      [5, 0],
      [10, 0],
      [10, 5],
      [10, 10],
    ]);
    expect(marks[3].angle).toBeCloseTo(Math.PI / 2);
    // An offset moves every mark on; a whole spacing brings them back.
    expect(pointsAlong(line, 5, 2)[0].x).toBe(2);
    expect(pointsAlong(line, 5, 7)[0].x).toBe(2);
    expect(pointsAlong(line, 5, -3)[0].x).toBe(2);
  });

  it('lays cells in a grid filling the rectangle', () => {
    const cells = gridCells(rect(0, 0, 300, 200), 6, 3, 10);
    expect(cells).toHaveLength(6);
    expect(cells[0]).toEqual(rect(0, 0, 280 / 3, 95));
    expect(cells[5].x + cells[5].w).toBeCloseTo(300);
    expect(cells[5].y + cells[5].h).toBeCloseTo(200);
    // Columns by the rectangle's shape when not given: a wide one, more across.
    expect(gridCells(rect(0, 0, 400, 100), 4)[3].y).toBe(0);
  });

  it('times a rotation: each design for its period, a wipe as each comes up', () => {
    expect(rotation(0, 3, 15)).toEqual({ index: 0, since: 0, wipe: null });
    expect(rotation(14.9, 3, 15).index).toBe(0);
    const r = rotation(15.3, 3, 15, 0.6);
    expect(r.index).toBe(1);
    expect(r.wipe).toBeCloseTo(0.5);
    expect(rotation(16, 3, 15, 0.6).wipe).toBeNull();
    expect(rotation(45, 3, 15).index).toBe(0);
    expect(rotation(5, 3, 15, 0.6, 10).index).toBe(1);
  });

  it('places a sweep and finds the row under it', () => {
    expect(sweepAt(1, 4)).toBe(0.25);
    expect(sweepRow(0.25, 8)).toBe(2);
    expect(sweepRow(1, 8)).toBe(7);
    expect(sweepRow(0.5, 0)).toBe(-1);
  });

  it('sweeps a ring gauge’s arc round the bottom gap', () => {
    const empty = ringArc(0);
    const full = ringArc(1);
    expect(empty.end).toBe(empty.start);
    expect(full.end - full.start).toBeCloseTo((Math.PI * 3) / 2);
    expect(ringArc(0.5).end).toBeCloseTo((Math.PI * 3) / 2);
  });

  it('steps animations at most ten times a second', () => {
    expect(ANIMATION_HZ).toBe(10);
    expect(animationStep(0.95)).toBe(9);
    expect(animationStep(1, 60)).toBe(10);
  });
});

describe('the flow network', () => {
  const network = () =>
    new FlowNetwork({
      bounds: { minX: 0, minY: 0, maxX: 2, maxY: 1 },
      pipes: [
        {
          id: 'main',
          points: [
            [0, 0.5],
            [2, 0.5],
          ],
        },
      ],
      nodes: [
        {
          id: 'P1',
          kind: 'pump',
          at: [0.5, 0.5],
          size: 0.2,
          onPress: () => 'deny',
        },
        { id: 'T1', kind: 'tank', at: [1.5, 0.5], size: 0.2, level: 0.5 },
      ],
    });

  it('asks for paint only when something changes while its pipes are still', () => {
    const n = network();
    n.layout(rect(0, 0, 400, 200), BLOCK_THEME);
    n.setNode('P1', { state: 'off' });
    n.clean();
    expect(run(n, 0, 3)).toBe(0);
    n.setPipe('main', 0);
    n.setNode('T1', { level: 0.5 });
    expect(n.dirty).toBe(false);
    n.setNode('T1', { level: 0.6, sub: '60 %' });
    expect(n.dirty).toBe(true);
  });

  it('moves its flow at no more than ten steps a second while a pipe carries one', () => {
    const n = network();
    n.layout(rect(0, 0, 400, 200), BLOCK_THEME);
    n.setPipe('main', 0.5);
    n.clean();
    const frames = run(n, 0, 2);
    expect(frames).toBeGreaterThanOrEqual(18);
    expect(frames).toBeLessThanOrEqual(21);
    expect(n.moving).toBe(true);
  });

  it('hits a pressable node by its glyph, in pixels', () => {
    const n = network();
    n.layout(rect(0, 0, 400, 200), BLOCK_THEME);
    expect(n.hit(100, 100)).toBe(n);
    expect(n.press(100, 100)).toEqual({ action: 'P1', sound: 'deny' });
    // The tank has no press: nothing there.
    expect(n.hit(300, 100)).toBeNull();
  });
});

describe('the other schematic components', () => {
  it('keeps a status grid clean when set to what it shows', () => {
    const g = new StatusGrid({ rows: ['A', 'B'], columns: ['X', 'Y'] });
    g.layout(rect(0, 0, 200, 100), BLOCK_THEME);
    g.setAll([
      [{ words: 'ON', colour: 'ok' }, {}],
      [{}, {}],
    ]);
    g.clean();
    g.setAll([
      [{ words: 'ON', colour: 'ok' }, {}],
      [{}, {}],
    ]);
    expect(g.dirty).toBe(false);
    expect(g.cellRect(1, 1).x).toBeGreaterThan(g.cellRect(0, 0).x);
    // A flashing cell blinks: on and off twice a second.
    g.setAll([
      [{ words: 'TRIP', flashing: true }, {}],
      [{}, {}],
    ]);
    g.clean();
    expect(run(g, 0, 2)).toBeLessThanOrEqual(9);
  });

  it('sweeps a list at no more than ten steps a second, and not at all when empty', () => {
    const s = new SensorSweep({ period: 2 });
    s.layout(rect(0, 0, 200, 200), BLOCK_THEME);
    s.clean();
    expect(run(s, 0, 1)).toBe(0);
    s.set([{ label: 'A', value: '1' }]);
    expect(run(s, 1, 2)).toBeLessThanOrEqual(11);
    s.tick(2.5);
    expect(s.sweep).toBeCloseTo(0.25);
  });

  it('fills a vessel, shimmering only while active', () => {
    const v = new Vessel('TANK');
    v.layout(rect(0, 0, 100, 300), BLOCK_THEME);
    v.set(0.4, '40 %');
    v.clean();
    expect(run(v, 0, 1)).toBe(0);
    v.set(0.4, '40 %', { active: true });
    expect(run(v, 1, 2)).toBeLessThanOrEqual(11);
    expect(v.body().y).toBeGreaterThan(0);
  });

  it('locks a reticle while its reading is in its zone', () => {
    const r = new Reticle('POOL', {
      xRange: [6.8, 8],
      yRange: [0, 3],
      zone: [7.2, 7.6, 1, 2],
      scanning: false,
    });
    r.set(7.4, 1.5);
    expect(r.locked).toBe(true);
    expect(r.toScope(7.4, 1.5)).toEqual({ u: expect.closeTo(0, 5), v: 0 });
    r.set(7.9, 0.2);
    expect(r.locked).toBe(false);
  });

  it('lays a sequence strip’s steps along its row', () => {
    const s = new SequenceStrip(['BACKWASH', 'SETTLE', 'RINSE']);
    s.layout(rect(0, 0, 310, 100), BLOCK_THEME);
    const b = s.blocks();
    expect(b).toHaveLength(3);
    expect(b[2].x + b[2].w).toBeCloseTo(310);
    s.set(1, 0.5, '30 S LEFT');
    s.clean();
    s.set(1, 0.501, '30 S LEFT');
    expect(s.dirty).toBe(false);
  });
});

describe('the rotator', () => {
  const designs = () =>
    [0, 1, 2, 3].map((i) => ({ title: `D${i}`, node: new Probe() }));

  it('shows each design of its cycle for its period, in turn', () => {
    const d = designs();
    const r = new Rotator(d, { period: 15, cycle: [0, 2, 3] });
    r.layout(rect(0, 0, 400, 300), BLOCK_THEME);
    const shown: number[] = [];
    r.onShow((i) => shown.push(i));
    run(r, 0, 50);
    expect(shown).toEqual([2, 3, 0]);
    expect(d[1].node.ticks).toBe(0);
    expect(d.filter((x) => !x.node.hidden).map((x) => x.title)).toEqual(['D0']);
  });

  it('ticks only the design shown, so a hidden one never asks for paint', () => {
    const d = designs();
    const r = new Rotator(d, { period: 100 });
    r.layout(rect(0, 0, 400, 300), BLOCK_THEME);
    run(r, 0, 1);
    expect(d[0].node.ticks).toBeGreaterThan(0);
    expect(d[1].node.ticks + d[2].node.ticks + d[3].node.ticks).toBe(0);
  });

  it('wipes the next design in, asking for paint only through the wipe', () => {
    const r = new Rotator(
      [0, 1].map((i) => ({ title: `L${i}`, node: new Label('x') })),
      { period: 10, transition: 0.6 },
    );
    r.layout(rect(0, 0, 400, 300), BLOCK_THEME);
    r.tick(0);
    r.clean();
    expect(run(r, 0, 9.9)).toBe(0);
    const frames = run(r, 9.9, 11);
    expect(frames).toBeGreaterThan(0);
    expect(frames).toBeLessThanOrEqual(8);
    expect(r.current).toBe(1);
  });

  it('holds a chosen design, and turns on from it when let go', () => {
    const d = designs();
    const r = new Rotator(d, { period: 10, cycle: [0, 1] });
    r.layout(rect(0, 0, 400, 300), BLOCK_THEME);
    r.tick(1);
    r.select(3);
    expect(r.current).toBe(3);
    expect(r.paused).toBe(true);
    run(r, 1, 40);
    expect(r.current).toBe(3);
    r.setPaused(false);
    run(r, 40, 51);
    expect(r.cycle).toContain(r.current);
  });

  it('sets rotators started together apart by their offsets', () => {
    const a = new Rotator(designs(), { period: 10 });
    const b = new Rotator(designs(), { period: 10, offset: 5 });
    for (const r of [a, b]) r.layout(rect(0, 0, 100, 100), BLOCK_THEME);
    run(a, 0, 6);
    run(b, 0, 6);
    expect(a.current).toBe(0);
    expect(b.current).toBe(1);
  });

  it('moves on when its indicator is pressed', () => {
    const r = new Rotator(designs(), { period: 10, id: 'rot' });
    r.layout(rect(0, 0, 400, 300), BLOCK_THEME);
    const ind = r.indicator();
    const hit = r.hit(ind.x + 5, ind.y + ind.h / 2);
    expect(hit).toBe(r);
    expect(r.press()).toEqual({ action: 'rot/next', sound: 'page' });
    expect(r.current).toBe(1);
  });
});

describe('the schematic browser', () => {
  const browser = () =>
    new SchematicBrowser(
      [0, 1, 2, 3, 4, 5].map((i) => ({
        title: `S${i} · LONG`,
        node: new Probe(),
      })),
      { title: 'STATION', pageSize: 4, cycle: [0, 1] },
    );

  it('lists a page of designs, MORE for the rest', () => {
    const b = browser();
    b.layout(rect(0, 0, 900, 500), BLOCK_THEME);
    expect(b.items.map((i) => i.label)).toEqual(['S0', 'S1', 'S2', 'S3']);
    expect(b.more.hidden).toBe(false);
    b.more.press();
    expect(b.items.map((i) => i.label)).toEqual(['S4', 'S5', '', '']);
    expect(b.items[2].disabled).toBe(true);
    // Every sidebar slot inside the frame.
    for (const s of [b.cycleButton, ...b.items, b.more])
      expect(s.rect.y + s.rect.h).toBeLessThanOrEqual(500);
  });

  it('brings a chosen design up and holds it; CYCLE lets it turn again', () => {
    const b = browser();
    b.layout(rect(0, 0, 900, 500), BLOCK_THEME);
    b.items[3].press();
    expect(b.rotator.current).toBe(3);
    expect(b.rotator.paused).toBe(true);
    expect(b.items[3].lit).toBe(true);
    expect(b.cycleButton.label).toBe('HELD');
    b.cycleButton.press();
    expect(b.rotator.paused).toBe(false);
    expect(b.cycleButton.lit).toBe(true);
  });
});
