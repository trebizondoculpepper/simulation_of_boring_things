import { describe, expect, it } from 'vite-plus/test';
import {
  initialPlantDoor,
  PLANT_DOOR,
  stepPlantDoor,
  workDoor,
} from './plant-door';
import type { PlantDoorState } from './plant-door';

const run = (s: PlantDoorState, seconds: number) => {
  let latched = false;
  for (let t = 0; t < seconds; t += 0.05) {
    const r = stepPlantDoor(s, 0.05);
    s = r.state;
    latched ||= r.latchedNow;
  }
  return { s, latched };
};

describe('the plant room door', () => {
  it('opens from either side: there is no code', () => {
    expect(workDoor(initialPlantDoor()).latched).toBe(false);
  });

  it('opens, is held, then closes itself and latches', () => {
    let s = workDoor(initialPlantDoor());
    s = run(s, 1).s;
    expect(s.angle).toBeCloseTo(PLANT_DOOR.open);
    expect(s.phase).toBe('held');
    s = run(s, PLANT_DOOR.held + 1).s;
    expect(s.phase).toBe('closing');
    expect(s.angle).toBeGreaterThan(0);
    const { s: shut, latched } = run(s, 10);
    expect(latched).toBe(true);
    expect(shut).toMatchObject({ angle: 0, latched: true, phase: 'shut' });
  });

  it('accelerates after release and decelerates before closing', () => {
    let s: PlantDoorState = {
      ...initialPlantDoor(),
      angle: PLANT_DOOR.open,
      phase: 'closing' as const,
      closeFrom: PLANT_DOOR.open,
    };
    const changes: number[] = [];
    for (let i = 0; i < 90; i++) {
      const next = stepPlantDoor(s, 0.05).state;
      changes.push(s.angle - next.angle);
      s = next;
    }
    expect(changes[0]).toBeLessThan(changes[30]);
    expect(changes[89]).toBeLessThan(changes[30]);
    expect(s.phase).toBe('shut');
  });
});

import { holdDoorOpen } from './plant-door';

describe('a door with someone in its doorway', () => {
  it('is held open, and closes once they are clear', () => {
    let s = workDoor(initialPlantDoor());
    s = run(s, PLANT_DOOR.held + 2).s;
    expect(s.phase).toBe('closing');
    // Someone steps into the doorway as it swings shut: held again.
    s = holdDoorOpen(s);
    expect(s.phase).toBe('held');
    expect(s.angle).toBeGreaterThan(0.05);
    // A shut door is not opened by it.
    expect(holdDoorOpen(initialPlantDoor()).angle).toBe(0);
    // Clear of it, it closes.
    expect(run(s, PLANT_DOOR.held + 20).s.phase).toBe('shut');
  });
});

import { keepDoorOpen, standDoorOpen } from './plant-door';

/** Step at 20 frames a second, `near` saying, each frame, whether someone is near. */
const walk = (
  s: PlantDoorState,
  seconds: number,
  near: (t: number) => boolean,
) => {
  let latched = false;
  let shutSounds = 0;
  const angles: number[] = [];
  for (let t = 0; t < seconds; t += 0.05) {
    const r = stepPlantDoor(s, 0.05, near(t));
    s = r.state;
    latched ||= r.latchedNow;
    if (r.latchedNow) shutSounds++;
    angles.push(s.angle);
  }
  return { s, latched, shutSounds, angles };
};

describe('a door with someone near it (mission 090)', () => {
  const opened = () => run(workDoor(initialPlantDoor()), 1).s;

  it('stays open long past its hold while they stand near, still', () => {
    const r = walk(opened(), PLANT_DOOR.held * 10, () => true);
    expect(r.s.angle).toBeCloseTo(PLANT_DOOR.open);
    expect(r.s.phase).toBe('held');
    expect(r.latched).toBe(false);
    expect(Math.min(...r.angles)).toBeCloseTo(PLANT_DOOR.open);
  });

  it('opens again, smoothly, if they come near as it closes', () => {
    let s = run(opened(), PLANT_DOOR.held + 2).s;
    expect(s.phase).toBe('closing');
    const caught = s.angle;
    const r = walk(s, 2, () => true);
    // No snap: it climbs back at its opening speed, never jumping.
    let previous = caught;
    for (const a of r.angles) {
      expect(a).toBeGreaterThanOrEqual(previous - 1e-9);
      expect(a - previous).toBeLessThanOrEqual(
        PLANT_DOOR.opening * 0.05 + 1e-9,
      );
      previous = a;
    }
    expect(r.s.angle).toBeCloseTo(PLANT_DOOR.open);
    expect(r.s.phase).toBe('held');
    s = r.s;
    // Walked away from, it closes at once and briskly (the owner,
    // 2026-10-27): its short hold, then shut within a couple of seconds.
    expect(walk(s, PLANT_DOOR.awayHold - 0.1, () => false).s.phase).toBe(
      'held',
    );
    expect(walk(s, PLANT_DOOR.awayHold + 0.1, () => false).s.phase).toBe(
      'closing',
    );
    expect(walk(s, PLANT_DOOR.awayHold + 1.5, () => false).latched).toBe(true);
  });

  it('with no one watching for walkers, it keeps its ordinary hold', () => {
    // Already some way through its hold once opened.
    const s = run(opened(), PLANT_DOOR.held - 0.6).s;
    expect(s.phase).toBe('held');
    expect(run(s, 0.8).s.phase).toBe('closing');
  });

  it('is caught even a frame before it latches, and never latches beside them', () => {
    let s = run(opened(), PLANT_DOOR.held + 0.1).s;
    // Run its closing sweep to within a whisker of shut.
    while (s.angle > 0.003) {
      const next = stepPlantDoor(s, 0.01).state;
      if (next.phase === 'shut') break;
      s = next;
    }
    expect(s.phase).toBe('closing');
    expect(s.angle).toBeLessThan(0.05);
    const r = stepPlantDoor(s, 0.05, true);
    expect(r.latchedNow).toBe(false);
    expect(r.state.phase).toBe('opening');
    expect(r.state.angle).toBeGreaterThan(s.angle);
  });

  it('leaving and coming straight back keeps it open; away long enough, it shuts', () => {
    // A step away and straight back, before it can swing shut.
    const back = walk(
      opened(),
      12,
      (t) => t < 1 || (t > 1.5 && t < 6) || t > 6.5,
    );
    expect(back.latched).toBe(false);
    expect(back.s.angle).toBeCloseTo(PLANT_DOOR.open);
    const gone = walk(opened(), 1 + PLANT_DOOR.held + 10, (t) => t < 1);
    expect(gone.latched).toBe(true);
    expect(gone.shutSounds).toBe(1);
    expect(gone.s).toMatchObject({ angle: 0, latched: true, phase: 'shut' });
  });

  it('a shut door stays shut: only its handle opens it', () => {
    const r = walk(initialPlantDoor(), 5, () => true);
    expect(r.s).toMatchObject({ angle: 0, latched: true, phase: 'shut' });
    expect(keepDoorOpen(initialPlantDoor())).toEqual(initialPlantDoor());
    expect(workDoor(initialPlantDoor()).phase).toBe('opening');
  });

  it('handed over open, it waits a full hold rather than closing at once', () => {
    const s = standDoorOpen(-1.2);
    expect(s).toMatchObject({ angle: 1.2, phase: 'held', latched: false });
    expect(run(s, PLANT_DOOR.held - 0.2).s.angle).toBeCloseTo(1.2);
    // With the walker beside it, it finishes opening.
    expect(walk(s, 1, () => true).s.angle).toBeCloseTo(PLANT_DOOR.open);
    expect(standDoorOpen(0)).toEqual(initialPlantDoor());
  });
});
