import { describe, expect, it } from 'vite-plus/test';
import {
  CAUSTICS_PROJECTOR,
  causticsFrame,
  causticsPhase,
  createCausticsClock,
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
