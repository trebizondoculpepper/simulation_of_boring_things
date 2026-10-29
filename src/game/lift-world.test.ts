import { describe, expect, it } from 'vite-plus/test';
import { applyAction, newWorld, stepWorld } from './world';

describe('the freight lift in the world (mission 108)', () => {
  it('starts at B2, shut, and answers calls, presses and the floor ahead’s ready', () => {
    let w = newWorld();
    expect(w.lifts.freight.floor).toBe('b2');
    expect(w.lifts.freight.doors).toBe('shut');
    w = applyAction(w, { type: 'lift/call', lift: 'freight', floor: 'b2' });
    expect(w.lifts.freight.doors).toBe('opening');
    w = applyAction(w, { type: 'lift/press', lift: 'freight', button: '4' });
    expect(w.lifts.freight.carCalls).toEqual(['4']);
    w = applyAction(w, { type: 'lift/hold', lift: 'freight', held: true });
    expect(w.lifts.freight.held).toBe(true);
    w = applyAction(w, { type: 'lift/hold', lift: 'freight', held: false });
    for (let i = 0; i < 200; i++) w = stepWorld(w, 0.1);
    expect(w.lifts.freight.trip?.to).toBe('4');
    w = applyAction(w, { type: 'lift/ready', lift: 'freight', floor: '4' });
    for (let i = 0; i < 200; i++) w = stepWorld(w, 0.1);
    expect(w.lifts.freight.floor).toBe('4');
  });
  it('runs the trial lift on its own floors, apart from the freight lift', () => {
    let w = newWorld();
    expect(w.lifts.trial.floor).toBe('1');
    w = applyAction(w, { type: 'lift/press', lift: 'trial', button: '3' });
    expect(w.lifts.trial.carCalls).toEqual(['3']);
    expect(w.lifts.freight.carCalls).toEqual([]);
  });
  it('a press of a dead button changes nothing', () => {
    const w = newWorld();
    expect(
      applyAction(w, { type: 'lift/press', lift: 'freight', button: 'g' }),
    ).toBe(w);
  });
});
