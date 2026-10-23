import { describe, expect, it } from 'vite-plus/test';
import { assemble, expandBlock, makeUps } from './unit-blocks';
import type { PlaceItem, PlaceLink } from './machine-placement';

const describeMakeUp = (m: ReturnType<typeof makeUps>[number]) =>
  m.map((b) => (b.rows === 2 ? `${b.cols}x2` : `${b.cols}`)).join('+');

describe('parallel units pre-assembled into blocks', () => {
  it('makes up four as the owner listed: a row, a square, two pairs, and the rest down to singles', () => {
    expect(makeUps(4).map(describeMakeUp)).toEqual([
      '4',
      '2x2',
      '3+1',
      '2+2',
      '2+1+1',
      '1+1+1+1',
    ]);
    expect(makeUps(5).map(describeMakeUp)).toContain('3+2');
  });

  const filter = (key: string): PlaceItem => ({
    key,
    w: 1.8,
    d: 1.8,
    h: 2.2,
    group: 'filter',
    ports: { in: { at: [-0.75, 1.6, 0], out: [-1, 0, 0] } },
  });
  const items = [
    filter('f1'),
    filter('f2'),
    filter('f3'),
    filter('f4'),
    { key: 'pump', w: 2, d: 1, h: 1 },
  ];
  const links: PlaceLink[] = ['f1', 'f2', 'f3', 'f4'].map((f) => ({
    a: 'pump',
    aPort: 'out',
    b: f,
    bPort: 'in',
    weight: 1,
  }));

  it('makes a square one item, two rows back to back, across the island', () => {
    const a = assemble(
      items,
      links,
      new Map([['filter', [{ rows: 2 as const, cols: 2 }]]]),
    );
    const block = a.items.find((it) => it.key.startsWith('block:'))!;
    expect(block.bothFaces).toBe(true);
    expect(block.w).toBeCloseTo(2 * 1.8 + 0.6);
    expect(block.d).toBeCloseTo(2 * 1.8 + 0.3);
    expect(a.items).toHaveLength(2);
  });

  it('pipes a block to what it serves as one, through its header', () => {
    const a = assemble(
      items,
      links,
      new Map([['filter', [{ rows: 1 as const, cols: 4 }]]]),
    );
    expect(a.links).toHaveLength(1);
    expect(a.links[0].weight).toBeCloseTo(2);
  });

  it('expands a block back into its units, the back row turned about', () => {
    const a = assemble(
      items,
      links,
      new Map([['filter', [{ rows: 2 as const, cols: 2 }]]]),
    );
    const [key, list] = [...a.members].find(([k]) => k.startsWith('block:'))!;
    void key;
    const units = expandBlock({ x: 0, z: 0, yaw: 0 }, list);
    expect(units).toHaveLength(4);
    expect(units.filter((u) => Math.abs(u.yaw - Math.PI) < 1e-9)).toHaveLength(
      2,
    );
    expect(new Set(units.map((u) => u.x.toFixed(2))).size).toBe(2);
  });
});
