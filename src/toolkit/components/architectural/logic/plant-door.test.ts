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
