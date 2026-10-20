import { describe, expect, it } from 'vite-plus/test';
import {
  BS5266,
  checkEmergencyLighting,
  illuminance,
  intensity,
} from './emergency-lighting';
import type { EmergencyFitting } from './emergency-lighting';

const at = (x: number, z: number, lumens = 200): EmergencyFitting => ({
  x,
  z,
  height: 3,
  lumens,
  spread: 1,
});

describe('emergency lighting, measured', () => {
  it('puts all of a fitting’s light into the floor below it', () => {
    // Integrate its intensity over the lower hemisphere: its flux.
    const f = at(0, 0);
    let flux = 0;
    const n = 2000;
    for (let i = 0; i < n; i++) {
      const theta = ((i + 0.5) / n) * (Math.PI / 2);
      flux +=
        intensity(f, theta) * 2 * Math.PI * Math.sin(theta) * (Math.PI / 2 / n);
    }
    expect(flux).toBeCloseTo(200, 0);
  });

  it('falls off with the square of the distance below', () => {
    const near = illuminance([{ ...at(0, 0), height: 2 }], 0, 0);
    const far = illuminance([{ ...at(0, 0), height: 4 }], 0, 0);
    expect(near / far).toBeCloseTo(4);
  });

  it('passes a well-lit room and names what fails in a badly lit one', () => {
    const area = { minX: -5, maxX: 5, minZ: -5, maxZ: 5 };
    const door = { name: 'exit door', x: 0, z: -5 };
    const good = [
      at(-2.5, -2.5),
      at(2.5, -2.5),
      at(-2.5, 2.5),
      at(2.5, 2.5),
      at(0, -4),
    ];
    const pass = checkEmergencyLighting(good, area, [door]);
    expect(pass.problems).toEqual([]);
    expect(pass.minimum).toBeGreaterThanOrEqual(BS5266.openArea);
    const bad = checkEmergencyLighting([at(0, 0, 60)], area, [door]);
    expect(bad.problems.some((p) => p.startsWith('open area'))).toBe(true);
    expect(bad.problems.some((p) => p.startsWith('exit door'))).toBe(true);
  });
});
