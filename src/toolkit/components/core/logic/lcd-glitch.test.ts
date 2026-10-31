import { describe, expect, it } from 'vite-plus/test';
import {
  GLITCH_MAX_HZ,
  glitchBurst,
  glitchMoment,
  glitchPlan,
  type GlitchOp,
} from './lcd-glitch';

const size = { w: 640, h: 480 };

function checkBounds(op: GlitchOp, w: number, h: number): void {
  if (op.kind === 'copy') {
    expect(op.sx).toBeGreaterThanOrEqual(0);
    expect(op.sy).toBeGreaterThanOrEqual(0);
    expect(op.sw).toBeGreaterThan(0);
    expect(op.sh).toBeGreaterThan(0);
    expect(op.sx + op.sw).toBeLessThanOrEqual(w);
    expect(op.sy + op.sh).toBeLessThanOrEqual(h);
    expect(op.dx).toBeGreaterThanOrEqual(0);
    expect(op.dy).toBeGreaterThanOrEqual(0);
    expect(op.dw).toBeGreaterThan(0);
    expect(op.dh).toBeGreaterThan(0);
    expect(op.dx + op.dw).toBeLessThanOrEqual(w);
    expect(op.dy + op.dh).toBeLessThanOrEqual(h);
  } else {
    expect(op.x).toBeGreaterThanOrEqual(0);
    expect(op.y).toBeGreaterThanOrEqual(0);
    expect(op.w).toBeGreaterThan(0);
    expect(op.h).toBeGreaterThan(0);
    expect(op.x + op.w).toBeLessThanOrEqual(w);
    expect(op.y + op.h).toBeLessThanOrEqual(h);
  }
}

describe('LCD glitch plan', () => {
  it('is deterministic and gives seeds, bursts and frames distinct wreckage', () => {
    const original = glitchPlan(42, 2, 1, size);
    expect(glitchPlan(42, 2, 1, size)).toEqual(original);
    expect(glitchPlan(43, 2, 1, size)).not.toEqual(original);
    expect(glitchPlan(42, 3, 1, size)).not.toEqual(original);
    expect(glitchPlan(42, 2, 2, size)).not.toEqual(original);
  });

  it('keeps every source and target rectangle inside the canvas and stays bounded', () => {
    for (const dimensions of [
      size,
      { w: 1, h: 1 },
      { w: 320, h: 240 },
      { w: 1920, h: 1080 },
    ]) {
      for (let burst = 0; burst < 12; burst++) {
        for (let frame = 0; frame < 5; frame++) {
          const plan = glitchPlan(31, burst, frame, dimensions);
          expect(plan.ops.length).toBeLessThanOrEqual(450);
          for (const op of plan.ops)
            checkBounds(op, dimensions.w, dimensions.h);
        }
      }
    }
  });

  it('never uses xor, which would punch transparent holes in the LCD', () => {
    for (let burst = 0; burst < 12; burst++) {
      const plan = glitchPlan(2026, burst, 4, size);
      expect(
        plan.ops.every((op) => !('blend' in op) || String(op.blend) !== 'xor'),
      ).toBe(true);
    }
  });
});

describe('LCD glitch schedule', () => {
  it('begins at burst zero and keeps its key stable during a hold', () => {
    expect(glitchMoment(9, 0)).toEqual({ burst: 0, frame: 0, key: '0:0' });
    expect(glitchMoment(9, 0.05).key).toBe('0:0');
  });

  it('spaces frame changes and rests between bursts, averaging below 0.8 Hz', () => {
    const changes: Array<{ time: number; burst: number; frame: number }> = [];
    let previous = '';
    for (let tick = 0; tick <= 360000; tick++) {
      const time = tick / 100;
      const moment = glitchMoment(527, time);
      if (moment.key !== previous) {
        changes.push({ time, burst: moment.burst, frame: moment.frame });
        previous = moment.key;
      }
    }
    expect(changes.length / 3600).toBeLessThan(0.8);
    for (let i = 1; i < changes.length; i++) {
      const prior = changes[i - 1];
      const current = changes[i];
      const gap = current.time - prior.time;
      if (current.burst === prior.burst) {
        expect(gap + 0.000001).toBeGreaterThanOrEqual(1 / GLITCH_MAX_HZ);
        expect(gap).toBeLessThanOrEqual(0.411);
      } else {
        expect(current.burst).toBe(prior.burst + 1);
        expect(current.frame).toBe(0);
        expect(gap).toBeGreaterThanOrEqual(4.1);
        expect(gap).toBeLessThanOrEqual(12.41);
      }
    }
  });

  it('names the burst being written, and null in the holds, for the pumps', () => {
    expect(glitchBurst(9, 0)).toBe(0);
    // Burst 0 is under way from the start.
    let bursts = 1;
    let previous: number | null = 0;
    for (let tick = 0; tick <= 60000; tick++) {
      const time = tick / 100;
      const burst = glitchBurst(9, time);
      const moment = glitchMoment(9, time);
      // Writing whenever the frame changes; between bursts, nothing.
      if (burst !== null) expect(burst).toBe(moment.burst);
      if (burst !== previous && burst !== null) {
        expect(previous).toBeNull();
        expect(burst).toBe(bursts);
        bursts++;
      }
      previous = burst;
    }
    expect(bursts).toBeGreaterThan(40);
    // Each burst's frames all change while it is being written.
    let key = '';
    for (let tick = 0; tick <= 60000; tick++) {
      const moment = glitchMoment(9, tick / 100);
      if (moment.key !== key)
        expect(glitchBurst(9, tick / 100)).toBe(moment.burst);
      key = moment.key;
    }
  });
});
