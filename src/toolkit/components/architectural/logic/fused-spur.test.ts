import { describe, expect, it } from 'vite-plus/test';
import { spurLive } from './fused-spur';

describe('a fused spur', () => {
  it('is live only when supplied, switched on and its fuse whole', () => {
    expect(spurLive(true, { on: true, fuse: true })).toBe(true);
    expect(spurLive(false, { on: true, fuse: true })).toBe(false);
    expect(spurLive(true, { on: false, fuse: true })).toBe(false);
    expect(spurLive(true, { on: true, fuse: false })).toBe(false);
  });
});
