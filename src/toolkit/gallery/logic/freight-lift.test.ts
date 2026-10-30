import { describe, expect, it } from 'vite-plus/test';
import {
  arrivalArrow,
  callLift,
  callLit,
  carAcceleration,
  carButtonLit,
  carLevel,
  closingWarning,
  holdLift,
  holdSeconds,
  indicatorLabel,
  LIFT_FLOORS,
  LIFT_LEVELS,
  LIFT_TIMING,
  liftBetweenSteps,
  liftDirection,
  liftReady,
  newLift,
  nextStop,
  openAt,
  pressLift,
  runProfile,
  runSeconds,
  stepLift,
  tripPhase,
  tripSeconds,
} from './freight-lift';
import type { LiftState } from './freight-lift';

/** Run the lift `seconds` on, a frame at a time. */
const run = (l: LiftState, seconds: number, frame = 1 / 60) => {
  let s = l;
  for (let t = 0; t < seconds; t += frame) s = stepLift(s, frame);
  return s;
};
const T = LIFT_TIMING;
/** The lift standing at `floor`, its doors fully open after a car call there. */
const openAtFloor = (floor = 'b2'): LiftState =>
  run(pressLift({ ...newLift(), floor }, floor), T.doors + 0.05);

describe('the freight lift’s floors (mission 108)', () => {
  it('lists B2, G, 3 and 4, bottom to top, each on a level the indicator knows', () => {
    expect(LIFT_FLOORS.map((f) => f.label)).toEqual(['B2', 'G', '3', '4']);
    for (const f of LIFT_FLOORS) expect(LIFT_LEVELS).toContain(f.level);
    const order = LIFT_FLOORS.map((f) => LIFT_LEVELS.indexOf(f.level));
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
  it('goes to the corridor, the bridge and the museum; reception not built', () => {
    expect(Object.fromEntries(LIFT_FLOORS.map((f) => [f.id, f.room]))).toEqual({
      b2: 'main_corridor',
      g: null,
      3: 'bridge',
      4: 'museum0',
    });
  });
});

describe('the freight lift’s doors', () => {
  it('a landing call where it stands opens them for the landing dwell, then they close', () => {
    let l = callLift(newLift(), 'b2');
    expect(l.doors).toBe('opening');
    l = run(l, T.doors + 0.05);
    expect(l.doors).toBe('open');
    expect(openAt(l, 'b2')).toBe(true);
    l = run(l, T.hallDwell - 0.3);
    expect(l.doors).toBe('open');
    l = run(l, 0.5);
    expect(l.doors).toBe('closing');
    l = run(l, T.doors + 0.05);
    expect(l.doors).toBe('shut');
    expect(l.open).toBe(0);
  });
  it('a car call dwells shorter than a landing call', () => {
    expect(T.carDwell).toBeGreaterThanOrEqual(3);
    expect(T.hallDwell).toBeGreaterThan(T.carDwell);
    let l = openAtFloor();
    l = run(l, T.carDwell + 0.2);
    expect(l.doors).toBe('closing');
  });
  it('sounds its warning before closing', () => {
    let l = openAtFloor();
    expect(closingWarning(l)).toBe(false);
    l = run(l, T.carDwell - T.warning + 0.1);
    expect(closingWarning(l)).toBe(true);
  });
  it('the light curtain keeps them open, and reopens them', () => {
    let l = holdLift(openAtFloor(), true);
    l = run(l, T.nudgeAfter - 1);
    expect(l.doors).toBe('open');
    l = run(holdLift(l, false), T.reopenDwell + 0.2);
    expect(l.doors).toBe('closing');
    l = holdLift(l, true);
    expect(l.doors).toBe('opening');
  });
  it('held too long, they nudge shut slowly with the buzzer, the curtain ignored', () => {
    let l = holdLift(openAtFloor(), true);
    l = run(l, T.nudgeAfter + 0.2);
    expect(l.nudging).toBe(true);
    expect(l.doors).toBe('closing');
    expect(closingWarning(l)).toBe(true);
    l = run(l, T.doors + 0.2);
    expect(l.doors).toBe('closing');
    l = run(l, T.nudgeDoors);
    expect(l.doors).toBe('shut');
    expect(l.nudging).toBe(false);
  });
  it('DOOR CLOSE shortens the dwell; DOOR OPEN reopens and holds', () => {
    let l = pressLift(openAtFloor(), 'close');
    l = run(l, T.warning);
    expect(l.doors).toBe('closing');
    l = pressLift(l, 'open');
    expect(l.doors).toBe('opening');
    l = run(l, T.reopenDwell);
    expect(l.doors).not.toBe('closing');
  });
  it('the current floor’s button reopens them', () => {
    expect(pressLift(newLift(), 'b2').doors).toBe('opening');
  });
});

describe('a ride', () => {
  it('closes, runs, waits short of a floor not ready, arrives once it is', () => {
    let l = pressLift(openAtFloor(), '4');
    expect(carButtonLit(l, '4')).toBe(true);
    l = pressLift(l, 'close');
    l = run(l, T.warning + T.doors + 0.2);
    expect(l.trip?.to).toBe('4');
    expect(tripPhase(l)).toBe('start');
    expect(liftDirection(l)).toBe('up');
    // Through the levels, the indicator counting.
    const seen: string[] = [];
    for (let t = 0; t < 60; t += 0.1) {
      l = stepLift(l, 0.1);
      const label = indicatorLabel(l);
      if (seen.at(-1) !== label) seen.push(label);
    }
    expect(seen).toEqual(['B2', 'B1', 'G', '1', '2', '3']);
    // Never arrived: waiting short of floor 4, the indicator on 3.
    expect(tripPhase(l)).toBe('wait');
    expect(l.doors).toBe('shut');
    expect(carButtonLit(l, '4')).toBe(true);
    l = liftReady(l, '4');
    l = run(l, T.stop + 2);
    expect(l.trip).toBeNull();
    expect(l.floor).toBe('4');
    expect(indicatorLabel(l)).toBe('4');
    expect(carButtonLit(l, '4')).toBe(false);
    expect(l.doors).not.toBe('shut');
  });
  it('a ready floor is reached in its trip time, never under the minimum ride', () => {
    for (const [a, b] of [
      ['b2', '4'],
      ['3', '4'],
      ['4', 'b2'],
    ] as const) {
      const total = tripSeconds(a, b);
      expect(total).toBeGreaterThanOrEqual(T.minRide);
      expect(holdSeconds(a, b)).toBeLessThan(total);
      let l: LiftState = {
        ...newLift(),
        floor: a,
        carCalls: [b],
        trip: { from: a, to: b, elapsed: 0, ready: true },
      };
      l = run(l, total - 0.2, 0.05);
      expect(l.trip).not.toBeNull();
      l = run(l, 0.4, 0.05);
      expect(l.trip).toBeNull();
      expect(l.floor).toBe(b);
    }
  });
  it('the car moves only between its start and its stop', () => {
    const l: LiftState = {
      ...newLift(),
      trip: { from: 'b2', to: '4', elapsed: 0.5, ready: true },
    };
    expect(carLevel(l)).toBe(0);
    const end = tripSeconds('b2', '4') - 0.1;
    expect(carLevel({ ...l, trip: { ...l.trip!, elapsed: end } })).toBe(6);
  });
  it('the car speeds up and slows down smoothly, never going back', () => {
    for (const span of [5.6, 13.2]) {
      let last = 0;
      for (let t = 0; t <= span; t += 0.01) {
        const { gone } = runProfile(t, span);
        expect(gone).toBeGreaterThanOrEqual(last - 1e-9);
        expect(gone - last).toBeLessThan(0.01);
        last = gone;
      }
      expect(runProfile(span, span).gone).toBe(1);
      // Its acceleration is the slope of its speed.
      const speed = (t: number) =>
        (runProfile(t + 1e-4, span).gone - runProfile(t - 1e-4, span).gone) /
        2e-4;
      for (const t of [0.3, 0.6, span - 0.5]) {
        const slope = (speed(t + 1e-3) - speed(t - 1e-3)) / 2e-3;
        expect(runProfile(t, span).acceleration).toBeCloseTo(slope, 2);
      }
    }
  });
  it('the judder is the acceleration: at either end of the run, not at rest or at speed', () => {
    const at = (elapsed: number): LiftState => ({
      ...newLift(),
      trip: { from: 'b2', to: '4', elapsed, ready: true },
    });
    const start = LIFT_TIMING.start;
    const run = runSeconds('b2', '4');
    expect(carAcceleration(newLift())).toBe(0);
    expect(carAcceleration(at(start / 2))).toBe(0);
    expect(carAcceleration(at(start + LIFT_TIMING.ramp / 2))).toBeGreaterThan(
      0,
    );
    expect(carAcceleration(at(start + run / 2))).toBe(0);
    expect(
      carAcceleration(at(start + run - LIFT_TIMING.ramp / 2)),
    ).toBeLessThan(0);
    // Going down, the push is the other way.
    const down: LiftState = {
      ...newLift(),
      floor: '4',
      trip: { from: '4', to: 'b2', elapsed: start + 0.6, ready: true },
    };
    expect(carAcceleration(down)).toBeLessThan(0);
  });
  it('a view carries the doors on between the world steps, smoothly', () => {
    const smooth = liftBetweenSteps();
    let world: LiftState = { ...newLift(), doors: 'opening', open: 0 };
    let last = smooth(world, 0).open;
    // Frames at 60 a second, the world stepping ten times a second.
    for (let frame = 1; frame <= 60; frame++) {
      const now = frame / 60;
      if (frame % 6 === 0) world = stepLift(world, 0.1);
      const shown = smooth(world, now).open;
      expect(shown - last).toBeGreaterThan(0);
      expect(shown - last).toBeCloseTo(1 / 60 / LIFT_TIMING.doors, 3);
      last = shown;
    }
  });
  it('a landing call is lit until the car arrives, then its arrow shows the way on', () => {
    let l = callLift({ ...newLift(), floor: '4' }, '3');
    expect(callLit(l, '3')).toBe(true);
    l = pressLift(l, 'b2'); // someone in the car wants B2 after it
    l = run(l, 0.2);
    expect(l.trip?.to).toBe('3');
    l = run(liftReady(l, '3'), tripSeconds('4', '3') + 0.2);
    expect(l.floor).toBe('3');
    expect(callLit(l, '3')).toBe(false);
    expect(l.dwell).toBe(T.hallDwell);
    expect(arrivalArrow(l)).toBe('down');
  });
  it('ignores the dead G button and a ready for another floor', () => {
    const l = newLift();
    expect(callLift(l, 'g')).toBe(l);
    expect(pressLift(l, 'g')).toBe(l);
    const moving: LiftState = {
      ...l,
      trip: { from: 'b2', to: '3', elapsed: 1, ready: false },
    };
    expect(liftReady(moving, '4')).toBe(moving);
  });
  it('rests at no cost: the same object back', () => {
    const l = newLift();
    expect(stepLift(l, 3600)).toBe(l);
  });
});

describe('collective control: calls answered in order of travel', () => {
  it('finishes the way it is going before turning back', () => {
    const l: LiftState = {
      ...newLift(),
      floor: '3',
      direction: 'up',
      carCalls: ['b2', '4'],
    };
    expect(nextStop(l)).toBe('4');
    expect(nextStop({ ...l, direction: 'down' })).toBe('b2');
  });
  it('takes the nearest call ahead, landing or car', () => {
    const l: LiftState = {
      ...newLift(),
      floor: 'b2',
      direction: 'up',
      carCalls: ['4'],
      hallCalls: ['3'],
    };
    expect(nextStop(l)).toBe('3');
  });
  it('with no direction, goes up first; nothing called, nowhere', () => {
    expect(nextStop({ ...newLift(), floor: '3', carCalls: ['b2'] })).toBe('b2');
    expect(nextStop(newLift())).toBeNull();
  });
});
