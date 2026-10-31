import { describe, expect, it } from 'vite-plus/test';
import {
  PC_BOOT,
  SCREENSAVER_AFTER,
  SCREENSAVER_HZ,
  clockText,
  cowSpots,
  diskBusy,
  duckPositions,
  newPc,
  pcFrame,
  pressPower,
  stepPc,
  touchPc,
} from './period-pc';

describe('the engineer’s PC', () => {
  it('is found on, its bookings open, and drifts into its screensaver', () => {
    const pc = newPc();
    expect(pc.power).toBe(true);
    expect(pc.screen).toBe('desktop');
    expect(stepPc(pc, SCREENSAVER_AFTER + 1).screen).toBe('screensaver');
  });

  it('wakes to its desktop at a touch, and drifts back when left', () => {
    let pc = touchPc(newPc());
    expect(pc.screen).toBe('desktop');
    pc = stepPc(pc, SCREENSAVER_AFTER - 1);
    expect(pc.screen).toBe('desktop');
    pc = touchPc(pc);
    pc = stepPc(pc, SCREENSAVER_AFTER - 1);
    expect(pc.screen).toBe('desktop');
    pc = stepPc(pc, 2);
    expect(pc.screen).toBe('screensaver');
  });

  it('goes dark at its power button and boots when pressed again', () => {
    let pc = pressPower(newPc());
    expect(pc.screen).toBe('off');
    expect(touchPc(pc)).toEqual(pc);
    expect(diskBusy(pc)).toBe(false);
    pc = pressPower(pc);
    expect(pc.screen).toBe('booting');
    pc = stepPc(pc, PC_BOOT.seconds - 0.1);
    expect(pc.screen).toBe('booting');
    pc = stepPc(pc, 0.2);
    expect(pc.screen).toBe('desktop');
  });

  it('takes a boot sequence’s own length when one is given', () => {
    const pc = stepPc(pressPower(pressPower(newPc())), 3, 2.5);
    expect(pc.screen).toBe('desktop');
  });

  it('keys its picture so it is drawn only when it changes', () => {
    const pc = stepPc(newPc(), SCREENSAVER_AFTER);
    const a = pcFrame(pc, 600).key;
    const b = pcFrame(stepPc(pc, 0.5 / SCREENSAVER_HZ), 600).key;
    const c = pcFrame(stepPc(pc, 1.01 / SCREENSAVER_HZ), 600).key;
    expect(a).toBe(b);
    expect(c).not.toBe(a);
    const desk = touchPc(pc);
    expect(pcFrame(desk, 600.2).key).toBe(pcFrame(desk, 600.9).key);
    expect(pcFrame(desk, 601).key).not.toBe(pcFrame(desk, 600).key);
  });

  it('wears the same cow spots for the same seed, on its surface', () => {
    expect(cowSpots(3, 9)).toEqual(cowSpots(3, 9));
    expect(cowSpots(3, 9)).not.toEqual(cowSpots(4, 9));
    for (const s of cowSpots(11, 12)) {
      expect(s.x).toBeGreaterThan(0);
      expect(s.x).toBeLessThan(1);
      expect(s.y).toBeGreaterThan(0);
      expect(s.y).toBeLessThan(1);
      expect(s.r).toBeGreaterThan(0);
      expect(s.lobes).toHaveLength(11);
    }
  });

  it('tells the time and keeps its ducks on the screen', () => {
    expect(clockText(0)).toBe('00:00');
    expect(clockText(14 * 60 + 5)).toBe('14:05');
    expect(clockText(1440 + 61)).toBe('01:01');
    for (const step of [0, 13, 500, 12345])
      for (const d of duckPositions(step)) {
        expect(d.x).toBeGreaterThanOrEqual(0);
        expect(d.x).toBeLessThanOrEqual(1);
        expect(d.y).toBeGreaterThanOrEqual(0);
        expect(d.y).toBeLessThanOrEqual(1);
      }
    expect(duckPositions(7)).toEqual(duckPositions(7));
  });
});
