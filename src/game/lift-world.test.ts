import { describe, expect, it } from 'vite-plus/test';
import { applyAction, newWorld, stepWorld } from './world';

describe('the freight lift in the world (mission 108)', () => {
  it('starts at B2, shut, and answers calls, presses and the floor ahead’s ready', () => {
    let w = newWorld();
    expect(w.lift.floor).toBe('b2');
    expect(w.lift.doors).toBe('shut');
    w = applyAction(w, { type: 'lift/call', floor: 'b2' });
    expect(w.lift.doors).toBe('opening');
    w = applyAction(w, { type: 'lift/press', button: '4' });
    expect(w.lift.carCalls).toEqual(['4']);
    w = applyAction(w, { type: 'lift/hold', held: true });
    expect(w.lift.held).toBe(true);
    w = applyAction(w, { type: 'lift/hold', held: false });
    for (let i = 0; i < 200; i++) w = stepWorld(w, 0.1);
    expect(w.lift.trip?.to).toBe('4');
    w = applyAction(w, { type: 'lift/ready', floor: '4' });
    for (let i = 0; i < 200; i++) w = stepWorld(w, 0.1);
    expect(w.lift.floor).toBe('4');
  });
  it('a press of a dead button changes nothing', () => {
    const w = newWorld();
    expect(applyAction(w, { type: 'lift/press', button: 'g' })).toBe(w);
  });
});
