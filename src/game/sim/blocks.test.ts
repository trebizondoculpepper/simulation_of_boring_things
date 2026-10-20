import { describe, expect, it } from 'vite-plus/test';
import { blockAt, listBlocks, read, write } from './blocks';
import type { Block } from './blocks';

const pumpSet: Block = {
  kind: 'pump-set',
  state: {},
  children: {
    motor: { kind: 'motor', state: { running: false } },
    pump: { kind: 'pump', state: {} },
  },
};
const plant: Block = {
  kind: 'plant',
  state: {},
  children: {
    circulation: {
      kind: 'system',
      state: {},
      children: { 'P-101': pumpSet, 'P-102': pumpSet },
    },
  },
};

describe('blocks within blocks', () => {
  it('finds a block, and a field of its state, by address', () => {
    expect(blockAt(plant, 'circulation/P-101/motor')?.kind).toBe('motor');
    expect(read(plant, 'circulation/P-101/motor:running')).toBe(false);
    expect(read(plant, 'circulation/P-999/motor:running')).toBeUndefined();
  });

  it('writes one instance of a reused kind without touching the others', () => {
    const next = write(plant, 'circulation/P-101/motor:running', true);
    expect(read(next, 'circulation/P-101/motor:running')).toBe(true);
    expect(read(next, 'circulation/P-102/motor:running')).toBe(false);
    // The untouched branch is shared, and the original is unchanged.
    expect(blockAt(next, 'circulation/P-102')).toBe(
      blockAt(plant, 'circulation/P-102'),
    );
    expect(read(plant, 'circulation/P-101/motor:running')).toBe(false);
  });

  it('refuses a write to a block that is not there', () => {
    expect(() => write(plant, 'circulation/P-9/motor:running', true)).toThrow();
  });

  it('lists every block by address', () => {
    expect(listBlocks(plant).map((b) => b.path)).toEqual([
      'circulation',
      'circulation/P-101',
      'circulation/P-101/motor',
      'circulation/P-101/pump',
      'circulation/P-102',
      'circulation/P-102/motor',
      'circulation/P-102/pump',
    ]);
  });
});
