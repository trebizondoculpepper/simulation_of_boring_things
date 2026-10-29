import { describe, expect, it } from 'vite-plus/test';
import {
  LOOK_UP,
  REVEAL,
  bannerLine,
  fanfareOf,
  revealCueOf,
  revealFrame,
} from './skimmer-reveal';

describe('the skimmer’s item reveal', () => {
  it('holds the reveal for the suspenseful arpeggio', () => {
    expect(REVEAL.suspense).toBe(7.6);
    expect(revealFrame(7.5, 0).phase).toBe('suspense');
    expect(revealFrame(7.6, 0).phase).toBe('fanfare');
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

  it('alternates the big-item cue and the fanfare', () => {
    expect(fanfareOf('hair-clump', 0)).toBe('reveal-big-item');
    expect(fanfareOf('leaves', 1)).toBe('reveal-fanfare');
    expect(fanfareOf('dead-rat', 2)).toBe('reveal-big-item');
  });

  it('deflates the fanfare for more hair', () => {
    expect(fanfareOf('more-hair', 5)).toBe('reveal-fanfare-deflated');
    expect(bannerLine('a DEAD RAT')).toBe('You got a DEAD RAT!');
  });
});

describe('revealCueOf', () => {
  it('plays the small-item fanfare for an empty basket, a find its own', () => {
    expect(revealCueOf(null, 0)).toBe('reveal-fanfare');
    expect(revealCueOf(null, 1)).toBe('reveal-fanfare');
    expect(revealCueOf('hair-clump', 0)).toBe('reveal-big-item');
    expect(revealCueOf('more-hair', 5)).toBe('reveal-fanfare-deflated');
  });
});
