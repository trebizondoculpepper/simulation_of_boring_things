import { describe, expect, it } from 'vite-plus/test';
import { createPutBack } from './put-back';
import type { Pose } from './put-back';

const at = (x: number): Pose => ({
  position: [x, 1.66, -0.3],
  quaternion: [0, 0, 0, 1],
});

describe('picking a thing up to look at it, and putting it back', () => {
  it('picks up a thing set out, and puts it back exactly where it was', () => {
    const things = createPutBack<string>();
    things.home('pool-sim', at(0.3));
    expect(things.has('pool-sim')).toBe(true);
    expect(things.canPickUp('pool-sim')).toBe(true);
    expect(things.pickUp('pool-sim')).toBe(true);
    expect(things.held()).toBe('pool-sim');
    expect(things.putBack('pool-sim')).toEqual(at(0.3));
    expect(things.held()).toBeNull();
    // Home again, it may be picked up again.
    expect(things.pickUp('pool-sim')).toBe(true);
  });

  it('holds one at a time', () => {
    const things = createPutBack<string>();
    things.home('a', at(0));
    things.home('b', at(0.1));
    expect(things.pickUp('a')).toBe(true);
    expect(things.canPickUp('b')).toBe(false);
    expect(things.pickUp('b')).toBe(false);
    expect(things.putBack('b')).toBeNull();
    expect(things.held()).toBe('a');
    things.putBack('a');
    expect(things.pickUp('b')).toBe(true);
  });

  it('leaves alone what something rests on, so nothing is left floating', () => {
    const things = createPutBack<string>();
    things.home('coshh', at(0.6));
    things.home('beige', at(0.6), 'coshh');
    expect(things.canPickUp('coshh')).toBe(false);
    expect(things.pickUp('coshh')).toBe(false);
    // The one on top comes off freely, and while it is away its support
    // still stays put, for it is to go back on top of it.
    expect(things.pickUp('beige')).toBe(true);
    expect(things.canPickUp('coshh')).toBe(false);
    things.putBack('beige');
    expect(things.canPickUp('coshh')).toBe(false);
  });

  it('bins the one held, on top of what is in the bin, and takes out only the top one', () => {
    const things = createPutBack<string>();
    things.home('a', at(0));
    things.home('b', at(0.1));
    expect(things.bin('a')).toBeNull();
    things.pickUp('a');
    expect(things.bin('a')).toBe(0);
    expect(things.where('a')).toBe('binned');
    expect(things.held()).toBeNull();
    things.pickUp('b');
    expect(things.bin('b')).toBe(1);
    expect(things.binned()).toEqual(['a', 'b']);
    expect(things.canPickUp('a')).toBe(false);
    expect(things.pickUp('b')).toBe(true);
    expect(things.binned()).toEqual(['a']);
    expect(things.putBack('b')).toEqual(at(0.1));
    expect(things.where('b')).toBe('home');
    expect(things.pickUp('a')).toBe(true);
  });

  it('frees a support once what rests on it is binned', () => {
    const things = createPutBack<string>();
    things.home('coshh', at(0.6));
    things.home('beige', at(0.6), 'coshh');
    things.pickUp('beige');
    things.bin('beige');
    // Nothing rests on it now.
    expect(things.pickUp('coshh')).toBe(true);
    things.bin('coshh');
    expect(things.binned()).toEqual(['beige', 'coshh']);
    things.pickUp('coshh');
    things.putBack('coshh');
    expect(things.where('coshh')).toBe('home');
    // With its support home again, it goes back on top of it.
    expect(things.pickUp('beige')).toBe(true);
    expect(things.putBack('beige')).toEqual(at(0.6));
  });

  it('keeps a binned thing under its binned support until the support is home', () => {
    const things = createPutBack<string>();
    things.home('book', at(0.15));
    things.home('lean', at(0.2), 'book');
    things.pickUp('lean');
    things.bin('lean');
    things.pickUp('book');
    things.bin('book');
    expect(things.binned()).toEqual(['lean', 'book']);
    expect(things.canPickUp('lean')).toBe(false);
    things.pickUp('book');
    things.putBack('book');
    expect(things.pickUp('lean')).toBe(true);
    expect(things.putBack('lean')).toEqual(at(0.2));
  });

  it('knows nothing of what it was never given', () => {
    const things = createPutBack<string>();
    expect(things.has('stapler')).toBe(false);
    expect(things.pickUp('stapler')).toBe(false);
    expect(things.putBack('stapler')).toBeNull();
  });
});
