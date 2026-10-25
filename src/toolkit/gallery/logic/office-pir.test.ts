import { describe, expect, it } from 'vite-plus/test';
import { createOfficePir } from './office-pir';

describe('engineer’s office PIR', () => {
  it('lights after motion, extends the hold, and goes dark after vacancy', () => {
    const changes: boolean[] = [];
    const pir = createOfficePir((lit) => changes.push(lit));
    pir.senseMotion();
    pir.update(0.2);
    expect(changes).toEqual([]);
    pir.update(0.2);
    expect(changes).toEqual([true]);
    pir.update(80);
    pir.senseMotion();
    pir.update(89);
    expect(changes).toEqual([true]);
    pir.update(2);
    expect(changes).toEqual([true, false]);
  });
});
