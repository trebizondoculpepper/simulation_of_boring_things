import { afterEach, expect, it, vi } from 'vite-plus/test';
import { Box3 } from 'three';
import { createLcdMonitor, createFlangeHandle } from './cabinet-fittings';
import { createPanelKit, disposeKit } from '../../core/views/eighties-controls';

afterEach(() => vi.unstubAllGlobals());

it('keeps the disconnect lever in front of its plate for the full throw', () => {
  vi.stubGlobal('document', {
    createElement: () => {
      const canvas = { width: 0, height: 0, getContext: () => context };
      const context = new Proxy(
        { canvas, measureText: (text: string) => ({ width: text.length * 7 }) },
        {
          get: (target, key) =>
            key in target ? Reflect.get(target, key) : () => {},
        },
      );
      return canvas;
    },
  });
  const kit = createPanelKit();
  const view = createFlangeHandle(kit, { colour: 'red' });
  const moving = view.lever.parent!;
  const check = () =>
    expect(new Box3().setFromObject(moving).min.z).toBeGreaterThan(0.012);
  check();
  view.set(false);
  for (let frame = 0; frame < 120; frame++) {
    view.update(1 / 60);
    check();
  }
  view.set(true);
  for (let frame = 0; frame < 120; frame++) {
    view.update(1 / 60);
    check();
  }
  disposeKit(kit, view.group);
});

it('keeps the semiboloid trend and bottom readout inside the LCD face', () => {
  const traces: {
    canvas: { width: number; height: number };
    lines: number[];
    text: [string, number][];
  }[] = [];
  vi.stubGlobal('document', {
    createElement: () => {
      const trace = {
        canvas: { width: 0, height: 0, getContext: () => context },
        lines: [] as number[],
        text: [] as [string, number][],
      };
      const context = new Proxy(
        {
          canvas: trace.canvas,
          measureText: (text: string) => ({ width: text.length * 7 }),
          createRadialGradient: () => ({ addColorStop() {} }),
          lineTo: (_x: number, y: number) => trace.lines.push(y),
          fillText: (text: string, _x: number, y: number) =>
            trace.text.push([text, y]),
        },
        {
          get: (target, key) =>
            key in target ? Reflect.get(target, key) : () => {},
        },
      );
      traces.push(trace);
      return trace.canvas;
    },
  });
  const kit = createPanelKit();
  const lcd = createLcdMonitor(kit, { mode: 'trend' });
  lcd.update(1);
  const picture = traces.find((trace) => trace.canvas.width === 320);
  expect(picture).toBeDefined();
  expect(Math.max(...picture!.lines)).toBeLessThanOrEqual(202);
  const status = picture!.text.find(([text]) => text.startsWith('PV '));
  expect(status?.[1]).toBeLessThanOrEqual(227);
  disposeKit(kit, lcd.group);
});

it('holds vertical fault bands across the LCD panel', () => {
  const bands: { x: number; width: number; height: number }[] = [];
  let vectorPoints = 0;
  let frozenCopies = 0;
  vi.stubGlobal('document', {
    createElement: () => {
      const canvas = { width: 0, height: 0, getContext: () => context };
      const context = new Proxy(
        {
          canvas,
          measureText: (text: string) => ({ width: text.length * 7 }),
          createRadialGradient: () => ({ addColorStop() {} }),
          lineTo: () => {
            if (canvas.width === 320) vectorPoints++;
          },
          drawImage: () => {
            if (canvas.width === 320) frozenCopies++;
          },
          fillRect: (x: number, _y: number, width: number, height: number) => {
            if (canvas.width === 320) bands.push({ x, width, height });
          },
        },
        {
          get: (target, key) =>
            key in target ? Reflect.get(target, key) : () => {},
        },
      );
      return canvas;
    },
  });
  const kit = createPanelKit();
  const lcd = createLcdMonitor(kit, { mode: 'vector' });
  lcd.update(1);
  const pointsBeforeFailure = vectorPoints;
  lcd.setFailure('banding', 8);
  lcd.update(1);
  const firstBands = bands
    .filter(({ width, height }) => width <= 15 && height === 240)
    .slice(-9)
    .map(({ x }) => x);
  lcd.setFailure('banding', 8.5);
  lcd.update(1);
  const secondBands = bands
    .filter(({ width, height }) => width <= 15 && height === 240)
    .slice(-9)
    .map(({ x }) => x);
  expect(
    bands.filter(({ width, height }) => width <= 15 && height === 240).length,
  ).toBeGreaterThanOrEqual(18);
  expect(secondBands).not.toEqual(firstBands);
  expect(vectorPoints).toBe(pointsBeforeFailure);
  expect(frozenCopies).toBeGreaterThanOrEqual(2);
  disposeKit(kit, lcd.group);
});

it('replaces LCD readings with changing buffer gibberish', () => {
  const text: string[] = [];
  vi.stubGlobal('document', {
    createElement: () => {
      const canvas = { width: 0, height: 0, getContext: () => context };
      const context = new Proxy(
        {
          canvas,
          measureText: (value: string) => ({ width: value.length * 7 }),
          createRadialGradient: () => ({ addColorStop() {} }),
          fillText: (value: string) => {
            if (canvas.width === 320) text.push(value);
          },
        },
        {
          get: (target, key) =>
            key in target ? Reflect.get(target, key) : () => {},
        },
      );
      return canvas;
    },
  });
  const kit = createPanelKit();
  const lcd = createLcdMonitor(kit, { mode: 'trend' });
  lcd.update(1);
  text.length = 0;
  lcd.setFailure('corrupt', 1);
  lcd.update(1);
  const first = [...text];
  expect(first).toHaveLength(13);
  expect(first.every((line) => /^[0-9A-F#$%?@]{28}$/.test(line))).toBe(true);
  lcd.setFailure('corrupt', 1.5);
  lcd.update(1);
  expect(text.slice(13)).not.toEqual(first);
  disposeKit(kit, lcd.group);
});
