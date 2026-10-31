import { describe, expect, it } from 'vite-plus/test';
import { applyAction, newWorld } from '../world';

describe('a hand dose, carried round by the circulation', () => {
  it('18 kg of bicarbonate in the Lounge’s tank reaches its far side within two hours', () => {
    const start = newWorld();
    const far = (w: typeof start) => w.treatment.circuits.pool_01.pool[2];
    const before = far(start).alkalinity;
    let w = applyAction(start, {
      type: 'hand/dose',
      pool: 'pool_01',
      chemical: 'bicarbonate',
      amount: 18,
    });
    // Unmixed yet: the far side has none of it.
    expect(far(w).alkalinity).toBe(before);
    w = applyAction(w, { type: 'time/skip', seconds: 2 * 3600 });
    const tank = w.treatment.circuits.pool_01.tank.alkalinity;
    // About 73 mg/l once mixed through the circuit's 146 m³ (Dr Aqualis's
    // Show dose: 17.4 kg for 69 mg/l in his 150 m³), less what the acid
    // pump takes back as the pH rises; mixed: the tank and far side agree.
    expect(far(w).alkalinity - before).toBeGreaterThan(62);
    expect(far(w).alkalinity - before).toBeLessThan(76);
    expect(Math.abs(tank - far(w).alkalinity)).toBeLessThan(3);
  });
});
