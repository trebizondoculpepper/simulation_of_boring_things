import { describe, expect, it } from 'vite-plus/test';
import {
  BLOCK_THEME,
  Button,
  Diagram,
  Frame,
  PageStack,
  Place,
  Segmented,
  Stack,
  Toggle,
  UiRoot,
  blinkOn,
  contains,
  elbowPath,
  fitBounds,
  pageButton,
  pillPath,
  rect,
  stackLayout,
  trendPoints,
} from './index';
import type { UiSound } from './index';

describe('the kit’s layout', () => {
  it('stacks fixed and growing items with gaps, filling the length', () => {
    const rs = stackLayout(rect(0, 0, 100, 20), 'row', 10, [
      { size: 20 },
      { grow: 1 },
      { grow: 3 },
    ]);
    expect(rs.map((r) => [r.x, r.w])).toEqual([
      [0, 20],
      [30, 15],
      [55, 45],
    ]);
    expect(rs.every((r) => r.h === 20)).toBe(true);
  });

  it('draws an elbow inside its rectangle for every corner, closed', () => {
    const r = rect(10, 20, 200, 90);
    for (const corner of ['nw', 'ne', 'sw', 'se'] as const) {
      const ops = elbowPath(r, corner, 150, 30, 75, 36);
      expect(ops.at(-1)).toEqual({ op: 'Z' });
      for (const p of ops)
        if ('x' in p) {
          expect(p.x).toBeGreaterThanOrEqual(10);
          expect(p.x).toBeLessThanOrEqual(210);
          expect(p.y).toBeGreaterThanOrEqual(20);
          expect(p.y).toBeLessThanOrEqual(110);
        }
    }
    // The north-west elbow's column runs down its west side, its arm along the top.
    const nw = elbowPath(r, 'nw', 150, 30, 75, 36);
    expect(nw[0]).toEqual({ op: 'M', x: 10, y: 110 });
    expect(nw).toContainEqual({ op: 'L', x: 210, y: 50 });
  });

  it('rounds a pill’s ends into half circles of half its height', () => {
    const ops = pillPath(rect(0, 0, 100, 40), 'both');
    const arcs = ops.filter((p) => p.op === 'A');
    expect(arcs).toHaveLength(2);
    expect(arcs.every((a) => a.op === 'A' && a.r === 20)).toBe(true);
    expect(
      pillPath(rect(0, 0, 100, 40), 'none').some((p) => p.op === 'A'),
    ).toBe(false);
  });

  it('spreads a trend across its plot, clamped to its range', () => {
    const pts = trendPoints([0, 5, 20], rect(0, 0, 100, 50), 0, 10);
    expect(pts).toEqual([
      { x: 0, y: 50 },
      { x: 50, y: 25 },
      { x: 100, y: 0 },
    ]);
  });

  it('fits a drawing into a rectangle and maps a pixel back', () => {
    const f = fitBounds(
      { minX: -1, minY: -0.5, maxX: 1, maxY: 0.5 },
      rect(0, 0, 400, 400),
    );
    expect(f.scale).toBe(200);
    expect(f.toPx(0, 0)).toEqual({ x: 200, y: 200 });
    expect(f.toPx(-1, 0.5)).toEqual({ x: 0, y: 100 });
    expect(f.fromPx(400, 300)).toEqual({ x: 1, y: -0.5 });
  });

  it('blinks lit for the first half of each period', () => {
    expect(blinkOn(0.1, 0.5)).toBe(true);
    expect(blinkOn(0.3, 0.5)).toBe(false);
    expect(blinkOn(0.6, 0.5)).toBe(true);
  });

  it('keeps a frame’s content inside the frame and clear of its sidebar', () => {
    const r = rect(0, 0, 900, 540);
    const g = Frame.geometry(r, BLOCK_THEME);
    expect(g.u).toBe(60);
    expect(g.content.x).toBeGreaterThan(g.side);
    expect(g.content.x + g.content.w).toBeLessThanOrEqual(900);
    expect(g.content.y + g.content.h).toBeLessThanOrEqual(540);
    expect(g.sidebar.y).toBeGreaterThan(g.top.y + g.top.h);
  });
});

describe('pressing the kit', () => {
  const mount = (child: Place | Stack | Frame, sounds: UiSound[] = []) =>
    new UiRoot(child, BLOCK_THEME, {
      width: 400,
      height: 200,
      onSound: (s) => sounds.push(s),
    });

  it('finds the button under a press and passes on its action and sound', () => {
    let pressed = 0;
    const place = new Place();
    place.put(
      new Button({ id: 'go', onPress: () => void pressed++ }),
      0,
      0,
      0.5,
      0.5,
    );
    place.put(new Button({ id: 'no', disabled: true }), 0.5, 0, 0.5, 0.5);
    const sounds: UiSound[] = [];
    const root = mount(place, sounds);
    expect(root.press(50, 50)).toMatchObject({
      action: 'go',
      sound: 'confirm',
    });
    expect(pressed).toBe(1);
    expect(root.press(300, 50)).toMatchObject({ sound: 'deny' });
    expect(root.press(100, 150)).toEqual({
      action: null,
      sound: null,
      node: null,
    });
    expect(sounds).toEqual(['confirm', 'deny']);
  });

  it('shows a tapped button pressed for the theme’s hold, then released', () => {
    const b = new Button({ id: 'b' });
    const place = new Place();
    place.put(b, 0, 0, 1, 1);
    const root = mount(place);
    root.tick(1);
    root.tap(10, 10);
    expect(b.pressed).toBe(true);
    root.tick(1.1);
    expect(b.pressed).toBe(true);
    root.tick(1.2);
    expect(b.pressed).toBe(false);
  });

  it('wants painting only after something it shows has changed', () => {
    const b = new Button({ label: 'A' });
    const place = new Place();
    place.put(b, 0, 0, 1, 1);
    const root = mount(place);
    expect(root.needsPaint).toBe(true);
    place.clean();
    b.setLabel('A');
    expect(root.needsPaint).toBe(false);
    b.setLit(true);
    expect(root.needsPaint).toBe(true);
  });

  it('lets a segmented selector refuse a choice, as an interlock does', () => {
    const seg = new Segmented({
      options: ['I', '0', 'II'],
      selected: 0,
      onSelect: (i) => (Math.abs(i - seg.selected) > 1 ? 'deny' : undefined),
    });
    const place = new Place();
    place.put(seg, 0, 0, 1, 1);
    const root = mount(place);
    // Three buttons across 400 px: II is at the right.
    expect(root.press(380, 100).sound).toBe('deny');
    expect(seg.selected).toBe(0);
    expect(root.press(200, 100).sound).toBe('confirm');
    expect(seg.selected).toBe(1);
    expect(seg.buttons.map((b) => b.lit)).toEqual([false, true, false]);
    expect(root.press(380, 100).sound).toBe('confirm');
    expect(seg.selected).toBe(2);
  });

  it('switches pages, lighting the page’s button, with the page sound', () => {
    const one = new Button({ id: 'on-one' });
    const two = new Button({ id: 'on-two' });
    const stack = new PageStack({ ONE: one, TWO: two });
    const toOne = pageButton(stack, 'ONE');
    const toTwo = pageButton(stack, 'TWO');
    const place = new Place();
    place.put(new Stack('column', [toOne, toTwo]), 0, 0, 0.25, 1);
    place.put(stack, 0.25, 0, 0.75, 1);
    const root = mount(place);
    expect(root.press(200, 100).action).toBe('on-one');
    expect(root.press(50, 150).sound).toBe('page');
    expect(stack.current).toBe('TWO');
    expect([toOne.lit, toTwo.lit]).toEqual([false, true]);
    expect(root.press(200, 100).action).toBe('on-two');
    // The page already shown: a plain confirm.
    expect(root.press(50, 150).sound).toBe('confirm');
  });

  it('toggles, unless its handler refuses', () => {
    let allow = true;
    const t = new Toggle({ onToggle: () => (allow ? undefined : 'deny') });
    const place = new Place();
    place.put(t, 0, 0, 1, 1);
    const root = mount(place);
    root.press(10, 10);
    expect(t.on).toBe(true);
    allow = false;
    expect(root.press(10, 10).sound).toBe('deny');
    expect(t.on).toBe(true);
  });

  it('presses a diagram’s symbol near the press, and nothing between them', () => {
    const pressed: string[] = [];
    const d = new Diagram({
      bounds: { minX: 0, minY: 0, maxX: 2, maxY: 1 },
      lines: [
        {
          id: 'l',
          points: [
            [0, 0.5],
            [2, 0.5],
          ],
          flow: 'forward',
        },
      ],
      symbols: [
        {
          id: 'pump',
          shape: 'circle',
          at: [0.5, 0.5],
          size: 0.2,
          onPress: () => void pressed.push('pump'),
        },
        { id: 'tank', shape: 'box', at: [1.5, 0.5], size: 0.2 },
      ],
    });
    const place = new Place();
    place.put(d, 0, 0, 1, 1);
    const root = mount(place);
    expect(root.press(100, 100).action).toBe('pump');
    expect(root.press(300, 100).node).toBeNull();
    expect(root.press(200, 100).node).toBeNull();
    expect(pressed).toEqual(['pump']);
    expect(contains(d.rect, 399, 199)).toBe(true);
  });
});
