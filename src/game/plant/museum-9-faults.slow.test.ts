import { describe, expect, it } from 'vite-plus/test';
import {
  FAULTS,
  actOnHall9,
  faultCleared,
  runHall9,
  HALL9_MODEL,
} from './museum-9-faults';
import type { FaultNo, Hall9 } from './museum-9-faults';
import { hall9Readings } from './museum-9-plant';
import { FIXES } from './museum-9-faults.test-support';

const base = runHall9(HALL9_MODEL.reset(36000), 300);
const cause = (h: Hall9, n: FaultNo) =>
  actOnHall9(
    actOnHall9(actOnHall9(h, { type: 'key', on: true }), {
      type: 'select',
      fault: n,
    }),
    { type: 'cause', r: 0 },
  );

describe('Hall 9’s faults, cleared only by their own fixes', () => {
  it('no fix clears another fault (every pair)', () => {
    for (const f of FAULTS)
      for (const g of FAULTS) {
        if (f.n === g.n) continue;
        // Acknowledging DP1 is part of both: refilling DT1 (fault 7) and
        // clearing a gas lock (fault 8); Hall 3's pump vents its own gas
        // through its discharge, so the acknowledgement alone clears it.
        if (f.n === 8 && g.n === 7) continue;
        const h = runHall9(FIXES[g.n](runHall9(cause(base, f.n), 30)), 60);
        expect(
          faultCleared(h.plant, f.n),
          `${f.name} by the fix for ${g.name}`,
        ).toBe(false);
      }
  }, 60_000);
});

describe('Hall 9’s slow faults (Try it 3)', () => {
  it('the heating valve failed shut: TC1 calls, TI2 = TI1 at once, POOL TEMP LOW only after plant hours', () => {
    let h = runHall9(cause(base, 5), 600);
    const r = hall9Readings(h.plant);
    expect(r.tc1Calling).toBe(true);
    expect(r.ti.ti2).toBeCloseTo(r.ti.ti1, 1);
    expect(h.annunciator.firstOut).toBeNull();
    let t = 600;
    while (!h.annunciator.present['pool-temp-low'] && t < 24 * 3600) {
      h = runHall9(h, 600);
      t += 600;
    }
    expect(t).toBeGreaterThan(4 * 3600);
    expect(h.annunciator.firstOut).toBe('pool-temp-low');
  }, 60_000);

  it('the drifted probe: no window, DC1 reading low while the kit reads the truth', () => {
    const h = runHall9(cause(base, 10), 1800);
    expect(h.annunciator.firstOut).toBeNull();
    const r = hall9Readings(h.plant);
    expect(r.free).toBeLessThan(h.plant.chem.cell.water.free - 0.2);
  });
});
