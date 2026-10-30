import { describe, expect, it } from 'vite-plus/test';
import {
  CAUSTICS_PROJECTOR,
  causticsFrame,
  causticsPhase,
  createCausticsClock,
  createWalkerWhereabouts,
  projectedLanes,
  projectorPresence,
  projectorState,
} from './caustics-projector';

describe('the caustics projector', () => {
  it('projects while the room is lit, stands by when it is dark, and is dark unpowered', () => {
    expect(projectorState(true, true)).toEqual({
      projecting: true,
      lamp: 'green',
    });
    expect(projectorState(true, false)).toEqual({
      projecting: false,
      lamp: 'amber',
    });
    expect(projectorState(false, true)).toEqual({
      projecting: false,
      lamp: 'off',
    });
  });

  it('steps its loop in whole frames at no more than 10 Hz, round and round', () => {
    expect(CAUSTICS_PROJECTOR.rate).toBeLessThanOrEqual(10);
    expect(causticsFrame(0)).toBe(0);
    expect(causticsFrame(0.09)).toBe(0);
    expect(causticsFrame(0.1)).toBe(1);
    expect(causticsFrame(CAUSTICS_PROJECTOR.loop)).toBe(0);
    expect(
      causticsPhase(causticsFrame(CAUSTICS_PROJECTOR.loop / 2)),
    ).toBeCloseTo(0.5, 9);
  });

  it('asks for a redraw only when its frame changes', () => {
    const clock = createCausticsClock();
    expect(clock.step(0)).toBe(true);
    let redraws = 0;
    for (let k = 0; k < 600; k++) if (clock.step(1 / 60)) redraws++;
    // Ten seconds at 60 fps: a hundred frames, not six hundred.
    expect(redraws).toBeGreaterThanOrEqual(99);
    expect(redraws).toBeLessThanOrEqual(101);
  });
});

describe('the projected lane lines', () => {
  it('spaces the lines evenly across the pool, stopping 2 m short of each end', () => {
    const lanes = projectedLanes(9.4, 6.5, 4);
    expect(lanes.lines.map((l) => l.v)).toEqual([0.2, 0.4, 0.6, 0.8]);
    expect(lanes.lines[0].u0).toBeCloseTo(2 / 9.4);
    expect(lanes.lines[0].u1).toBeCloseTo(1 - 2 / 9.4);
  });
  it('makes the lines 0.2 m wide and their T bars 1 m long', () => {
    const lanes = projectedLanes(9.4, 6.5, 4);
    expect(lanes.halfWidthV * 6.5).toBeCloseTo(0.1);
    expect(lanes.tHalfV * 6.5).toBeCloseTo(0.5);
    expect(lanes.halfWidthU * 9.4).toBeCloseTo(0.1);
  });
  it('draws none for no lanes', () => {
    expect(projectedLanes(9.4, 6.5, 0).lines).toEqual([]);
  });
});

describe('the projector going out when the walker leaves', () => {
  it('fades to black over the 4 s after the threshold, then switches off', () => {
    expect(projectorPresence(false, 0)).toEqual({
      projecting: true,
      brightness: 1,
    });
    expect(projectorPresence(false, 2).brightness).toBeCloseTo(0.5);
    expect(projectorPresence(false, 4)).toEqual({
      projecting: false,
      brightness: 0,
    });
  });
  it('fades up over 1 s on coming back', () => {
    expect(projectorPresence(true, 0.5).brightness).toBeCloseTo(0.5);
    expect(projectorPresence(true, 3).brightness).toBe(1);
  });
  it('keeps the leaving time across halls', () => {
    const w = createWalkerWhereabouts();
    // Off until the walker first enters Hall 0, then faded up.
    expect(w.presence(0).projecting).toBe(false);
    w.walkerIn('museum1', 50);
    expect(w.presence(60).projecting).toBe(false);
    w.walkerIn('museum0', 90);
    expect(w.presence(95).brightness).toBe(1);
    w.walkerIn('museum1', 100);
    w.walkerIn('museum1', 103);
    expect(w.presence(102).brightness).toBeCloseTo(0.5);
    expect(w.presence(111).projecting).toBe(false);
    w.walkerIn('museum0', 200);
    expect(w.presence(200.25).brightness).toBeCloseTo(0.25);
  });
});
