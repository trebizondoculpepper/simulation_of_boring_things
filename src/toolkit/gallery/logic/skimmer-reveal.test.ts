import { describe, expect, it } from 'vite-plus/test';
import {
  LOOK_UP,
  REVEAL,
  bannerLine,
  fanfareOf,
  revealFrame,
} from './skimmer-reveal';

describe('the skimmer’s item reveal', () => {
  it('holds the reveal for the extended suspense phrase', () => {
    expect(REVEAL.suspense).toBe(3.05);
    expect(revealFrame(3, 0).phase).toBe('suspense');
    expect(revealFrame(3.05, 0).phase).toBe('fanfare');
  });

  it('looks up during the suspense, the find not yet shown', () => {
    const start = revealFrame(0, 0);
    expect(start.phase).toBe('suspense');
    expect(start.pitch).toBe(0);
    const late = revealFrame(REVEAL.suspense - 0.01, 0);
    expect(late.pitch).toBeCloseTo(LOOK_UP, 2);
    expect(late.size).toBe(0);
    expect(late.banner).toBe(false);
  });

  it('shows the find turning above, with the banner, through the fanfare', () => {
    const f = revealFrame(REVEAL.suspense + 1, 0);
    expect(f.phase).toBe('fanfare');
    expect(f.pitch).toBe(LOOK_UP);
    expect(f.size).toBe(1);
    expect(f.banner).toBe(true);
    expect(revealFrame(REVEAL.suspense + 1.5, 0).spin).toBeGreaterThan(f.spin);
  });

  it('brings the look back to where it was, then lets go', () => {
    const end = REVEAL.suspense + REVEAL.fanfare + REVEAL.settle;
    expect(revealFrame(end - 0.25, -0.2).phase).toBe('settle');
    const done = revealFrame(end + 0.01, -0.2);
    expect(done.phase).toBe('done');
    expect(done.pitch).toBe(-0.2);
  });

  it('follows the music’s own lengths', () => {
    const timing = { suspense: 3, fanfare: 2, settle: 0.5 };
    expect(revealFrame(2.9, 0, timing).phase).toBe('suspense');
    expect(revealFrame(4.9, 0, timing).phase).toBe('fanfare');
  });

  it('deflates the fanfare for more hair', () => {
    expect(fanfareOf('dead-rat')).toBe('reveal-fanfare');
    expect(fanfareOf('more-hair')).toBe('reveal-fanfare-deflated');
    expect(bannerLine('a DEAD RAT')).toBe('You got a DEAD RAT!');
  });
});
