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

  it('opens, is held, then closes itself and latches, slowly then quickly', () => {
    let s = workDoor(initialPlantDoor());
    s = run(s, 1).s;
    expect(s.angle).toBeCloseTo(PLANT_DOOR.open);
    expect(s.phase).toBe('held');
    // Through the sweep, slowly; the last few degrees quickly.
    s = run(s, PLANT_DOOR.held + 1).s;
    expect(s.phase).toBe('closing');
    expect(s.angle).toBeGreaterThan(PLANT_DOOR.latchFrom);
    const { s: shut, latched } = run(s, 10);
    expect(latched).toBe(true);
    expect(shut).toMatchObject({ angle: 0, latched: true, phase: 'shut' });
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
