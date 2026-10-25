import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { createPanelKit } from '../../core/views/eighties-controls';
import { createDistributionBoard } from './electrical-switchgear';

beforeEach(() => {
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
});
afterEach(() => vi.unstubAllGlobals());

describe('switch room distribution board', () => {
  it('opens its labelled glazed door from a click on the leaf', () => {
    const board = createDistributionBoard(createPanelKit());
    const door = board.object.getObjectByName(
      'DEV-DB1 distribution board door',
    );
    expect(door).toBeDefined();
    expect(door?.children.length).toBeGreaterThan(4);
    const clickable = door?.children.find((child) =>
      board.parts.uses.has(child),
    );
    expect(clickable).toBeDefined();
    board.parts.uses.get(clickable!)!();
    board.update(1);
    expect(door?.rotation.y).toBeCloseTo(-1.35);
    board.parts.uses.get(clickable!)!();
    board.update(1);
    expect(door?.rotation.y).toBeCloseTo(0);
    board.dispose();
  });

  it('uses a development identity for the same operable board in dev0', () => {
    const board = createDistributionBoard(createPanelKit(), 'DEV-DB1');
    const door = board.object.getObjectByName(
      'DEV-DB1 distribution board door',
    );
    expect(door).toBeDefined();
    expect(door?.children.some((child) => board.parts.uses.has(child))).toBe(
      true,
    );
    board.dispose();
  });
});
