import { actOnHall4, newHall4, runHall4 } from './museum-4-lab';
import type { Hall4State, TankId } from './museum-4-lab';

/** The station worked as a visitor works it: SELECT, the thumbwheels, DOSE, and the valve's seconds. */
export function dosed(s: Hall4State, tank: TankId, amount: number): Hall4State {
  let n = actOnHall4(s, { type: 'select', tank });
  if (n.selected !== tank) n = actOnHall4(n, { type: 'select', tank });
  const tenths = Math.min(9999, Math.round(amount * 10));
  for (let d = 0 as 0 | 1 | 2 | 3; d < 4; d = (d + 1) as 0 | 1 | 2 | 3) {
    const want = Math.floor(tenths / 10 ** (3 - d)) % 10;
    while (Math.floor(n.dial / 10 ** (3 - d)) % 10 !== want)
      n = actOnHall4(n, { type: 'wheel', digit: d, by: 1 });
  }
  n = actOnHall4(n, { type: 'dose' });
  return runHall4(n, 5);
}

/** The reset water with nobody swimming, at 10:00. */
export const quiet = () =>
  actOnHall4(newHall4(36000), { type: 'swimmers', swimmers: 'none' });
