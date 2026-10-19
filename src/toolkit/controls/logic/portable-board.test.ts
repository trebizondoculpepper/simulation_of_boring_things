import { expect, it } from 'vite-plus/test';
import { createBoardFall, createPortableBoard } from './portable-board';

it('only drops a held board, and allows settled boards to be picked up again', () => {
  const board = createPortableBoard();
  const events: string[] = [];
  board.onEvent((event) => events.push(event));
  board.drop();
  expect(board.phase.value).toBe('installed');
  board.pickUp();
  board.drop();
  board.impact();
  board.settle();
  expect(board.phase.value).toBe('settled');
  board.pickUp();
  expect(board.phase.value).toBe('held');
  expect(events).toEqual(['pick-up', 'drop', 'impact', 'pick-up']);
});

it.each([1 / 120, 1 / 30, 0.1])(
  'falls, skitters and settles quickly with dt=%s',
  (dt) => {
    const fall = createBoardFall(0, 1.5, 0, 0.65, 0.2);
    let impacts = 0;
    let time = 0;
    while (!fall.body.settled && time < 3) {
      fall.step(
        dt,
        () => 0.02,
        () => impacts++,
      );
      time += dt;
    }
    expect(fall.body.settled).toBe(true);
    expect(time).toBeLessThan(2);
    expect(fall.body.y).toBeCloseTo(0.02);
    expect(fall.body.x).toBeGreaterThan(0.1);
    expect(impacts).toBeGreaterThan(0);
    expect(impacts).toBeLessThanOrEqual(3);
  },
);

it('reports diminishing collision speeds at increasingly short intervals', () => {
  const fall = createBoardFall(0, 1.5, 0, 0.65, 0.2);
  const board = createPortableBoard();
  board.pickUp();
  board.drop();
  const speeds: number[] = [];
  const times: number[] = [];
  let time = 0;
  while (!fall.body.settled && time < 3) {
    fall.step(
      1 / 120,
      () => 0,
      (speed, slip) => {
        board.impact(speed, slip);
        speeds.push(board.impactSpeed.value);
        times.push(time);
      },
    );
    time += 1 / 120;
  }
  expect(speeds.length).toBeGreaterThan(1);
  expect(board.impacts.value).toBe(speeds.length);
  for (let i = 1; i < speeds.length; i++) {
    expect(speeds[i]).toBeLessThan(speeds[i - 1] * 0.25);
    if (i > 1)
      expect(times[i] - times[i - 1]).toBeLessThan(times[i - 1] - times[i - 2]);
  }
  board.pickUp();
  board.drop();
  expect(board.impacts.value).toBe(0);
});

it('fixed and locked objects stay attached; releasing an exhibit enables pickup and drop', () => {
  const fixed = createPortableBoard(undefined, undefined, 'fixed');
  expect(fixed.pickUp()).toBe(false);
  expect(fixed.phase.value).toBe('installed');
  const exhibit = createPortableBoard();
  exhibit.setLocked(true);
  expect(exhibit.canPickUp.value).toBe(false);
  expect(exhibit.pickUp()).toBe(false);
  exhibit.setLocked(false);
  expect(exhibit.canPickUp.value).toBe(true);
  exhibit.pickUp();
  exhibit.drop();
  expect(exhibit.phase.value).toBe('falling');
});
